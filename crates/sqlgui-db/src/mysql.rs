use std::time::Instant;

use async_trait::async_trait;
use sqlx::{Column, MySqlPool, Row, TypeInfo};
use sqlx::mysql::MySqlPoolOptions;

use crate::connector::DbConnector;
use crate::error::{DbError, DbResult};
use crate::pool::{AnyDbPool, ManagedConnection, PoolManager};
use crate::types::{
    CellValue, ColumnMeta, ColumnSchema, ConnectionConfig, DatabaseMeta,
    DbKind, OpenConnectionResult, QueryRequest, QueryResult, SchemaMeta,
    TableMeta,
};

#[derive(Clone)]
pub struct MySqlConnector {
    pool_manager: PoolManager,
}

impl MySqlConnector {
    pub fn new(pool_manager: PoolManager) -> Self {
        Self { pool_manager }
    }

    fn build_url(config: &ConnectionConfig) -> DbResult<String> {
        let host = config.host.as_deref().unwrap_or("localhost");
        let port = config.port.unwrap_or(3306);
        let username = config.username.as_deref().unwrap_or("root");
        let password = config.password.as_deref().unwrap_or("");
        let database = config.database.as_deref().unwrap_or("");

        if database.is_empty() {
            Ok(format!(
                "mysql://{}:{}@{}:{}",
                urlencoding::encode(username),
                urlencoding::encode(password),
                host,
                port
            ))
        } else {
            Ok(format!(
                "mysql://{}:{}@{}:{}/{}",
                urlencoding::encode(username),
                urlencoding::encode(password),
                host,
                port,
                database
            ))
        }
    }

    fn get_pool(&self, connection_id: &str) -> DbResult<MySqlPool> {
        let connection = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| {
                DbError::ConnectionNotFound(connection_id.to_string())
            })?;

        match connection.pool {
            AnyDbPool::MySQL(pool) => Ok(pool),
            _ => Err(DbError::InvalidConfig(
                "connection is not mysql".to_string(),
            )),
        }
    }
}

#[async_trait]
impl DbConnector for MySqlConnector {
    async fn test_connection(&self, config: ConnectionConfig) -> DbResult<()> {
        let url = Self::build_url(&config)?;

        let pool = MySqlPoolOptions::new()
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

        let pool = MySqlPoolOptions::new()
            .max_connections(10)
            .connect(&url)
            .await
            .map_err(|err| DbError::ConnectionFailed(err.to_string()))?;

        self.pool_manager.insert(ManagedConnection {
            id: connection_id.clone(),
            name: config.name.clone(),
            kind: DbKind::MySQL,
            database: config.database.clone(),
            pool: AnyDbPool::MySQL(pool),
        });

        Ok(OpenConnectionResult {
            connection_id,
            name: config.name,
            kind: DbKind::MySQL,
            database: config.database,
        })
    }

    async fn close(&self, connection_id: String) -> DbResult<()> {
        if let Some(connection) = self.pool_manager.remove(&connection_id) {
            if let AnyDbPool::MySQL(pool) = connection.pool {
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
                result_row.push(read_mysql_cell(&row, index));
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

    async fn list_databases(&self, connection_id: String) -> DbResult<Vec<DatabaseMeta>> {
        let pool = self.get_pool(&connection_id)?;

        let rows = sqlx::query("SHOW DATABASES")
            .fetch_all(&pool)
            .await
            .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .filter_map(|row| row.try_get::<String, _>(0).ok())
            .filter(|name| {
                !matches!(
                    name.as_str(),
                    "information_schema" | "performance_schema" | "mysql" | "sys"
                )
            })
            .map(|name| DatabaseMeta { name })
            .collect())
    }

    async fn list_schemas(&self, connection_id: String) -> DbResult<Vec<SchemaMeta>> {
        let databases = self.list_databases(connection_id).await?;

        Ok(databases
            .into_iter()
            .map(|database| SchemaMeta {
                name: database.name,
            })
            .collect())
    }

    async fn list_tables(
        &self,
        connection_id: String,
        schema: Option<String>,
    ) -> DbResult<Vec<TableMeta>> {
        let pool = self.get_pool(&connection_id)?;

        let schema = schema.ok_or_else(|| {
            DbError::InvalidConfig("schema/database is required".to_string())
        })?;

        let rows = sqlx::query(
            r#"
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = ?
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
        let schema = schema.ok_or_else(|| {
            DbError::InvalidConfig("schema/database is required".to_string())
        })?;

        let rows = sqlx::query(
            r#"
            SELECT
                table_schema,
                table_name,
                column_name,
                column_type,
                is_nullable,
                column_key,
                column_default
            FROM information_schema.columns
            WHERE table_schema = ?
              AND table_name = ?
            ORDER BY ordinal_position
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
                database_type: row.try_get::<String, _>("column_type").unwrap_or_default(),
                nullable: Some(
                    row.try_get::<String, _>("is_nullable")
                        .unwrap_or_default()
                        == "YES",
                ),
                primary_key: row.try_get::<String, _>("column_key").unwrap_or_default() == "PRI",
                default_value: row.try_get::<Option<String>, _>("column_default").unwrap_or(None),
            })
            .collect())
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

fn read_mysql_cell(row: &sqlx::mysql::MySqlRow, index: usize) -> CellValue {
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

    if let Ok(value) = row.try_get::<Option<Vec<u8>>, _>(index) {
        return value
            .map(|value| CellValue::Bytes(base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                value,
            )))
            .unwrap_or(CellValue::Null);
    }

    CellValue::Null
}
