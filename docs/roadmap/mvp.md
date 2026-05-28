## 结论

`mvp` 分支相比上次看的 `main` 分支已经不是模板了，已经进入 **SQL GUI MVP 实现阶段**。现在有明确的产品 README，定位是 “Tauri 2 + React + shadcn/ui + Rust + sqlx + i18n + Plugin System”，并且 workspace 已经收敛到 `apps/desktop`、`packages/sqlgui-api`、`packages/sqlgui-sdk`、`crates/sqlgui-db`、`extensions/*` 这类 SQL GUI 方向。

但我给的判断是：

> **MVP 接近可用，但还不能算正式完成。当前完成度约 65%～70%。**

原因是核心链路已经搭起来了：连接数据库、打开连接、执行 SQL、展示结果、查看 schema tree、导出结果，这些都有代码实现；但是还缺少若干 MVP 级别的稳定性、安全性和体验收口，比如密码明文 localStorage、查询历史还是占位、DML affected rows 不完整、空结果列信息缺失、Schema Tree 对 MySQL/PostgreSQL 的层级语义还不够准。

---

# 当前已经完成得比较好的部分

## 1. 工程方向已经收敛

根 `package.json` 已经改成 `sqlgui`，脚本也从模板脚本变成桌面优先：`pnpm dev` 会跑 `@sqlgui/desktop tauri:dev`，`check` 会跑 workspace check 和 `cargo check --workspace`。

Rust workspace 也已经建立，包含：

```txt
apps/desktop/src-tauri
crates/sqlgui-common
crates/sqlgui-db
crates/sqlgui-extension
crates/sqlgui-marketplace
```

并且 workspace 依赖里已经引入 `sqlx`，开启了 `sqlite`、`postgres`、`mysql`、`json`、`chrono` 等特性。

**这一点很好，说明项目已经不是泛模板，而是桌面 SQL GUI 产品架构。**

---

## 2. Tauri 桌面壳已经产品化

Tauri 配置里 `productName` 已经是 `SQL GUI`，窗口尺寸也从模板状态变成 1280x800，identifier 也改成 `com.sqlgui.app`。

桌面 app 的依赖也已经接近 MVP 需求：React、Monaco Editor、Zustand、Tauri fs/dialog/shell、i18n、lucide、shadcn 相关能力都有了。

---

## 3. Workbench 主框架已经成型

现在入口已经不是计数器了，而是启动服务、调用 `system_health_check`，然后渲染 `Workbench`、权限弹窗和危险 SQL 确认弹窗。

`Workbench` 里已经有：

```txt
ActivityBar
SideBar
MainArea
StatusBar
CommandPalette
ConnectionDialog
NotificationCenter
```

整体已经像一个数据库 IDE / VSCode 风格工作台。

---

## 4. SQL Editor 已经基本可用

编辑器区域已经接入 `SqlEditorArea -> SqlEditor`，并且 `SqlEditor` 用的是 Monaco Editor。它配置了 SQL language、主题、行号、字体、自动布局、快捷提示等能力。

执行快捷键也已经有了：`Ctrl/Cmd + Enter` 会调用 `sqlExecutionService.executeEditor`。

Toolbar 里也有运行按钮和连接选择器。

**这部分已经达到 MVP 标准。**

---

## 5. DB Core 已经打通 SQLite / PostgreSQL / MySQL

Rust 侧已经注册了完整 Tauri DB command：

```txt
db_test_connection
db_open_connection
db_close_connection
db_execute_query
db_list_databases
db_list_schemas
db_list_tables
db_list_columns
```

这些都挂到了 Tauri invoke handler 里。

前端 `dbService` 也一一封装了这些 native command。

Rust DB Manager 已经根据 `DbKind` 分发到 SQLite、PostgreSQL、MySQL connector。

SQLite connector 已经支持连接测试、open pool、query、list tables、list columns。

PostgreSQL connector 也支持连接测试、open、query、list databases、schemas、tables、columns。

MySQL connector 也实现了连接、查询、库表列读取。

**这已经是 MVP 最核心的进展。**

---

## 6. 连接管理已经能用，但还不安全

连接弹窗支持 SQLite、PostgreSQL、MySQL 三种类型，能填 host、port、username、password、database、SQLite filePath，并且有 Test 和 Save 按钮。

连接服务支持：

```txt
initialize
restoreActiveConnection
addProfile
updateConnection
testConnection
connect
disconnect
```

并且会持久化 connections 和 active connection。

但是目前连接 profile 是通过 `appStorage.setJSON(CONNECTIONS_KEY, this._profiles)` 存储，而 `appStorage` 底层是 localStorage。

而 profile 里包含 password，UI 也提示了 `passwordInsecure`。

所以：**连接管理能用，但安全性不达正式 MVP 发布标准。**

---

## 7. 查询执行与结果展示已经闭环

执行逻辑已经完整：

1. 检查 editor
2. 检查 connectionId
3. 获取选中 SQL 或全文
4. 危险 SQL 确认
5. 调 `dbService.executeQuery`
6. 写入 result store
7. 成功/失败展示结果

Bottom Panel 已经有 Results / Problems / Logs，Results 面板会展示运行中、错误、成功结果、耗时、行列数量、清空按钮。

ResultGrid 已经有虚拟滚动、cell 选择、复制 cell、导出 CSV、导出 JSON。

**这部分已经非常接近 MVP。**

---

## 8. Schema Tree 已经基本可用

连接视图会渲染 `ConnectionsTree`。

Tree 支持：

```txt
connection
database
schema
tables
table
columns
column
```

并且懒加载 children。

右键菜单已有：

```txt
Select Top 1000
Show Columns
Copy Table Name
Copy Full Name
Refresh
```

Tree service 会调用 `listDatabases`、`listSchemas`、`listTables`、`listColumns`。

**这部分也接近 MVP，但 MySQL/PostgreSQL 的层级语义还有问题，后面说。**

---

# 当前还不能算 MVP 完成的原因

## 1. 查询结果对“空结果 SELECT”处理不完整

SQLite/PostgreSQL/MySQL 的 query 实现都是从 `rows.first()` 里拿 columns。问题是：如果 SQL 是 `SELECT * FROM users WHERE id = -1`，返回 0 行时 `rows.first()` 没有值，columns 就会是空数组。

这会导致“查询成功但没有行”的表格看起来像没有列。
MVP 前建议修。

---

## 2. DML / affected rows 没有正确处理

当前三种 connector 的 query 都走 `sqlx::query(...).fetch_all(...)`，最后 `affected_rows: None`。

这意味着：

```sql
UPDATE users SET name = 'a' WHERE id = 1;
DELETE FROM logs WHERE created_at < ...;
INSERT INTO ...
```

即使执行成功，UI 也没法准确展示 affected rows。

MVP 可以允许只做 SELECT，但如果 UI 已经允许任意 SQL，就需要补 DML 结果。

---

## 3. 自动 LIMIT 实现太简单

SQLite/PostgreSQL/MySQL 都是简单判断：

```rust
if lower.starts_with("select") && !lower.contains(" limit ") {
  format!("{trimmed} LIMIT {limit}")
}
```

这个会有坑：

```sql
SELECT * FROM users;
```

可能变成：

```sql
SELECT * FROM users; LIMIT 1000
```

这在很多数据库里是不合法的。

还可能误判注释、子查询、CTE、字符串里的 `limit`。

MVP 前建议先做保守策略：只在没有分号、单条 SELECT、非复杂 SQL 时自动加 limit；否则不改 SQL。

---

## 4. 密码存储不安全

当前连接配置会完整持久化，profile 里有 password 字段，底层是 localStorage。

MVP 内部自用可以忍，但要对外发布至少要改成：

```txt
配置 JSON/localStorage：只存非敏感字段
密码：存系统 Keychain / Credential Manager / Secret Service
```

否则用户一打开 DevTools 就能看到数据库密码。

---

## 5. SQLite 文件选择还不够好

虽然项目已经引了 Tauri dialog 插件，但连接弹窗里的 SQLite filePath 目前只是普通 input 手填路径。

MVP 体验上应该加：

```txt
选择 SQLite 文件
新建 SQLite 文件
最近打开文件
```

否则 SQLite 这个最适合 MVP 的数据库反而体验不顺。

---

## 6. Query History 还没完成

ActivityBar 里有 history 入口，但 `HistoryView` 目前只是一个空状态，占位显示 `commandPalette.noCommands`。

MVP 最好至少记录最近 50 条：

```txt
connection
sql
startedAt
elapsedMs
success/error
```

这个对 SQL GUI 很关键。

---

## 7. Schema Tree 对多库/多 schema 还要修语义

当前前端 tree 是：

```txt
connection -> database -> schema -> tables -> table -> columns
```

这个对 PostgreSQL/MySQL 需要更细化：

- PostgreSQL 的 connection 实际连接到一个 database，不能在同一个 pool 里随便切换其他 database。
- MySQL 的 schema 基本就是 database，但当前 MySQL `list_schemas` 直接返回所有 databases。
- 前端 `database -> loadSchemasOrTables` 又会再列 schema，容易出现 “database A 下面又列出 database A/B/C” 的层级错觉。

MVP 可以先统一成：

```txt
SQLite:
connection -> main -> tables -> table -> columns

PostgreSQL:
connection -> current_database -> schema -> table -> columns

MySQL:
connection -> database -> table -> columns
```

不要强行所有数据库都套同一层级。

---

## 8. 没看到真正的自动化测试与集成验证

现在根脚本有 `check`，桌面包也有 `check: tsc --noEmit`，Rust workspace 也能 `cargo check`。

但从目前扫到的代码看，MVP 核心链路还缺少最关键的测试：

```txt
SQLite in-memory / temp file query test
list tables / list columns test
SQL safety test
connection profile storage test
ResultGrid format test
```

我没有实际拉代码运行，所以不能确认当前 `pnpm check` 和 `cargo check` 是否全绿。

---

# MVP 完成度评分

| 模块          | 完成度 | 判断                                       |
| ------------- | -----: | ------------------------------------------ |
| 工程收敛      |    85% | 已从模板转为 SQL GUI                       |
| Tauri 桌面壳  |    85% | 已产品化                                   |
| DB Core       |    75% | 三类数据库都有实现，但查询结果边界问题不少 |
| 连接管理      |    65% | 能用，但密码不安全                         |
| SQL Editor    |    80% | Monaco + 快捷键 + toolbar 已有             |
| Result Grid   |    75% | 虚拟滚动、复制、导出已有                   |
| Schema Tree   |    70% | 能跑，但多数据库语义需修                   |
| Query History |    10% | 目前基本占位                               |
| 插件系统      |    55% | 代码很多，但不是 MVP 必需，稳定性待验证    |
| 测试/CI       |    30% | check 有，核心测试不足                     |

**综合：65%～70%。**

我会定义为：

> **MVP 功能主干已完成，但还没到“可以打 v0.1 release”的程度。**

---

# 最新路线图

## Phase 0：MVP 收口，不再继续扩大范围

当前代码已经做了插件系统、市场、安全权限等很多东西。建议现在先暂停新增大功能，把 MVP 收口到：

```txt
连接数据库 -> 浏览库表 -> 写 SQL -> 执行 SQL -> 展示结果 -> 导出结果
```

这条链路必须稳定。

---

## Phase 1：修 MVP 阻塞问题

### P0-1：修查询结果模型

必须补：

1. SELECT 0 行时仍然显示 columns
2. INSERT / UPDATE / DELETE 显示 affected rows
3. 区分 query 与 execute
4. 错误信息结构化
5. timeout 真正生效
6. 查询取消，至少预留接口

建议 Rust 侧拆成：

```rust
execute_query(request) -> QueryResult
execute_statement(request) -> StatementResult
```

或者统一：

```ts
type QueryResult =
  | {
      kind: 'rows';
      columns: ColumnMeta[];
      rows: CellValue[][];
      elapsedMs: number;
      truncated: boolean;
    }
  | { kind: 'affected'; affectedRows: number; elapsedMs: number; message?: string };
```

---

### P0-2：修 LIMIT 注入

当前的字符串拼接风险较大。MVP 建议先简单安全：

```txt
只有满足以下条件才自动 limit：
1. trim 后以 SELECT 开头
2. 不包含分号
3. 不包含已有 LIMIT
4. 不是 EXPLAIN
5. 不是 WITH，或者先不处理 WITH
```

复杂 SQL 不自动加 limit，让用户自己控制。

---

### P0-3：密码安全存储

现在至少做三层：

```txt
ConnectionProfile:
  name/kind/host/port/database/filePath 存 localStorage

CredentialStore:
  password 存系统安全存储

ConnectionConfig:
  运行时合并 profile + credential
```

Tauri 侧可以后续接系统 keychain；短期也可以先做接口抽象：

```ts
credentialService.save(connectionId, password);
credentialService.get(connectionId);
credentialService.delete(connectionId);
```

哪怕第一版实现还是 localStorage，也不要让业务代码直接依赖 password 存在 profile 里。

---

### P0-4：SQLite 文件选择

连接弹窗里给 SQLite 加：

```txt
选择文件
新建文件
最近文件
```

你已经有 `@tauri-apps/plugin-dialog`，实现成本不高。

---

### P0-5：修 Schema Tree 层级

建议按数据库类型分支处理：

```ts
if SQLite:
  connection -> tables -> table -> columns

if PostgreSQL:
  connection -> schema -> table -> columns

if MySQL:
  connection -> database -> table -> columns
```

不要为了统一 UI 强套 database/schema 两层。

---

### P0-6：补 Query History

当前 `HistoryView` 是占位，建议立刻补成 MVP 可用：

```txt
最近 100 条 SQL
点击恢复到编辑器
显示成功/失败
显示耗时
支持按连接过滤
支持清空
```

---

## Phase 2：MVP 验收标准

达到下面这些，我才建议你打 `v0.1.0`：

```txt
1. SQLite 能选择文件、连接、查看 tables/columns、执行 SELECT
2. PostgreSQL 能连接、查看 schema/table/columns、执行 SELECT
3. MySQL 能连接、查看 database/table/columns、执行 SELECT
4. SELECT 0 行也能展示列
5. DML 能展示 affected rows
6. 查询错误能展示清晰错误
7. 连接配置可持久化，但密码不明文存 localStorage
8. Query History 可用
9. Result Grid 可导出 CSV/JSON
10. pnpm check + cargo check 通过
11. 至少有 SQLite 的自动化测试
12. Tauri build 能在本机成功
```

---

# v0.1 路线图：SQL GUI MVP

## 必做

- [ ] 修 SELECT 0 行无 columns
- [ ] 修 DML affected rows
- [ ] 修自动 LIMIT 拼接
- [ ] SQLite 文件选择器
- [ ] 密码从 ConnectionProfile 移出
- [ ] Query History
- [ ] Schema Tree 按数据库类型分层
- [ ] 连接右键菜单：Connect / Disconnect / Edit / Delete / Refresh
- [ ] ResultGrid 支持空结果、DML 结果、错误结果
- [ ] SQLite 核心自动化测试
- [ ] README 增加 MVP 使用说明和截图

---

# v0.2 路线图：体验增强版

- [ ] 多 Tab 持久化恢复
- [ ] SQL 草稿自动保存
- [ ] SQL 格式化
- [ ] SQL snippets
- [ ] 复制行 / 复制列 / 复制结果
- [ ] 结果分页
- [ ] 查询取消
- [ ] 表 DDL 查看
- [ ] 表结构详情页
- [ ] 连接分组
- [ ] 最近连接
- [ ] 主题设置
- [ ] 快捷键设置

---

# v0.3 路线图：插件系统稳定版

你现在插件系统代码已经不少，但建议 v0.1 先不要把它当主线卖点。

v0.3 再正式收口：

- [ ] 插件 manifest schema 稳定
- [ ] 插件加载 / 卸载 / 启用 / 禁用稳定
- [ ] 插件权限模型稳定
- [ ] 插件日志面板
- [ ] 插件错误隔离
- [ ] 插件 storage API
- [ ] 插件 command API
- [ ] 插件 view contribution API
- [ ] 本地插件安装
- [ ] 插件签名校验
- [ ] 插件市场 mock -> 本地 registry

---

# v0.4 路线图：SQL Agent

等 SQL GUI 基础稳定后再做 SQL Agent。不要现在就做，否则会掩盖基础查询体验的问题。

SQL Agent 第一版建议只做：

```txt
1. 解释 SQL
2. 根据 schema 生成 SQL
3. 解释数据库报错
4. 优化 SQL 建议
5. 只读查询执行
```

Agent 工具：

```txt
get_current_connection
get_schema_tree
get_table_columns
run_readonly_query
get_query_history
explain_sql
```

安全策略：

```txt
默认只读
危险 SQL 必须二次确认
Agent 不能直接执行 DROP/DELETE/UPDATE
```

---

# v0.5 路线图：数据同步

先别做 CDC，第一版做轻量同步：

```txt
查询结果 -> 目标表
CSV/JSON -> 目标表
表 -> 表
```

同步模式：

```txt
append
replace
upsert
```

任务模型：

```ts
interface SyncTask {
  id: string;
  name: string;
  sourceConnectionId: string;
  targetConnectionId: string;
  sourceQuery: string;
  targetTable: string;
  mode: 'append' | 'replace' | 'upsert';
  mapping: Array<{
    sourceColumn: string;
    targetColumn: string;
  }>;
}
```

---

# v0.6+：分布式与 Remote Runner

远期再做：

```txt
Local SQL GUI
  -> Control Plane
  -> Remote Runner
  -> Database
```

适合：

1. 内网数据库访问
2. 长任务同步
3. 定时任务
4. 团队共享任务
5. 多 Runner 调度

但这个一定要在 SQL GUI 和数据同步稳定后再做。

---

## 最后建议

你这个 `mvp` 分支已经有很大进展，方向是对的。现在最危险的是 **功能铺太多**：插件市场、权限、扩展、i18n、Agent 预留都可以有，但 MVP 不能被这些拖散。

下一步最优先不是继续加新模块，而是：

> **用 SQLite 做一条 100% 稳定的最小闭环，然后再验证 PostgreSQL/MySQL。**

最小闭环就是：

```txt
选择 SQLite 文件
-> 连接
-> 展示 tables/columns
-> 右键 Select Top 1000
-> 打开 SQL Editor
-> 执行 SQL
-> 展示 ResultGrid
-> 导出 CSV/JSON
-> 写入 Query History
```

这条链路稳定之后，就可以考虑打 `v0.1.0-alpha`。
