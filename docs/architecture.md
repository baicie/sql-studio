# SQL GUI Architecture

## Overview

SQL GUI is a cross-platform database client with a VS Code–style extension system.

## Layers

| Layer         | Location              | Responsibility                   |
| ------------- | --------------------- | -------------------------------- |
| Desktop shell | `apps/desktop`        | Tauri + React workbench          |
| Shared UI     | `packages/ui`         | shadcn/ui wrappers (Phase 1+)    |
| Plugin API    | `packages/sqlgui-api` | Extension host contract          |
| Plugin SDK    | `packages/sqlgui-sdk` | Extension authoring helpers      |
| DB core       | `crates/sqlgui-db`    | Connection & query engine (Rust) |
| Extensions    | `extensions/*`        | Third-party plugins              |

## Phase 0 Status

Phase 0 establishes the monorepo skeleton: pnpm workspace, Cargo workspace, empty Workbench, and health-check Tauri command.
