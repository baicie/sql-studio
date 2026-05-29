下面是 **Phase 3：Rust DB Core MVP 详细设计**。

Phase 0 搭工程，Phase 1 搭 Workbench，Phase 2 搭核心服务层。
Phase 3 开始进入真正业务主链路：

> **数据库连接层 + Tauri Command + 前端 DB Service + 基础查询闭环**

---

# Phase 3 总目标

这一阶段要完成：

```txt
1. Rust 侧定义统一 DB Core
2. 支持 SQLite / PostgreSQL / MySQL 的基础连接
3. 支持测试连接
4. 支持打开连接
5. 支持关闭连接
6. 支持执行 SQL
7. 支持查询结果统一序列化返回前端
8. 支持 list databases / schemas / tables / columns
9. 前端 dbService 可以调用 Rust DB Core
10. ConnectionService 接入真实 Tauri DB 命令
11. 能从 UI 创建连接并执行一条 SQL
```

MVP 结束时，你应该能做到：

```txt
1. 新建 SQLite 连接
2. 新建 PostgreSQL 连接
3. 新建 MySQL 连接
4. 测试连接成功/失败
5. 打开连接
6. 在临时 SQL 输入框执行 SELECT 1
7. 结果返回前端
8. Logs 面板能看到查询日志
9. StatusBar 显示当前连接
```

---

# 1. Phase 3 不做什么

先不要做这些：

```txt
1. 不做 Monaco SQL 编辑器深度集成
2. 不做复杂 ResultGrid
3. 不做 SSH Tunnel
4. 不做连接密码安全存储最终方案
5. 不做查询取消
6. 不做事务管理 UI
7. 不做数据编辑
8. 不做 Explain 可视化
9. 不做 SQL 自动补全
10. 不做大型结果集流式加载
```

Phase 3 的重点是：

> **把 DB Core 抽象打稳，不要急着做炫酷 UI。**

---

# 2. 总体架构

Phase 3 后结构：

```txt
React UI
  ↓
Frontend ConnectionService / DbService
  ↓
Tauri invoke
  ↓
apps/desktop/src-tauri/commands/db.rs
  ↓
sqlgui-db crate
  ↓
PoolManager
  ↓
SQLite / PostgreSQL / MySQL
```

整体链路：

```txt
ConnectionDialog 点击 Test
  ↓
frontend dbService.testConnection(config)
  ↓
invoke("db_test_connection", { config })
  ↓
Rust db_test_connection command
  ↓
DbManager.test_connection(config)
  ↓
对应 connector 测试连接
  ↓
返回 Ok / Error
  ↓
前端 Notification + Logs
```

---

# 3. Rust 目录设计

Phase 3 主要改这些：

```txt
crates/sqlgui-db/src/
├─ lib.rs
├─ error.rs
├─ types.rs
├─ manager.rs
├─ pool.rs
├─ connector.rs
├─ sqlite.rs
├─ postgres.rs
├─ mysql.rs
├─ schema.rs
└─ value.rs
```

Tauri 侧：

```txt
apps/desktop/src-tauri/src/
├─ state.rs
└─ commands/
   ├─ mod.rs
   ├─ system.rs
   └─ db.rs
```

前端侧：

```txt
apps/desktop/src/services/
├─ db/
│  ├─ dbService.ts
│  └─ types.ts
├─ connection/
│  ├─ ConnectionService.ts
│  └─ types.ts
```

UI 侧：

```txt
apps/desktop/src/workbench/views/
├─ ConnectionsView.tsx
└─ connection/
   ├─ ConnectionDialog.tsx
   ├─ ConnectionTree.tsx
   └─ ConnectionForm.tsx
```

---

# 4. Rust DB Core 类型设计

## 4.1 `types.rs`

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DbKind {
    SQLite,
    PostgreSQL,
    MySQL,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: Option<String>,
    pub name: String,
    pub kind: DbKind,

    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,

    pub file_path: Option<String>,

    pub ssl: Option<bool>,
    pub connect_timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenConnectionResult {
    pub connection_id: String,
    pub name: String,
    pub kind: DbKind,
    pub database: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryRequest {
    pub connection_id: String,
    pub sql: String,
    pub limit: Option<u32>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<ColumnMeta>,
    pub rows: Vec<Vec<CellValue>>,
    pub affected_rows: Option<u64>,
    pub elapsed_ms: u64,
    pub truncated: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMeta {
    pub name: String,
    pub database_type: String,
    pub nullable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub schema: Option<String>,
    pub name: String,
    pub table_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnSchema {
    pub schema: Option<String>,
    pub table: String,
    pub name: String,
    pub database_type: String,
    pub nullable: Option<bool>,
    pub primary_key: bool,
    pub default_value: Option<String>,
}
```

---

# 5. 错误模型设计

## 5.1 `error.rs`

DB 层不要直接把 sqlx 错误原样丢给前端。
要统一错误类型，方便 UI 展示。

```rust
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
```

Tauri command 最终统一转成 `String`：

```rust
.map_err(|err| err.to_string())
```

后续可以升级成结构化错误：

```ts
{
  code: 'CONNECTION_FAILED',
  message: '...',
  details: ...
}
```

---

# 6. PoolManager 设计

SQL GUI 会同时打开多个连接，所以必须有连接池管理。

## 6.1 `pool.rs`

```rust
use std::sync::Arc;

use dashmap::DashMap;
use sqlx::{MySqlPool, PgPool, SqlitePool};

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
    pub kind: crate::types::DbKind,
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
```

---

# 7. Connector Trait 设计

用 trait 抽象数据库能力。

## 7.1 `connector.rs`

```rust
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
```

---

# 8. DbManager 设计

`DbManager` 是外部唯一入口。
Tauri command 不直接碰具体 connector。

## 8.1 `manager.rs`

```rust
use uuid::Uuid;

use crate::connector::DbConnector;
use crate::error::{DbError, DbResult};
use crate::mysql::MySqlConnector;
use crate::postgres::PostgresConnector;
use crate::pool::PoolManager;
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
```

---

# 9. SQLite Connector

SQLite 最适合 Phase 3 第一个打通，因为不需要额外服务器。

## 9.1 `sqlite.rs`

```rust
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

        Ok(format!("sqlite://{}", file_path))
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

    async fn list_databases(&self, connection_id: String) -> DbResult<Vec<DatabaseMeta>> {
        let _pool = self.get_pool(&connection_id)?;

        Ok(vec![DatabaseMeta {
            name: "main".to_string(),
        }])
    }

    async fn list_schemas(&self, connection_id: String) -> DbResult<Vec<SchemaMeta>> {
        let _pool = self.get_pool(&connection_id)?;

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

        let sql = format!("PRAGMA table_info({})", quote_sqlite_ident(&table));

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

fn quote_sqlite_ident(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
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
            return CellValue::Bytes(base64::encode(value));
        }

        return CellValue::Null;
    }

    CellValue::Null
}
```

注意：这里用了 `base64`，需要加依赖：

```toml
base64 = "0.22"
```

加到 workspace dependencies 或 crate dependencies。

---

# 10. PostgreSQL Connector

## 10.1 `postgres.rs`

```rust
use std::time::Instant;

use async_trait::async_trait;
use sqlx::{Column, PgPool, Row, TypeInfo};
use sqlx::postgres::PgPoolOptions;

use crate::connector::DbConnector;
use crate::error::{DbError, DbResult};
use crate::pool::{AnyDbPool, ManagedConnection, PoolManager};
use crate::types::{
    CellValue, ColumnMeta, ColumnSchema, ConnectionConfig, DatabaseMeta,
    DbKind, OpenConnectionResult, QueryRequest, QueryResult, SchemaMeta,
    TableMeta,
};

#[derive(Clone)]
pub struct PostgresConnector {
    pool_manager: PoolManager,
}

impl PostgresConnector {
    pub fn new(pool_manager: PoolManager) -> Self {
        Self { pool_manager }
    }

    fn build_url(config: &ConnectionConfig) -> DbResult<String> {
        let host = config.host.as_deref().unwrap_or("localhost");
        let port = config.port.unwrap_or(5432);
        let username = config.username.as_deref().unwrap_or("postgres");
        let password = config.password.as_deref().unwrap_or("");
        let database = config.database.as_deref().unwrap_or("postgres");

        Ok(format!(
            "postgres://{}:{}@{}:{}/{}",
            urlencoding::encode(username),
            urlencoding::encode(password),
            host,
            port,
            database
        ))
    }

    fn get_pool(&self, connection_id: &str) -> DbResult<PgPool> {
        let connection = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| {
                DbError::ConnectionNotFound(connection_id.to_string())
            })?;

        match connection.pool {
            AnyDbPool::PostgreSQL(pool) => Ok(pool),
            _ => Err(DbError::InvalidConfig(
                "connection is not postgresql".to_string(),
            )),
        }
    }
}

#[async_trait]
impl DbConnector for PostgresConnector {
    async fn test_connection(&self, config: ConnectionConfig) -> DbResult<()> {
        let url = Self::build_url(&config)?;

        let pool = PgPoolOptions::new()
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

        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(&url)
            .await
            .map_err(|err| DbError::ConnectionFailed(err.to_string()))?;

        self.pool_manager.insert(ManagedConnection {
            id: connection_id.clone(),
            name: config.name.clone(),
            kind: DbKind::PostgreSQL,
            database: config.database.clone(),
            pool: AnyDbPool::PostgreSQL(pool),
        });

        Ok(OpenConnectionResult {
            connection_id,
            name: config.name,
            kind: DbKind::PostgreSQL,
            database: config.database,
        })
    }

    async fn close(&self, connection_id: String) -> DbResult<()> {
        if let Some(connection) = self.pool_manager.remove(&connection_id) {
            if let AnyDbPool::PostgreSQL(pool) = connection.pool {
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
                result_row.push(read_pg_cell(&row, index));
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

        let rows = sqlx::query(
            r#"
            SELECT datname
            FROM pg_database
            WHERE datistemplate = false
            ORDER BY datname
            "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| DatabaseMeta {
                name: row.try_get::<String, _>("datname").unwrap_or_default(),
            })
            .collect())
    }

    async fn list_schemas(&self, connection_id: String) -> DbResult<Vec<SchemaMeta>> {
        let pool = self.get_pool(&connection_id)?;

        let rows = sqlx::query(
            r#"
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schema_name
            "#,
        )
        .fetch_all(&pool)
        .await
        .map_err(|err| DbError::SchemaFailed(err.to_string()))?;

        Ok(rows
            .into_iter()
            .map(|row| SchemaMeta {
                name: row.try_get::<String, _>("schema_name").unwrap_or_default(),
            })
            .collect())
    }

    async fn list_tables(
        &self,
        connection_id: String,
        schema: Option<String>,
    ) -> DbResult<Vec<TableMeta>> {
        let pool = self.get_pool(&connection_id)?;
        let schema = schema.unwrap_or_else(|| "public".to_string());

        let rows = sqlx::query(
            r#"
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = $1
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
        let schema = schema.unwrap_or_else(|| "public".to_string());

        let rows = sqlx::query(
            r#"
            SELECT
                c.table_schema,
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                CASE WHEN kcu.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
            FROM information_schema.columns c
            LEFT JOIN information_schema.table_constraints tc
                ON tc.table_schema = c.table_schema
                AND tc.table_name = c.table_name
                AND tc.constraint_type = 'PRIMARY KEY'
            LEFT JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
                AND kcu.table_name = tc.table_name
                AND kcu.column_name = c.column_name
            WHERE c.table_schema = $1
              AND c.table_name = $2
            ORDER BY c.ordinal_position
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
                database_type: row.try_get::<String, _>("data_type").unwrap_or_default(),
                nullable: Some(
                    row.try_get::<String, _>("is_nullable")
                        .unwrap_or_default()
                        == "YES",
                ),
                primary_key: row.try_get::<bool, _>("is_primary_key").unwrap_or(false),
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

fn read_pg_cell(row: &sqlx::postgres::PgRow, index: usize) -> CellValue {
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

    if let Ok(value) = row.try_get::<Option<serde_json::Value>, _>(index) {
        return value.map(CellValue::Json).unwrap_or(CellValue::Null);
    }

    CellValue::Null
}
```

需要依赖：

```toml
urlencoding = "2"
```

---

# 11. MySQL Connector

MySQL 和 PostgreSQL 类似。MVP 先支持基础查询和表结构。

## 11.1 `mysql.rs`

```rust
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
            .map(|value| CellValue::Bytes(base64::encode(value)))
            .unwrap_or(CellValue::Null);
    }

    CellValue::Null
}
```

---

# 12. lib.rs 导出

`crates/sqlgui-db/src/lib.rs`

```rust
pub mod connector;
pub mod error;
pub mod manager;
pub mod mysql;
pub mod pool;
pub mod postgres;
pub mod sqlite;
pub mod types;

pub use manager::DbManager;
pub use types::*;
```

---

# 13. Cargo.toml 依赖

## 13.1 根 `Cargo.toml`

```toml
[workspace]
members = [
  "apps/desktop/src-tauri",
  "crates/sqlgui-common",
  "crates/sqlgui-db",
  "crates/sqlgui-extension",
  "crates/sqlgui-marketplace"
]
resolver = "2"

[workspace.package]
edition = "2021"
license = "MIT"

[workspace.dependencies]
anyhow = "1"
thiserror = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
dashmap = "6"
uuid = { version = "1", features = ["v4", "serde"] }
base64 = "0.22"
urlencoding = "2"

sqlx = { version = "0.8", features = [
  "runtime-tokio",
  "sqlite",
  "postgres",
  "mysql",
  "json",
  "chrono",
  "uuid"
] }
```

## 13.2 `crates/sqlgui-db/Cargo.toml`

```toml
[package]
name = "sqlgui-db"
version = "0.1.0"
edition.workspace = true
license.workspace = true

[dependencies]
anyhow.workspace = true
async-trait.workspace = true
base64.workspace = true
dashmap.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
thiserror.workspace = true
tokio.workspace = true
urlencoding.workspace = true
uuid.workspace = true
```

---

# 14. Tauri AppState 接入 DB

## 14.1 `state.rs`

```rust
use sqlgui_db::DbManager;

#[derive(Clone)]
pub struct AppState {
    pub app_name: String,
    pub db: DbManager,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            app_name: "sqlgui".to_string(),
            db: DbManager::new(),
        }
    }
}
```

---

# 15. Tauri DB Commands

## 15.1 `commands/mod.rs`

```rust
pub mod db;
pub mod system;
```

## 15.2 `commands/db.rs`

```rust
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
```

---

# 16. 注册 Commands

`apps/desktop/src-tauri/src/lib.rs`

```rust
mod commands;
mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::system::system_health_check,
            commands::db::db_test_connection,
            commands::db::db_open_connection,
            commands::db::db_close_connection,
            commands::db::db_execute_query,
            commands::db::db_list_databases,
            commands::db::db_list_schemas,
            commands::db::db_list_tables,
            commands::db::db_list_columns,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.open_devtools();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running sqlgui");
}
```

---

# 17. 前端类型设计

## 17.1 `services/db/types.ts`

```ts
export type DbKind = 'SQLite' | 'PostgreSQL' | 'MySQL';

export interface ConnectionConfig {
  id?: string;
  name: string;
  kind: DbKind;

  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;

  filePath?: string;

  ssl?: boolean;
  connectTimeoutMs?: number;
}

export interface OpenConnectionResult {
  connectionId: string;
  name: string;
  kind: DbKind;
  database?: string;
}

export interface QueryRequest {
  connectionId: string;
  sql: string;
  limit?: number;
  timeoutMs?: number;
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: CellValue[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
  message?: string;
}

export interface ColumnMeta {
  name: string;
  databaseType: string;
  nullable?: boolean;
}

export type CellValue =
  | { Null: null }
  | { Bool: boolean }
  | { I64: number }
  | { F64: number }
  | { String: string }
  | { Bytes: string }
  | { Json: unknown };

export interface DatabaseMeta {
  name: string;
}

export interface SchemaMeta {
  name: string;
}

export interface TableMeta {
  schema?: string;
  name: string;
  tableType: string;
}

export interface ColumnSchema {
  schema?: string;
  table: string;
  name: string;
  databaseType: string;
  nullable?: boolean;
  primaryKey: boolean;
  defaultValue?: string;
}
```

注意：Rust enum 默认序列化成：

```json
{ "String": "hello" }
```

如果你嫌前端处理麻烦，也可以把 `CellValue` 改成：

```rust
#[serde(tag = "type", content = "value")]
```

这样前端更舒服：

```json
{ "type": "string", "value": "hello" }
```

我更建议改成 tagged enum。

### 推荐改法

Rust：

```rust
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
```

前端：

```ts
export type CellValue =
  | { type: 'null' }
  | { type: 'bool'; value: boolean }
  | { type: 'i64'; value: number }
  | { type: 'f64'; value: number }
  | { type: 'string'; value: string }
  | { type: 'bytes'; value: string }
  | { type: 'json'; value: unknown };
```

这个更适合 UI 渲染。

---

# 18. 前端 dbService

## 18.1 `services/db/dbService.ts`

```ts
import { callNative } from '@/services/native/invoke';
import type {
  ColumnSchema,
  ConnectionConfig,
  DatabaseMeta,
  OpenConnectionResult,
  QueryRequest,
  QueryResult,
  SchemaMeta,
  TableMeta,
} from './types';

export class DbService {
  testConnection(config: ConnectionConfig): Promise<void> {
    return callNative<void>('db_test_connection', { config });
  }

  openConnection(config: ConnectionConfig): Promise<OpenConnectionResult> {
    return callNative<OpenConnectionResult>('db_open_connection', {
      config,
    });
  }

  closeConnection(connectionId: string): Promise<void> {
    return callNative<void>('db_close_connection', {
      connectionId,
    });
  }

  executeQuery(request: QueryRequest): Promise<QueryResult> {
    return callNative<QueryResult>('db_execute_query', {
      request,
    });
  }

  listDatabases(connectionId: string): Promise<DatabaseMeta[]> {
    return callNative<DatabaseMeta[]>('db_list_databases', {
      connectionId,
    });
  }

  listSchemas(connectionId: string): Promise<SchemaMeta[]> {
    return callNative<SchemaMeta[]>('db_list_schemas', {
      connectionId,
    });
  }

  listTables(connectionId: string, schema?: string): Promise<TableMeta[]> {
    return callNative<TableMeta[]>('db_list_tables', {
      connectionId,
      schema,
    });
  }

  listColumns(connectionId: string, table: string, schema?: string): Promise<ColumnSchema[]> {
    return callNative<ColumnSchema[]>('db_list_columns', {
      connectionId,
      schema,
      table,
    });
  }
}

export const dbService = new DbService();
```

---

# 19. 注册到 ServiceRegistry

`app/serviceRegistry.ts`

```ts
import { DbService } from '@/services/db/dbService';

export class ServiceRegistry {
  readonly storage = new StorageService(new LocalStorageProvider());
  readonly log = new LogService();
  readonly notification = new NotificationService();
  readonly command = new CommandService(this.log);
  readonly menu = new MenuService();
  readonly keybinding = new KeybindingService(this.command, this.log);
  readonly editor = new EditorService();
  readonly db = new DbService();
  readonly connection = new ConnectionService(this.db, this.notification, this.log, this.storage);
  readonly workbench = new WorkbenchService();
}
```

这意味着 `ConnectionService` 构造函数要升级。

---

# 20. ConnectionService 真实化

## 20.1 `services/connection/types.ts`

```ts
import type { ConnectionConfig, DbKind, OpenConnectionResult } from '@/services/db/types';

export interface ConnectionProfile {
  id: string;
  name: string;
  kind: DbKind;

  host?: string;
  port?: number;
  username?: string;
  database?: string;
  filePath?: string;

  // MVP 阶段可以先保存密码；正式版要改 keyring
  password?: string;
}

export interface ActiveConnection {
  id: string;
  name: string;
  kind: DbKind;
  database?: string;
}

export interface ConnectionTreeNode {
  id: string;
  label: string;
  kind: 'connection' | 'database' | 'schema' | 'table' | 'column';
  connectionId?: string;
  schema?: string;
  table?: string;
  children?: ConnectionTreeNode[];
  loading?: boolean;
}
```

---

## 20.2 `ConnectionService.ts`

```ts
import { Emitter } from '@/lib/event';
import type { DbService } from '@/services/db/dbService';
import type { NotificationService } from '@/services/notification/NotificationService';
import type { LogService } from '@/services/log/LogService';
import type { StorageService } from '@/services/storage/StorageService';
import type { ConnectionConfig, OpenConnectionResult } from '@/services/db/types';
import type { ActiveConnection, ConnectionProfile } from './types';

const STORAGE_KEY = 'connections.profiles';

export class ConnectionService {
  private profiles: ConnectionProfile[] = [];
  private activeConnection: ActiveConnection | undefined;

  private readonly onDidChangeProfilesEmitter = new Emitter<ConnectionProfile[]>();

  readonly onDidChangeProfiles = this.onDidChangeProfilesEmitter.event.bind(
    this.onDidChangeProfilesEmitter,
  );

  private readonly onDidChangeActiveConnectionEmitter = new Emitter<ActiveConnection | undefined>();

  readonly onDidChangeActiveConnection = this.onDidChangeActiveConnectionEmitter.event.bind(
    this.onDidChangeActiveConnectionEmitter,
  );

  constructor(
    private readonly db: DbService,
    private readonly notification: NotificationService,
    private readonly log: LogService,
    private readonly storage: StorageService,
  ) {}

  async loadProfiles() {
    const profiles = await this.storage.get<ConnectionProfile[]>(STORAGE_KEY, []);

    this.profiles = profiles ?? [];
    this.onDidChangeProfilesEmitter.fire(this.getProfiles());
  }

  getProfiles() {
    return [...this.profiles];
  }

  async saveProfile(profile: ConnectionProfile) {
    const index = this.profiles.findIndex((item) => item.id === profile.id);

    if (index >= 0) {
      this.profiles[index] = profile;
    } else {
      this.profiles.push(profile);
    }

    await this.storage.set(STORAGE_KEY, this.profiles);
    this.onDidChangeProfilesEmitter.fire(this.getProfiles());
  }

  async deleteProfile(id: string) {
    this.profiles = this.profiles.filter((item) => item.id !== id);
    await this.storage.set(STORAGE_KEY, this.profiles);
    this.onDidChangeProfilesEmitter.fire(this.getProfiles());
  }

  async testConnection(config: ConnectionConfig) {
    this.log.info('connection', `Testing connection: ${config.name}`);

    await this.db.testConnection(config);

    this.notification.success('Connection successful.');
  }

  async openConnection(config: ConnectionConfig): Promise<OpenConnectionResult> {
    this.log.info('connection', `Opening connection: ${config.name}`);

    const result = await this.db.openConnection(config);

    this.activeConnection = {
      id: result.connectionId,
      name: result.name,
      kind: result.kind,
      database: result.database,
    };

    this.onDidChangeActiveConnectionEmitter.fire(this.activeConnection);

    this.notification.success(`Connected: ${result.name}`);

    return result;
  }

  async closeConnection(connectionId: string) {
    await this.db.closeConnection(connectionId);

    if (this.activeConnection?.id === connectionId) {
      this.activeConnection = undefined;
      this.onDidChangeActiveConnectionEmitter.fire(undefined);
    }

    this.notification.info('Connection closed.');
  }

  getActiveConnection() {
    return this.activeConnection;
  }
}
```

在 app bootstrap 里加载 profiles：

```ts
export async function bootstrapApp() {
  if (bootstrapped) return;
  bootstrapped = true;

  registerCoreCommands(services);
  registerCoreMenus(services);
  registerCoreKeybindings(services);

  await services.connection.loadProfiles();

  services.log.info('app', 'Application bootstrapped.');
}
```

如果 `bootstrapApp` 改成 async，`App.tsx` 里：

```ts
bootstrapApp().catch(console.error);
```

---

# 21. 核心命令升级

`registerCoreCommands.ts` 里新增：

```ts
services.command.registerCommand({
  id: 'connection.testActive',
  title: 'Test Active Connection',
  category: 'Connection',
  source: 'core',
  handler: async () => {
    const active = services.connection.getActiveConnection();

    if (!active) {
      services.notification.warning('No active connection.');
      return;
    }

    services.notification.info(`Active connection: ${active.name}`);
  },
});

services.command.registerCommand({
  id: 'sql.executeRaw',
  title: 'Execute Raw SQL',
  category: 'SQL',
  source: 'core',
  handler: async (sql?: unknown) => {
    const active = services.connection.getActiveConnection();

    if (!active) {
      services.notification.warning('No active connection.');
      return;
    }

    const text = typeof sql === 'string' ? sql : 'SELECT 1';

    const result = await services.db.executeQuery({
      connectionId: active.id,
      sql: text,
      limit: 1000,
      timeoutMs: 30000,
    });

    services.log.info('sql', `Query finished: ${result.rows.length} rows, ${result.elapsedMs}ms`);

    services.notification.success(`Query finished: ${result.rows.length} rows.`);

    // Phase 3 可先放到 Log；Phase 4/6 再进 ResultStore
    console.table(result.rows);
  },
});
```

后续 Phase 4/6 会有真正的 `ResultService` 和 `ResultGrid`。

---

# 22. ConnectionDialog UI

Phase 3 需要一个最小连接弹窗。

## 22.1 Store

```ts
// workbench/views/connection/connectionDialogStore.ts

import { create } from 'zustand';

interface ConnectionDialogStore {
  open: boolean;
  openDialog: () => void;
  closeDialog: () => void;
}

export const useConnectionDialogStore = create<ConnectionDialogStore>((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false }),
}));
```

`connection.new` 命令改成：

```ts
handler: () => {
  useConnectionDialogStore.getState().openDialog();
};
```

---

## 22.2 `ConnectionDialog.tsx`

这里先不用 shadcn Dialog 也行，但如果已经接 shadcn，可以用它。下面给普通版：

```tsx
import { useState } from 'react';
import { services } from '@/app/serviceRegistry';
import type { ConnectionConfig, DbKind } from '@/services/db/types';
import { useConnectionDialogStore } from './connectionDialogStore';

export function ConnectionDialog() {
  const open = useConnectionDialogStore((state) => state.open);
  const closeDialog = useConnectionDialogStore((state) => state.closeDialog);

  const [kind, setKind] = useState<DbKind>('SQLite');
  const [name, setName] = useState('Local SQLite');
  const [filePath, setFilePath] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function buildConfig(): ConnectionConfig {
    return {
      id: crypto.randomUUID(),
      name,
      kind,
      filePath: kind === 'SQLite' ? filePath : undefined,
      host: kind !== 'SQLite' ? host : undefined,
      port: kind !== 'SQLite' ? port : undefined,
      username: kind !== 'SQLite' ? username : undefined,
      password: kind !== 'SQLite' ? password : undefined,
      database: kind !== 'SQLite' ? database : undefined,
      connectTimeoutMs: 10000,
    };
  }

  async function testConnection() {
    setLoading(true);

    try {
      await services.connection.testConnection(buildConfig());
    } catch (error) {
      services.notification.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveAndOpen() {
    setLoading(true);

    try {
      const config = buildConfig();

      await services.connection.saveProfile({
        id: config.id!,
        name: config.name,
        kind: config.kind,
        filePath: config.filePath,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
      });

      await services.connection.openConnection(config);

      closeDialog();
    } catch (error) {
      services.notification.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50">
      <div className="w-[520px] rounded-lg border bg-popover p-4 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">New Connection</h2>
          <p className="text-sm text-muted-foreground">Create and test a database connection.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Type</span>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5"
              value={kind}
              onChange={(event) => {
                const nextKind = event.target.value as DbKind;
                setKind(nextKind);

                if (nextKind === 'SQLite') {
                  setName('Local SQLite');
                }

                if (nextKind === 'PostgreSQL') {
                  setName('PostgreSQL');
                  setPort(5432);
                }

                if (nextKind === 'MySQL') {
                  setName('MySQL');
                  setPort(3306);
                }
              }}
            >
              <option value="SQLite">SQLite</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="MySQL">MySQL</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Name</span>
            <input
              className="w-full rounded-md border bg-background px-2 py-1.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {kind === 'SQLite' ? (
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">File Path</span>
              <input
                className="w-full rounded-md border bg-background px-2 py-1.5"
                value={filePath}
                placeholder="/path/to/database.sqlite"
                onChange={(event) => setFilePath(event.target.value)}
              />
            </label>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_100px] gap-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Host</span>
                  <input
                    className="w-full rounded-md border bg-background px-2 py-1.5"
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Port</span>
                  <input
                    className="w-full rounded-md border bg-background px-2 py-1.5"
                    type="number"
                    value={port}
                    onChange={(event) => setPort(Number(event.target.value))}
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Username</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Password</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Database</span>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1.5"
                  value={database}
                  onChange={(event) => setDatabase(event.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={closeDialog}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={testConnection}
            disabled={loading}
          >
            Test
          </button>

          <button
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            onClick={saveAndOpen}
            disabled={loading}
          >
            Save & Open
          </button>
        </div>
      </div>
    </div>
  );
}
```

在 Workbench 中挂载：

```tsx
<ConnectionDialog />
```

---

# 23. ConnectionsView 接入真实 profiles

```tsx
import { useEffect, useState } from 'react';
import { Plus, Database } from 'lucide-react';
import { services } from '@/app/serviceRegistry';
import type { ConnectionProfile } from '@/services/connection/types';

export function ConnectionsView() {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>(services.connection.getProfiles());

  useEffect(() => {
    const disposable = services.connection.onDidChangeProfiles(setProfiles);
    return () => disposable.dispose();
  }, []);

  async function openProfile(profile: ConnectionProfile) {
    try {
      await services.connection.openConnection({
        id: profile.id,
        name: profile.name,
        kind: profile.kind,
        host: profile.host,
        port: profile.port,
        username: profile.username,
        password: profile.password,
        database: profile.database,
        filePath: profile.filePath,
      });
    } catch (error) {
      services.notification.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Connections
        </span>

        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="New connection"
          onClick={() => services.command.executeCommand('connection.new')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {profiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No connections yet.
        </div>
      ) : (
        <div className="p-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onDoubleClick={() => openProfile(profile)}
            >
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{profile.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
```

---

# 24. 临时 SQL 执行 UI

Phase 3 可以先在 `EditorArea` 的 query 占位里放 textarea，不接 Monaco。

```tsx
import { useState } from 'react';
import { services } from '@/app/serviceRegistry';

function QueryEditorPlaceholder() {
  const [sql, setSql] = useState('SELECT 1');
  const [result, setResult] = useState<string>('');

  async function execute() {
    const active = services.connection.getActiveConnection();

    if (!active) {
      services.notification.warning('No active connection.');
      return;
    }

    try {
      const queryResult = await services.db.executeQuery({
        connectionId: active.id,
        sql,
        limit: 1000,
      });

      setResult(JSON.stringify(queryResult, null, 2));

      services.log.info(
        'sql',
        `Query success: ${queryResult.rows.length} rows, ${queryResult.elapsedMs}ms`,
      );
    } catch (error) {
      services.notification.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="grid h-full grid-rows-[1fr_auto_1fr] gap-2 p-3">
      <textarea
        className="w-full resize-none rounded-md border bg-background p-2 font-mono text-sm"
        value={sql}
        onChange={(event) => setSql(event.target.value)}
      />

      <div>
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          onClick={execute}
        >
          Execute
        </button>
      </div>

      <pre className="overflow-auto rounded-md border bg-muted/30 p-2 text-xs">
        {result || 'Result will be here.'}
      </pre>
    </div>
  );
}
```

在 `EditorArea.tsx` 中替换：

```tsx
{
  activeTab?.kind === 'query' ? <QueryEditorPlaceholder /> : null;
}
```

---

# 25. 安全策略 MVP

Phase 3 先做基础保护。

## 25.1 默认加 limit

Rust 侧已经给 SELECT 加了 `LIMIT 1000`。

问题：这只是简单字符串判断，后续必须升级为 SQL parser 或更谨慎策略。

## 25.2 写操作确认

Phase 3 可先在前端做简单判断：

```ts
export function isDangerousSql(sql: string) {
  const lower = sql.trim().toLowerCase();

  return ['insert ', 'update ', 'delete ', 'drop ', 'alter ', 'truncate ', 'create '].some(
    (prefix) => lower.startsWith(prefix),
  );
}
```

执行前：

```ts
if (isDangerousSql(sql)) {
  const confirmed = window.confirm('This SQL may modify database. Continue?');

  if (!confirmed) return;
}
```

后续应该放到 Rust 侧 + Plugin Permission Broker。

---

# 26. 密码存储策略

Phase 3 可以先做 MVP，但要在代码里留接口。

## 当前 MVP

```txt
连接 profile 暂时保存 password
```

但要明确标记：

```ts
// TODO: replace with OS keyring before public release
password?: string
```

## 后续正式方案

```txt
ConnectionProfile 只保存 passwordRef
密码存 OS keyring
Rust SecretManager 负责读写
前端永远拿不到明文密码
```

未来类型应该变成：

```ts
export interface ConnectionProfile {
  id: string;
  name: string;
  kind: DbKind;
  passwordRef?: string;
}
```

---

# 27. Phase 3 验收标准

```txt
Rust
[ ] cargo check --workspace 通过
[ ] sqlgui-db 编译通过
[ ] DbManager 可创建
[ ] SQLite test_connection 通过
[ ] SQLite open/query/list_tables/list_columns 通过
[ ] PostgreSQL test/open/query 通过
[ ] MySQL test/open/query 通过
[ ] Tauri command 注册成功

前端
[ ] DbService 类型完整
[ ] ConnectionService 调用真实 dbService
[ ] ConnectionDialog 可以新建连接
[ ] Test Connection 正常
[ ] Save & Open 正常
[ ] StatusBar 显示当前连接
[ ] ConnectionsView 展示 profiles
[ ] Query Tab 可执行 SELECT 1
[ ] Notification 显示成功/失败
[ ] Logs 面板记录连接和查询日志
```

---

# 28. Phase 3 Todo 清单

```txt
Rust 类型
[ ] 完善 sqlgui-db/types.rs
[ ] 定义 DbKind
[ ] 定义 ConnectionConfig
[ ] 定义 QueryRequest
[ ] 定义 QueryResult
[ ] 定义 CellValue
[ ] 定义 SchemaMeta/TableMeta/ColumnSchema

Rust 错误
[ ] 新增 error.rs
[ ] 定义 DbError
[ ] 实现 From<sqlx::Error>
[ ] Tauri command 统一 map_err

Pool
[ ] 新增 pool.rs
[ ] 定义 AnyDbPool
[ ] 定义 ManagedConnection
[ ] 实现 PoolManager

Connector
[ ] 新增 connector.rs
[ ] 定义 DbConnector trait

DbManager
[ ] 新增 manager.rs
[ ] 实现 test_connection
[ ] 实现 open
[ ] 实现 close
[ ] 实现 query
[ ] 实现 list_databases
[ ] 实现 list_schemas
[ ] 实现 list_tables
[ ] 实现 list_columns

SQLite
[ ] 实现 build_url
[ ] 实现 test_connection
[ ] 实现 open
[ ] 实现 query
[ ] 实现 list_tables
[ ] 实现 list_columns

PostgreSQL
[ ] 实现 build_url
[ ] 实现 test_connection
[ ] 实现 open
[ ] 实现 query
[ ] 实现 list_databases
[ ] 实现 list_schemas
[ ] 实现 list_tables
[ ] 实现 list_columns

MySQL
[ ] 实现 build_url
[ ] 实现 test_connection
[ ] 实现 open
[ ] 实现 query
[ ] 实现 list_databases
[ ] 实现 list_tables
[ ] 实现 list_columns

Tauri
[ ] AppState 加 DbManager
[ ] 新增 commands/db.rs
[ ] 注册 db_test_connection
[ ] 注册 db_open_connection
[ ] 注册 db_close_connection
[ ] 注册 db_execute_query
[ ] 注册 db_list_databases
[ ] 注册 db_list_schemas
[ ] 注册 db_list_tables
[ ] 注册 db_list_columns

前端类型
[ ] 新增 services/db/types.ts
[ ] 新增 DbKind
[ ] 新增 ConnectionConfig
[ ] 新增 QueryResult
[ ] 新增 SchemaMeta/TableMeta/ColumnSchema

前端服务
[ ] 新增 DbService
[ ] ServiceRegistry 注册 db
[ ] ConnectionService 接入 db
[ ] ConnectionService 实现 load/save profiles
[ ] ConnectionService 实现 testConnection
[ ] ConnectionService 实现 openConnection
[ ] ConnectionService 实现 closeConnection

UI
[ ] 新增 ConnectionDialog
[ ] connection.new 打开弹窗
[ ] ConnectionsView 展示 profiles
[ ] 双击 profile 打开连接
[ ] StatusBar 展示 active connection
[ ] Query Tab 临时 textarea
[ ] Execute 调用 services.db.executeQuery
[ ] 结果临时 JSON 展示

验证
[ ] SQLite 文件连接
[ ] PostgreSQL 本地连接
[ ] MySQL 本地连接
[ ] SELECT 1 查询
[ ] list_tables 查询
```

---

# 29. 推荐开发顺序

最稳顺序：

```txt
1. 先实现 Rust types/error/pool/manager 空壳
2. 只实现 SQLite connector
3. Tauri command 打通 SQLite test/open/query
4. 前端 dbService 调用 SQLite
5. ConnectionDialog 创建 SQLite 连接
6. Query Tab 执行 SELECT 1
7. 再补 PostgreSQL
8. 再补 MySQL
9. 最后补 list_tables/list_columns
```

不要三个数据库一起写。
先 SQLite 走通闭环：

```txt
SQLite test → open → query → return result → UI 展示
```

闭环通了，Postgres/MySQL 只是 connector 扩展。

---

# 30. Phase 3 最终效果

完成后，SQL GUI 已经不是空壳了，而是：

```txt
可以创建连接
可以测试连接
可以打开连接
可以执行 SQL
可以返回结果
可以查看基础 schema
```

这时项目正式进入“能用”的阶段。

Phase 4 就可以继续做：

> **连接树增强 + Schema Explorer + 表右键菜单 + 生成 SQL + 连接配置管理体验**

也就是把 Phase 3 的底层能力做成真正舒服的数据库浏览体验。
