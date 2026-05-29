use std::time::{Duration, Instant};

use async_trait::async_trait;
use sqlx::{Column, PgPool, Row, TypeInfo};
use sqlx::postgres::PgPoolOptions;

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
pub struct PostgresConnector {
    pool_manager: PoolManager,
}

impl PostgresConnector {
    pub fn new(pool_manager: PoolManager) -> Self {
        Self { pool_manager }
    }

    fn build_url(config: &ConnectionConfig) -> DbResult<String> {
        let host = config.host.as_deref().unwrap_or("localhost");
        let port = config.port.unwrap_or(5432);
        let username = config.username.as_deref().unwrap_or("postgres");
        let password = config.password.as_deref().unwrap_or("");
        let database = config.database.as_deref().unwrap_or("postgres");

        Ok(format!(
            "postgres://{}:{}@{}:{}/{}",
            urlencoding::encode(username),
            urlencoding::encode(password),
            host,
            port,
            database
        ))
    }

    fn get_pool(&self, connection_id: &str) -> DbResult<PgPool> {
        let connection = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| {
                DbError::ConnectionNotFound(connection_id.to_string())
            })?;

        match connection.pool {
            AnyDbPool::PostgreSQL(pool) => Ok(pool),
            _ => Err(DbError::InvalidConfig(
                "connection is not postgresql".to_string(),
            )),
        }
    }

    async fn execute_with_timeout(
        &self,
        pool: &PgPool,
        sql: &str,
        timeout_ms: Option<u64>,
    ) -> DbResult<QueryResult> {
        let start = Instant::now();
        let timeout = Duration::from_millis(timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));
        let sql = sql.to_string();
        let pool = pool.clone();

        let dml = is_dml_statement(&sql);

        if dml {
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
                self.extract_columns_from_select(&sql).unwrap_or_default()
            };

            let result_rows = rows
                .into_iter()
                .map(|row| {
                    (0..row.len())
                        .map(|idx| read_pg_cell(&row, idx))
                        .collect()
                })
                .collect();

            Ok(QueryResult {
                columns,
                rows: result_rows,
                affected_rows: None,
                elapsed_ms: start.elapsed().as_millis() as u64,
                truncated: row_count >= limit.unwrap_or(1000) as usize && limit.is_some(),
                message: None,
            })
        }
    }

    fn extract_limit(&self, sql: &str) -> Option<u32> {
        let lower = sql.to_lowercase();
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

    fn extract_columns_from_select(&self, sql: &str) -> Option<Vec<ColumnMeta>> {
        let sql = sql.trim().to_uppercase();
        if !sql.starts_with("SELECT") {
            return None;
        }

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
            return None;
        }

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
impl DbConnector for PostgresConnector {
    async fn test_connection(&self, config: ConnectionConfig) -> DbResult<()> {
        let url = Self::build_url(&config)?;

        let pool = PgPoolOptions::new()
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

        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(&url)
            .await
            .map_err(|err| DbError::ConnectionFailed(err.to_string()))?;

        self.pool_manager.insert(ManagedConnection {
            id: connection_id.clone(),
            name: config.name.clone(),
            kind: DbKind::PostgreSQL,
            database: config.database.clone(),
            pool: AnyDbPool::PostgreSQL(pool),
        });

        Ok(OpenConnectionResult {
            connection_id,
            name: config.name,
            kind: DbKind::PostgreSQL,
            database: config.database,
        })
    }

    async fn close(&self, connection_id: String) -> DbResult<()> {
        if let Some(connection) = self.pool_manager.remove(&connection_id) {
            if let AnyDbPool::PostgreSQL(pool) = connection.pool {
                pool.close().await;
            }
        }

        Ok(())
    }

    async fn query(&self, request: QueryRequest) -> DbResult<QueryResult> {
        let pool = self.get_pool(&request.connection_id)?;
        self.execute_with_timeout(&pool, &request.sql, request.timeout_ms)
            .await
    }

    async fn list_databases(&self, connection_id: String) -> DbResult<Vec<DatabaseMeta>> {
        let pool = self.get_pool(&connection_id)?;

        let rows = sqlx::query(
            r#"
            SELECT datname
            FROM pg_database
            WHERE datistemplate = false
            ORDER BY datname
            "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| DatabaseMeta {
                name: row.try_get::<String, _>("datname").unwrap_or_default(),
            })
            .collect())
    }

    async fn list_schemas(&self, connection_id: String) -> DbResult<Vec<SchemaMeta>> {
        let pool = self.get_pool(&connection_id)?;

        let rows = sqlx::query(
            r#"
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schema_name
            "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| SchemaMeta {
                name: row.try_get::<String, _>("schema_name").unwrap_or_default(),
            })
            .collect())
    }

    async fn list_tables(
        &self,
        connection_id: String,
        schema: Option<String>,
    ) -> DbResult<Vec<TableMeta>> {
        let pool = self.get_pool(&connection_id)?;
        let schema = schema.unwrap_or_else(|| "public".to_string());

        let rows = sqlx::query(
            r#"
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = $1
            ORDER BY table_name
            "#,
        )
        .bind(&schema)
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| TableMeta {
                schema: row.try_get::<Option<String>, _>("table_schema").unwrap_or(None),
                name: row.try_get::<String, _>("table_name").unwrap_or_default(),
                table_type: row.try_get::<String, _>("table_type").unwrap_or_default(),
            })
            .collect())
    }

    async fn list_columns(
        &self,
        connection_id: String,
        schema: Option<String>,
        table: String,
    ) -> DbResult<Vec<ColumnSchema>> {
        let pool = self.get_pool(&connection_id)?;
        let schema = schema.unwrap_or_else(|| "public".to_string());

        let rows = sqlx::query(
            r#"
            SELECT
                c.table_schema,
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
            FROM information_schema.columns c
            LEFT JOIN information_schema.table_constraints tc
                ON tc.table_schema = c.table_schema
                AND tc.table_name = c.table_name
                AND tc.constraint_type = 'PRIMARY KEY'
            LEFT JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
                AND kcu.table_name = tc.table_name
                AND kcu.column_name = c.column_name
            WHERE c.table_schema = $1
              AND c.table_name = $2
            ORDER BY c.ordinal_position
            "#,
        )
        .bind(&schema)
        .bind(&table)
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| ColumnSchema {
                schema: row.try_get::<Option<String>, _>("table_schema").unwrap_or(None),
                table: row.try_get::<String, _>("table_name").unwrap_or_default(),
                name: row.try_get::<String, _>("column_name").unwrap_or_default(),
                database_type: row.try_get::<String, _>("data_type").unwrap_or_default(),
                nullable: Some(
                    row.try_get::<String, _>("is_nullable")
                        .unwrap_or_default()
                        == "YES",
                ),
                primary_key: row.try_get::<bool, _>("is_primary_key").unwrap_or(false),
                default_value: row.try_get::<Option<String>, _>("column_default").unwrap_or(None),
            })
            .collect())
    }
}

fn read_pg_cell(row: &sqlx::postgres::PgRow, index: usize) -> CellValue {
    if let Ok(value) = row.try_get::<Option<bool>, _>(index) {
        return value.map(CellValue::Bool).unwrap_or(CellValue::Null);
    }

    if let Ok(value) = row.try_get::<Option<i64>, _>(index) {
        return value.map(CellValue::I64).unwrap_or(CellValue::Null);
    }

    if let Ok(value) = row.try_get::<Option<i32>, _>(index) {
        return value
            .map(|value| CellValue::I64(value as i64))
            .unwrap_or(CellValue::Null);
    }

    if let Ok(value) = row.try_get::<Option<f64>, _>(index) {
        return value.map(CellValue::F64).unwrap_or(CellValue::Null);
    }

    if let Ok(value) = row.try_get::<Option<f32>, _>(index) {
        return value
            .map(|value| CellValue::F64(value as f64))
            .unwrap_or(CellValue::Null);
    }

    if let Ok(value) = row.try_get::<Option<String>, _>(index) {
        return value.map(CellValue::String).unwrap_or(CellValue::Null);
    }

    if let Ok(value) = row.try_get::<Option<serde_json::Value>, _>(index) {
        return value.map(CellValue::Json).unwrap_or(CellValue::Null);
    }

    CellValue::Null
}
