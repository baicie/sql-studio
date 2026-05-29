下面是 **Phase 0：项目初始化** 的详细设计。目标是把 `template-repo/full-monorepo` 改造成 SQL GUI 的基础工程骨架。

你这个模板里 `full-monorepo` 已经有根 `dev/build/lint/postinstall` 脚本，适合直接作为起点；`pnpm-workspace.yaml` 当前包含 `apps/*` 和 `packages/*`；`apps/desktop` 已经是 Tauri + React + TypeScript，并且有 `tauri:dev`、`tauri:build` 脚本；Rust 侧也已经用了 Tauri 2、serde、tauri-plugin-shell。

---

# Phase 0 目标

Phase 0 不写业务功能，只做一件事：

> **把 SQL GUI 的工程骨架搭好，并确保前端、Tauri、Rust workspace、插件目录都能正常启动和编译。**

完成后应该具备：

```txt
1. pnpm install 正常
2. Tauri Desktop 能启动
3. React 应用能显示空 Workbench
4. Rust workspace 能 cargo check
5. packages/* 能被 workspace 引用
6. crates/* 已经预留
7. extensions/* 已经预留
8. 项目命名统一为 sqlgui
```

---

# 1. 初始化方式

## 1.1 从模板复制

```bash
cp -r template-repo/full-monorepo sqlgui
cd sqlgui
```

如果你是从 GitHub 拉：

```bash
git clone https://github.com/baicie/template-repo.git
cp -r template-repo/full-monorepo sqlgui
cd sqlgui
rm -rf .git
git init
```

---

# 2. 目标目录结构

Phase 0 完成后目录建议是：

```txt
sqlgui/
├─ apps/
│  ├─ desktop/                  # Tauri2 + React 主应用
│  ├─ web/                      # 插件市场官网，Phase 0 保留占坑
│  └─ backend/                  # 插件市场服务端，Phase 0 保留占坑
│
├─ packages/
│  ├─ ui/                       # shadcn/ui 二次封装
│  ├─ utils/                    # 通用 TS 工具
│  ├─ i18n/                     # 多语言资源
│  ├─ sqlgui-api/               # 插件 API 类型
│  ├─ sqlgui-sdk/               # 插件开发 SDK
│  └─ extension-schema/         # 插件 manifest schema
│
├─ crates/
│  ├─ sqlgui-common/            # Rust 公共类型
│  ├─ sqlgui-db/                # Rust DB Core
│  ├─ sqlgui-extension/         # 插件安装/权限/manifest
│  └─ sqlgui-marketplace/       # 插件市场 client
│
├─ extensions/
│  └─ sql-formatter-demo/       # 第一个插件 demo，占坑
│
├─ docs/
│  ├─ architecture.md
│  ├─ roadmap.md
│  └─ plugin-system.md
│
├─ package.json
├─ pnpm-workspace.yaml
├─ Cargo.toml
├─ AGENTS.md
└─ README.md
```

注意：
`apps/web` 和 `apps/backend` 可以暂时不开发，但建议保留。因为你这个项目重点有“插件市场”，以后市场前台和 API 会用到。

---

# 3. 命名规范

建议统一用：

```txt
项目名：sqlgui
桌面应用包名：@sqlgui/desktop
UI 包：@sqlgui/ui
工具包：@sqlgui/utils
插件 API：@sqlgui/api
插件 SDK：@sqlgui/sdk
Rust DB crate：sqlgui-db
Rust extension crate：sqlgui-extension
```

不要继续用模板默认的：

```txt
desktop-app
@repo/ui
@repo/utils
full-monorepo
```

否则后面包名会越来越乱。

---

# 4. 文件修改设计

## 4.1 根目录 `package.json`

模板根 package 已经有 `dev/build/lint/postinstall`，可以保留，但建议改成更适合 SQL GUI 的脚本。

### 修改前核心问题

模板里 root `package.json` 的脚本是：

```json
{
  "dev": "pnpm -r --parallel dev",
  "build": "pnpm -r build",
  "lint": "pnpm -r lint"
}
```

它适合批量跑所有包，但 SQL GUI 里桌面应用是主入口，最好加几个明确命令。

### 建议修改为

```json
{
  "name": "sqlgui",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter @sqlgui/desktop tauri:dev",
    "dev:desktop": "pnpm --filter @sqlgui/desktop tauri:dev",
    "build": "pnpm -r build && cargo build --workspace",
    "build:desktop": "pnpm --filter @sqlgui/desktop tauri:build",
    "check": "pnpm -r check && cargo check --workspace",
    "lint": "pnpm -r lint",
    "format": "prettier --write .",
    "clean": "rimraf node_modules apps/*/node_modules packages/*/node_modules extensions/*/node_modules target",
    "postinstall": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "pre-commit": "pnpm lint-staged && pnpm check",
    "commit-msg": "node -e \"import('@baicie/scripts').then(m => m.verifyCommit())\""
  },
  "lint-staged": {
    "*.{js,json,md,yml,yaml}": ["prettier --write"],
    "*.{ts,tsx}": ["eslint --fix", "prettier --parser=typescript --write"],
    "*.rs": ["cargo fmt"]
  },
  "devDependencies": {
    "@baicie/scripts": "^0.1.2",
    "eslint": "^10.4.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-import-x": "^4.16.2",
    "eslint-plugin-prettier": "^5.5.5",
    "eslint-plugin-react": "^7.37.5",
    "eslint-plugin-react-hooks": "^7.1.1",
    "lint-staged": "^17.0.5",
    "prettier": "^3.8.3",
    "rimraf": "^6.1.3",
    "simple-git-hooks": "^2.13.1",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.59.4"
  }
}
```

---

## 4.2 修改 `pnpm-workspace.yaml`

模板当前只覆盖：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

你需要加上插件目录：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'extensions/*'

allowBuilds:
  '@nestjs/core': true
  '@swc/core': true
  '@tarojs/binding': true
  '@tarojs/cli': true
  core-js: true
  core-js-pure: true
  esbuild: true
  fsevents: true
  less: true
  msgpackr-extract: true
  simple-git-hooks: true
  swiper: true
  unrs-resolver: true
```

为什么要加 `extensions/*`？

因为后面插件也会是 TS 项目，比如：

```txt
extensions/sql-formatter-demo
extensions/explain-viewer
extensions/theme-default
```

它们应该共享 workspace 里的 `@sqlgui/api`、`@sqlgui/sdk`。

---

## 4.3 新增根 `Cargo.toml`

根目录新增 Rust workspace：

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
repository = "https://github.com/baicie/sqlgui"

[workspace.dependencies]
anyhow = "1"
thiserror = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
async-trait = "0.1"
sqlx = { version = "0.8", features = [
  "runtime-tokio",
  "sqlite",
  "postgres",
  "mysql",
  "json",
  "chrono"
] }
dashmap = "6"
uuid = { version = "1", features = ["v4", "serde"] }
```

Phase 0 先不一定要把 `sqlx` 全部接入，但 workspace 依赖可以先规划好。

---

# 5. Desktop 应用改造

## 5.1 修改 `apps/desktop/package.json`

模板里的 desktop 包名是 `desktop-app`，需要改成 `@sqlgui/desktop`。

### 建议内容

```json
{
  "name": "@sqlgui/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "SQL GUI desktop application built with Tauri, React and Rust.",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "check": "tsc --noEmit",
    "lint": "eslint .",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "dependencies": {
    "@sqlgui/ui": "workspace:*",
    "@sqlgui/utils": "workspace:*",
    "@sqlgui/i18n": "workspace:*",
    "@sqlgui/api": "workspace:*",
    "@tauri-apps/api": "^2.11.0",
    "@tauri-apps/plugin-shell": "^2.3.5",
    "@tanstack/react-table": "^8.21.3",
    "@tanstack/react-virtual": "^3.13.12",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "i18next": "^25.0.0",
    "lucide-react": "^0.468.0",
    "monaco-editor": "^0.52.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-i18next": "^15.0.0",
    "react-resizable-panels": "^2.1.7",
    "tailwind-merge": "^2.6.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "@tauri-apps/cli": "^2.11.2",
    "@types/react": "^19.2.15",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.14"
  }
}
```

如果你还没把 `@repo/tsconfig` 改名，可以暂时保留，后面再统一改成 `@sqlgui/tsconfig`。

---

## 5.2 修改 `apps/desktop/src-tauri/Cargo.toml`

模板现在是：

```toml
[package]
name = "desktop-app"
```

建议改成：

```toml
[package]
name = "sqlgui-desktop"
version = "0.1.0"
description = "SQL GUI desktop application"
authors = ["bai cie"]
edition = "2021"

[lib]
name = "sqlgui_desktop_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"

sqlgui-common = { path = "../../../crates/sqlgui-common" }
sqlgui-db = { path = "../../../crates/sqlgui-db" }
sqlgui-extension = { path = "../../../crates/sqlgui-extension" }
sqlgui-marketplace = { path = "../../../crates/sqlgui-marketplace" }

serde.workspace = true
serde_json.workspace = true
anyhow.workspace = true
tokio.workspace = true

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

---

## 5.3 修改 `apps/desktop/src-tauri/src/lib.rs`

模板目前只是初始化 shell 插件并开发环境打开 devtools。

Phase 0 先改成有 `AppState` 和一个健康检查命令。

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

新增：

```txt
apps/desktop/src-tauri/src/
├─ lib.rs
├─ state.rs
└─ commands/
   ├─ mod.rs
   └─ system.rs
```

`state.rs`：

```rust
pub struct AppState {
    pub app_name: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            app_name: "sqlgui".to_string(),
        }
    }
}
```

`commands/mod.rs`：

```rust
pub mod system;
```

`commands/system.rs`：

```rust
use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheckResponse {
    pub app_name: String,
    pub rust_core_ready: bool,
}

#[tauri::command]
pub async fn system_health_check(
    state: State<'_, AppState>,
) -> Result<HealthCheckResponse, String> {
    Ok(HealthCheckResponse {
        app_name: state.app_name.clone(),
        rust_core_ready: true,
    })
}
```

---

# 6. React 入口改造

## 6.1 目标

Phase 0 不做完整界面，但要有一个空 Workbench：

```txt
ActivityBar
SideBar
EditorArea
BottomPanel
StatusBar
```

确保未来 Phase 1 可以直接往里面填东西。

---

## 6.2 建议目录

```txt
apps/desktop/src/
├─ main.tsx
├─ App.tsx
├─ styles/
│  └─ globals.css
├─ services/
│  └─ native/
│     └─ invoke.ts
└─ workbench/
   ├─ Workbench.tsx
   └─ layout/
      ├─ ActivityBar.tsx
      ├─ SideBar.tsx
      ├─ EditorArea.tsx
      ├─ BottomPanel.tsx
      └─ StatusBar.tsx
```

---

## 6.3 `services/native/invoke.ts`

```ts
import { invoke } from '@tauri-apps/api/core';

export async function callNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }
}
```

---

## 6.4 `App.tsx`

```tsx
import { useEffect, useState } from 'react';
import { callNative } from './services/native/invoke';
import { Workbench } from './workbench/Workbench';

interface HealthCheckResponse {
  appName: string;
  rustCoreReady: boolean;
}

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    callNative<HealthCheckResponse>('system_health_check').then(setHealth).catch(console.error);
  }, []);

  return <Workbench health={health} />;
}
```

---

## 6.5 `Workbench.tsx`

```tsx
import { ActivityBar } from './layout/ActivityBar';
import { BottomPanel } from './layout/BottomPanel';
import { EditorArea } from './layout/EditorArea';
import { SideBar } from './layout/SideBar';
import { StatusBar } from './layout/StatusBar';

interface WorkbenchProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function Workbench({ health }: WorkbenchProps) {
  return (
    <div className="grid h-screen grid-rows-[1fr_28px] bg-background text-foreground">
      <div className="grid min-h-0 grid-cols-[48px_280px_1fr]">
        <ActivityBar />
        <SideBar />
        <div className="grid min-h-0 grid-rows-[1fr_240px]">
          <EditorArea />
          <BottomPanel />
        </div>
      </div>

      <StatusBar health={health} />
    </div>
  );
}
```

---

## 6.6 布局组件

`ActivityBar.tsx`：

```tsx
import { Database, Blocks, History, Settings } from 'lucide-react';

export function ActivityBar() {
  return (
    <aside className="flex flex-col items-center gap-3 border-r bg-muted/40 py-3">
      <Database className="h-5 w-5" />
      <Blocks className="h-5 w-5" />
      <History className="h-5 w-5" />
      <div className="flex-1" />
      <Settings className="h-5 w-5" />
    </aside>
  );
}
```

`SideBar.tsx`：

```tsx
export function SideBar() {
  return (
    <aside className="border-r bg-muted/20">
      <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Connections
      </div>

      <div className="p-3 text-sm text-muted-foreground">No connections yet.</div>
    </aside>
  );
}
```

`EditorArea.tsx`：

```tsx
export function EditorArea() {
  return (
    <main className="min-h-0 bg-background">
      <div className="border-b px-3 py-2 text-sm text-muted-foreground">Welcome</div>

      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        SQL editor will be here.
      </div>
    </main>
  );
}
```

`BottomPanel.tsx`：

```tsx
export function BottomPanel() {
  return (
    <section className="border-t bg-muted/10">
      <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Results
      </div>

      <div className="p-3 text-sm text-muted-foreground">Query results will be here.</div>
    </section>
  );
}
```

`StatusBar.tsx`：

```tsx
interface StatusBarProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function StatusBar({ health }: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between border-t bg-muted px-3 text-xs text-muted-foreground">
      <span>SQL GUI</span>
      <span>Rust Core: {health?.rustCoreReady ? 'Ready' : 'Checking...'}</span>
    </footer>
  );
}
```

---

# 7. 新增 packages

## 7.1 `packages/sqlgui-api`

```txt
packages/sqlgui-api/
├─ package.json
├─ tsconfig.json
└─ src/
   └─ index.ts
```

`package.json`：

```json
{
  "name": "@sqlgui/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "check": "tsc --noEmit",
    "lint": "eslint ."
  },
  "devDependencies": {
    "typescript": "^6.0.3"
  }
}
```

`src/index.ts`：

```ts
export interface Disposable {
  dispose(): void;
}

export interface ExtensionContext {
  id: string;
  extensionPath: string;
  subscriptions: Disposable[];
}

export interface SqlGuiApi {
  commands: {
    registerCommand(
      command: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>,
    ): Disposable;

    executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T>;
  };

  window: {
    showInformationMessage(message: string): Promise<void>;
    showWarningMessage(message: string): Promise<void>;
    showErrorMessage(message: string): Promise<void>;
  };
}
```

---

## 7.2 `packages/sqlgui-sdk`

```txt
packages/sqlgui-sdk/
├─ package.json
├─ tsconfig.json
└─ src/
   └─ index.ts
```

`package.json`：

```json
{
  "name": "@sqlgui/sdk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "check": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@sqlgui/api": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^6.0.3"
  }
}
```

`src/index.ts`：

```ts
export type { Disposable, ExtensionContext, SqlGuiApi } from '@sqlgui/api';
```

---

## 7.3 `packages/extension-schema`

```txt
packages/extension-schema/
├─ package.json
└─ src/
   ├─ index.ts
   └─ sqlgui-extension.schema.json
```

`src/index.ts`：

```ts
export interface ExtensionManifest {
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  main: string;
  activationEvents?: string[];
  permissions?: string[];
  contributes?: {
    commands?: Array<{
      command: string;
      title: string;
      category?: string;
    }>;
    menus?: Record<
      string,
      Array<{
        command: string;
        when?: string;
        group?: string;
      }>
    >;
  };
}
```

---

## 7.4 `packages/i18n`

```txt
packages/i18n/
├─ package.json
└─ src/
   ├─ index.ts
   └─ locales/
      ├─ zh-CN/common.json
      └─ en-US/common.json
```

`src/locales/zh-CN/common.json`：

```json
{
  "app.name": "SQL GUI",
  "connections.title": "连接",
  "results.title": "结果",
  "extensions.title": "插件"
}
```

`src/locales/en-US/common.json`：

```json
{
  "app.name": "SQL GUI",
  "connections.title": "Connections",
  "results.title": "Results",
  "extensions.title": "Extensions"
}
```

---

# 8. 新增 Rust crates

## 8.1 `crates/sqlgui-common`

```txt
crates/sqlgui-common/
├─ Cargo.toml
└─ src/
   └─ lib.rs
```

`Cargo.toml`：

```toml
[package]
name = "sqlgui-common"
version = "0.1.0"
edition.workspace = true
license.workspace = true
repository.workspace = true

[dependencies]
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true
```

`src/lib.rs`：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}
```

---

## 8.2 `crates/sqlgui-db`

```txt
crates/sqlgui-db/
├─ Cargo.toml
└─ src/
   ├─ lib.rs
   └─ types.rs
```

`Cargo.toml`：

```toml
[package]
name = "sqlgui-db"
version = "0.1.0"
edition.workspace = true
license.workspace = true
repository.workspace = true

[dependencies]
sqlgui-common = { path = "../sqlgui-common" }

anyhow.workspace = true
async-trait.workspace = true
dashmap.workspace = true
serde.workspace = true
serde_json.workspace = true
sqlx.workspace = true
thiserror.workspace = true
tokio.workspace = true
uuid.workspace = true
```

`src/lib.rs`：

```rust
pub mod types;

pub fn db_core_ready() -> bool {
    true
}
```

`src/types.rs`：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DbKind {
    SQLite,
    PostgreSQL,
    MySQL,
}
```

---

## 8.3 `crates/sqlgui-extension`

```txt
crates/sqlgui-extension/
├─ Cargo.toml
└─ src/
   ├─ lib.rs
   └─ manifest.rs
```

`Cargo.toml`：

```toml
[package]
name = "sqlgui-extension"
version = "0.1.0"
edition.workspace = true
license.workspace = true
repository.workspace = true

[dependencies]
anyhow.workspace = true
serde.workspace = true
serde_json.workspace = true
thiserror.workspace = true
```

`src/lib.rs`：

```rust
pub mod manifest;

pub fn extension_core_ready() -> bool {
    true
}
```

`src/manifest.rs`：

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionManifest {
    pub name: String,
    pub publisher: String,
    pub version: String,
    pub main: String,
}
```

---

## 8.4 `crates/sqlgui-marketplace`

```txt
crates/sqlgui-marketplace/
├─ Cargo.toml
└─ src/
   └─ lib.rs
```

`Cargo.toml`：

```toml
[package]
name = "sqlgui-marketplace"
version = "0.1.0"
edition.workspace = true
license.workspace = true
repository.workspace = true

[dependencies]
anyhow.workspace = true
serde.workspace = true
serde_json.workspace = true
```

`src/lib.rs`：

```rust
pub fn marketplace_core_ready() -> bool {
    true
}
```

---

# 9. 新增插件 Demo 占坑

```txt
extensions/sql-formatter-demo/
├─ package.json
├─ tsconfig.json
├─ sqlgui.extension.json
└─ src/
   └─ extension.ts
```

`package.json`：

```json
{
  "name": "sqlgui-extension-sql-formatter-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit",
    "check": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@sqlgui/api": "workspace:*",
    "@sqlgui/sdk": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^6.0.3"
  }
}
```

`sqlgui.extension.json`：

```json
{
  "name": "sql-formatter-demo",
  "displayName": "SQL Formatter Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:sql.format"],
  "permissions": ["editor.read", "editor.write", "ui.notification"],
  "contributes": {
    "commands": [
      {
        "command": "sql.format",
        "title": "Format SQL",
        "category": "SQL"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "sql.format",
          "when": "editorLang == sql"
        }
      ]
    }
  }
}
```

`src/extension.ts`：

```ts
import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  const disposable = api.commands.registerCommand('sql.format', async () => {
    await api.window.showInformationMessage('Format SQL from demo extension.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

---

# 10. shadcn/ui 接入策略

Phase 0 只做准备，不要把所有组件都加进来。

先装基础依赖：

```bash
pnpm --filter @sqlgui/desktop add class-variance-authority clsx tailwind-merge lucide-react
```

如果模板里还没有 Tailwind，需要加：

```bash
pnpm --filter @sqlgui/desktop add -D tailwindcss postcss autoprefixer
```

然后后续 Phase 1 再引入：

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input dialog dropdown-menu command tabs scroll-area separator
```

Phase 0 不建议立刻大规模引入组件，先确保工程能跑。

---

# 11. `.gitignore`

确保有这些：

```gitignore
node_modules
dist
build
target
.DS_Store
.env
.env.*
!.env.example

apps/desktop/src-tauri/target
apps/desktop/src-tauri/gen

.sqlgui
*.log
```

---

# 12. README 初版

`README.md`：

````md
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
````

## Workspace

```txt
apps/desktop        Desktop app
packages/ui         Shared UI
packages/sqlgui-api Plugin API
packages/sqlgui-sdk Plugin SDK
crates/sqlgui-db    Rust DB Core
extensions/*        Extensions
```

````

---

# 13. Phase 0 验证命令

初始化完成后执行：

```bash
pnpm install
````

检查 TS workspace：

```bash
pnpm -r check
```

检查 Rust：

```bash
cargo check --workspace
```

启动桌面端：

```bash
pnpm dev
```

或者：

```bash
pnpm --filter @sqlgui/desktop tauri:dev
```

预期结果：

```txt
1. Tauri 窗口打开
2. 页面显示 SQL GUI 空 Workbench
3. StatusBar 显示 Rust Core: Ready
4. 控制台没有 TS 编译错误
5. cargo check --workspace 通过
```

---

# 14. Phase 0 Todo 清单

```txt
项目复制
[x] 从 template-repo/full-monorepo 复制出 sqlgui（在 sql-studio 仓库内完成改造）
[-] 删除旧 .git（跳过，保留现有 git 历史）
[-] 初始化新 git（跳过）

命名修改
[x] root package name 改为 sqlgui
[x] desktop package name 改为 @sqlgui/desktop
[x] @repo/ui 改为 @sqlgui/ui
[x] @repo/utils 改为 @sqlgui/utils
[x] desktop Rust package 改为 sqlgui-desktop
[x] lib name 改为 sqlgui_desktop_lib

workspace 修改
[x] pnpm-workspace.yaml 加 extensions/*
[x] 新增根 Cargo.toml workspace
[x] apps/desktop/src-tauri 加入 workspace
[x] 新增 crates/sqlgui-common
[x] 新增 crates/sqlgui-db
[x] 新增 crates/sqlgui-extension
[x] 新增 crates/sqlgui-marketplace

前端基础
[x] 新增 Workbench
[x] 新增 ActivityBar
[x] 新增 SideBar
[x] 新增 EditorArea
[x] 新增 BottomPanel
[x] 新增 StatusBar
[x] 新增 native invoke 封装
[x] App.tsx 调用 system_health_check

Rust 基础
[x] 新增 AppState
[x] 新增 commands/system.rs
[x] 注册 system_health_check command
[x] 确认 Tauri 启动正常（rust-toolchain.toml 已修复）

packages
[x] 新增 packages/sqlgui-api
[x] 新增 packages/sqlgui-sdk
[x] 新增 packages/i18n
[x] 新增 packages/extension-schema

插件占坑
[x] 新增 extensions/sql-formatter-demo
[x] 新增 sqlgui.extension.json
[x] 新增 extension.ts demo

工程质量
[x] 更新 README.md
[x] 更新 .gitignore
[x] pnpm install 通过
[x] pnpm -r check 通过
[x] cargo check --workspace 通过
[x] pnpm dev 能启动
```

---

# 15. Phase 0 完成标准

满足下面条件才进入 Phase 1：

```txt
[x] pnpm install 无错误
[x] pnpm dev 能打开桌面窗口
[x] 页面显示 Workbench 空布局
[x] StatusBar 能显示 Rust Core Ready
[x] cargo check --workspace 通过
[x] pnpm -r check 通过
[x] packages/sqlgui-api 可被 extension 引用
[x] crates/sqlgui-db 可被 desktop Rust 引用
[x] extensions/sql-formatter-demo 已经有 manifest
```

---

# 16. 我的建议执行顺序

最稳的执行顺序是：

```txt
1. 复制 full-monorepo
2. 先让原始 desktop 跑起来
3. 改 package 命名
4. 加 pnpm workspace extensions/*
5. 加 Cargo workspace
6. 加 crates/*
7. 改 Tauri lib.rs，加 health check
8. 改 React App，显示 Workbench
9. 加 packages/sqlgui-api / sdk
10. 加 extensions/sql-formatter-demo
11. 跑 pnpm install / cargo check / pnpm dev
```

不要一开始就接 shadcn、Monaco、sqlx 真实连接。
Phase 0 的核心是：

> **工程骨架先稳定，命名先统一，workspace 先打通。**

这个阶段完成后，Phase 1 就可以直接开始做 Workbench、CommandService 和插件系统的基础服务了。
