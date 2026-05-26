use uuid::Uuid;

use crate::connector::DbConnector;
use crate::error::{DbError, DbResult};
use crate::mysql::MySqlConnector;
use crate::postgres::PostgresConnector;
use crate::pool::PoolManager;
use crate::sql_safety::is_readonly_sql;
use crate::sqlite::SqliteConnector;
use crate::types::{
    ColumnSchema, ConnectionConfig, DatabaseMeta, DbKind, OpenConnectionResult,
    QueryRequest, QueryResult, SchemaMeta, TableMeta,
};

#[derive(Clone)]
pub struct DbManager {
    pool_manager: PoolManager,
    sqlite: SqliteConnector,
    postgres: PostgresConnector,
    mysql: MySqlConnector,
}

impl DbManager {
    pub fn new() -> Self {
        let pool_manager = PoolManager::new();

        Self {
            sqlite: SqliteConnector::new(pool_manager.clone()),
            postgres: PostgresConnector::new(pool_manager.clone()),
            mysql: MySqlConnector::new(pool_manager.clone()),
            pool_manager,
        }
    }

    pub async fn test_connection(&self, config: ConnectionConfig) -> DbResult<()> {
        self.connector(&config.kind).test_connection(config).await
    }

    pub async fn open(
        &self,
        mut config: ConnectionConfig,
    ) -> DbResult<OpenConnectionResult> {
        if config.id.is_none() {
            config.id = Some(Uuid::new_v4().to_string());
        }

        self.connector(&config.kind).open(config).await
    }

    pub async fn close(&self, connection_id: String) -> DbResult<()> {
        let connection = self
            .pool_manager
            .get(&connection_id)
            .ok_or_else(|| DbError::ConnectionNotFound(connection_id.clone()))?;

        self.connector(&connection.kind)
            .close(connection_id)
            .await
    }

    pub async fn query(&self, request: QueryRequest) -> DbResult<QueryResult> {
        if request.readonly.unwrap_or(false) && !is_readonly_sql(&request.sql) {
            return Err(DbError::QueryFailed(
                "Readonly query rejected: SQL may modify data".to_string(),
            ));
        }

        let connection = self
            .pool_manager
            .get(&request.connection_id)
            .ok_or_else(|| {
                DbError::ConnectionNotFound(request.connection_id.clone())
            })?;

        self.connector(&connection.kind).query(request).await
    }

    pub async fn list_databases(
        &self,
        connection_id: String,
    ) -> DbResult<Vec<DatabaseMeta>> {
        let connection = self
            .pool_manager
            .get(&connection_id)
            .ok_or_else(|| DbError::ConnectionNotFound(connection_id.clone()))?;

        self.connector(&connection.kind)
            .list_databases(connection_id)
            .await
    }

    pub async fn list_schemas(
        &self,
        connection_id: String,
    ) -> DbResult<Vec<SchemaMeta>> {
        let connection = self
            .pool_manager
            .get(&connection_id)
            .ok_or_else(|| DbError::ConnectionNotFound(connection_id.clone()))?;

        self.connector(&connection.kind)
            .list_schemas(connection_id)
            .await
    }

    pub async fn list_tables(
        &self,
        connection_id: String,
        schema: Option<String>,
    ) -> DbResult<Vec<TableMeta>> {
        let connection = self
            .pool_manager
            .get(&connection_id)
            .ok_or_else(|| DbError::ConnectionNotFound(connection_id.clone()))?;

        self.connector(&connection.kind)
            .list_tables(connection_id, schema)
            .await
    }

    pub async fn list_columns(
        &self,
        connection_id: String,
        schema: Option<String>,
        table: String,
    ) -> DbResult<Vec<ColumnSchema>> {
        let connection = self
            .pool_manager
            .get(&connection_id)
            .ok_or_else(|| DbError::ConnectionNotFound(connection_id.clone()))?;

        self.connector(&connection.kind)
            .list_columns(connection_id, schema, table)
            .await
    }

    fn connector(&self, kind: &DbKind) -> &dyn DbConnector {
        match kind {
            DbKind::SQLite => &self.sqlite,
            DbKind::PostgreSQL => &self.postgres,
            DbKind::MySQL => &self.mysql,
        }
    }
}
