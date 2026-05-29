我看完 `mvp` 分支后，结论是：**当前已经不是“脚手架阶段”，而是进入了可交互 SQL GUI MVP 后半段；核心架构基本成型，但还不建议直接合并 main 或打包给用户用。**
我这次是基于分支代码静态 review，没有实际跑 `pnpm/cargo` 构建。

## 当前进展判断

**1. 工程方向已经收敛得比较对。**
README 里明确了目标是 Tauri 2 + React + shadcn/ui + Rust/sqlx + i18n + Plugin System，工作区也已经围绕 `apps/desktop`、`packages/ui`、`packages/sqlgui-api`、`packages/sqlgui-sdk`、`crates/sqlgui-db`、`extensions/*` 展开。根脚本也已经有 `dev/build/check/lint` 和插件打包/签名相关命令。

**2. Rust DB Core MVP 已经有完整雏形。**
Rust workspace 已包含 `sqlgui-db / sqlgui-extension / sqlgui-marketplace` 等 crate，`sqlx` 已启用 SQLite、PostgreSQL、MySQL 三类能力。DB Manager 里也已经完成了基于 `DbKind` 的 connector 分发、连接池管理、查询分发、schema/table/column 元信息读取入口。Tauri command 层也暴露了 test/open/close/query/listDatabases/listSchemas/listTables/listColumns。

**3. 前端 Workbench、连接管理、编辑器、结果表格已经闭环。**
Workbench 已经有 ActivityBar、SideBar、MainArea、StatusBar、CommandPalette、ConnectionDialog、NotificationCenter。查询执行链路也已经从 editor/service 调到 `dbService.executeQuery`，并把结果写入 `resultService`。结果表格已经接入 `@sqlgui/ui` 的 DataTable，并支持复制单元格、导出 CSV/JSON。

**4. UI 包化方向是对的，而且已经开始落实。**
`@sqlgui/ui` 已经统一导出 Button、Input、Dialog、Select、Tabs、Toolbar、Tree、DataTable 等基础组件；业务侧例如 ActivityBar、ConnectionDialog、ResultGrid 已经开始从 `@sqlgui/ui` 引用组件，而不是全靠原始 H5 控件。AGENTS 里也加入了“不在 apps/desktop 里重复造基础 UI”的约束，这个方向非常正确。

**5. 插件系统比普通 MVP 更超前。**
现在已经有 manifest schema、API 包、SDK 包、Worker 插件宿主、RPC Dispatcher、权限系统、权限弹窗、危险 SQL 二次确认、本地安装、Mock Marketplace、信任发布者存储。也就是说，这条线已经不只是“规划”，而是有一套可运行的原型结构。

## MVP 完成度

我会这么评估：

| 模块              | 当前状态 | 判断                                   |
| ----------------- | -------: | -------------------------------------- |
| 工程结构          |      75% | 方向清晰，但还有文档/配置残留          |
| Workbench/UI      |      70% | 能用，但还需要统一视觉和交互细节       |
| DB Core           |      65% | 三类数据库入口都有，但查询执行还偏 MVP |
| SQL 编辑/结果展示 |      70% | 闭环成立，体验还需打磨                 |
| 插件系统          |      60% | 架构很强，但稳定性和安全边界还要补     |
| 插件市场          |      35% | 目前是 Mock + 本地安装，不是真市场     |
| 发布准备          |      40% | 还缺测试、CI、密钥安全、打包验收       |

**整体：大约 65%～70% 的 MVP 完成度。**
如果目标只是“自己演示能跑”，已经接近；如果目标是“开源后让别人下载试用”，还差一轮 P0/P1 修复。

## 必须优先修的 P0 问题

### 1. 数据库密码现在是明文持久化风险

`ConnectionService` 会把连接 profile 存到 `appStorage`，profile 里包含 `password`，连接恢复时也会读取并重新 open。虽然 UI 里已经提示了 `passwordInsecure`，但这对于桌面 SQL 工具来说仍然是 P0 风险。

建议改成：

```txt
MVP 阶段：
- 默认不保存密码
- 提供 “Remember password” 选项
- 勾选后走系统安全存储

后续：
- macOS Keychain
- Windows Credential Manager
- Linux Secret Service
- 或 Tauri Stronghold
```

### 2. 插件 reload 有明显异步竞态

`reloadExtensions()` 里调用了异步 `_scanAndLoadExtensions()`，但没有 `await`，紧接着就 `_loadStoredExtensions()` 和 `_activateAll()`。这会导致安装插件后 reload 读到旧扫描结果，或者激活时扩展列表还没更新。

建议直接改成：

```ts
async reloadExtensions() {
  this._deactivateAll()
  activationRegistry.clear()

  await this._scanAndLoadExtensions()
  this._loadStoredExtensions()
  this._activateAll()

  this._refreshSnapshot()
  this._subscription.emit()
  notificationService.info('Extensions reloaded.')
}
```

同时 `installFromPackage / installFromFolderCopy / installFromFolderLink` 里也应该 `await this.reloadExtensions()`。

### 3. 查询 timeout 参数目前基本没生效

前端会传 `timeoutMs: 30_000`，`QueryRequest` 类型里也定义了 `timeoutMs`，但是 SQLite/Postgres/MySQL connector 查询里直接 `fetch_all`，没有用 `tokio::time::timeout` 或 sqlx 层 timeout 控制。

建议 DB Core 加统一封装：

```rust
let future = sqlx::query(&sql).fetch_all(&pool);
let rows = tokio::time::timeout(Duration::from_millis(timeout_ms), future)
  .await
  .map_err(|_| DbError::QueryFailed("Query timeout".into()))?
  .map_err(|err| DbError::QueryFailed(err.to_string()))?;
```

### 4. SQL 安全检测太浅

现在编辑器侧危险 SQL 只判断开头是不是 `drop/truncate/alter/delete/update/insert`；Rust 侧 readonly 判断也是拿第一个 keyword 判断。插件权限里的 SQL 分析稍好一点，但本质仍是“首关键字规则”。这对多语句、注释、CTE、存储过程、`WITH ... DELETE`、`SELECT func_that_writes()` 等情况都不稳。

MVP 可以先接受，但要把安全策略降级为“提示/权限控制”，不要把它当强安全边界。后续建议引入 SQL parser 或至少做多语句扫描。

## P1 问题

**连接树有一些状态和节点设计问题。**
`ConnectionsTree` 直接调用 `connectionService.getProfiles()`，没有通过 `useSyncExternalStore` 订阅连接状态，新增连接后可能依赖父组件重渲染才能刷新。另外 `tables` / `columns` 节点被标记为非叶子，但 `loadNodeChildren` 对这两类节点直接返回空数组，展开行为会比较怪。

**插件权限弹窗只能处理一个 pending request。**
`PermissionPromptService` 只有一个 `grantRequest` 和一个 `dangerousSqlRequest`，但插件激活可能通过 `Promise.all` 并发发生。多个插件同时请求权限时，后一个请求可能覆盖前一个。

**插件运行时需要明确要求插件必须 bundle 成单文件。**
当前 Worker 通过读取插件入口源码，转成 Blob URL，再 `import(blobUrl)`。这种方式对单文件插件没问题，但如果插件入口里存在相对 import，运行时大概率解析不到扩展目录中的其他文件。

**文档和实现有几处不一致。**
AGENTS 里写的是 “sandboxed iframe”，但当前实现是 Web Worker；AGENTS 里还说 packages 使用 rolldown 构建 dist，但 `@sqlgui/ui` 现在是直接 exports `src/index.tsx`，脚本也是 `tsc --noEmit`。这些最好合并前修掉，否则后面 agent/协作者会被误导。

**`.pnpm-store` 不应该进仓库。**
我在分支 compare 里看到了 `.pnpm-store/v11/index.db` 被加入，但 `.gitignore` 当前没有忽略 `.pnpm-store`。这类文件必须删掉并加入忽略。

## 下一步建议

我建议你不要继续加新功能，先做一轮 **MVP hardening**：

```txt
fix/mvp-hardening
```

优先级如下：

1. **修 P0**：密码存储、extension reload await、query timeout、SQL safety 文档降级。
2. **加测试**：至少补 SQLite 临时库集成测试、manifest validator 测试、permission broker 测试、extension reload 测试。
3. **清理仓库**：删除 `.pnpm-store`，清理 `pnpm-workspace.yaml` 里 Nest/Taro 等模板残留，修正 Cargo.toml repository 字段。
4. **统一文档**：AGENTS / docs/todo / README 需要和真实实现一致。
5. **再做 UI polish**：ConnectionDialog 文件选择、CommandPalette 交互、ResultGrid 空状态、错误提示、加载态、连接树订阅。

## 最终判断

这个 `mvp` 分支的方向是对的，而且架构野心比较大：**不是简单 SQL GUI，而是在做一个带插件系统的 SQL Workbench。**

但当前最大问题是：**功能推进很快，安全、异步一致性、测试、文档同步还没跟上。**

我的建议是：

```txt
暂时不要合 main
暂时不要继续加 AI Agent / 数据同步 / 分布式
先把当前 MVP 打磨成一个稳定可演示版本
```

等 P0 修完后，这个分支就可以进入 “MVP 可合并候选” 状态。
