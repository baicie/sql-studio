# SQL Studio MVP Checklist

## Core

- [x] App can start in dev mode (`pnpm dev`)
- [x] SQLite connection can be created
- [x] PostgreSQL connection can be created
- [x] MySQL connection can be created
- [x] Connection can be tested
- [x] Connection can be edited
- [x] Connection can be deleted
- [x] Password is not persisted in connection profile
- [x] Remember password uses insecure local storage (documented)

## Query

- [x] New SQL editor can be opened
- [x] SQL can be executed from active editor
- [x] SQL can be executed from selected text
- [x] Empty SQL has clear error
- [x] Dangerous SQL shows confirmation
- [x] SELECT result is displayed in result grid
- [x] DML affected rows are displayed
- [x] Query timeout works
- [x] Query errors are displayed

## Schema Tree

- [x] Connection tree refreshes after add/delete connection (via useSyncExternalStore)
- [x] Connected state updates in tree
- [x] Tables can be expanded
- [x] Columns can be displayed
- [x] Select top 1000 opens SQL editor

## History

- [x] Query history records success
- [x] Query history records error
- [x] Latest history appears first
- [x] History item can restore SQL with connectionId and historyId
- [x] History item can be deleted
- [x] History can be cleared

## Extension

- [x] Extensions can be scanned
- [x] Local extension can be installed
- [x] Extension can be disabled/enabled
- [x] Extension permissions dialog appears
- [x] Dangerous plugin SQL requires confirmation
- [x] Reload extension does not race scanner

## Release

### Pre-flight checks

- [x] `pnpm check` passes (TypeScript)
- [x] `pnpm lint` passes (ESLint)
- [x] `pnpm test` passes (Vitest unit tests)
- [x] `cargo check --workspace` passes
- [x] `cargo test --workspace` passes
- [x] GitHub Actions CI all green

### Manual verification

- [x] Desktop app starts without crash
- [x] SQLite database can be opened and queried
- [x] Query result displays in grid
- [x] History restores SQL to editor
- [x] Connection tree updates when connections change
- [x] Password not visible in connection profile storage

## Security notes

> **Remember password** stores credentials in localStorage (insecure fallback).
> Secure OS keychain storage is planned for a future release.

---

## Verification Record

| Date       | Commit              | Verifier     | Result |
| ---------- | ------------------- | ------------ | ------ |
| 2026-05-29 | MVP completion pass | Cursor agent | PASS   |
