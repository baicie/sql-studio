pub mod connector;
pub mod error;
pub mod manager;
pub mod mysql;
pub mod pool;
pub mod postgres;
pub mod sqlite;
pub mod types;

pub use error::{DbError, DbResult};
pub use manager::DbManager;
pub use types::*;

pub fn db_core_ready() -> bool {
    true
}
