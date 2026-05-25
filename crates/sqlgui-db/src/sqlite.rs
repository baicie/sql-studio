use std::time::Instant;

use async_trait::async_trait;
use sqlx::{Column, Row, SqlitePool, TypeInfo};
use sqlx::sqlite::SqlitePoolOptions;

use crate::connector::DbConnector;
use crate::error::{DbError, DbResult};
use crate::pool::{AnyDbPool, ManagedConnection, PoolManager};
use crate::types::{
    CellValue, ColumnMeta, ColumnSchema, ConnectionConfig, DatabaseMeta,
    DbKind, OpenConnectionResult, QueryRequest, QueryResult, SchemaMeta,
    TableMeta,
};

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
        let start = Instant::now();

        let sql = apply_limit_if_needed(&request.sql, request.limit);

        let rows = sqlx::query(&sql)
            .fetch_all(&pool)
            .await
            .map_err(|err| DbError::QueryFailed(err.to_string()))?;

        let mut columns = Vec::new();
        let mut result_rows = Vec::new();

        if let Some(first_row) = rows.first() {
            for column in first_row.columns() {
                columns.push(ColumnMeta {
                    name: column.name().to_string(),
                    database_type: column.type_info().name().to_string(),
                    nullable: None,
                });
            }
        }

        for row in rows {
            let mut result_row = Vec::new();

            for index in 0..row.len() {
                result_row.push(read_sqlite_cell(&row, index));
            }

            result_rows.push(result_row);
        }

        Ok(QueryResult {
            columns,
            rows: result_rows,
            affected_rows: None,
            elapsed_ms: start.elapsed().as_millis() as u64,
            truncated: false,
            message: None,
        })
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

fn apply_limit_if_needed(sql: &str, limit: Option<u32>) -> String {
    let trimmed = sql.trim();
    let lower = trimmed.to_lowercase();

    if !lower.starts_with("select") {
        return trimmed.to_string();
    }

    if lower.contains(" limit ") {
        return trimmed.to_string();
    }

    let limit = limit.unwrap_or(1000);
    format!("{trimmed} LIMIT {limit}")
}

fn read_sqlite_cell(row: &sqlx::sqlite::SqliteRow, index: usize) -> CellValue {
    if let Ok(value) = row.try_get::<Option<i64>, _>(index) {
        if let Some(value) = value {
            return CellValue::I64(value);
        }
        return CellValue::Null;
    }

    if let Ok(value) = row.try_get::<Option<f64>, _>(index) {
        if let Some(value) = value {
            return CellValue::F64(value);
        }
        return CellValue::Null;
    }

    if let Ok(value) = row.try_get::<Option<String>, _>(index) {
        if let Some(value) = value {
            return CellValue::String(value);
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
