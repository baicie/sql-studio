下面给你一版 **SQL GUI MVP 路线图 + Todo**，基于前面确定的方向：

> **Tauri2 + React + shadcn/ui + i18n + Rust DB 层 + VS Code 风格插件系统 + 插件市场**

核心原则：

> **先做一个能用的 SQL GUI，再做一个能扩展的 SQL GUI，最后再做插件市场。**

不要一上来就做完整插件市场、签名、WASM、Native 插件，不然会拖死。

---

# 一、MVP 总目标

第一版 MVP 要做到：

```txt
1. 能创建数据库连接
2. 能执行 SQL
3. 能展示结果表格
4. 能查看库/表结构
5. 有基础工作台布局
6. 有命令系统
7. 有插件 Manifest
8. 能加载本地插件
9. 插件能注册命令/菜单
10. 有一个“假插件市场”页面，可以安装本地/远程 mock 插件
```

暂时不做：

```txt
1. 真正线上插件市场
2. 插件签名
3. 插件评分评论
4. Native 插件
5. WASM 插件
6. SSH Tunnel
7. Oracle / SQL Server
8. AI SQL 助手
9. 复杂权限弹窗
10. 多窗口复杂同步
```

---

# 二、阶段路线图

## Phase 0：项目初始化

目标：把工程骨架搭起来。

预计：1～2 天。

### Todo

```txt
[ ] 使用 full-monorepo 模板初始化项目
[ ] 重命名项目为 sqlgui
[ ] 重命名 apps/desktop 为 sqlgui-desktop
[ ] 重命名 @repo/ui 为 @sqlgui/ui
[ ] 重命名 @repo/utils 为 @sqlgui/utils
[ ] 添加 packages/sqlgui-api
[ ] 添加 packages/sqlgui-sdk
[ ] 添加 packages/i18n
[ ] 添加 packages/extension-schema
[ ] 添加 crates/sqlgui-db
[ ] 添加 crates/sqlgui-extension
[ ] 添加 crates/sqlgui-common
[ ] 添加 extensions/sql-formatter-demo
[ ] 配置根 Cargo workspace
[ ] 配置 pnpm workspace 包含 extensions/*
[ ] 确认 pnpm install 正常
[ ] 确认 pnpm --filter sqlgui-desktop tauri:dev 正常
```

建议目录：

```txt
sqlgui/
├─ apps/
│  └─ desktop/
├─ packages/
│  ├─ ui/
│  ├─ utils/
│  ├─ i18n/
│  ├─ sqlgui-api/
│  ├─ sqlgui-sdk/
│  └─ extension-schema/
├─ crates/
│  ├─ sqlgui-db/
│  ├─ sqlgui-extension/
│  └─ sqlgui-common/
├─ extensions/
│  └─ sql-formatter-demo/
├─ package.json
├─ pnpm-workspace.yaml
└─ Cargo.toml
```

---

## Phase 1：Workbench 基础布局

目标：先做出像 VS Code 的壳。

预计：2～4 天。

### 页面结构

```txt
TitleBar
ActivityBar
SideBar
EditorArea
BottomPanel
StatusBar
CommandPalette
```

### Todo

```txt
[ ] 创建 Workbench 根组件
[ ] 实现左侧 ActivityBar
[ ] 实现 SideBar 容器
[ ] 实现 EditorArea 容器
[ ] 实现 BottomPanel 容器
[ ] 实现 StatusBar
[ ] 接入 shadcn/ui
[ ] 接入 Tailwind
[ ] 接入 lucide-react 图标
[ ] 实现基础主题变量
[ ] 实现暗色模式
[ ] 实现布局状态持久化
```

### 推荐文件

```txt
apps/desktop/src/workbench/
├─ Workbench.tsx
├─ layout/
│  ├─ ActivityBar.tsx
│  ├─ SideBar.tsx
│  ├─ EditorArea.tsx
│  ├─ BottomPanel.tsx
│  └─ StatusBar.tsx
├─ command/
│  └─ CommandPalette.tsx
└─ store/
   └─ workbenchStore.ts
```

---

## Phase 2：核心服务系统

目标：先做 VS Code 风格的基础服务，不急着写业务。

预计：3～5 天。

### 必须实现的服务

```txt
CommandService
MenuService
KeybindingService
NotificationService
StorageService
EditorService
ConnectionService
ExtensionService
```

### Todo

```txt
[ ] 实现 CommandService
[ ] 支持 registerCommand
[ ] 支持 executeCommand
[ ] 支持 unregisterCommand
[ ] 实现 MenuService
[ ] 支持菜单贡献点
[ ] 支持 when 条件表达式 MVP
[ ] 实现 KeybindingService
[ ] 支持快捷键绑定
[ ] 实现 NotificationService
[ ] 实现 LocalStorage/文件级 StorageService
[ ] 实现 Command Palette
[ ] Command Palette 能搜索和执行命令
[ ] 注册核心命令 sql.execute
[ ] 注册核心命令 connection.new
[ ] 注册核心命令 extensions.open
```

### MVP 命令示例

```txt
sql.execute
sql.format
connection.new
connection.test
connection.disconnect
editor.newQuery
extensions.openMarketplace
extensions.reload
```

---

## Phase 3：Rust DB Core MVP

目标：能连接数据库、执行 SQL、返回结果。

预计：5～8 天。

第一版建议支持：

```txt
SQLite
PostgreSQL
MySQL
```

但如果你想快，第一阶段只做：

```txt
SQLite + PostgreSQL
```

### Todo

```txt
[ ] crates/sqlgui-db 定义 ConnectionConfig
[ ] 定义 QueryRequest
[ ] 定义 QueryResult
[ ] 定义 ColumnMeta
[ ] 定义 CellValue
[ ] 实现 PoolManager
[ ] 实现 SQLite connector
[ ] 实现 PostgreSQL connector
[ ] 实现 MySQL connector，可放后面
[ ] 实现 test_connection
[ ] 实现 open_connection
[ ] 实现 close_connection
[ ] 实现 execute_query
[ ] 实现 list_databases
[ ] 实现 list_schemas
[ ] 实现 list_tables
[ ] 实现 list_columns
[ ] 统一错误类型 DbError
[ ] Tauri command 暴露 db_test_connection
[ ] Tauri command 暴露 db_open_connection
[ ] Tauri command 暴露 db_execute_query
[ ] Tauri command 暴露 db_list_tables
```

### 关键要求

```txt
[ ] 查询默认 limit 1000
[ ] 查询默认 timeout 30 秒
[ ] 非 SELECT 语句先弹确认
[ ] 结果过大要 truncated: true
[ ] password 不回传前端
[ ] 连接密码后续接 keyring，MVP 可先本地加密/明文警告
```

---

## Phase 4：连接管理 UI

目标：用户能新建连接、测试连接、保存连接、看到连接树。

预计：3～5 天。

### Todo

```txt
[ ] 实现 ConnectionDialog
[ ] 支持 SQLite 文件路径
[ ] 支持 PostgreSQL host/port/user/password/database
[ ] 支持 MySQL host/port/user/password/database
[ ] 实现 Test Connection 按钮
[ ] 实现 Save Connection
[ ] 实现 ConnectionTree
[ ] 展示连接列表
[ ] 展示数据库
[ ] 展示 schema
[ ] 展示 table
[ ] 右键表：生成 SELECT 语句
[ ] 右键表：查看结构
[ ] 保存连接到本地配置
[ ] 密码暂时不展示，不复制，不日志输出
```

### 连接树 MVP

```txt
Connections
└─ Local SQLite
   └─ main
      └─ tables
         ├─ users
         └─ orders
└─ PostgreSQL Dev
   └─ public
      └─ tables
         ├─ users
         └─ logs
```

---

## Phase 5：SQL 编辑器

目标：能写 SQL、执行 SQL、显示基本高亮。

预计：3～5 天。

建议用：

```txt
Monaco Editor
```

或者想轻一点：

```txt
CodeMirror 6
```

如果对标 VS Code，优先 Monaco。

### Todo

```txt
[ ] 接入 Monaco Editor
[ ] 创建 SqlEditor 组件
[ ] 支持多 Tab
[ ] 支持新建 Query Tab
[ ] 支持当前连接绑定
[ ] 支持 Ctrl/Cmd + Enter 执行当前 SQL
[ ] 支持选中 SQL 执行
[ ] 没有选中时执行全文
[ ] 支持 SQL 基础高亮
[ ] 支持编辑器主题跟随应用主题
[ ] 支持保存草稿到本地
[ ] 支持最近打开 SQL
```

### 编辑器服务

```txt
[ ] activeEditor
[ ] getActiveEditorText
[ ] getSelectedText
[ ] getSelectedTextOrFullText
[ ] replaceSelection
[ ] insertText
[ ] createEditor
[ ] closeEditor
```

---

## Phase 6：查询结果表格

目标：能展示查询结果，并具备基础可用性。

预计：4～6 天。

建议：

```txt
TanStack Table + TanStack Virtual
```

### Todo

```txt
[ ] 实现 ResultGrid
[ ] 支持列名展示
[ ] 支持行号
[ ] 支持 NULL 展示
[ ] 支持复制单元格
[ ] 支持复制整行
[ ] 支持复制全部结果
[ ] 支持 CSV 导出
[ ] 支持 JSON 导出
[ ] 支持大数据虚拟滚动
[ ] 支持查询耗时显示
[ ] 支持 affected rows 显示
[ ] 支持 truncated 提示
[ ] 支持结果面板多 Tab
[ ] 支持错误面板展示
```

### BottomPanel

```txt
Tabs:
- Results
- Messages
- Problems
- Logs
```

---

## Phase 7：i18n

目标：基础国际化能力先搭好，不然后面改很烦。

预计：1～2 天。

### Todo

```txt
[ ] 接入 react-i18next
[ ] 支持 zh-CN
[ ] 支持 en-US
[ ] 抽离 common.json
[ ] 抽离 connection.json
[ ] 抽离 editor.json
[ ] 抽离 extension.json
[ ] 设置语言切换入口
[ ] 语言配置持久化
```

### 目录

```txt
packages/i18n/
├─ locales/
│  ├─ zh-CN/
│  └─ en-US/
└─ index.ts
```

---

# 三、插件系统 MVP

这是重点，但第一版不要做太大。

目标：

> **插件可以通过 manifest 注册命令和菜单，并运行在 Web Worker 里。**

预计：7～12 天。

---

## Phase 8：插件 Manifest

### Todo

```txt
[ ] 定义 sqlgui.extension.json schema
[ ] 定义 name/displayName/publisher/version/main
[ ] 定义 activationEvents
[ ] 定义 permissions
[ ] 定义 contributes.commands
[ ] 定义 contributes.menus
[ ] 定义 contributes.keybindings
[ ] 定义 contributes.views，暂缓实现
[ ] 定义 contributes.snippets，暂缓实现
[ ] 定义 contributes.themes，暂缓实现
[ ] 实现 manifest 校验
[ ] 实现 manifest 读取
[ ] 实现 contribution 注册
```

### MVP Manifest

```json
{
  "name": "sql-formatter-demo",
  "displayName": "SQL Formatter Demo",
  "publisher": "baicie",
  "version": "0.1.0",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:sql.format"],
  "permissions": ["editor.read", "editor.write"],
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

---

## Phase 9：插件 API 包

目标：插件开发者能拿到类型。

### Todo

```txt
[ ] packages/sqlgui-api 定义 SqlGuiApi
[ ] 定义 ExtensionContext
[ ] 定义 Disposable
[ ] 定义 commands API
[ ] 定义 window API
[ ] 定义 editor API
[ ] 定义 db API，MVP 可只读
[ ] 定义 storage API
[ ] 定义 views API，先占位
[ ] 导出类型
[ ] 写一个插件示例
```

### 第一版 API 只做这些

```ts
sqlgui.commands.registerCommand();
sqlgui.commands.executeCommand();
sqlgui.window.showInformationMessage();
sqlgui.window.showErrorMessage();
sqlgui.editor.getActiveText();
sqlgui.editor.getSelectedTextOrFullText();
sqlgui.editor.replaceSelection();
sqlgui.storage.get();
sqlgui.storage.set();
```

暂时不要开放：

```txt
db.query.write
fileSystem
network.fetch
native
secret
```

---

## Phase 10：插件宿主 Web Worker

目标：插件不能直接跑在主线程。

### Todo

```txt
[ ] 实现 PluginHostManager
[ ] 每个插件一个 Worker，或者第一版共用一个 Worker
[ ] 实现插件加载
[ ] 实现 activate 调用
[ ] 实现 deactivate 调用
[ ] 实现 RPC request/response
[ ] 实现插件侧 createSqlGuiApi
[ ] 插件 command handler 能回调执行
[ ] 插件异常不能导致主应用崩溃
[ ] 插件日志收集到 Plugin Logs
[ ] 支持 Reload Extension Host
```

### MVP 插件运行流程

```txt
读取 manifest
  ↓
注册 contributes.commands
  ↓
用户执行命令
  ↓
触发 activationEvent
  ↓
创建 Worker
  ↓
加载 extension.js
  ↓
调用 activate(api, context)
  ↓
执行 command handler
```

---

## Phase 11：插件权限系统

目标：先做最小权限校验。

### Todo

```txt
[ ] 定义权限枚举
[ ] 插件安装时读取 permissions
[ ] 本地保存 grantedPermissions
[ ] API 调用前检查权限
[ ] editor.read 保护读取编辑器
[ ] editor.write 保护修改编辑器
[ ] storage.local 保护插件存储
[ ] db.schema.read 保护读取表结构
[ ] db.query.read 暂缓开放
[ ] db.query.write MVP 禁止
[ ] 权限不足时抛出标准错误
```

### MVP 权限

```txt
editor.read
editor.write
storage.local
ui.notification
db.connection.read
db.schema.read
```

先不要做：

```txt
db.query.write
network.fetch
file.read
file.write
secret.read
```

---

## Phase 12：插件本地安装

目标：能从本地目录加载插件。

### Todo

```txt
[ ] 定义本地插件目录 ~/.sqlgui/extensions
[ ] 支持 Load Extension From Folder
[ ] 支持安装 .sgx 包，MVP 可以先不压缩
[ ] 读取插件 manifest
[ ] 复制插件到本地目录
[ ] 写入 installed-extensions.json
[ ] 支持 enable/disable
[ ] 支持 uninstall
[ ] 支持 reload
[ ] 插件错误展示
```

第一版可以先直接加载：

```txt
extensions/sql-formatter-demo
```

不要急着做 zip 包。

---

# 四、插件市场 MVP

目标：

> **先做一个“假的插件市场”，用本地 JSON 模拟远程市场。**

预计：4～7 天。

不要一开始做服务端、账号、发布、签名。

---

## Phase 13：Mock Marketplace

### Todo

```txt
[ ] 创建 marketplace.mock.json
[ ] 定义 MarketplaceExtension 类型
[ ] 实现 MarketplaceService.search
[ ] 实现 Marketplace 页面
[ ] 支持搜索插件
[ ] 支持分类筛选
[ ] 支持查看详情
[ ] 支持安装
[ ] 支持卸载
[ ] 支持启用/禁用
[ ] 展示插件权限
[ ] 展示插件版本
[ ] 展示插件 README
```

### Mock 数据

```json
[
  {
    "id": "baicie.sql-formatter-demo",
    "name": "sql-formatter-demo",
    "displayName": "SQL Formatter Demo",
    "publisher": "baicie",
    "version": "0.1.0",
    "description": "Format SQL in editor.",
    "categories": ["Formatter"],
    "permissions": ["editor.read", "editor.write"],
    "downloadUrl": "local://extensions/sql-formatter-demo",
    "verified": true
  }
]
```

---

## Phase 14：插件管理 UI

### Todo

```txt
[ ] Installed Extensions 页面
[ ] Marketplace 页面
[ ] Extension Detail 页面
[ ] 权限展示
[ ] Enable / Disable
[ ] Uninstall
[ ] Reload
[ ] 查看插件日志
[ ] 查看插件贡献的命令
[ ] 查看插件贡献的菜单
```

---

# 五、MVP 结束标准

做到下面这些，就算 MVP 完成：

```txt
[ ] 用户可以创建 SQLite/PostgreSQL 连接
[ ] 用户可以打开 SQL 编辑器
[ ] 用户可以执行 SQL
[ ] 用户可以看到结果表格
[ ] 用户可以在连接树查看表
[ ] 用户可以用 Command Palette 执行命令
[ ] 用户可以打开插件页面
[ ] 用户可以安装 sql-formatter-demo 插件
[ ] 插件可以注册 sql.format 命令
[ ] 插件可以读取当前 SQL
[ ] 插件可以格式化并替换当前 SQL
[ ] 插件运行在 Worker 中
[ ] 插件没有权限时 API 调用失败
[ ] 应用支持中文/英文基础切换
```

---

# 六、推荐开发顺序

不要按模块平铺开发，按“可运行闭环”推进。

## 第一个闭环：壳能跑

```txt
full-monorepo 起项目
  ↓
Tauri dev 能启动
  ↓
Workbench 基础布局
  ↓
Command Palette 能打开
```

## 第二个闭环：SQL 能跑

```txt
Connection Dialog
  ↓
Rust db_test_connection
  ↓
Rust db_execute_query
  ↓
SqlEditor
  ↓
ResultGrid
```

## 第三个闭环：插件能跑

```txt
Manifest Loader
  ↓
Command Contribution
  ↓
Worker Plugin Host
  ↓
sql.format demo
```

## 第四个闭环：市场能装

```txt
Marketplace mock JSON
  ↓
Extension Detail
  ↓
Install local plugin
  ↓
Enable / Disable
  ↓
Reload Extension Host
```

---

# 七、两个月 MVP 时间表

## 第 1 周：工程 + Workbench

```txt
[ ] 初始化 full-monorepo
[ ] 改名 sqlgui
[ ] Tauri2 跑通
[ ] shadcn/ui 接入
[ ] Workbench 布局
[ ] CommandService
[ ] Command Palette
```

## 第 2 周：DB Core

```txt
[ ] Rust DB 类型定义
[ ] SQLite connector
[ ] PostgreSQL connector
[ ] Tauri commands
[ ] 前端 dbService
[ ] 连接测试
```

## 第 3 周：SQL 编辑器 + 结果表格

```txt
[ ] Monaco Editor
[ ] 多 Tab
[ ] 执行 SQL
[ ] ResultGrid
[ ] 错误展示
[ ] 查询历史
```

## 第 4 周：连接树 + 基础体验

```txt
[ ] ConnectionTree
[ ] list tables
[ ] list columns
[ ] 右键生成 SELECT
[ ] 状态栏
[ ] i18n
[ ] 本地配置存储
```

## 第 5 周：插件 Manifest + Command Contribution

```txt
[ ] extension schema
[ ] manifest loader
[ ] command contribution
[ ] menu contribution
[ ] activation events
[ ] sql-formatter-demo manifest
```

## 第 6 周：Plugin Host

```txt
[ ] Web Worker plugin host
[ ] RPC bridge
[ ] @sqlgui/api
[ ] @sqlgui/sdk
[ ] 插件 activate/deactivate
[ ] 插件日志
[ ] 插件错误隔离
```

## 第 7 周：权限 + 本地安装

```txt
[ ] permission broker
[ ] editor.read/editor.write
[ ] storage.local
[ ] Load Extension From Folder
[ ] Enable/Disable
[ ] Uninstall
[ ] Reload Extension Host
```

## 第 8 周：Mock 插件市场 + 收尾

```txt
[ ] Marketplace mock JSON
[ ] Marketplace UI
[ ] Extension Detail
[ ] Install from local/mock
[ ] Installed Extensions 页面
[ ] README
[ ] MVP demo 录屏
```

---

# 八、第一批核心文件 Todo

## 前端

```txt
apps/desktop/src/
├─ main.tsx
├─ App.tsx
├─ workbench/
│  ├─ Workbench.tsx
│  ├─ layout/
│  ├─ command/
│  ├─ editor/
│  ├─ connections/
│  ├─ results/
│  └─ extensions/
├─ services/
│  ├─ commandService.ts
│  ├─ menuService.ts
│  ├─ keybindingService.ts
│  ├─ editorService.ts
│  ├─ connectionService.ts
│  ├─ extensionService.ts
│  ├─ marketplaceService.ts
│  └─ native/
│     └─ invoke.ts
├─ plugins/
│  ├─ host/
│  │  ├─ PluginHost.ts
│  │  ├─ PluginHostManager.ts
│  │  ├─ rpc.ts
│  │  └─ permissionBroker.ts
│  ├─ manifest/
│  │  ├─ manifestLoader.ts
│  │  └─ contributionRegistry.ts
│  └─ marketplace/
│     └─ marketplace.mock.json
└─ i18n/
```

## Rust

```txt
apps/desktop/src-tauri/src/
├─ lib.rs
├─ state.rs
├─ commands/
│  ├─ db.rs
│  ├─ extension.rs
│  └─ marketplace.rs
```

```txt
crates/sqlgui-db/src/
├─ lib.rs
├─ types.rs
├─ error.rs
├─ pool.rs
├─ manager.rs
├─ connector.rs
├─ sqlite.rs
├─ postgres.rs
└─ mysql.rs
```

```txt
crates/sqlgui-extension/src/
├─ lib.rs
├─ types.rs
├─ manifest.rs
├─ manager.rs
├─ installer.rs
└─ permissions.rs
```

---

# 九、插件系统 Todo 细化

## 1. 插件 Manifest

```txt
[ ] 定义 ExtensionManifest TS 类型
[ ] 定义 ExtensionManifest Rust 类型
[ ] 定义 JSON Schema
[ ] 校验 name
[ ] 校验 publisher
[ ] 校验 version
[ ] 校验 main 文件存在
[ ] 校验 activationEvents
[ ] 校验 permissions
[ ] 校验 contributes.commands
[ ] 校验 contributes.menus
```

## 2. Contribution Registry

```txt
[ ] registerCommandContribution
[ ] registerMenuContribution
[ ] registerKeybindingContribution
[ ] registerViewContribution，占位
[ ] unregisterExtensionContributions
[ ] extension disable 时移除贡献
[ ] extension uninstall 时移除贡献
```

## 3. Activation System

```txt
[ ] onStartupFinished
[ ] onCommand:xxx
[ ] onView:xxx，暂缓
[ ] onDbKind:postgres，暂缓
[ ] activation 去重
[ ] activation 失败记录错误
[ ] deactivate 时 dispose subscriptions
```

## 4. Worker Host

```txt
[ ] 创建 Worker
[ ] 加载插件 bundle
[ ] 注入 sqlgui API
[ ] 调用 activate
[ ] 注册 command handler
[ ] 主线程执行命令时回调插件 handler
[ ] 捕获插件异常
[ ] 收集 console.log
[ ] terminate Worker
```

## 5. Permission Broker

```txt
[ ] method -> permission 映射
[ ] extension -> granted permissions
[ ] 权限不足抛错
[ ] 高危 SQL 禁止
[ ] 插件 storage 按 extensionId 隔离
[ ] 插件无法读取其他插件数据
```

---

# 十、建议第一版内置插件

MVP 内置 3 个 demo 插件就够：

## 1. SQL Formatter Demo

```txt
能力：
[ ] 注册 sql.format 命令
[ ] 读取选中 SQL
[ ] 简单格式化
[ ] 替换编辑器文本

权限：
[ ] editor.read
[ ] editor.write
```

## 2. SQL Snippets Demo

```txt
能力：
[ ] 注册 snippets
[ ] 插入 SELECT 模板
[ ] 插入 CREATE TABLE 模板

权限：
[ ] editor.write
```

## 3. Explain Viewer Demo

```txt
能力：
[ ] 注册 explain.open 命令
[ ] 读取当前 SQL
[ ] 调用 explain
[ ] 打开结果面板

权限：
[ ] editor.read
[ ] db.query.explain
```

MVP 可以先只做第一个。

---

# 十一、不要做的坑

这些第一版千万别碰：

```txt
[ ] 不要做完整线上插件市场
[ ] 不要做用户账号系统
[ ] 不要做插件发布平台
[ ] 不要做插件签名基础设施
[ ] 不要开放 native 插件
[ ] 不要开放任意网络请求
[ ] 不要开放任意文件读写
[ ] 不要让插件直接拿 Tauri invoke
[ ] 不要一开始支持所有数据库
[ ] 不要一开始做复杂 SQL 智能补全
[ ] 不要一开始做 AI
```

否则项目会变成：

> SQL GUI 没做完，先做了半个 VS Code。

---

# 十二、最终优先级

我建议你按这个优先级排：

```txt
P0 必须：
1. Workbench
2. CommandService
3. Rust DB Core
4. Connection Manager
5. SQL Editor
6. ResultGrid

P1 重点：
7. Manifest Loader
8. Command Contribution
9. Web Worker Plugin Host
10. Permission Broker
11. Local Extension Install

P2 加分：
12. Mock Marketplace
13. Extension Detail
14. Installed Extensions
15. SQL Formatter Demo

P3 后续：
16. WASM 插件
17. Native Trusted Plugin
18. 真正线上插件市场
19. 插件签名
20. SSH Tunnel / 更多数据库
```

一句话路线：

> **先跑通 SQL GUI 主链路，再用一个 sql.format 插件跑通插件链路，最后用 mock marketplace 跑通安装链路。**

这就是最稳的 MVP。
