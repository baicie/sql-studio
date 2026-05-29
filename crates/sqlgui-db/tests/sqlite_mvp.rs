use sqlgui_db::{types::*, ConnectionConfig, DbManager, QueryRequest};
use tempfile::NamedTempFile;

#[tokio::test]
async fn sqlite_open_insert_query() -> anyhow::Result<()> {
    let file = NamedTempFile::new()?;
    let path = file.path().to_string_lossy().to_string();

    let manager = DbManager::new();

    let result = manager
        .open(ConnectionConfig {
            id: Some("test-sqlite".into()),
            name: "Test SQLite".into(),
            kind: DbKind::SQLite,
            file_path: Some(path),
            host: None,
            port: None,
            username: None,
            password: None,
            database: None,
            ssl: None,
            connect_timeout_ms: None,
        })
        .await?;

    assert_eq!(result.connection_id, "test-sqlite");

    let cid = &result.connection_id;

    let create_result = manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT)".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: Some(false),
        })
        .await?;

    // DDL statements (CREATE TABLE) return None for affected_rows in SQLite
    assert!(create_result.affected_rows.is_none() || create_result.affected_rows == Some(0));
    assert!(create_result.columns.is_empty());

    let insert_result = manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "INSERT INTO users(name) VALUES ('alice')".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: Some(false),
        })
        .await?;

    assert_eq!(insert_result.affected_rows, Some(1));

    manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "INSERT INTO users(name) VALUES ('bob')".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: Some(false),
        })
        .await?;

    let query_result = manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "SELECT id, name FROM users ORDER BY id".into(),
            limit: Some(100),
            timeout_ms: Some(30_000),
            readonly: Some(true),
        })
        .await?;

    assert_eq!(query_result.columns.len(), 2);
    assert_eq!(query_result.columns[0].name, "id");
    assert_eq!(query_result.columns[1].name, "name");
    assert_eq!(query_result.rows.len(), 2);

    manager.close(cid.clone()).await?;

    Ok(())
}

#[tokio::test]
async fn sqlite_in_memory() -> anyhow::Result<()> {
    let manager = DbManager::new();

    let result = manager
        .open(ConnectionConfig {
            id: Some("mem-test".into()),
            name: "Memory SQLite".into(),
            kind: DbKind::SQLite,
            file_path: Some(":memory:".into()),
            host: None,
            port: None,
            username: None,
            password: None,
            database: None,
            ssl: None,
            connect_timeout_ms: None,
        })
        .await?;

    let cid = &result.connection_id;

    manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "CREATE TABLE test(id INTEGER)".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: Some(false),
        })
        .await?;

    manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "INSERT INTO test VALUES (42)".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: Some(false),
        })
        .await?;

    let result = manager
        .query(QueryRequest {
            connection_id: cid.clone(),
            sql: "SELECT * FROM test".into(),
            limit: Some(10),
            timeout_ms: Some(30_000),
            readonly: Some(true),
        })
        .await?;

    assert_eq!(result.rows.len(), 1);
    match &result.rows[0][0] {
        CellValue::I64(v) => assert_eq!(*v, 42),
        other => panic!("expected I64(42), got {:?}", other),
    }

    manager.close(cid.clone()).await?;

    Ok(())
}
