use tauri::State;

use sqlgui_db::{
    ColumnSchema, ConnectionConfig, DatabaseMeta, OpenConnectionResult,
    QueryRequest, QueryResult, SchemaMeta, TableMeta,
};

use crate::state::AppState;

#[tauri::command]
pub async fn db_test_connection(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> Result<(), String> {
    state
        .db
        .test_connection(config)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_open_connection(
    state: State<'_, AppState>,
    config: ConnectionConfig,
) -> Result<OpenConnectionResult, String> {
    state
        .db
        .open(config)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_close_connection(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<(), String> {
    state
        .db
        .close(connection_id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_execute_query(
    state: State<'_, AppState>,
    request: QueryRequest,
) -> Result<QueryResult, String> {
    state
        .db
        .query(request)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_databases(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<DatabaseMeta>, String> {
    state
        .db
        .list_databases(connection_id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_schemas(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<SchemaMeta>, String> {
    state
        .db
        .list_schemas(connection_id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_tables(
    state: State<'_, AppState>,
    connection_id: String,
    schema: Option<String>,
) -> Result<Vec<TableMeta>, String> {
    state
        .db
        .list_tables(connection_id, schema)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_columns(
    state: State<'_, AppState>,
    connection_id: String,
    schema: Option<String>,
    table: String,
) -> Result<Vec<ColumnSchema>, String> {
    state
        .db
        .list_columns(connection_id, schema, table)
        .await
        .map_err(|err| err.to_string())
}
