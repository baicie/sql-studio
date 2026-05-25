use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("invalid connection config: {0}")]
    InvalidConfig(String),

    #[error("connection not found: {0}")]
    ConnectionNotFound(String),

    #[error("connection failed: {0}")]
    ConnectionFailed(String),

    #[error("query failed: {0}")]
    QueryFailed(String),

    #[error("schema introspection failed: {0}")]
    SchemaFailed(String),

    #[error("unsupported database kind")]
    UnsupportedDatabase,

    #[error("operation timeout")]
    Timeout,

    #[error("internal error: {0}")]
    Internal(String),
}

pub type DbResult<T> = Result<T, DbError>;

impl From<sqlx::Error> for DbError {
    fn from(error: sqlx::Error) -> Self {
        DbError::QueryFailed(error.to_string())
    }
}

impl From<anyhow::Error> for DbError {
    fn from(error: anyhow::Error) -> Self {
        DbError::Internal(error.to_string())
    }
}
