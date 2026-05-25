use async_trait::async_trait;

use crate::error::DbResult;
use crate::types::{
    ColumnSchema, ConnectionConfig, DatabaseMeta, OpenConnectionResult,
    QueryRequest, QueryResult, SchemaMeta, TableMeta,
};

#[async_trait]
pub trait DbConnector: Send + Sync {
    async fn test_connection(&self, config: ConnectionConfig) -> DbResult<()>;

    async fn open(&self, config: ConnectionConfig) -> DbResult<OpenConnectionResult>;

    async fn close(&self, connection_id: String) -> DbResult<()>;

    async fn query(&self, request: QueryRequest) -> DbResult<QueryResult>;

    async fn list_databases(&self, connection_id: String) -> DbResult<Vec<DatabaseMeta>>;

    async fn list_schemas(&self, connection_id: String) -> DbResult<Vec<SchemaMeta>>;

    async fn list_tables(
        &self,
        connection_id: String,
        schema: Option<String>,
    ) -> DbResult<Vec<TableMeta>>;

    async fn list_columns(
        &self,
        connection_id: String,
        schema: Option<String>,
        table: String,
    ) -> DbResult<Vec<ColumnSchema>>;
}
