use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum DbKind {
    SQLite,
    PostgreSQL,
    MySQL,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    #[serde(default)]
    pub id: Option<String>,
    pub name: String,
    pub kind: DbKind,

    #[serde(default)]
    pub host: Option<String>,
    #[serde(default)]
    pub port: Option<u16>,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub database: Option<String>,

    #[serde(rename = "filePath", default)]
    pub file_path: Option<String>,

    #[serde(default)]
    pub ssl: Option<bool>,
    #[serde(rename = "connectTimeoutMs", default)]
    pub connect_timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenConnectionResult {
    #[serde(rename = "connectionId")]
    pub connection_id: String,
    pub name: String,
    pub kind: DbKind,
    #[serde(default)]
    pub database: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryRequest {
    #[serde(rename = "connectionId")]
    pub connection_id: String,
    pub sql: String,
    #[serde(default)]
    pub limit: Option<u32>,
    #[serde(rename = "timeoutMs", default)]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<CellValue>>,
    #[serde(rename = "affectedRows", default)]
    pub affected_rows: Option<u64>,
    #[serde(rename = "elapsedMs")]
    pub elapsed_ms: u64,
    pub truncated: bool,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMeta {
    pub name: String,
    #[serde(rename = "databaseType")]
    pub database_type: String,
    #[serde(default)]
    pub nullable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "camelCase")]
pub enum CellValue {
    Null,
    Bool(bool),
    I64(i64),
    F64(f64),
    String(String),
    Bytes(String),
    Json(serde_json::Value),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseMeta {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaMeta {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableMeta {
    #[serde(default)]
    pub schema: Option<String>,
    pub name: String,
    #[serde(rename = "tableType")]
    pub table_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnSchema {
    #[serde(default)]
    pub schema: Option<String>,
    pub table: String,
    pub name: String,
    #[serde(rename = "databaseType")]
    pub database_type: String,
    #[serde(default)]
    pub nullable: Option<bool>,
    #[serde(rename = "primaryKey")]
    pub primary_key: bool,
    #[serde(rename = "defaultValue", default)]
    pub default_value: Option<String>,
}
