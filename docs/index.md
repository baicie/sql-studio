下面给你一版 **SQL GUI 初版架构设计**，定位是：

> **像 VS Code 一样的可扩展 SQL 工作台**
> 技术栈：**Tauri 2 + React + shadcn/ui + i18n + Rust DB Core + 插件市场**

核心目标不是一开始对标 DataGrip/Navicat，而是先做一个：

> **轻量、可扩展、插件化、能长期演进的 SQL GUI 框架。**

---

# 1. 总体架构

## 1.1 VS Code 架构映射

VS Code 扩展体系的核心是：扩展通过 `package.json` 里的 **Contribution Points** 声明命令、菜单、视图、快捷键等能力，再通过 VS Code API 实现行为。官方文档也明确说扩展通常由 Contribution Points + VS Code API 组合扩展功能。([Visual Studio Code][1])

我们仿照它做 SQL GUI：

| VS Code              | SQL GUI 对应                            |
| -------------------- | --------------------------------------- |
| Main Process         | Tauri Rust Core                         |
| Renderer / Workbench | React Workbench                         |
| Extension Host       | Plugin Host Web Worker                  |
| Contribution Points  | plugin.json / sqlgui.extension.json     |
| VS Code API          | `sqlgui` Plugin API                     |
| Marketplace          | SQL GUI Plugin Marketplace              |
| Command Palette      | SQL Command Palette                     |
| Explorer             | Connection Explorer                     |
| Editor               | SQL Editor                              |
| Panel                | Query Result / Logs / Problems          |
| Language Server      | SQL Dialect Analyzer / Formatter Plugin |
| Secret Storage       | Rust Keyring / OS Secure Storage        |
| FileSystem API       | 受限 Plugin Storage API                 |

Tauri 2 本身适合这个架构：前端可以使用任意 Web 技术，后端由 Rust 提供系统能力，前后端通过 command / invoke 通信。Tauri 官方也说明前端运行在系统 WebView 中，应用核心主要由 Rust 编写，并通过 IPC 连接。([Tauri][2])

---

# 2. 核心分层

```txt
sqlgui
├─ React Workbench              # UI 工作台
│  ├─ Activity Bar              # 左侧图标栏
│  ├─ Side Bar                  # 连接树 / 插件市场 / 历史记录
│  ├─ Editor Area               # SQL 编辑器，多 Tab
│  ├─ Panel                     # 查询结果 / 日志 / 问题
│  ├─ Status Bar                # 连接状态 / 行列 / 方言
│  └─ Command Palette           # 命令面板
│
├─ Frontend Services
│  ├─ CommandService
│  ├─ MenuService
│  ├─ KeybindingService
│  ├─ EditorService
│  ├─ ConnectionService
│  ├─ QueryService
│  ├─ ExtensionService
│  ├─ MarketplaceService
│  ├─ StorageService
│  └─ I18nService
│
├─ Plugin Host
│  ├─ Extension Manifest Loader
│  ├─ Contribution Registry
│  ├─ Activation Event System
│  ├─ Web Worker Sandbox
│  ├─ Permission Broker
│  └─ Plugin API Bridge
│
├─ Tauri Rust Core
│  ├─ DB Core
│  ├─ Connection Pool Manager
│  ├─ Query Executor
│  ├─ Schema Introspection
│  ├─ Secret Manager
│  ├─ Extension Installer
│  ├─ Signature Verifier
│  └─ Local App Storage
│
└─ Plugin Marketplace
   ├─ Registry API
   ├─ Plugin Package CDN
   ├─ Signature Service
   ├─ Review / Rating
   └─ Compatibility Metadata
```

---

# 3. 技术选型

## 3.1 桌面壳：Tauri 2

选择 Tauri 2 的原因：

1. 包体比 Electron 更轻；
2. UI 仍然使用 React/Web 生态；
3. Rust 适合做数据库连接、连接池、加密存储、插件安全边界；
4. Tauri 2 有 command 系统，前端可以调用 Rust 函数；
5. Tauri 2 有 capabilities / permissions，可以限制 WebView 暴露能力。([Tauri][3])

Tauri 插件机制本身也支持 Rust 代码、生命周期钩子、命令暴露和 JS API 胶水层，但我们这里要区分：

> **Tauri Plugin 是应用底层能力插件；SQL GUI Plugin 是用户安装的业务扩展。**

用户市场里的插件不要直接等同于 Tauri Plugin，否则安全边界太难控。Tauri 官方插件确实可以暴露 Rust / Kotlin / Swift 能力，但这更适合“可信的宿主能力”，不适合第一版开放给任意市场插件。([Tauri][4])

---

## 3.2 前端：React + shadcn/ui

shadcn/ui 适合这种工具型应用，因为它本质上不是传统 npm 组件库，而是“可复制进项目里改造”的组件分发方式。官方也把它描述为 accessible components 和 code distribution platform。([Shadcn][5])

SQL GUI 需要大量自定义 UI：

- 树形连接管理；
- 结果表格；
- SQL 编辑器工具栏；
- 插件市场卡片；
- 命令面板；
- 状态栏；
- 多 Tab；
- 分屏布局。

shadcn 的风格适合做统一设计系统，但重型组件建议自己封装：

| 功能         | 推荐                         |
| ------------ | ---------------------------- |
| SQL 编辑器   | Monaco Editor / CodeMirror 6 |
| 查询结果表格 | TanStack Table + Virtualizer |
| 基础组件     | shadcn/ui                    |
| 状态管理     | Zustand                      |
| 数据请求     | TanStack Query               |
| i18n         | react-i18next                |
| 布局拖拽     | react-resizable-panels       |
| 图标         | lucide-react                 |

react-i18next 官方推荐在函数组件里使用 `useTranslation` Hook 获取翻译函数和 i18n 实例，适合这个 React 架构。([react.i18next.com][6])

---

## 3.3 Rust DB 层

第一版不要直接从前端用 `tauri-plugin-sql` 暴露数据库查询。Tauri 官方 SQL 插件确实通过 sqlx 支持 SQLite、MySQL、PostgreSQL。([Tauri][7])

但 SQL GUI 更复杂，你需要：

- 连接池管理；
- 查询取消；
- 查询超时；
- 大结果集分页；
- schema introspection；
- SQL 执行日志；
- 敏感信息脱敏；
- 插件权限管控；
- 统一错误模型；
- 后续支持 SSH Tunnel；
- 后续支持 ClickHouse / Redis / MongoDB。

所以建议：

> **不用 tauri-plugin-sql 直接做业务层，而是自己在 Rust 里基于 sqlx 封装 DB Core。**

sqlx 本身是 async、pure Rust SQL 工具，支持 PostgreSQL、MySQL/MariaDB、SQLite，并支持可选的编译期查询检查。([GitHub][8])

---

# 4. 项目目录设计

```txt
sqlgui/
├─ apps/
│  └─ desktop/
│     ├─ src/                         # React Workbench
│     │  ├─ app/
│     │  ├─ workbench/
│     │  ├─ services/
│     │  ├─ features/
│     │  ├─ plugins/
│     │  ├─ i18n/
│     │  └─ main.tsx
│     │
│     ├─ src-tauri/
│     │  ├─ src/
│     │  │  ├─ lib.rs
│     │  │  ├─ commands/
│     │  │  ├─ db/
│     │  │  ├─ extension/
│     │  │  ├─ marketplace/
│     │  │  ├─ security/
│     │  │  └─ state.rs
│     │  ├─ Cargo.toml
│     │  └─ tauri.conf.json
│     │
│     ├─ package.json
│     └─ vite.config.ts
│
├─ packages/
│  ├─ sqlgui-api/                     # 插件 API 类型
│  ├─ sqlgui-sdk/                     # 插件开发 SDK
│  ├─ ui/                             # shadcn 二次封装
│  ├─ i18n/                           # 共享语言资源
│  └─ extension-schema/               # manifest JSON Schema
│
├─ crates/
│  ├─ sqlgui-db/                      # Rust DB Core
│  ├─ sqlgui-extension/               # 插件安装 / 校验 / 权限
│  ├─ sqlgui-marketplace/             # 市场 API client
│  └─ sqlgui-common/
│
├─ extensions/
│  ├─ sql-formatter/
│  ├─ postgres-helper/
│  ├─ explain-viewer/
│  └─ theme-dark-plus/
│
├─ marketplace-server/                # 后续可独立服务
├─ docs/
└─ pnpm-workspace.yaml
```

---

# 5. Workbench UI 设计

## 5.1 主界面布局

```txt
┌─────────────────────────────────────────────────────────────┐
│ TitleBar                                                     │
├──────┬───────────────────┬──────────────────────────────────┤
│ Act  │ SideBar           │ Editor Group                     │
│ Bar  │                   │ ┌──────────────────────────────┐ │
│      │ Connections       │ │ SQL Editor Tab                │ │
│      │ Extensions        │ │                              │ │
│      │ History           │ └──────────────────────────────┘ │
│      │ Snippets          │                                  │
├──────┴───────────────────┴──────────────────────────────────┤
│ Panel: Results / Explain / Logs / Problems                   │
├─────────────────────────────────────────────────────────────┤
│ StatusBar: connection / dialect / time / rows / plugin state  │
└─────────────────────────────────────────────────────────────┘
```

## 5.2 React 目录

```txt
src/workbench/
├─ layout/
│  ├─ Workbench.tsx
│  ├─ ActivityBar.tsx
│  ├─ SideBar.tsx
│  ├─ EditorArea.tsx
│  ├─ Panel.tsx
│  └─ StatusBar.tsx
│
├─ command-palette/
│  ├─ CommandPalette.tsx
│  └─ useCommandPalette.ts
│
├─ editor/
│  ├─ SqlEditor.tsx
│  ├─ EditorTabs.tsx
│  └─ editorService.ts
│
├─ connections/
│  ├─ ConnectionTree.tsx
│  ├─ ConnectionDialog.tsx
│  └─ connectionService.ts
│
├─ results/
│  ├─ ResultGrid.tsx
│  ├─ ResultToolbar.tsx
│  └─ resultService.ts
│
└─ extensions/
   ├─ ExtensionMarketplace.tsx
   ├─ ExtensionDetail.tsx
   ├─ InstalledExtensions.tsx
   └─ extensionService.ts
```

---

# 6. Rust DB Core 设计

## 6.1 数据库抽象

第一版支持：

- SQLite；
- PostgreSQL；
- MySQL / MariaDB。

后续再加：

- SQL Server；
- ClickHouse；
- Redis；
- MongoDB；
- DuckDB；
- SSH Tunnel。

## 6.2 Rust 类型草案

```rust
// crates/sqlgui-db/src/types.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DbKind {
    SQLite,
    PostgreSQL,
    MySQL,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub kind: DbKind,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password_ref: Option<String>,
    pub database: Option<String>,
    pub file_path: Option<String>,
    pub ssl: Option<bool>,
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
    Number(f64),
    String(String),
    Bytes(String),
    Json(serde_json::Value),
}
```

---

## 6.3 Connector Trait

```rust
// crates/sqlgui-db/src/connector.rs

use async_trait::async_trait;
use crate::types::*;

#[async_trait]
pub trait DbConnector: Send + Sync {
    async fn test_connection(&self, config: ConnectionConfig) -> anyhow::Result<()>;

    async fn open(&self, config: ConnectionConfig) -> anyhow::Result<String>;

    async fn close(&self, connection_id: String) -> anyhow::Result<()>;

    async fn query(&self, request: QueryRequest) -> anyhow::Result<QueryResult>;

    async fn list_databases(&self, connection_id: String) -> anyhow::Result<Vec<String>>;

    async fn list_schemas(&self, connection_id: String) -> anyhow::Result<Vec<String>>;

    async fn list_tables(
        &self,
        connection_id: String,
        schema: Option<String>,
    ) -> anyhow::Result<Vec<TableMeta>>;
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableMeta {
    pub schema: Option<String>,
    pub name: String,
    pub table_type: String,
}
```

---

## 6.4 Pool Manager 草案

```rust
// crates/sqlgui-db/src/pool.rs

use std::sync::Arc;
use dashmap::DashMap;
use sqlx::{MySqlPool, PgPool, SqlitePool};

#[derive(Clone)]
pub enum AnyDbPool {
    Postgres(PgPool),
    MySql(MySqlPool),
    Sqlite(SqlitePool),
}

#[derive(Clone)]
pub struct PoolManager {
    pools: Arc<DashMap<String, AnyDbPool>>,
}

impl PoolManager {
    pub fn new() -> Self {
        Self {
            pools: Arc::new(DashMap::new()),
        }
    }

    pub fn insert(&self, connection_id: String, pool: AnyDbPool) {
        self.pools.insert(connection_id, pool);
    }

    pub fn get(&self, connection_id: &str) -> Option<AnyDbPool> {
        self.pools.get(connection_id).map(|p| p.clone())
    }

    pub fn remove(&self, connection_id: &str) {
        self.pools.remove(connection_id);
    }
}
```

---

## 6.5 Tauri Commands

Tauri command 可以接收参数、返回值，也可以返回错误和 async，适合封装数据库操作。([Tauri][3])

```rust
// apps/desktop/src-tauri/src/commands/db.rs

use tauri::State;
use sqlgui_db::types::*;
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
) -> Result<String, String> {
    state
        .db
        .open(config)
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
```

```rust
// apps/desktop/src-tauri/src/lib.rs

mod commands;
mod state;

use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::db::db_test_connection,
            commands::db::db_open_connection,
            commands::db::db_execute_query,
            commands::db::db_list_tables,
            commands::extension::extension_install,
            commands::extension::extension_list_installed,
            commands::marketplace::marketplace_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running sqlgui");
}
```

---

# 7. 前端调用 Rust

```ts
// apps/desktop/src/services/native/invoke.ts

import { invoke } from '@tauri-apps/api/core';

export async function callNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
  }
}
```

```ts
// apps/desktop/src/services/db/dbService.ts

import { callNative } from '../native/invoke';

export interface QueryRequest {
  connectionId: string;
  sql: string;
  limit?: number;
  timeoutMs?: number;
}

export interface QueryResult {
  columns: Array<{
    name: string;
    databaseType: string;
    nullable?: boolean;
  }>;
  rows: unknown[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
}

export const dbService = {
  testConnection(config: unknown) {
    return callNative<void>('db_test_connection', { config });
  },

  openConnection(config: unknown) {
    return callNative<string>('db_open_connection', { config });
  },

  executeQuery(request: QueryRequest) {
    return callNative<QueryResult>('db_execute_query', { request });
  },

  listTables(connectionId: string, schema?: string) {
    return callNative('db_list_tables', { connectionId, schema });
  },
};
```

---

# 8. 插件系统设计：重点

这是整个项目最关键的地方。

我建议第一版插件系统分三层：

```txt
┌──────────────────────────────────────────────┐
│ Marketplace Plugin                           │
│ JS/TS 插件，运行在 Web Worker / Sandbox       │
└───────────────────┬──────────────────────────┘
                    │ SQLGUI Plugin API
┌───────────────────▼──────────────────────────┐
│ Plugin Host / Permission Broker              │
│ 命令、菜单、视图、存储、DB 权限、生命周期       │
└───────────────────┬──────────────────────────┘
                    │ Tauri invoke
┌───────────────────▼──────────────────────────┐
│ Rust Core                                    │
│ DB、文件、密钥、网络、安装、签名验证             │
└──────────────────────────────────────────────┘
```

第一版不要支持插件直接跑 Rust native 代码。否则插件市场会变成安全灾难。

---

## 8.1 插件分类

### 第一阶段：Web Plugin

最推荐先做。

特点：

- 插件代码是 JS bundle；
- 运行在 Web Worker；
- 不能直接访问 Tauri API；
- 只能通过 `sqlgui` API 调宿主能力；
- 适合主题、格式化、结果分析、SQL snippet、编辑器增强、连接树菜单等。

### 第二阶段：WASM Plugin

适合：

- SQL Formatter；
- SQL Parser；
- Explain Plan Analyzer；
- 数据脱敏；
- CSV/JSON 转换；
- AI Prompt 模板处理。

### 第三阶段：Native Trusted Plugin

只允许官方或用户手动安装。

适合：

- 新数据库驱动；
- SSH Tunnel；
- Kerberos；
- Oracle / SQL Server Native Client；
- 企业内网认证。

---

## 8.2 插件包结构

插件包后缀可以设计成：

```txt
.sgx
```

本质是 zip：

```txt
publisher.plugin-name-1.0.0.sgx
├─ sqlgui.extension.json
├─ dist/
│  └─ extension.js
├─ README.md
├─ CHANGELOG.md
├─ icon.png
├─ LICENSE
└─ signature.sig
```

---

## 8.3 插件 Manifest

仿照 VS Code `package.json`，但用独立文件：

```json
{
  "name": "explain-viewer",
  "displayName": "Explain Viewer",
  "publisher": "sqlgui",
  "version": "0.1.0",
  "description": "Visualize SQL explain plans.",
  "engines": {
    "sqlgui": "^0.1.0"
  },
  "categories": ["Database", "Visualization"],
  "main": "dist/extension.js",
  "activationEvents": [
    "onCommand:explainViewer.open",
    "onDbKind:postgres",
    "onView:explainViewer.panel"
  ],
  "permissions": ["db.connection.read", "db.query.explain", "editor.read", "storage.local"],
  "contributes": {
    "commands": [
      {
        "command": "explainViewer.open",
        "title": "Open Explain Viewer",
        "category": "SQL"
      }
    ],
    "menus": {
      "editor/title": [
        {
          "command": "explainViewer.open",
          "when": "editorLang == sql"
        }
      ],
      "result/context": [
        {
          "command": "explainViewer.open",
          "when": "dbKind == postgres"
        }
      ]
    },
    "views": {
      "panel": [
        {
          "id": "explainViewer.panel",
          "name": "Explain",
          "icon": "activity"
        }
      ]
    },
    "sqlDialects": [
      {
        "id": "postgres",
        "snippets": "snippets/postgres.json"
      }
    ],
    "configuration": {
      "properties": {
        "explainViewer.autoAnalyze": {
          "type": "boolean",
          "default": false,
          "description": "Analyze explain output automatically."
        }
      }
    }
  }
}
```

---

## 8.4 Contribution Points

第一版支持这些：

```ts
export type ContributionPoint =
  | 'commands'
  | 'menus'
  | 'keybindings'
  | 'views'
  | 'themes'
  | 'icons'
  | 'snippets'
  | 'sqlDialects'
  | 'formatters'
  | 'resultRenderers'
  | 'connectionTree/context'
  | 'editor/title'
  | 'editor/context'
  | 'result/context'
  | 'statusBar';
```

具体能力：

| Contribution             | 用途               |
| ------------------------ | ------------------ |
| `commands`               | 注册命令           |
| `menus`                  | 菜单贡献           |
| `keybindings`            | 快捷键             |
| `views`                  | 侧边栏/面板视图    |
| `themes`                 | 主题               |
| `snippets`               | SQL 片段           |
| `sqlDialects`            | SQL 方言增强       |
| `formatters`             | SQL 格式化         |
| `resultRenderers`        | 查询结果自定义渲染 |
| `statusBar`              | 状态栏项           |
| `connectionTree/context` | 连接树右键菜单     |
| `editor/context`         | SQL 编辑器右键菜单 |
| `result/context`         | 结果表右键菜单     |

---

## 8.5 Activation Events

```ts
export type ActivationEvent =
  | '*'
  | 'onStartupFinished'
  | `onCommand:${string}`
  | `onView:${string}`
  | `onDbKind:${'sqlite' | 'postgres' | 'mysql'}`
  | `onSqlDialect:${string}`
  | `onResultRenderer:${string}`
  | `onLanguage:${'sql'}`;
```

原则：

> 插件不要启动时全量激活。
> 只有命令、视图、数据库类型、编辑器语言触发时才激活。

---

# 9. 插件 API 草案

## 9.1 插件入口

```ts
// extensions/explain-viewer/src/extension.ts

import type { SqlGuiApi, ExtensionContext } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  const disposable = api.commands.registerCommand('explainViewer.open', async () => {
    const editor = api.window.activeSqlEditor;
    if (!editor) {
      api.window.showWarningMessage('No active SQL editor.');
      return;
    }

    const sql = await editor.getSelectedTextOrDocumentText();
    const connection = await api.db.getActiveConnection();

    if (!connection) {
      api.window.showWarningMessage('No active connection.');
      return;
    }

    const result = await api.db.explain({
      connectionId: connection.id,
      sql,
    });

    await api.views.openPanel('explainViewer.panel', {
      result,
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

---

## 9.2 `@sqlgui/api` 类型

```ts
// packages/sqlgui-api/src/index.ts

export interface Disposable {
  dispose(): void;
}

export interface ExtensionContext {
  id: string;
  extensionPath: string;
  globalState: Memento;
  workspaceState: Memento;
  subscriptions: Disposable[];
}

export interface Memento {
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  update<T>(key: string, value: T): Promise<void>;
}

export interface SqlGuiApi {
  commands: CommandApi;
  window: WindowApi;
  editor: EditorApi;
  db: DatabaseApi;
  views: ViewApi;
  storage: StorageApi;
  i18n: I18nApi;
}

export interface CommandApi {
  registerCommand(
    command: string,
    handler: (...args: unknown[]) => unknown | Promise<unknown>,
  ): Disposable;

  executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T>;

  getCommands(): Promise<string[]>;
}

export interface WindowApi {
  showInformationMessage(message: string): Promise<void>;
  showWarningMessage(message: string): Promise<void>;
  showErrorMessage(message: string): Promise<void>;
  activeSqlEditor: SqlEditor | undefined;
}

export interface SqlEditor {
  id: string;
  language: 'sql';
  getText(): Promise<string>;
  getSelectedText(): Promise<string>;
  getSelectedTextOrDocumentText(): Promise<string>;
  insertText(text: string): Promise<void>;
  replaceSelection(text: string): Promise<void>;
}

export interface DatabaseApi {
  getActiveConnection(): Promise<DbConnection | undefined>;

  query(request: PluginQueryRequest): Promise<QueryResult>;

  explain(request: PluginExplainRequest): Promise<QueryResult>;

  listTables(connectionId: string): Promise<TableMeta[]>;
}

export interface PluginQueryRequest {
  connectionId: string;
  sql: string;
  limit?: number;
}

export interface PluginExplainRequest {
  connectionId: string;
  sql: string;
}

export interface DbConnection {
  id: string;
  name: string;
  kind: 'sqlite' | 'postgres' | 'mysql';
  database?: string;
}

export interface QueryResult {
  columns: Array<{ name: string; databaseType: string }>;
  rows: unknown[][];
  elapsedMs: number;
}

export interface TableMeta {
  schema?: string;
  name: string;
  tableType: string;
}

export interface ViewApi {
  registerViewProvider(id: string, provider: ViewProvider): Disposable;
  openPanel(id: string, payload?: unknown): Promise<void>;
}

export interface ViewProvider {
  render(container: ViewContainer, payload?: unknown): void | Promise<void>;
}

export interface ViewContainer {
  postMessage(message: unknown): void;
}

export interface StorageApi {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface I18nApi {
  t(key: string, params?: Record<string, unknown>): string;
}
```

---

# 10. 插件宿主设计

## 10.1 为什么用 Web Worker

插件不应该直接运行在 React 主线程里。否则一个插件死循环会卡死整个 UI。

```txt
React Workbench
   │
   │ postMessage / RPC
   ▼
Plugin Host Worker
   │
   │ brokered invoke
   ▼
Tauri Rust Core
```

Worker 里不给插件暴露：

- `@tauri-apps/api`;
- 原始 `invoke`;
- 真实文件系统；
- 真实数据库密码；
- 任意 native API。

插件只能拿到宿主注入的 `sqlgui` API。

---

## 10.2 RPC 协议

```ts
// packages/sqlgui-api/src/rpc.ts

export interface RpcRequest {
  id: string;
  method: string;
  params?: unknown;
}

export interface RpcResponse {
  id: string;
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export interface RpcNotification {
  method: string;
  params?: unknown;
}
```

---

## 10.3 Workbench 侧 PluginHost

```ts
// apps/desktop/src/plugins/host/PluginHost.ts

import type { RpcRequest, RpcResponse } from '@sqlgui/api';
import { permissionBroker } from './permissionBroker';
import { commandService } from '@/services/commandService';
import { dbService } from '@/services/db/dbService';

export class PluginHost {
  private worker?: Worker;
  private pending = new Map<string, (value: unknown) => void>();

  constructor(private readonly extensionId: string) {}

  async start(sourceCode: string) {
    const workerSource = `
      ${sourceCode}
    `;

    const blob = new Blob([workerSource], {
      type: 'application/javascript',
    });

    this.worker = new Worker(URL.createObjectURL(blob), {
      type: 'module',
      name: `plugin:${this.extensionId}`,
    });

    this.worker.onmessage = async (event) => {
      const message = event.data;

      if (message.type === 'host:request') {
        const response = await this.handlePluginRequest(message.request);
        this.worker?.postMessage({
          type: 'host:response',
          response,
        });
      }
    };

    this.worker.postMessage({
      type: 'plugin:activate',
      extensionId: this.extensionId,
    });
  }

  private async handlePluginRequest(request: RpcRequest): Promise<RpcResponse> {
    try {
      const result = await this.dispatch(request.method, request.params);
      return { id: request.id, result };
    } catch (error) {
      return {
        id: request.id,
        error: {
          code: 'PLUGIN_HOST_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async dispatch(method: string, params: unknown) {
    await permissionBroker.assertAllowed(this.extensionId, method, params);

    switch (method) {
      case 'commands.register':
        return commandService.registerPluginCommand(this.extensionId, params);

      case 'commands.execute':
        return commandService.executePluginCommand(this.extensionId, params);

      case 'db.query':
        return dbService.executeQuery(params as any);

      case 'db.explain':
        return dbService.executeQuery({
          ...(params as any),
          sql: `EXPLAIN ${(params as any).sql}`,
        });

      default:
        throw new Error(`Unknown plugin method: ${method}`);
    }
  }

  stop() {
    this.worker?.terminate();
  }
}
```

---

## 10.4 Worker 侧 API Bridge

```ts
// packages/sqlgui-sdk/src/workerApi.ts

import type { RpcRequest, RpcResponse, SqlGuiApi } from '@sqlgui/api';

let seq = 0;
const pending = new Map<
  string,
  {
    resolve(value: unknown): void;
    reject(error: Error): void;
  }
>();

function request<T>(method: string, params?: unknown): Promise<T> {
  const id = String(++seq);

  const payload: RpcRequest = {
    id,
    method,
    params,
  };

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });

    self.postMessage({
      type: 'host:request',
      request: payload,
    });
  });
}

self.onmessage = (event) => {
  const message = event.data;

  if (message.type === 'host:response') {
    const response = message.response as RpcResponse;
    const item = pending.get(response.id);
    if (!item) return;

    pending.delete(response.id);

    if (response.error) {
      item.reject(new Error(response.error.message));
    } else {
      item.resolve(response.result);
    }
  }
};

export function createSqlGuiApi(): SqlGuiApi {
  return {
    commands: {
      registerCommand(command, handler) {
        const handlerId = `handler:${command}`;

        // 真实实现里要把 handler 存在 worker 内部 registry
        request('commands.register', { command, handlerId });

        return {
          dispose() {
            request('commands.unregister', { command });
          },
        };
      },

      executeCommand(command, ...args) {
        return request('commands.execute', { command, args });
      },

      getCommands() {
        return request('commands.getAll');
      },
    },

    window: {
      showInformationMessage(message) {
        return request('window.info', { message });
      },
      showWarningMessage(message) {
        return request('window.warn', { message });
      },
      showErrorMessage(message) {
        return request('window.error', { message });
      },
      get activeSqlEditor() {
        // 草案：实际可以返回 proxy 对象
        return undefined;
      },
    },

    editor: {} as any,

    db: {
      getActiveConnection() {
        return request('db.getActiveConnection');
      },
      query(payload) {
        return request('db.query', payload);
      },
      explain(payload) {
        return request('db.explain', payload);
      },
      listTables(connectionId) {
        return request('db.listTables', { connectionId });
      },
    },

    views: {
      registerViewProvider(id, provider) {
        request('views.register', { id });
        return {
          dispose() {
            request('views.unregister', { id });
          },
        };
      },

      openPanel(id, payload) {
        return request('views.openPanel', { id, payload });
      },
    },

    storage: {
      get(key) {
        return request('storage.get', { key });
      },
      set(key, value) {
        return request('storage.set', { key, value });
      },
      delete(key) {
        return request('storage.delete', { key });
      },
    },

    i18n: {
      t(key, params) {
        // 插件侧可以有本地翻译，也可以请求 host
        return key;
      },
    },
  };
}
```

---

# 11. 插件权限系统

这是插件市场的生命线。

## 11.1 权限模型

```ts
export type PluginPermission =
  | 'editor.read'
  | 'editor.write'
  | 'db.connection.read'
  | 'db.schema.read'
  | 'db.query.read'
  | 'db.query.write'
  | 'db.query.explain'
  | 'storage.local'
  | 'network.fetch'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'ui.notification';
```

注意区分：

| 权限                 | 说明                                    |
| -------------------- | --------------------------------------- |
| `db.query.read`      | 允许执行 SELECT / SHOW / EXPLAIN        |
| `db.query.write`     | 允许执行 INSERT / UPDATE / DELETE / DDL |
| `db.query.explain`   | 允许执行 EXPLAIN                        |
| `db.connection.read` | 只能读连接元信息，不能读密码            |
| `storage.local`      | 插件自己的 key-value 存储               |
| `network.fetch`      | 是否允许访问外网                        |
| `editor.write`       | 是否允许修改 SQL 编辑器内容             |

## 11.2 危险 SQL 二次确认

即使插件声明了 `db.query.write`，也要做保护：

```txt
插件执行 DROP / TRUNCATE / DELETE / UPDATE / ALTER
        ↓
Permission Broker 检查
        ↓
如果不是用户主动触发，拒绝
        ↓
如果是用户主动触发，弹二次确认
        ↓
Rust DB Core 执行
```

## 11.3 权限 Broker 草案

```ts
// apps/desktop/src/plugins/host/permissionBroker.ts

const methodPermissions: Record<string, string[]> = {
  'db.query': ['db.query.read'],
  'db.explain': ['db.query.explain'],
  'db.listTables': ['db.schema.read'],
  'editor.getText': ['editor.read'],
  'editor.replaceSelection': ['editor.write'],
  'storage.get': ['storage.local'],
  'storage.set': ['storage.local'],
};

export const permissionBroker = {
  async assertAllowed(extensionId: string, method: string, params: unknown) {
    const required = methodPermissions[method] ?? [];
    const granted = await getGrantedPermissions(extensionId);

    for (const permission of required) {
      if (!granted.includes(permission)) {
        throw new Error(`Extension ${extensionId} requires permission: ${permission}`);
      }
    }

    if (method === 'db.query') {
      await assertSafeSqlExecution(extensionId, params);
    }
  },
};

async function getGrantedPermissions(extensionId: string): Promise<string[]> {
  // 从本地 extension registry 读取用户授权
  return [];
}

async function assertSafeSqlExecution(extensionId: string, params: unknown) {
  const sql = String((params as any)?.sql ?? '')
    .trim()
    .toLowerCase();

  const dangerous =
    sql.startsWith('drop ') ||
    sql.startsWith('truncate ') ||
    sql.startsWith('alter ') ||
    sql.startsWith('delete ') ||
    sql.startsWith('update ') ||
    sql.startsWith('insert ');

  if (dangerous) {
    throw new Error('Dangerous SQL execution from plugin requires explicit user confirmation.');
  }
}
```

---

# 12. 插件市场设计

## 12.1 市场架构

```txt
SQL GUI App
   │
   │ HTTPS
   ▼
Marketplace API
   │
   ├─ Search Index
   ├─ Plugin Metadata DB
   ├─ Review / Rating DB
   ├─ Publisher Accounts
   ├─ Signature Service
   └─ Package Storage / CDN
```

## 12.2 市场 API

```txt
GET  /api/extensions/search?q=&category=&sort=
GET  /api/extensions/:publisher/:name
GET  /api/extensions/:publisher/:name/versions
GET  /api/extensions/:publisher/:name/download/:version
POST /api/extensions/publish
POST /api/extensions/:id/reviews
```

## 12.3 插件市场数据结构

```ts
export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  categories: string[];
  iconUrl?: string;
  downloadUrl: string;
  readme: string;
  changelog?: string;
  downloads: number;
  rating: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  engines: {
    sqlgui: string;
  };
  permissions: PluginPermission[];
  sha256: string;
  signature: string;
}
```

---

## 12.4 安装流程

```txt
用户点击安装
   ↓
下载 .sgx 插件包
   ↓
校验 sha256
   ↓
校验签名
   ↓
解压到本地 extensions 目录
   ↓
读取 manifest
   ↓
展示权限确认
   ↓
写入 installed-extensions.json
   ↓
注册 contributions
   ↓
按 activationEvents 延迟激活
```

## 12.5 本地插件目录

```txt
~/.sqlgui/
├─ extensions/
│  ├─ sqlgui.explain-viewer-0.1.0/
│  │  ├─ sqlgui.extension.json
│  │  ├─ dist/extension.js
│  │  └─ README.md
│  └─ baicie.sql-formatter-0.2.0/
│
├─ extension-state/
│  ├─ sqlgui.explain-viewer.json
│  └─ baicie.sql-formatter.json
│
├─ installed-extensions.json
└─ marketplace-cache.json
```

---

# 13. Rust 插件安装草案

```rust
// apps/desktop/src-tauri/src/commands/extension.rs

use tauri::State;
use crate::state::AppState;
use sqlgui_extension::{InstallRequest, InstalledExtension};

#[tauri::command]
pub async fn extension_install(
    state: State<'_, AppState>,
    request: InstallRequest,
) -> Result<InstalledExtension, String> {
    state
        .extension_manager
        .install(request)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn extension_list_installed(
    state: State<'_, AppState>,
) -> Result<Vec<InstalledExtension>, String> {
    state
        .extension_manager
        .list_installed()
        .await
        .map_err(|err| err.to_string())
}
```

```rust
// crates/sqlgui-extension/src/types.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub download_url: String,
    pub expected_sha256: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledExtension {
    pub id: String,
    pub publisher: String,
    pub name: String,
    pub version: String,
    pub display_name: String,
    pub path: String,
    pub enabled: bool,
    pub permissions: Vec<String>,
}
```

```rust
// crates/sqlgui-extension/src/manager.rs

use crate::types::*;
use anyhow::Result;

pub struct ExtensionManager {
    extension_dir: std::path::PathBuf,
}

impl ExtensionManager {
    pub fn new(extension_dir: std::path::PathBuf) -> Self {
        Self { extension_dir }
    }

    pub async fn install(
        &self,
        request: InstallRequest,
    ) -> Result<InstalledExtension> {
        let bytes = self.download(&request.download_url).await?;

        self.verify_sha256(&bytes, &request.expected_sha256)?;
        self.verify_signature(&bytes, &request.signature)?;

        let extension = self.extract_and_read_manifest(bytes).await?;

        self.write_installed_registry(&extension).await?;

        Ok(extension)
    }

    pub async fn list_installed(&self) -> Result<Vec<InstalledExtension>> {
        // 读取 installed-extensions.json
        Ok(vec![])
    }

    async fn download(&self, _url: &str) -> Result<Vec<u8>> {
        todo!()
    }

    fn verify_sha256(&self, _bytes: &[u8], _expected: &str) -> Result<()> {
        todo!()
    }

    fn verify_signature(&self, _bytes: &[u8], _signature: &str) -> Result<()> {
        todo!()
    }

    async fn extract_and_read_manifest(
        &self,
        _bytes: Vec<u8>,
    ) -> Result<InstalledExtension> {
        todo!()
    }

    async fn write_installed_registry(
        &self,
        _extension: &InstalledExtension,
    ) -> Result<()> {
        todo!()
    }
}
```

---

# 14. 插件市场 UI

## 14.1 页面结构

```txt
Extensions
├─ Marketplace
│  ├─ Search
│  ├─ Category Filter
│  ├─ Extension List
│  └─ Extension Detail
│
├─ Installed
│  ├─ Enable / Disable
│  ├─ Uninstall
│  ├─ Settings
│  └─ Permissions
│
└─ Development
   ├─ Load From Folder
   ├─ Reload Extension Host
   └─ Show Plugin Logs
```

## 14.2 React 代码草案

```tsx
// apps/desktop/src/workbench/extensions/ExtensionMarketplace.tsx

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { marketplaceService } from '@/services/marketplaceService';

export function ExtensionMarketplace() {
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const result = await marketplaceService.search(keyword);
      setItems(result.items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search extensions..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') search();
          }}
        />
        <Button onClick={search} disabled={loading}>
          Search
        </Button>
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="font-medium">{item.displayName}</CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.publisher}</span>
                <span>{item.downloads} downloads</span>
              </div>
              <Button size="sm" onClick={() => marketplaceService.install(item)}>
                Install
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

```ts
// apps/desktop/src/services/marketplaceService.ts

import { callNative } from './native/invoke';

export const marketplaceService = {
  search(query: string) {
    return callNative<{ items: any[] }>('marketplace_search', {
      query,
    });
  },

  install(extension: any) {
    return callNative('extension_install', {
      request: {
        downloadUrl: extension.downloadUrl,
        expectedSha256: extension.sha256,
        signature: extension.signature,
      },
    });
  },
};
```

---

# 15. Command System

## 15.1 命令注册

```ts
// apps/desktop/src/services/commandService.ts

type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export interface Command {
  id: string;
  title: string;
  category?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
  handler: CommandHandler;
}

class CommandService {
  private commands = new Map<string, Command>();

  register(command: Command) {
    if (this.commands.has(command.id)) {
      throw new Error(`Command already registered: ${command.id}`);
    }

    this.commands.set(command.id, command);

    return {
      dispose: () => {
        this.commands.delete(command.id);
      },
    };
  }

  async execute<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    const command = this.commands.get(id);

    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }

    return (await command.handler(...args)) as T;
  }

  getAll() {
    return Array.from(this.commands.values());
  }

  registerPluginCommand(extensionId: string, raw: any) {
    return this.register({
      id: raw.command,
      title: raw.title ?? raw.command,
      source: 'plugin',
      extensionId,
      handler: async (...args) => {
        // 转发到插件 Worker
        return pluginRuntime.invokeHandler(extensionId, raw.command, args);
      },
    });
  }
}

export const commandService = new CommandService();
```

## 15.2 核心命令

```ts
export function registerCoreCommands() {
  commandService.register({
    id: 'sql.execute',
    title: 'Execute SQL',
    category: 'SQL',
    source: 'core',
    handler: async () => {
      // 执行当前 editor SQL
    },
  });

  commandService.register({
    id: 'connection.new',
    title: 'New Connection',
    category: 'Connection',
    source: 'core',
    handler: async () => {
      // 打开连接弹窗
    },
  });

  commandService.register({
    id: 'extensions.openMarketplace',
    title: 'Open Extension Marketplace',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      // 打开插件市场
    },
  });
}
```

---

# 16. Menu System

```ts
// apps/desktop/src/services/menuService.ts

export interface MenuItem {
  command: string;
  title?: string;
  when?: string;
  group?: string;
  source: 'core' | 'plugin';
  extensionId?: string;
}

class MenuService {
  private menus = new Map<string, MenuItem[]>();

  contribute(location: string, items: MenuItem[]) {
    const current = this.menus.get(location) ?? [];
    this.menus.set(location, [...current, ...items]);
  }

  getMenu(location: string, context: Record<string, unknown>) {
    const items = this.menus.get(location) ?? [];

    return items.filter((item) => {
      if (!item.when) return true;
      return evaluateWhenClause(item.when, context);
    });
  }
}

function evaluateWhenClause(expression: string, context: Record<string, unknown>): boolean {
  // MVP 可以先做极简表达式：
  // "editorLang == sql"
  // "dbKind == postgres"
  const [key, op, value] = expression.split(/\s+/);

  if (op === '==') {
    return String(context[key]) === value;
  }

  return false;
}

export const menuService = new MenuService();
```

---

# 17. i18n 设计

目录：

```txt
src/i18n/
├─ index.ts
├─ locales/
│  ├─ zh-CN/
│  │  ├─ common.json
│  │  ├─ connection.json
│  │  └─ extension.json
│  └─ en-US/
│     ├─ common.json
│     ├─ connection.json
│     └─ extension.json
```

```ts
// src/i18n/index.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonZh from './locales/zh-CN/common.json';
import connectionZh from './locales/zh-CN/connection.json';
import extensionZh from './locales/zh-CN/extension.json';

import commonEn from './locales/en-US/common.json';
import connectionEn from './locales/en-US/connection.json';
import extensionEn from './locales/en-US/extension.json';

i18n.use(initReactI18next).init({
  lng: 'zh-CN',
  fallbackLng: 'en-US',
  ns: ['common', 'connection', 'extension'],
  defaultNS: 'common',
  resources: {
    'zh-CN': {
      common: commonZh,
      connection: connectionZh,
      extension: extensionZh,
    },
    'en-US': {
      common: commonEn,
      connection: connectionEn,
      extension: extensionEn,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
```

---

# 18. 插件开发 CLI

后面可以做一个：

```bash
sqlgui ext init
sqlgui ext dev
sqlgui ext package
sqlgui ext publish
```

插件开发目录：

```txt
my-extension/
├─ src/
│  └─ extension.ts
├─ sqlgui.extension.json
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

`package.json`：

```json
{
  "name": "sqlgui-extension-explain-viewer",
  "version": "0.1.0",
  "scripts": {
    "dev": "sqlgui ext dev",
    "build": "vite build",
    "package": "sqlgui ext package",
    "publish": "sqlgui ext publish"
  },
  "devDependencies": {
    "@sqlgui/api": "workspace:*",
    "@sqlgui/sdk": "workspace:*",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

---

# 19. 第一版功能范围

## M0：基础 SQL GUI

目标：先能用。

- 新建连接；
- 保存连接；
- 测试连接；
- SQLite / PostgreSQL / MySQL；
- SQL 编辑器；
- 执行 SQL；
- 结果表格；
- 查询历史；
- schema tree；
- 基础 i18n；
- 深色/浅色主题。

## M1：插件系统 MVP

目标：能像 VS Code 一样扩展命令/菜单。

- 插件 manifest；
- 插件安装目录；
- 插件启用/禁用；
- Web Worker 插件宿主；
- commands contribution；
- menus contribution；
- activation events；
- plugin storage；
- permission broker；
- 开发者模式 load from folder。

## M2：插件市场 MVP

目标：能搜索和安装插件。

- marketplace search；
- extension detail；
- install / uninstall；
- update；
- sha256 校验；
- 权限确认；
- 插件评分/下载量；
- 官方插件标识。

## M3：高级插件能力

- SQL formatter；
- SQL snippets；
- result renderer；
- explain viewer；
- theme；
- status bar；
- connection tree context menu；
- SQL dialect provider。

## M4：WASM / Native Trusted Plugin

- WASM 插件；
- 官方 native driver；
- SSH Tunnel；
- Oracle / SQL Server；
- 企业私有插件源。

---

# 20. 最推荐的插件市场策略

第一版市场不要开放所有能力，按等级来。

## Level 1：安全插件

允许上架：

- 主题；
- 图标；
- SQL snippets；
- SQL formatter；
- 结果渲染器；
- Explain 可视化；
- SQL 模板；
- 编辑器增强。

## Level 2：受限能力插件

需要权限提示：

- 读取当前 SQL；
- 读取 schema；
- 执行 explain；
- 查询元数据；
- 访问网络；
- 本地 storage。

## Level 3：高危插件

默认不进公开市场：

- 执行写 SQL；
- 访问本地文件；
- SSH Tunnel；
- Native driver；
- 凭据读取；
- 网络代理。

---

# 21. 最小可运行路线

我建议你第一步不要先做市场，而是先做：

```txt
Tauri Shell
  ↓
React Workbench
  ↓
Connection Manager
  ↓
Query Editor
  ↓
Result Grid
  ↓
CommandService
  ↓
Extension Manifest Loader
  ↓
Web Worker Plugin Host
```

最小插件 Demo：

```txt
插件声明一个命令：
sql.format

点击命令后：
读取当前 SQL
格式化 SQL
写回 editor
```

这个插件不碰数据库，安全、好验证。

---

# 22. 最终架构一句话

这个 SQL GUI 的本质应该是：

> **Tauri 提供安全的原生宿主，Rust 负责数据库与系统能力，React 提供类 VS Code 工作台，插件系统通过 Manifest + Contribution Points + Worker Sandbox + Permission Broker 扩展功能，插件市场只分发受限 JS/WASM 插件，Native 能力必须走官方可信通道。**

你这个项目真正的护城河不是“能连数据库”，而是：

> **能不能做出一个 SQL 工具领域的 VS Code 扩展生态。**

第一版重点别贪大，先把 **命令系统、菜单系统、插件 Manifest、插件宿主、权限 Broker、插件市场安装链路** 打牢。

[1]: https://code.visualstudio.com/api/get-started/extension-anatomy?utm_source=chatgpt.com 'Extension Anatomy'
[2]: https://v2.tauri.app/blog/tauri-20/?utm_source=chatgpt.com 'Tauri 2.0 Stable Release'
[3]: https://v2.tauri.app/develop/calling-rust/?utm_source=chatgpt.com 'Calling Rust from the Frontend'
[4]: https://v2.tauri.app/develop/plugins/?utm_source=chatgpt.com 'Plugin Development'
[5]: https://ui.shadcn.com/docs?utm_source=chatgpt.com 'Introduction - Shadcn UI'
[6]: https://react.i18next.com/latest/usetranslation-hook?utm_source=chatgpt.com 'useTranslation (hook)'
[7]: https://v2.tauri.app/plugin/sql/?utm_source=chatgpt.com 'SQL'
[8]: https://github.com/launchbadge/sqlx?utm_source=chatgpt.com 'launchbadge/sqlx'
