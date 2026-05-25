use std::sync::Arc;

use dashmap::DashMap;
use sqlx::{MySqlPool, PgPool, SqlitePool};

use crate::types::DbKind;

#[derive(Clone)]
pub enum AnyDbPool {
    SQLite(SqlitePool),
    PostgreSQL(PgPool),
    MySQL(MySqlPool),
}

#[derive(Clone)]
pub struct ManagedConnection {
    pub id: String,
    pub name: String,
    pub kind: DbKind,
    pub database: Option<String>,
    pub pool: AnyDbPool,
}

#[derive(Clone)]
pub struct PoolManager {
    pools: Arc<DashMap<String, ManagedConnection>>,
}

impl PoolManager {
    pub fn new() -> Self {
        Self {
            pools: Arc::new(DashMap::new()),
        }
    }

    pub fn insert(&self, connection: ManagedConnection) {
        self.pools.insert(connection.id.clone(), connection);
    }

    pub fn get(&self, connection_id: &str) -> Option<ManagedConnection> {
        self.pools.get(connection_id).map(|item| item.clone())
    }

    pub fn remove(&self, connection_id: &str) -> Option<ManagedConnection> {
        self.pools.remove(connection_id).map(|(_, value)| value)
    }

    pub fn list(&self) -> Vec<ManagedConnection> {
        self.pools.iter().map(|item| item.clone()).collect()
    }

    pub fn contains(&self, connection_id: &str) -> bool {
        self.pools.contains_key(connection_id)
    }
}
