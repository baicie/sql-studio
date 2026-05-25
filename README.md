# SQL GUI

A lightweight, extensible SQL GUI built with Tauri 2, React, shadcn/ui and Rust.

## Tech Stack

- Tauri 2
- React
- TypeScript
- shadcn/ui
- Rust
- sqlx
- i18n
- Plugin System

## Development

```bash
pnpm install
pnpm dev
```

## Workspace

```txt
apps/desktop        Desktop app
packages/ui         Shared UI
packages/sqlgui-api Plugin API
packages/sqlgui-sdk Plugin SDK
crates/sqlgui-db    Rust DB Core
extensions/*        Extensions
```
