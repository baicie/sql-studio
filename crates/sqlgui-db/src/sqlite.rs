use std::time::{Duration, Instant};

use async_trait::async_trait;
use sqlx::{Column, Row, SqlitePool, TypeInfo};
use sqlx::sqlite::SqlitePoolOptions;

use crate::connector::DbConnector;
use crate::error::{DbError, DbResult};
use crate::pool::{AnyDbPool, ManagedConnection, PoolManager};
use crate::query_helper::{apply_limit, is_dml_statement};
use crate::types::{
    CellValue, ColumnMeta, ColumnSchema, ConnectionConfig, DatabaseMeta,
    DbKind, OpenConnectionResult, QueryRequest, QueryResult, SchemaMeta,
    TableMeta,
};

const DEFAULT_TIMEOUT_MS: u64 = 30_000;

#[derive(Clone)]
pub struct SqliteConnector {
    pool_manager: PoolManager,
}

impl SqliteConnector {
    pub fn new(pool_manager: PoolManager) -> Self {
        Self { pool_manager }
    }

    fn build_url(config: &ConnectionConfig) -> DbResult<String> {
        let file_path = config.file_path.as_ref().ok_or_else(|| {
            DbError::InvalidConfig("SQLite file_path is required".to_string())
        })?;

        Ok(format!("sqlite:{}", file_path))
    }

    fn get_pool(&self, connection_id: &str) -> DbResult<SqlitePool> {
        let connection = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| {
                DbError::ConnectionNotFound(connection_id.to_string())
            })?;

        match connection.pool {
            AnyDbPool::SQLite(pool) => Ok(pool),
            _ => Err(DbError::InvalidConfig(
                "connection is not sqlite".to_string(),
            )),
        }
    }

    async fn execute_with_timeout(
        &self,
        pool: &SqlitePool,
        sql: &str,
        timeout_ms: Option<u64>,
        request_limit: Option<u32>,
    ) -> DbResult<QueryResult> {
        let start = Instant::now();
        let timeout = Duration::from_millis(timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));
        let sql = sql.to_string();
        let pool = pool.clone();

        let dml = is_dml_statement(&sql);

        if dml {
            // DML: use execute to get affected rows
            let result = tokio::time::timeout(timeout, async move {
                sqlx::query(&sql).execute(&pool).await
            })
            .await
            .map_err(|_| DbError::Timeout)?
            .map_err(|e| DbError::QueryFailed(e.to_string()))?;

            Ok(QueryResult {
                columns: Vec::new(),
                rows: Vec::new(),
                affected_rows: Some(result.rows_affected()),
                elapsed_ms: start.elapsed().as_millis() as u64,
                truncated: false,
                message: None,
            })
        } else {
            // SELECT: use fetch_all, get columns even if 0 rows
            let limit = self.extract_limit(&sql);
            let sql_with_limit = apply_limit(&sql, limit.unwrap_or(1000));

            let rows = tokio::time::timeout(timeout, async move {
                sqlx::query(&sql_with_limit).fetch_all(&pool).await
            })
            .await
            .map_err(|_| DbError::Timeout)?
            .map_err(|e| DbError::QueryFailed(e.to_string()))?;

            let row_count = rows.len();
            let columns = if let Some(first_row) = rows.first() {
                first_row
                    .columns()
                    .iter()
                    .map(|col| ColumnMeta {
                        name: col.name().to_string(),
                        database_type: col.type_info().name().to_string(),
                        nullable: None,
                    })
                    .collect()
            } else {
                // 0 rows: still try to extract columns from the SQL itself
                self.extract_columns_from_select(&sql).unwrap_or_default()
            };

            let result_rows = rows
                .into_iter()
                .map(|row| {
                    (0..row.len())
                        .map(|idx| read_sqlite_cell(&row, idx))
                        .collect()
                })
                .collect();

            // Use request_limit for truncated detection; if user already specified a LIMIT
            // in their SQL, auto-limit was not applied and request_limit is None.
            let limit_for_truncated = request_limit.unwrap_or(1000);

            Ok(QueryResult {
                columns,
                rows: result_rows,
                affected_rows: None,
                elapsed_ms: start.elapsed().as_millis() as u64,
                truncated: row_count >= limit_for_truncated as usize,
                message: None,
            })
        }
    }

    /// Extract LIMIT value from SQL if present.
    fn extract_limit(&self, sql: &str) -> Option<u32> {
        let lower = sql.to_lowercase();
        // Find "limit N" in the SQL
        if let Some(idx) = lower.rfind("limit") {
            let rest = lower[idx..].trim();
            if let Some(space_idx) = rest.find(' ') {
                let num_str = rest[space_idx..].trim();
                num_str.parse::<u32>().ok()
            } else {
                None
            }
        } else {
            None
        }
    }

    /// For 0-row SELECTs, try to get column names from the SELECT list.
    /// This is a best-effort heuristic; for accurate results use DESCRIBE.
    fn extract_columns_from_select(&self, sql: &str) -> Option<Vec<ColumnMeta>> {
        let sql = sql.trim().to_uppercase();
        if !sql.starts_with("SELECT") {
            return None;
        }

        // Remove ORDER BY / GROUP BY / HAVING / LIMIT to get column list
        let mut cols_end = sql.len();
        for keyword in [" ORDER BY", " GROUP BY", " HAVING", " LIMIT"] {
            if let Some(idx) = sql.find(keyword) {
                if idx < cols_end {
                    cols_end = idx;
                }
            }
        }

        let col_str = &sql[6..cols_end].trim();
        if col_str.is_empty() || *col_str == "*" {
            return None; // Can't resolve * without table info
        }

        // Parse simple comma-separated column expressions
        let mut columns = Vec::new();
        let mut depth = 0isize;
        let mut start = 0;

        for (i, ch) in col_str.char_indices() {
            match ch {
                '(' => depth += 1,
                ')' => depth -= 1,
                ',' if depth == 0 => {
                    let col = col_str[start..i].trim();
                    if !col.is_empty() {
                        columns.push(ColumnMeta {
                            name: self.alias_or_name(col),
                            database_type: "TEXT".to_string(),
                            nullable: None,
                        });
                    }
                    start = i + 1;
                }
                _ => {}
            }
        }

        // Last column
        let col = col_str[start..].trim();
        if !col.is_empty() {
            columns.push(ColumnMeta {
                name: self.alias_or_name(col),
                database_type: "TEXT".to_string(),
                nullable: None,
            });
        }

        if columns.is_empty() {
            None
        } else {
            Some(columns)
        }
    }

    /// Extract alias or column name from a column expression.
    fn alias_or_name(&self, expr: &str) -> String {
        let expr = expr.trim();
        if let Some(idx) = expr.to_uppercase().rfind(" AS ") {
            return expr[idx + 4..].trim().to_string();
        }
        if let Some(idx) = expr.rfind('.') {
            return expr[idx + 1..].trim().to_string();
        }
        expr.to_string()
    }
}

#[async_trait]
impl DbConnector for SqliteConnector {
    async fn test_connection(&self, config: ConnectionConfig) -> DbResult<()> {
        let url = Self::build_url(&config)?;
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect(&url)
            .await
            .map_err(|err| DbError::ConnectionFailed(err.to_string()))?;

        sqlx::query("SELECT 1")
            .execute(&pool)
            .await
            .map_err(|err| DbError::ConnectionFailed(err.to_string()))?;

        pool.close().await;

        Ok(())
    }

    async fn open(&self, config: ConnectionConfig) -> DbResult<OpenConnectionResult> {
        let connection_id = config
            .id
            .clone()
            .ok_or_else(|| DbError::InvalidConfig("id is required".to_string()))?;

        let url = Self::build_url(&config)?;

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&url)
            .await
            .map_err(|err| DbError::ConnectionFailed(err.to_string()))?;

        self.pool_manager.insert(ManagedConnection {
            id: connection_id.clone(),
            name: config.name.clone(),
            kind: DbKind::SQLite,
            database: config.file_path.clone(),
            pool: AnyDbPool::SQLite(pool),
        });

        Ok(OpenConnectionResult {
            connection_id,
            name: config.name,
            kind: DbKind::SQLite,
            database: config.file_path,
        })
    }

    async fn close(&self, connection_id: String) -> DbResult<()> {
        if let Some(connection) = self.pool_manager.remove(&connection_id) {
            if let AnyDbPool::SQLite(pool) = connection.pool {
                pool.close().await;
            }
        }

        Ok(())
    }

    async fn query(&self, request: QueryRequest) -> DbResult<QueryResult> {
        let pool = self.get_pool(&request.connection_id)?;
        self.execute_with_timeout(&pool, &request.sql, request.timeout_ms, request.limit)
            .await
    }

    async fn list_databases(&self, _connection_id: String) -> DbResult<Vec<DatabaseMeta>> {
        Ok(vec![DatabaseMeta {
            name: "main".to_string(),
        }])
    }

    async fn list_schemas(&self, _connection_id: String) -> DbResult<Vec<SchemaMeta>> {
        Ok(vec![SchemaMeta {
            name: "main".to_string(),
        }])
    }

    async fn list_tables(
        &self,
        connection_id: String,
        _schema: Option<String>,
    ) -> DbResult<Vec<TableMeta>> {
        let pool = self.get_pool(&connection_id)?;

        let rows = sqlx::query(
            r#"
            SELECT name, type
            FROM sqlite_master
            WHERE type IN ('table', 'view')
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        let tables = rows
            .into_iter()
            .map(|row| TableMeta {
                schema: Some("main".to_string()),
                name: row.try_get::<String, _>("name").unwrap_or_default(),
                table_type: row.try_get::<String, _>("type").unwrap_or_default(),
            })
            .collect();

        Ok(tables)
    }

    async fn list_columns(
        &self,
        connection_id: String,
        _schema: Option<String>,
        table: String,
    ) -> DbResult<Vec<ColumnSchema>> {
        let pool = self.get_pool(&connection_id)?;

        let sql = format!("PRAGMA table_info(\"{}\")", table.replace('"', "\"\""));

        let rows = sqlx::query(&sql)
            .fetch_all(&pool)
            .await
            .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        let columns = rows
            .into_iter()
            .map(|row| ColumnSchema {
                schema: Some("main".to_string()),
                table: table.clone(),
                name: row.try_get::<String, _>("name").unwrap_or_default(),
                database_type: row.try_get::<String, _>("type").unwrap_or_default(),
                nullable: Some(row.try_get::<i64, _>("notnull").unwrap_or(0) == 0),
                primary_key: row.try_get::<i64, _>("pk").unwrap_or(0) > 0,
                default_value: row.try_get::<Option<String>, _>("dflt_value").unwrap_or(None),
            })
            .collect();

        Ok(columns)
    }
}

fn read_sqlite_cell(row: &sqlx::sqlite::SqliteRow, index: usize) -> CellValue {
    if let Ok(value) = row.try_get::<Option<i64>, _>(index) {
        if value.is_some() {
            return CellValue::I64(value.unwrap());
        }
        return CellValue::Null;
    }

    if let Ok(value) = row.try_get::<Option<f64>, _>(index) {
        if value.is_some() {
            return CellValue::F64(value.unwrap());
        }
        return CellValue::Null;
    }

    if let Ok(value) = row.try_get::<Option<String>, _>(index) {
        if value.is_some() {
            return CellValue::String(value.unwrap());
        }
        return CellValue::Null;
    }

    if let Ok(value) = row.try_get::<Option<Vec<u8>>, _>(index) {
        if let Some(value) = value {
            return CellValue::Bytes(base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                value,
            ));
        }
        return CellValue::Null;
    }

    CellValue::Null
}
