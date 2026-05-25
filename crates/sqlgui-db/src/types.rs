use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DbKind {
    SQLite,
    PostgreSQL,
    MySQL,
}
