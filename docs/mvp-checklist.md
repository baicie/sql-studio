# SQL Studio MVP Checklist

## Core

- [ ] App can start in dev mode (`pnpm dev`)
- [ ] SQLite connection can be created
- [ ] PostgreSQL connection can be created
- [ ] MySQL connection can be created
- [ ] Connection can be tested
- [ ] Connection can be edited
- [ ] Connection can be deleted
- [ ] Password is not persisted in connection profile
- [ ] Remember password uses insecure local storage (documented)

## Query

- [ ] New SQL editor can be opened
- [ ] SQL can be executed from active editor
- [ ] SQL can be executed from selected text
- [ ] Empty SQL has clear error
- [ ] Dangerous SQL shows confirmation
- [ ] SELECT result is displayed in result grid
- [ ] DML affected rows are displayed
- [ ] Query timeout works
- [ ] Query errors are displayed

## Schema Tree

- [ ] Connection tree refreshes after add/delete connection (via useSyncExternalStore)
- [ ] Connected state updates in tree
- [ ] Tables can be expanded
- [ ] Columns can be displayed
- [ ] Select top 1000 opens SQL editor

## History

- [ ] Query history records success
- [ ] Query history records error
- [ ] Latest history appears first
- [ ] History item can restore SQL with connectionId and historyId
- [ ] History item can be deleted
- [ ] History can be cleared

## Extension

- [ ] Extensions can be scanned
- [ ] Local extension can be installed
- [ ] Extension can be disabled/enabled
- [ ] Extension permissions dialog appears
- [ ] Dangerous plugin SQL requires confirmation
- [ ] Reload extension does not race scanner

## Release

### Pre-flight checks

- [ ] `pnpm check` passes (TypeScript)
- [ ] `pnpm lint` passes (ESLint)
- [ ] `pnpm test` passes (Vitest unit tests)
- [ ] `cargo check --workspace` passes
- [ ] `cargo test --workspace` passes
- [ ] GitHub Actions CI all green

### Manual verification

- [ ] Desktop app starts without crash
- [ ] SQLite database can be opened and queried
- [ ] Query result displays in grid
- [ ] History restores SQL to editor
- [ ] Connection tree updates when connections change
- [ ] Password not visible in connection profile storage

## Security notes

> **Remember password** stores credentials in localStorage (insecure fallback).
> Secure OS keychain storage is planned for a future release.
