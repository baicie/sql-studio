下面是 **Phase 9：插件 API / SDK 详细设计与代码草案**。

这一阶段目标是：

> **定义 SQL GUI 插件开发者使用的标准 API，提供 `@sqlgui/api` 类型包和 `@sqlgui/sdk` 运行时桥接包，让插件具备统一的开发模型。**

Phase 8 已经完成：

```txt
读取 sqlgui.extension.json
注册 commands / menus / keybindings / views 贡献点
enable / disable 插件
```

Phase 9 要继续完成：

```txt
插件开发者如何写插件？
插件能调用哪些 API？
插件如何注册命令？
插件如何读取编辑器？
插件如何操作 SQL Editor？
插件如何读数据库结构？
插件如何使用本地存储？
插件如何显示通知？
插件代码如何和宿主通信？
```

但注意：

> **Phase 9 只定义 API 和 SDK，不真正实现 Web Worker Plugin Host。**

真正运行插件、隔离插件、RPC 调度放到 **Phase 10**。

---

# 1. Phase 9 核心目标

## 1.1 必做

```txt
[ ] 创建 packages/sqlgui-api
[ ] 创建 packages/sqlgui-sdk
[ ] 定义插件入口 activate/deactivate 类型
[ ] 定义 ExtensionContext
[ ] 定义 Disposable
[ ] 定义 commands API
[ ] 定义 window API
[ ] 定义 editor API
[ ] 定义 db API
[ ] 定义 views API
[ ] 定义 storage API
[ ] 定义 i18n API
[ ] 定义 clipboard API
[ ] 定义 event/emitter 基础设施
[ ] 定义插件 RPC 协议
[ ] 定义插件侧 createSqlGuiApi
[ ] 定义插件打包模板
[ ] 改造 demo 插件使用 @sqlgui/api
[ ] 输出插件开发最小示例
```

## 1.2 暂不做

```txt
[ ] 不真正启动 Worker
[ ] 不真正加载插件 bundle
[ ] 不做权限拦截
[ ] 不做插件市场发布
[ ] 不做 WASM 插件
[ ] 不做 Native 插件
[ ] 不做完整视图渲染
[ ] 不做插件调试器
```

---

# 2. Phase 9 在整体架构中的位置

```txt
Phase 8:
Manifest + Contributions
        ↓
Phase 9:
@sqlgui/api + @sqlgui/sdk
        ↓
Phase 10:
Plugin Host Worker + RPC
        ↓
Phase 11:
Permission Broker
        ↓
Phase 12:
Local Install / Package
```

Phase 9 的产物是两个包：

```txt
packages/sqlgui-api
  插件 API 类型定义，只提供 type，不依赖宿主实现

packages/sqlgui-sdk
  插件运行时 SDK，负责创建插件侧 api proxy，通过 RPC 和宿主通信
```

---

# 3. 设计原则

## 3.1 插件不能直接访问宿主内部对象

插件不能拿到：

```txt
Monaco 实例
Zustand store
Tauri invoke
真实数据库密码
真实文件系统
真实 window 主线程对象
```

插件只能拿到：

```ts
activate(api, context);
```

其中 `api` 是宿主注入的受限对象：

```ts
api.commands;
api.window;
api.editor;
api.db;
api.views;
api.storage;
api.i18n;
api.clipboard;
```

---

## 3.2 插件 API 稳定，内部实现可替换

插件开发者只依赖：

```ts
import type { SqlGuiApi, ExtensionContext } from '@sqlgui/api';
```

不依赖：

```txt
React
Tauri
Monaco
Zustand
Rust command
Worker 实现细节
```

这样后续你从 Web Worker 换成 iframe sandbox / WASM host，也不会破坏插件 API。

---

## 3.3 插件 API 设计像 VS Code，但不要一开始太大

第一版只提供高频能力：

```txt
commands
window message
editor read/write
db metadata/query-readonly
views 占位
storage.local
i18n
clipboard
```

不要一开始给：

```txt
fileSystem
network
native
secret
terminal
webview
debug
task
```

---

# 4. 包目录设计

```txt
packages/
├─ sqlgui-api/
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ index.ts
│     ├─ disposable.ts
│     ├─ event.ts
│     ├─ extension.ts
│     ├─ api.ts
│     ├─ commands.ts
│     ├─ window.ts
│     ├─ editor.ts
│     ├─ db.ts
│     ├─ views.ts
│     ├─ storage.ts
│     ├─ i18n.ts
│     ├─ clipboard.ts
│     ├─ diagnostics.ts
│     ├─ result.ts
│     ├─ manifest.ts
│     └─ rpc.ts
│
└─ sqlgui-sdk/
   ├─ package.json
   ├─ tsconfig.json
   └─ src/
      ├─ index.ts
      ├─ createSqlGuiApi.ts
      ├─ rpcClient.ts
      ├─ workerProtocol.ts
      ├─ commandRuntime.ts
      ├─ disposableStore.ts
      ├─ extensionRuntime.ts
      └─ logger.ts
```

---

# 5. `@sqlgui/api` package.json

```json
{
  "name": "@sqlgui/api",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

`@sqlgui/api` 主要是类型包，原则上不放宿主实现。

---

# 6. `@sqlgui/sdk` package.json

```json
{
  "name": "@sqlgui/sdk",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@sqlgui/api": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

# 7. 基础类型：Disposable

## 7.1 设计目的

插件注册命令、事件监听、视图、状态栏项后，需要可释放。

```ts
const disposable = api.commands.registerCommand('sql.format', handler);

context.subscriptions.push(disposable);
```

插件停用时：

```ts
for (const item of context.subscriptions) {
  item.dispose();
}
```

## 7.2 代码

```ts
// packages/sqlgui-api/src/disposable.ts

export interface Disposable {
  dispose(): void;
}

export class DisposableStore implements Disposable {
  private readonly items = new Set<Disposable>();
  private disposed = false;

  add<T extends Disposable>(item: T): T {
    if (this.disposed) {
      item.dispose();
      return item;
    }

    this.items.add(item);
    return item;
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    for (const item of this.items) {
      try {
        item.dispose();
      } catch {
        // ignore
      }
    }

    this.items.clear();
  }
}

export function toDisposable(fn: () => void): Disposable {
  return {
    dispose: fn,
  };
}
```

---

# 8. Event / Emitter

后续插件需要监听：

```txt
active editor changed
connection changed
query finished
language changed
```

先做一个基础 Event 类型。

```ts
// packages/sqlgui-api/src/event.ts

import type { Disposable } from './disposable';

export type Event<T> = (listener: (event: T) => void) => Disposable;

export class Emitter<T> implements Disposable {
  private readonly listeners = new Set<(event: T) => void>();

  readonly event: Event<T> = (listener) => {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  };

  fire(event: T): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  dispose(): void {
    this.listeners.clear();
  }
}
```

---

# 9. 插件入口类型

```ts
// packages/sqlgui-api/src/extension.ts

import type { Disposable } from './disposable';
import type { SqlGuiApi } from './api';

export interface ExtensionContext {
  readonly id: string;
  readonly name: string;
  readonly publisher: string;
  readonly version: string;

  readonly extensionPath: string;
  readonly globalStoragePath: string;

  readonly subscriptions: Disposable[];

  readonly globalState: Memento;
  readonly workspaceState: Memento;

  readonly logger: ExtensionLogger;
}

export interface Memento {
  get<T>(key: string): Promise<T | undefined>;
  get<T>(key: string, defaultValue: T): Promise<T>;
  update<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface ExtensionLogger {
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export type ActivateFunction = (api: SqlGuiApi, context: ExtensionContext) => void | Promise<void>;

export type DeactivateFunction = () => void | Promise<void>;

export interface ExtensionModule {
  activate?: ActivateFunction;
  deactivate?: DeactivateFunction;
}
```

插件写法：

```ts
import type { SqlGuiApi, ExtensionContext } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  // ...
}

export function deactivate() {}
```

---

# 10. 总 API 入口

```ts
// packages/sqlgui-api/src/api.ts

import type { CommandApi } from './commands';
import type { WindowApi } from './window';
import type { EditorApi } from './editor';
import type { DatabaseApi } from './db';
import type { ViewApi } from './views';
import type { StorageApi } from './storage';
import type { I18nApi } from './i18n';
import type { ClipboardApi } from './clipboard';
import type { DiagnosticsApi } from './diagnostics';
import type { ResultApi } from './result';

export interface SqlGuiApi {
  readonly version: string;

  readonly commands: CommandApi;
  readonly window: WindowApi;
  readonly editor: EditorApi;
  readonly db: DatabaseApi;
  readonly views: ViewApi;
  readonly storage: StorageApi;
  readonly i18n: I18nApi;
  readonly clipboard: ClipboardApi;
  readonly diagnostics: DiagnosticsApi;
  readonly result: ResultApi;
}
```

---

# 11. Commands API

## 11.1 能力

插件可以：

```txt
注册命令
执行命令
获取命令列表
```

## 11.2 类型

```ts
// packages/sqlgui-api/src/commands.ts

import type { Disposable } from './disposable';

export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export interface CommandApi {
  registerCommand(command: string, handler: CommandHandler): Disposable;

  executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T>;

  getCommands(): Promise<string[]>;
}
```

插件示例：

```ts
context.subscriptions.push(
  api.commands.registerCommand('sql.format', async () => {
    await api.window.showInformationMessage('Format SQL');
  }),
);
```

---

# 12. Window API

## 12.1 能力

第一版只给：

```txt
信息提示
警告提示
错误提示
选择项
输入框，占位
activeSqlEditor
```

## 12.2 类型

```ts
// packages/sqlgui-api/src/window.ts

import type { Event } from './event';
import type { SqlEditor } from './editor';

export interface MessageItem {
  title: string;
  isCloseAffordance?: boolean;
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
}

export interface InputBoxOptions {
  title?: string;
  prompt?: string;
  placeholder?: string;
  value?: string;
  password?: boolean;
}

export interface WindowApi {
  readonly activeSqlEditor: SqlEditor | undefined;

  readonly onDidChangeActiveSqlEditor: Event<SqlEditor | undefined>;

  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;

  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;

  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;

  showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: {
      title?: string;
      placeholder?: string;
    },
  ): Promise<T | undefined>;

  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
}
```

MVP 可以先实现 message，QuickPick / InputBox 后续实现。

---

# 13. Editor API

## 13.1 设计原则

插件不能直接拿 Monaco。
插件只能通过抽象 `SqlEditor` 操作。

## 13.2 类型

```ts
// packages/sqlgui-api/src/editor.ts

import type { Event } from './event';

export interface OpenSqlOptions {
  title?: string;
  content?: string;
  connectionId?: string;
  database?: string;
  schema?: string;
}

export interface TextRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface SqlEditor {
  readonly id: string;
  readonly title: string;
  readonly connectionId?: string;
  readonly database?: string;
  readonly schema?: string;
  readonly readonly: boolean;

  getText(): Promise<string>;

  setText(text: string): Promise<void>;

  getSelectedText(): Promise<string>;

  getSelectedTextOrDocumentText(): Promise<string>;

  replaceSelection(text: string): Promise<void>;

  insertText(text: string): Promise<void>;

  getCursorPosition(): Promise<CursorPosition | undefined>;

  revealRange(range: TextRange): Promise<void>;
}

export interface EditorApi {
  readonly onDidOpenEditor: Event<SqlEditor>;
  readonly onDidCloseEditor: Event<string>;
  readonly onDidChangeActiveEditor: Event<SqlEditor | undefined>;

  getActiveEditor(): Promise<SqlEditor | undefined>;

  getEditors(): Promise<SqlEditor[]>;

  openSql(options: OpenSqlOptions): Promise<SqlEditor>;

  closeEditor(editorId: string): Promise<void>;
}
```

---

# 14. Database API

## 14.1 第一版开放能力

Phase 9 类型上可以定义完整一点，但后续权限控制在 Phase 11 实现。

第一版推荐开放：

```txt
读取 active connection
读取连接列表
读取 schema/table/columns
执行 readonly query
explain query
```

写 SQL 暂时不要开放，或者需要 `db.query.write` 权限。

## 14.2 类型

```ts
// packages/sqlgui-api/src/db.ts

import type { Event } from './event';

export type DbKind = 'sqlite' | 'postgres' | 'mysql';

export interface DbConnection {
  id: string;
  name: string;
  kind: DbKind;
  database?: string;
  connected: boolean;
}

export interface DatabaseMeta {
  name: string;
}

export interface SchemaMeta {
  name: string;
}

export interface TableMeta {
  name: string;
  schema?: string;
  tableType: string;
}

export interface ColumnMeta {
  name: string;
  databaseType: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
}

export interface QueryRequest {
  connectionId: string;
  sql: string;
  limit?: number;
  timeoutMs?: number;
  readonly?: boolean;
}

export interface QueryResult {
  columns: ColumnMeta[];
  rows: unknown[][];
  affectedRows?: number;
  elapsedMs: number;
  truncated: boolean;
}

export interface ExplainRequest {
  connectionId: string;
  sql: string;
}

export interface DatabaseApi {
  readonly onDidChangeConnections: Event<DbConnection[]>;
  readonly onDidChangeActiveConnection: Event<DbConnection | undefined>;

  getActiveConnection(): Promise<DbConnection | undefined>;

  getConnections(): Promise<DbConnection[]>;

  listDatabases(connectionId: string): Promise<DatabaseMeta[]>;

  listSchemas(connectionId: string, database?: string): Promise<SchemaMeta[]>;

  listTables(
    connectionId: string,
    options?: {
      database?: string;
      schema?: string;
    },
  ): Promise<TableMeta[]>;

  listColumns(
    connectionId: string,
    options: {
      database?: string;
      schema?: string;
      table: string;
    },
  ): Promise<ColumnMeta[]>;

  query(request: QueryRequest): Promise<QueryResult>;

  explain(request: ExplainRequest): Promise<QueryResult>;
}
```

注意：

> `query()` 在 Phase 11 权限系统中需要区分 readonly/write。

---

# 15. Views API

Phase 9 先定义类型，不一定完全实现。

后续插件可能贡献：

```txt
侧边栏视图
底部面板视图
结果渲染器
详情视图
```

```ts
// packages/sqlgui-api/src/views.ts

import type { Disposable } from './disposable';
import type { Event } from './event';

export type ViewLocation = 'sideBar' | 'panel';

export interface ViewContext {
  readonly viewId: string;
  readonly extensionId: string;

  postMessage(message: unknown): Promise<void>;

  readonly onDidReceiveMessage: Event<unknown>;
}

export interface ViewProvider {
  resolveView(context: ViewContext): void | Promise<void>;
}

export interface WebviewOptions {
  enableScripts?: boolean;
}

export interface WebviewView {
  readonly id: string;
  readonly title: string;

  setHtml(html: string): Promise<void>;
  postMessage(message: unknown): Promise<void>;
}

export interface ViewApi {
  registerViewProvider(viewId: string, provider: ViewProvider): Disposable;

  openView(viewId: string, payload?: unknown): Promise<void>;

  createWebviewView(viewId: string, options?: WebviewOptions): Promise<WebviewView>;
}
```

MVP 阶段 `createWebviewView` 可以暂时不实现。

---

# 16. Storage API

## 16.1 设计

插件存储必须隔离：

```txt
extensionId: baicie.sql-formatter-demo
key: options
实际 key: baicie.sql-formatter-demo/options
```

插件不能访问其他插件数据。

## 16.2 类型

```ts
// packages/sqlgui-api/src/storage.ts

export interface StorageApi {
  get<T>(key: string): Promise<T | undefined>;

  get<T>(key: string, defaultValue: T): Promise<T>;

  set<T>(key: string, value: T): Promise<void>;

  delete(key: string): Promise<void>;

  keys(): Promise<string[]>;

  clear(): Promise<void>;
}
```

`ExtensionContext.globalState` 和 `api.storage` 的区别：

```txt
context.globalState:
  当前插件专属状态，推荐插件保存自身配置

api.storage:
  宿主提供的更通用 storage API，MVP 可和 globalState 指向同一个实现
```

---

# 17. i18n API

```ts
// packages/sqlgui-api/src/i18n.ts

import type { Event } from './event';

export interface I18nApi {
  readonly language: string;

  readonly onDidChangeLanguage: Event<string>;

  t(key: string, params?: Record<string, unknown>): string;
}
```

插件示例：

```ts
api.window.showInformationMessage(api.i18n.t('message.formatSuccess'));
```

---

# 18. Clipboard API

```ts
// packages/sqlgui-api/src/clipboard.ts

export interface ClipboardApi {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
}
```

---

# 19. Diagnostics API

后续 SQL 诊断、插件 lint、SQL 语法检查会用到。

Phase 9 先定义。

```ts
// packages/sqlgui-api/src/diagnostics.ts

import type { Disposable } from './disposable';
import type { TextRange } from './editor';

export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  range?: TextRange;
  source?: string;
  code?: string;
}

export interface DiagnosticsApi {
  setDiagnostics(editorId: string, diagnostics: Diagnostic[]): Promise<void>;

  clearDiagnostics(editorId: string): Promise<void>;

  createDiagnosticCollection(name: string): DiagnosticCollection;
}

export interface DiagnosticCollection extends Disposable {
  set(editorId: string, diagnostics: Diagnostic[]): Promise<void>;
  clear(editorId?: string): Promise<void>;
}
```

---

# 20. Result API

插件后面可以读当前结果、注册结果渲染器。

Phase 9 先定义基础读取能力。

```ts
// packages/sqlgui-api/src/result.ts

import type { Disposable } from './disposable';
import type { Event } from './event';
import type { QueryResult } from './db';

export interface QueryRecord {
  queryId: string;
  editorId: string;
  connectionId: string;
  sql: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
  result?: QueryResult;
  error?: string;
  elapsedMs?: number;
}

export interface ResultRendererContext {
  query: QueryRecord;
}

export interface ResultRenderer {
  render(context: ResultRendererContext): void | Promise<void>;
}

export interface ResultApi {
  readonly onDidFinishQuery: Event<QueryRecord>;

  getActiveQuery(): Promise<QueryRecord | undefined>;

  getQueries(): Promise<QueryRecord[]>;

  registerResultRenderer(rendererId: string, renderer: ResultRenderer): Disposable;
}
```

MVP 暂时不实现 `registerResultRenderer` 的真实渲染。

---

# 21. Manifest 类型复用

Phase 8 里已经定义了 manifest 类型，可以搬到 `@sqlgui/api`。

```ts
// packages/sqlgui-api/src/manifest.ts

export type ExtensionActivationEvent =
  | '*'
  | 'onStartupFinished'
  | `onCommand:${string}`
  | `onView:${string}`
  | `onDbKind:${string}`
  | `onLanguage:${string}`;

export type ExtensionPermission =
  | 'editor.read'
  | 'editor.write'
  | 'storage.local'
  | 'ui.notification'
  | 'db.connection.read'
  | 'db.schema.read'
  | 'db.query.read'
  | 'db.query.write'
  | 'db.query.explain'
  | 'network.fetch'
  | 'clipboard.read'
  | 'clipboard.write';

export interface ExtensionManifest {
  name: string;
  displayName?: string;
  publisher: string;
  version: string;
  description?: string;
  main?: string;
  icon?: string;
  engines?: {
    sqlgui?: string;
  };
  categories?: string[];
  activationEvents?: ExtensionActivationEvent[];
  permissions?: ExtensionPermission[];
  contributes?: ExtensionContributions;
}

export interface ExtensionContributions {
  commands?: CommandContribution[];
  menus?: Record<string, MenuContribution[]>;
  keybindings?: KeybindingContribution[];
  views?: ViewContributionMap;
  snippets?: SnippetContribution[];
  themes?: ThemeContribution[];
  configuration?: ConfigurationContribution;
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface MenuContribution {
  command: string;
  title?: string;
  when?: string;
  group?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  win?: string;
  linux?: string;
  when?: string;
}

export interface ViewContributionMap {
  activityBar?: ViewContribution[];
  sideBar?: ViewContribution[];
  panel?: ViewContribution[];
}

export interface ViewContribution {
  id: string;
  name: string;
  icon?: string;
  when?: string;
}

export interface SnippetContribution {
  language: 'sql';
  path: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  path: string;
  uiTheme?: 'dark' | 'light';
}

export interface ConfigurationContribution {
  title?: string;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  description?: string;
  enum?: unknown[];
}
```

---

# 22. `@sqlgui/api` index.ts

```ts
// packages/sqlgui-api/src/index.ts

export type { SqlGuiApi } from './api';

export type { Disposable } from './disposable';

export { DisposableStore, toDisposable } from './disposable';

export type { Event } from './event';

export { Emitter } from './event';

export type {
  ExtensionContext,
  ExtensionLogger,
  Memento,
  ActivateFunction,
  DeactivateFunction,
  ExtensionModule,
} from './extension';

export type { CommandApi, CommandHandler } from './commands';

export type { WindowApi, MessageItem, QuickPickItem, InputBoxOptions } from './window';

export type { EditorApi, SqlEditor, OpenSqlOptions, TextRange, CursorPosition } from './editor';

export type {
  DatabaseApi,
  DbKind,
  DbConnection,
  DatabaseMeta,
  SchemaMeta,
  TableMeta,
  ColumnMeta,
  QueryRequest,
  QueryResult,
  ExplainRequest,
} from './db';

export type { ViewApi, ViewProvider, ViewContext, WebviewView, WebviewOptions } from './views';

export type { StorageApi } from './storage';

export type { I18nApi } from './i18n';

export type { ClipboardApi } from './clipboard';

export type {
  DiagnosticsApi,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
} from './diagnostics';

export type { ResultApi, QueryRecord, ResultRenderer, ResultRendererContext } from './result';

export type {
  ExtensionManifest,
  ExtensionContributions,
  ExtensionPermission,
  ExtensionActivationEvent,
  CommandContribution,
  MenuContribution,
  KeybindingContribution,
  ViewContribution,
  ViewContributionMap,
  SnippetContribution,
  ThemeContribution,
  ConfigurationContribution,
  ConfigurationProperty,
} from './manifest';

export type { RpcRequest, RpcResponse, RpcNotification, RpcError } from './rpc';
```

---

# 23. RPC 协议设计

Phase 10 会用 Worker RPC。Phase 9 先定义协议。

## 23.1 基础协议

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
  error?: RpcError;
}

export interface RpcNotification {
  method: string;
  params?: unknown;
}

export interface RpcError {
  code: string;
  message: string;
  data?: unknown;
}

export type RpcMessage =
  | {
      type: 'rpc:request';
      request: RpcRequest;
    }
  | {
      type: 'rpc:response';
      response: RpcResponse;
    }
  | {
      type: 'rpc:notification';
      notification: RpcNotification;
    };
```

## 23.2 Worker 协议

```ts
// packages/sqlgui-sdk/src/workerProtocol.ts

import type { RpcRequest, RpcResponse, RpcNotification } from '@sqlgui/api';

export type HostToPluginMessage =
  | {
      type: 'plugin:activate';
      extensionId: string;
      context: SerializedExtensionContext;
    }
  | {
      type: 'plugin:deactivate';
    }
  | {
      type: 'plugin:invokeCommand';
      command: string;
      args: unknown[];
      requestId: string;
    }
  | {
      type: 'rpc:response';
      response: RpcResponse;
    }
  | {
      type: 'rpc:notification';
      notification: RpcNotification;
    };

export type PluginToHostMessage =
  | {
      type: 'plugin:activated';
      extensionId: string;
    }
  | {
      type: 'plugin:activationError';
      extensionId: string;
      error: string;
    }
  | {
      type: 'plugin:commandResult';
      requestId: string;
      result?: unknown;
      error?: string;
    }
  | {
      type: 'rpc:request';
      request: RpcRequest;
    }
  | {
      type: 'rpc:notification';
      notification: RpcNotification;
    }
  | {
      type: 'plugin:log';
      level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
      message: string;
      args: unknown[];
    };

export interface SerializedExtensionContext {
  id: string;
  name: string;
  publisher: string;
  version: string;
  extensionPath: string;
  globalStoragePath: string;
}
```

---

# 24. `@sqlgui/sdk`：RpcClient

插件侧所有 API 最终都走 RPC。

```ts
// packages/sqlgui-sdk/src/rpcClient.ts

import type { RpcRequest, RpcResponse, RpcNotification } from '@sqlgui/api';

export interface RpcTransport {
  postMessage(message: unknown): void;
  addMessageListener(listener: (message: unknown) => void): () => void;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export class RpcClient {
  private seq = 0;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(private readonly transport: RpcTransport) {
    this.transport.addMessageListener((message) => {
      this.handleMessage(message);
    });
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    const id = String(++this.seq);

    const request: RpcRequest = {
      id,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.transport.postMessage({
        type: 'rpc:request',
        request,
      });
    });
  }

  notify(method: string, params?: unknown): void {
    const notification: RpcNotification = {
      method,
      params,
    };

    this.transport.postMessage({
      type: 'rpc:notification',
      notification,
    });
  }

  private handleMessage(message: unknown): void {
    if (!isRpcResponseMessage(message)) return;

    const response = message.response;
    const pending = this.pending.get(response.id);

    if (!pending) return;

    this.pending.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message || response.error.code || 'RPC Error'));
      return;
    }

    pending.resolve(response.result);
  }
}

function isRpcResponseMessage(
  value: unknown,
): value is { type: 'rpc:response'; response: RpcResponse } {
  return typeof value === 'object' && value !== null && (value as any).type === 'rpc:response';
}
```

---

# 25. Worker Transport

```ts
// packages/sqlgui-sdk/src/index.ts

export { createSqlGuiApi } from './createSqlGuiApi';

export { createWorkerTransport } from './workerProtocol';

export { createExtensionRuntime } from './extensionRuntime';
```

```ts
// packages/sqlgui-sdk/src/workerProtocol.ts

export function createWorkerTransport() {
  return {
    postMessage(message: unknown) {
      globalThis.postMessage(message);
    },

    addMessageListener(listener: (message: unknown) => void) {
      const handler = (event: MessageEvent) => {
        listener(event.data);
      };

      globalThis.addEventListener('message', handler);

      return () => {
        globalThis.removeEventListener('message', handler);
      };
    },
  };
}
```

---

# 26. commandRuntime

插件注册 command 时，handler 不会直接传给宿主。
因为函数不能跨 Worker 直接传递。

所以插件侧要保存 handler，然后告诉宿主：

```txt
我注册了 command sql.format
handlerId = sql.format
```

宿主执行命令时，再发消息给插件：

```txt
plugin:invokeCommand sql.format
```

插件侧收到后执行本地 handler。

```ts
// packages/sqlgui-sdk/src/commandRuntime.ts

import type { CommandHandler, Disposable } from '@sqlgui/api';

export class CommandRuntime {
  private readonly handlers = new Map<string, CommandHandler>();

  registerCommand(
    command: string,
    handler: CommandHandler,
    notifyRegister: (command: string) => void,
    notifyUnregister: (command: string) => void,
  ): Disposable {
    this.handlers.set(command, handler);
    notifyRegister(command);

    return {
      dispose: () => {
        this.handlers.delete(command);
        notifyUnregister(command);
      },
    };
  }

  async executeLocalCommand(command: string, args: unknown[]): Promise<unknown> {
    const handler = this.handlers.get(command);

    if (!handler) {
      throw new Error(`Command handler not found: ${command}`);
    }

    return await handler(...args);
  }

  has(command: string) {
    return this.handlers.has(command);
  }

  clear() {
    this.handlers.clear();
  }
}
```

---

# 27. createSqlGuiApi

这是 Phase 9 的核心。

```ts
// packages/sqlgui-sdk/src/createSqlGuiApi.ts

import type {
  ClipboardApi,
  CommandApi,
  DatabaseApi,
  DiagnosticsApi,
  EditorApi,
  ExtensionContext,
  I18nApi,
  ResultApi,
  SqlEditor,
  SqlGuiApi,
  StorageApi,
  ViewApi,
  WindowApi,
} from '@sqlgui/api';
import { Emitter } from '@sqlgui/api';
import { RpcClient } from './rpcClient';
import { CommandRuntime } from './commandRuntime';

export interface CreateSqlGuiApiOptions {
  version: string;
  rpc: RpcClient;
  commandRuntime: CommandRuntime;
  context: ExtensionContext;
}

export function createSqlGuiApi(options: CreateSqlGuiApiOptions): SqlGuiApi {
  const { rpc, commandRuntime } = options;

  const commands: CommandApi = {
    registerCommand(command, handler) {
      return commandRuntime.registerCommand(
        command,
        handler,
        (registeredCommand) => {
          rpc.notify('commands.register', {
            command: registeredCommand,
          });
        },
        (unregisteredCommand) => {
          rpc.notify('commands.unregister', {
            command: unregisteredCommand,
          });
        },
      );
    },

    executeCommand(command, ...args) {
      return rpc.request('commands.execute', {
        command,
        args,
      });
    },

    getCommands() {
      return rpc.request('commands.getAll');
    },
  };

  const activeEditorEmitter = new Emitter<SqlEditor | undefined>();

  const windowApi: WindowApi = {
    activeSqlEditor: undefined,

    onDidChangeActiveSqlEditor: activeEditorEmitter.event,

    showInformationMessage(message, ...items) {
      return rpc.request('window.showInformationMessage', {
        message,
        items,
      });
    },

    showWarningMessage(message, ...items) {
      return rpc.request('window.showWarningMessage', {
        message,
        items,
      });
    },

    showErrorMessage(message, ...items) {
      return rpc.request('window.showErrorMessage', {
        message,
        items,
      });
    },

    showQuickPick(items, quickPickOptions) {
      return rpc.request('window.showQuickPick', {
        items,
        options: quickPickOptions,
      });
    },

    showInputBox(inputBoxOptions) {
      return rpc.request('window.showInputBox', {
        options: inputBoxOptions,
      });
    },
  };

  const editorApi: EditorApi = {
    onDidOpenEditor: new Emitter<SqlEditor>().event,
    onDidCloseEditor: new Emitter<string>().event,
    onDidChangeActiveEditor: activeEditorEmitter.event,

    getActiveEditor() {
      return rpc.request('editor.getActive');
    },

    getEditors() {
      return rpc.request('editor.getAll');
    },

    openSql(openOptions) {
      return rpc.request('editor.openSql', openOptions);
    },

    closeEditor(editorId) {
      return rpc.request('editor.close', {
        editorId,
      });
    },
  };

  const dbApi: DatabaseApi = {
    onDidChangeConnections: new Emitter<any>().event,
    onDidChangeActiveConnection: new Emitter<any>().event,

    getActiveConnection() {
      return rpc.request('db.getActiveConnection');
    },

    getConnections() {
      return rpc.request('db.getConnections');
    },

    listDatabases(connectionId) {
      return rpc.request('db.listDatabases', {
        connectionId,
      });
    },

    listSchemas(connectionId, database) {
      return rpc.request('db.listSchemas', {
        connectionId,
        database,
      });
    },

    listTables(connectionId, listOptions) {
      return rpc.request('db.listTables', {
        connectionId,
        ...listOptions,
      });
    },

    listColumns(connectionId, listOptions) {
      return rpc.request('db.listColumns', {
        connectionId,
        ...listOptions,
      });
    },

    query(request) {
      return rpc.request('db.query', request);
    },

    explain(request) {
      return rpc.request('db.explain', request);
    },
  };

  const viewsApi: ViewApi = {
    registerViewProvider(viewId) {
      rpc.notify('views.registerProvider', {
        viewId,
      });

      return {
        dispose() {
          rpc.notify('views.unregisterProvider', {
            viewId,
          });
        },
      };
    },

    openView(viewId, payload) {
      return rpc.request('views.open', {
        viewId,
        payload,
      });
    },

    createWebviewView(viewId, webviewOptions) {
      return rpc.request('views.createWebviewView', {
        viewId,
        options: webviewOptions,
      });
    },
  };

  const storageApi: StorageApi = {
    get(key, defaultValue?: unknown) {
      return rpc.request('storage.get', {
        key,
        defaultValue,
      });
    },

    set(key, value) {
      return rpc.request('storage.set', {
        key,
        value,
      });
    },

    delete(key) {
      return rpc.request('storage.delete', {
        key,
      });
    },

    keys() {
      return rpc.request('storage.keys');
    },

    clear() {
      return rpc.request('storage.clear');
    },
  };

  const i18nApi: I18nApi = {
    language: 'en-US',

    onDidChangeLanguage: new Emitter<string>().event,

    t(key, params) {
      // MVP：插件侧先请求宿主翻译
      // 后续插件语言包可在 worker 内本地翻译
      return `[${key}]`;
    },
  };

  const clipboardApi: ClipboardApi = {
    readText() {
      return rpc.request('clipboard.readText');
    },

    writeText(text) {
      return rpc.request('clipboard.writeText', {
        text,
      });
    },
  };

  const diagnosticsApi: DiagnosticsApi = {
    setDiagnostics(editorId, diagnostics) {
      return rpc.request('diagnostics.set', {
        editorId,
        diagnostics,
      });
    },

    clearDiagnostics(editorId) {
      return rpc.request('diagnostics.clear', {
        editorId,
      });
    },

    createDiagnosticCollection(name) {
      return {
        async set(editorId, diagnostics) {
          await rpc.request('diagnostics.collection.set', {
            name,
            editorId,
            diagnostics,
          });
        },

        async clear(editorId) {
          await rpc.request('diagnostics.collection.clear', {
            name,
            editorId,
          });
        },

        dispose() {
          rpc.notify('diagnostics.collection.dispose', {
            name,
          });
        },
      };
    },
  };

  const resultApi: ResultApi = {
    onDidFinishQuery: new Emitter<any>().event,

    getActiveQuery() {
      return rpc.request('result.getActiveQuery');
    },

    getQueries() {
      return rpc.request('result.getQueries');
    },

    registerResultRenderer(rendererId) {
      rpc.notify('result.registerRenderer', {
        rendererId,
      });

      return {
        dispose() {
          rpc.notify('result.unregisterRenderer', {
            rendererId,
          });
        },
      };
    },
  };

  return {
    version: options.version,
    commands,
    window: windowApi,
    editor: editorApi,
    db: dbApi,
    views: viewsApi,
    storage: storageApi,
    i18n: i18nApi,
    clipboard: clipboardApi,
    diagnostics: diagnosticsApi,
    result: resultApi,
  };
}
```

这里有一个问题：`window.activeSqlEditor` 是只读属性，但我们现在先返回 `undefined`。
Phase 10 可以通过宿主通知更新内部状态。

---

# 28. ExtensionContext 创建

```ts
// packages/sqlgui-sdk/src/extensionRuntime.ts

import type { Disposable, ExtensionContext, ExtensionLogger, Memento } from '@sqlgui/api';
import { RpcClient } from './rpcClient';

export interface CreateExtensionContextOptions {
  id: string;
  name: string;
  publisher: string;
  version: string;
  extensionPath: string;
  globalStoragePath: string;
  rpc: RpcClient;
}

export function createExtensionContext(options: CreateExtensionContextOptions): ExtensionContext {
  const globalState = createMemento(options.rpc, 'global');
  const workspaceState = createMemento(options.rpc, 'workspace');
  const logger = createLogger(options.id, options.rpc);

  return {
    id: options.id,
    name: options.name,
    publisher: options.publisher,
    version: options.version,
    extensionPath: options.extensionPath,
    globalStoragePath: options.globalStoragePath,
    subscriptions: [],
    globalState,
    workspaceState,
    logger,
  };
}

function createMemento(rpc: RpcClient, scope: 'global' | 'workspace'): Memento {
  return {
    async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
      const value = await rpc.request<T | undefined>('memento.get', {
        scope,
        key,
      });

      return value === undefined ? defaultValue : value;
    },

    update<T>(key: string, value: T): Promise<void> {
      return rpc.request('memento.update', {
        scope,
        key,
        value,
      });
    },

    delete(key: string): Promise<void> {
      return rpc.request('memento.delete', {
        scope,
        key,
      });
    },

    keys(): Promise<string[]> {
      return rpc.request('memento.keys', {
        scope,
      });
    },
  };
}

function createLogger(extensionId: string, rpc: RpcClient): ExtensionLogger {
  function log(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
    message: string,
    args: unknown[],
  ) {
    rpc.notify('extension.log', {
      extensionId,
      level,
      message,
      args,
    });
  }

  return {
    trace(message, ...args) {
      log('trace', message, args);
    },
    debug(message, ...args) {
      log('debug', message, args);
    },
    info(message, ...args) {
      log('info', message, args);
    },
    warn(message, ...args) {
      log('warn', message, args);
    },
    error(message, ...args) {
      log('error', message, args);
    },
  };
}
```

---

# 29. ExtensionRuntime

Phase 10 会由 Worker Host 使用。
Phase 9 先把插件侧运行时封好。

```ts
// packages/sqlgui-sdk/src/extensionRuntime.ts

import type { ExtensionModule } from '@sqlgui/api';
import { RpcClient } from './rpcClient';
import { CommandRuntime } from './commandRuntime';
import { createSqlGuiApi } from './createSqlGuiApi';
import { createExtensionContext } from './extensionRuntime';

export interface StartExtensionRuntimeOptions {
  version: string;
  extensionId: string;
  name: string;
  publisher: string;
  extensionVersion: string;
  extensionPath: string;
  globalStoragePath: string;
  rpc: RpcClient;
  module: ExtensionModule;
}

export async function startExtensionRuntime(options: StartExtensionRuntimeOptions) {
  const commandRuntime = new CommandRuntime();

  const context = createExtensionContext({
    id: options.extensionId,
    name: options.name,
    publisher: options.publisher,
    version: options.extensionVersion,
    extensionPath: options.extensionPath,
    globalStoragePath: options.globalStoragePath,
    rpc: options.rpc,
  });

  const api = createSqlGuiApi({
    version: options.version,
    rpc: options.rpc,
    commandRuntime,
    context,
  });

  if (options.module.activate) {
    await options.module.activate(api, context);
  }

  return {
    api,
    context,
    commandRuntime,

    async deactivate() {
      for (const disposable of context.subscriptions) {
        disposable.dispose();
      }

      if (options.module.deactivate) {
        await options.module.deactivate();
      }

      commandRuntime.clear();
    },
  };
}
```

这里有一个命名冲突：文件里同时导入 `createExtensionContext` 又在同文件定义。实际拆成两个文件更清晰：

```txt
extensionContext.ts
extensionRuntime.ts
```

---

# 30. 更正后的文件拆分

## 30.1 extensionContext.ts

```ts
// packages/sqlgui-sdk/src/extensionContext.ts

import type { ExtensionContext, ExtensionLogger, Memento } from '@sqlgui/api';
import type { RpcClient } from './rpcClient';

export interface CreateExtensionContextOptions {
  id: string;
  name: string;
  publisher: string;
  version: string;
  extensionPath: string;
  globalStoragePath: string;
  rpc: RpcClient;
}

export function createExtensionContext(options: CreateExtensionContextOptions): ExtensionContext {
  return {
    id: options.id,
    name: options.name,
    publisher: options.publisher,
    version: options.version,
    extensionPath: options.extensionPath,
    globalStoragePath: options.globalStoragePath,
    subscriptions: [],
    globalState: createMemento(options.rpc, 'global'),
    workspaceState: createMemento(options.rpc, 'workspace'),
    logger: createLogger(options.id, options.rpc),
  };
}

function createMemento(rpc: RpcClient, scope: 'global' | 'workspace'): Memento {
  return {
    async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
      const value = await rpc.request<T | undefined>('memento.get', {
        scope,
        key,
      });

      return value === undefined ? defaultValue : value;
    },

    update<T>(key: string, value: T): Promise<void> {
      return rpc.request('memento.update', {
        scope,
        key,
        value,
      });
    },

    delete(key: string): Promise<void> {
      return rpc.request('memento.delete', {
        scope,
        key,
      });
    },

    keys(): Promise<string[]> {
      return rpc.request('memento.keys', {
        scope,
      });
    },
  };
}

function createLogger(extensionId: string, rpc: RpcClient): ExtensionLogger {
  function log(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
    message: string,
    args: unknown[],
  ) {
    rpc.notify('extension.log', {
      extensionId,
      level,
      message,
      args,
    });
  }

  return {
    trace(message, ...args) {
      log('trace', message, args);
    },
    debug(message, ...args) {
      log('debug', message, args);
    },
    info(message, ...args) {
      log('info', message, args);
    },
    warn(message, ...args) {
      log('warn', message, args);
    },
    error(message, ...args) {
      log('error', message, args);
    },
  };
}
```

## 30.2 extensionRuntime.ts

```ts
// packages/sqlgui-sdk/src/extensionRuntime.ts

import type { ExtensionModule } from '@sqlgui/api';
import type { RpcClient } from './rpcClient';
import { CommandRuntime } from './commandRuntime';
import { createSqlGuiApi } from './createSqlGuiApi';
import { createExtensionContext } from './extensionContext';

export interface StartExtensionRuntimeOptions {
  appVersion: string;
  extensionId: string;
  name: string;
  publisher: string;
  extensionVersion: string;
  extensionPath: string;
  globalStoragePath: string;
  rpc: RpcClient;
  module: ExtensionModule;
}

export async function startExtensionRuntime(options: StartExtensionRuntimeOptions) {
  const commandRuntime = new CommandRuntime();

  const context = createExtensionContext({
    id: options.extensionId,
    name: options.name,
    publisher: options.publisher,
    version: options.extensionVersion,
    extensionPath: options.extensionPath,
    globalStoragePath: options.globalStoragePath,
    rpc: options.rpc,
  });

  const api = createSqlGuiApi({
    version: options.appVersion,
    rpc: options.rpc,
    commandRuntime,
    context,
  });

  if (options.module.activate) {
    await options.module.activate(api, context);
  }

  return {
    api,
    context,
    commandRuntime,

    async deactivate() {
      for (const disposable of context.subscriptions) {
        disposable.dispose();
      }

      if (options.module.deactivate) {
        await options.module.deactivate();
      }

      commandRuntime.clear();
    },
  };
}
```

---

# 31. 插件侧示例：SQL Formatter

```ts
// extensions/sql-formatter-demo/src/extension.ts

import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.logger.info('SQL Formatter activated');

  const disposable = api.commands.registerCommand('sql.format', async () => {
    const editor = await api.editor.getActiveEditor();

    if (!editor) {
      await api.window.showWarningMessage('No active SQL editor.');
      return;
    }

    const sql = await editor.getSelectedTextOrDocumentText();

    if (!sql.trim()) {
      await api.window.showWarningMessage('SQL is empty.');
      return;
    }

    const formatted = formatSql(sql);

    await editor.replaceSelection(formatted);

    await api.window.showInformationMessage('SQL formatted.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function formatSql(sql: string) {
  return sql
    .replace(/\bselect\b/gi, 'SELECT')
    .replace(/\bfrom\b/gi, '\nFROM')
    .replace(/\bwhere\b/gi, '\nWHERE')
    .replace(/\border\s+by\b/gi, '\nORDER BY')
    .replace(/\bgroup\s+by\b/gi, '\nGROUP BY')
    .replace(/\blimit\b/gi, '\nLIMIT');
}
```

---

# 32. 插件 tsconfig

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "types": []
  },
  "include": ["src"]
}
```

---

# 33. 插件 vite.config.ts

```ts
// extensions/sql-formatter-demo/vite.config.ts

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/extension.ts',
      formats: ['es'],
      fileName: () => 'extension.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['@sqlgui/api'],
    },
  },
});
```

注意：

> `@sqlgui/api` 必须 external，因为它只是类型包，运行时不应该被插件 bundle 引入。

如果插件只 import type，构建后不会保留运行时 import。

---

# 34. Demo 插件 package.json

```json
{
  "name": "sqlgui-extension-sql-formatter-demo",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@sqlgui/api": "workspace:*",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

---

# 35. Demo 插件 manifest 更新

```json
{
  "name": "sql-formatter-demo",
  "displayName": "SQL Formatter Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "description": "A demo extension that formats SQL in the editor.",
  "main": "dist/extension.js",
  "engines": {
    "sqlgui": "^0.1.0"
  },
  "categories": ["Formatter"],
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
          "when": "editorLang == sql",
          "group": "navigation"
        }
      ]
    },
    "keybindings": [
      {
        "command": "sql.format",
        "key": "mod+shift+f",
        "when": "editorLang == sql"
      }
    ]
  }
}
```

---

# 36. Host 侧需要对接的 RPC method 列表

Phase 9 先定义协议清单，Phase 10 实现。

## 36.1 commands

```txt
commands.register
commands.unregister
commands.execute
commands.getAll
```

## 36.2 window

```txt
window.showInformationMessage
window.showWarningMessage
window.showErrorMessage
window.showQuickPick
window.showInputBox
```

## 36.3 editor

```txt
editor.getActive
editor.getAll
editor.openSql
editor.close
editor.getText
editor.setText
editor.getSelectedText
editor.getSelectedTextOrDocumentText
editor.replaceSelection
editor.insertText
editor.getCursorPosition
editor.revealRange
```

## 36.4 db

```txt
db.getActiveConnection
db.getConnections
db.listDatabases
db.listSchemas
db.listTables
db.listColumns
db.query
db.explain
```

## 36.5 storage / memento

```txt
storage.get
storage.set
storage.delete
storage.keys
storage.clear

memento.get
memento.update
memento.delete
memento.keys
```

## 36.6 clipboard

```txt
clipboard.readText
clipboard.writeText
```

## 36.7 diagnostics

```txt
diagnostics.set
diagnostics.clear
diagnostics.collection.set
diagnostics.collection.clear
diagnostics.collection.dispose
```

## 36.8 result

```txt
result.getActiveQuery
result.getQueries
result.registerRenderer
result.unregisterRenderer
```

## 36.9 views

```txt
views.registerProvider
views.unregisterProvider
views.open
views.createWebviewView
```

---

# 37. Host 侧类型：PluginRpcMethod

可以提前定义，避免字符串乱飞。

```ts
// apps/desktop/src/plugins/host/pluginRpcMethods.ts

export const PluginRpcMethods = {
  CommandsRegister: 'commands.register',
  CommandsUnregister: 'commands.unregister',
  CommandsExecute: 'commands.execute',
  CommandsGetAll: 'commands.getAll',

  WindowInfo: 'window.showInformationMessage',
  WindowWarn: 'window.showWarningMessage',
  WindowError: 'window.showErrorMessage',
  WindowQuickPick: 'window.showQuickPick',
  WindowInputBox: 'window.showInputBox',

  EditorGetActive: 'editor.getActive',
  EditorGetAll: 'editor.getAll',
  EditorOpenSql: 'editor.openSql',
  EditorClose: 'editor.close',
  EditorGetText: 'editor.getText',
  EditorSetText: 'editor.setText',
  EditorGetSelectedText: 'editor.getSelectedText',
  EditorGetSelectedTextOrDocumentText: 'editor.getSelectedTextOrDocumentText',
  EditorReplaceSelection: 'editor.replaceSelection',
  EditorInsertText: 'editor.insertText',

  DbGetActiveConnection: 'db.getActiveConnection',
  DbGetConnections: 'db.getConnections',
  DbListDatabases: 'db.listDatabases',
  DbListSchemas: 'db.listSchemas',
  DbListTables: 'db.listTables',
  DbListColumns: 'db.listColumns',
  DbQuery: 'db.query',
  DbExplain: 'db.explain',

  StorageGet: 'storage.get',
  StorageSet: 'storage.set',
  StorageDelete: 'storage.delete',
  StorageKeys: 'storage.keys',
  StorageClear: 'storage.clear',
} as const;
```

---

# 38. 插件 API 与权限映射预留

Phase 9 先定义映射表，Phase 11 用。

```ts
// apps/desktop/src/plugins/permissions/apiPermissionMap.ts

import type { ExtensionPermission } from '@sqlgui/api';

export const apiPermissionMap: Record<string, ExtensionPermission[]> = {
  'editor.getActive': ['editor.read'],
  'editor.getAll': ['editor.read'],
  'editor.getText': ['editor.read'],
  'editor.getSelectedText': ['editor.read'],
  'editor.getSelectedTextOrDocumentText': ['editor.read'],

  'editor.setText': ['editor.write'],
  'editor.replaceSelection': ['editor.write'],
  'editor.insertText': ['editor.write'],

  'db.getActiveConnection': ['db.connection.read'],
  'db.getConnections': ['db.connection.read'],
  'db.listDatabases': ['db.schema.read'],
  'db.listSchemas': ['db.schema.read'],
  'db.listTables': ['db.schema.read'],
  'db.listColumns': ['db.schema.read'],

  'db.query': ['db.query.read'],
  'db.explain': ['db.query.explain'],

  'storage.get': ['storage.local'],
  'storage.set': ['storage.local'],
  'storage.delete': ['storage.local'],
  'storage.keys': ['storage.local'],
  'storage.clear': ['storage.local'],

  'clipboard.readText': ['clipboard.read'],
  'clipboard.writeText': ['clipboard.write'],

  'window.showInformationMessage': ['ui.notification'],
  'window.showWarningMessage': ['ui.notification'],
  'window.showErrorMessage': ['ui.notification'],
};
```

---

# 39. SDK 里的 Logger

```ts
// packages/sqlgui-sdk/src/logger.ts

import type { RpcClient } from './rpcClient';
import type { ExtensionLogger } from '@sqlgui/api';

export function createLogger(extensionId: string, rpc: RpcClient): ExtensionLogger {
  function send(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
    message: string,
    args: unknown[],
  ) {
    rpc.notify('extension.log', {
      extensionId,
      level,
      message,
      args,
    });
  }

  return {
    trace(message, ...args) {
      send('trace', message, args);
    },
    debug(message, ...args) {
      send('debug', message, args);
    },
    info(message, ...args) {
      send('info', message, args);
    },
    warn(message, ...args) {
      send('warn', message, args);
    },
    error(message, ...args) {
      send('error', message, args);
    },
  };
}
```

---

# 40. SDK index.ts

```ts
// packages/sqlgui-sdk/src/index.ts

export { RpcClient } from './rpcClient';

export type { RpcTransport } from './rpcClient';

export { createWorkerTransport } from './workerProtocol';

export { CommandRuntime } from './commandRuntime';

export { createSqlGuiApi } from './createSqlGuiApi';

export type { CreateSqlGuiApiOptions } from './createSqlGuiApi';

export { createExtensionContext } from './extensionContext';

export type { CreateExtensionContextOptions } from './extensionContext';

export { startExtensionRuntime } from './extensionRuntime';

export type { StartExtensionRuntimeOptions } from './extensionRuntime';
```

---

# 41. 插件开发模板

后续可以通过 CLI 生成，Phase 9 先放模板目录：

```txt
templates/
└─ extension-basic/
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts
   ├─ sqlgui.extension.json
   └─ src/
      └─ extension.ts
```

## 41.1 extension.ts

```ts
import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.subscriptions.push(
    api.commands.registerCommand('example.hello', async () => {
      await api.window.showInformationMessage('Hello from SQL GUI extension!');
    }),
  );
}

export function deactivate() {}
```

## 41.2 manifest

```json
{
  "name": "hello-world",
  "displayName": "Hello World",
  "publisher": "example",
  "version": "0.1.0",
  "description": "A basic SQL GUI extension.",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:example.hello"],
  "permissions": ["ui.notification"],
  "contributes": {
    "commands": [
      {
        "command": "example.hello",
        "title": "Hello World",
        "category": "Example"
      }
    ]
  }
}
```

---

# 42. API 文档草案

可以在 `docs/extension-api.md` 写：

````md
# SQL GUI Extension API

## Entry

```ts
export async function activate(api: SqlGuiApi, context: ExtensionContext) {}
export function deactivate() {}
```
````

## Register command

```ts
context.subscriptions.push(api.commands.registerCommand('sql.format', async () => {}));
```

## Editor

```ts
const editor = await api.editor.getActiveEditor();
const sql = await editor?.getSelectedTextOrDocumentText();
```

## Database

```ts
const connection = await api.db.getActiveConnection();
const tables = await api.db.listTables(connection.id);
```

````

---

# 43. Phase 9 开发顺序

```txt
1. 创建 packages/sqlgui-api
2. 定义 Disposable / Event
3. 定义 ExtensionContext
4. 定义 SqlGuiApi 总入口
5. 定义 commands/window/editor/db/views/storage/i18n/clipboard/result API
6. 定义 manifest 类型并从 Phase 8 迁移
7. 定义 rpc.ts
8. 创建 packages/sqlgui-sdk
9. 实现 RpcClient
10. 实现 CommandRuntime
11. 实现 createSqlGuiApi
12. 实现 createExtensionContext
13. 实现 startExtensionRuntime
14. 改造 sql-formatter-demo 使用 @sqlgui/api
15. 添加插件 vite 构建
16. 添加 templates/extension-basic
17. 添加 API 文档
18. 添加 apiPermissionMap 预留
19. pnpm build 全部通过
20. 为 Phase 10 的 Plugin Host 留好入口
````

---

# 44. Phase 9 验收标准

```txt
[ ] @sqlgui/api 能 build
[ ] @sqlgui/sdk 能 build
[ ] demo 插件能 typecheck
[ ] demo 插件能 vite build 成 dist/extension.js
[ ] 插件代码能 import type { SqlGuiApi, ExtensionContext }
[ ] 插件能写 activate/deactivate
[ ] 插件能注册 command 的类型检查通过
[ ] 插件能调用 editor/db/window/storage API 的类型检查通过
[ ] RPC method 命名已统一
[ ] 插件 API 与权限映射表已预留
[ ] extension-basic 模板可用
```

---

# 45. 最小闭环

Phase 9 最小闭环是：

```txt
创建 @sqlgui/api
  ↓
定义 SqlGuiApi / ExtensionContext
  ↓
sql-formatter-demo 使用类型写 activate
  ↓
vite build 插件
  ↓
dist/extension.js 生成成功
```

此时虽然插件还不能真正运行，但你已经完成了：

> **插件开发者 API 契约。**

---

# 46. Phase 9 的关键价值

Phase 9 最重要的是确定未来插件生态的“语言”。

插件开发者以后看到的是：

```ts
export async function activate(api, context) {
  context.subscriptions.push(api.commands.registerCommand('xxx', async () => {}));
}
```

而不是看到你的内部实现：

```txt
Zustand
Monaco
Tauri invoke
Rust command
Worker RPC
ConnectionStore
EditorStore
ResultStore
```

这就是插件系统的边界。

所以 Phase 9 的核心不是“写很多实现”，而是：

```txt
定义稳定 API
定义插件入口
定义 RPC 协议
定义 SDK 代理层
定义 demo 插件开发模式
```

后续 Phase 10 只要把 RPC 接到真实宿主服务，插件就能跑起来。
