这次 `mvp` 分支比上一轮又推进了不少：**ahead main 从 23 个提交变成 25 个提交**，新增重点是 **凭据拆分、查询历史、连接树细化、SQL 执行链路增强、extension reload 竞态修复**。整体判断：**MVP 完成度从约 65% 提升到 72% 左右，但仍不建议直接合 main。**

## 当前进展

### 1. 方向更接近真正可用的 SQL GUI 了

现在主线已经非常明确：Tauri 桌面端 + Rust DB Core + React Workbench + 插件系统。数据库侧已经有 timeout、DML affected rows、truncated 结果标记等改进，不再只是简单 `fetch_all`。SQLite 查询已经用 `tokio::time::timeout` 包住 DML 和 SELECT，并返回 affected rows、truncated 等信息。

PostgreSQL 也类似，已经把 DML 走 `execute`、SELECT 走 `fetch_all`，并通过 `DbError::Timeout` 表示超时错误。

### 2. 插件 reload 的异步竞态已经修了

上一轮我提到 `reloadExtensions()` 没有 `await _scanAndLoadExtensions()`，现在已经改成了 `async reloadExtensions()`，并且 install package/folder 后也 `await this.reloadExtensions()`。这个是一个实质性修复。

### 3. 连接密码已经不再直接塞进 profile

`ConnectionService.addProfile/updateConnection/_persist` 现在会把 profile 里的 password 剥离，不再写入 `connections`。这比之前安全不少。

但注意：**现在的 credentialStore 仍然只是 appStorage 里的 `credentials`，密码还是明文存本地。**这只能算“从连接 profile 里拆出来”，不能算真正安全存储。

### 4. 查询历史已经接上了

SQL 执行成功/失败后会写入 `historyService`，包含 connectionId、connectionName、sql、status、elapsedMs、startedAt、finishedAt、errorMessage 等。HistoryView 也有展示、过滤、复制、恢复、删除、清空。

## 现在最明显的问题

### P0：credentialStore 仍然是“伪安全”

现在的实现是：

```ts
const CREDENTIALS_KEY = 'credentials';
appStorage.setJSON(CREDENTIALS_KEY, entries);
```

这意味着密码虽然不在 `connections` 里，但仍然在本地 storage 里明文保存。

建议下一步直接抽象成：

```ts
interface CredentialStore {
  save(connectionId: string, password: string): Promise<void>;
  get(connectionId: string): Promise<string | null>;
  delete(connectionId: string): Promise<void>;
}
```

然后 MVP 阶段先留 fallback，但正式路径应该走：

```txt
macOS: Keychain
Windows: Credential Manager
Linux: Secret Service
或者 Tauri Stronghold
```

### P0：连接树“删除连接”没有真正删除

`handleDelete` 现在 confirm 后只调用了 `connectionService.disconnect()` 和 `connectionService.getProfiles()`，并没有 `removeProfile/deleteProfile`，所以 UI 上看起来有删除入口，但实际不会删除连接。

建议补：

```ts
deleteConnection(id: string) {
  this._profiles = this._profiles.filter((profile) => profile.id !== id)
  credentialStore.delete(id)

  if (this._activeConnectionId === id) {
    void this.disconnect()
  }

  this._persist()
  this._refreshSnapshot()
  this._subscription.emit()
}
```

### P0：连接菜单文案反了

这里逻辑是：

```ts
label: isConnected ? t('openConnection') : t('closeConnection');
onClick: isConnected ? handlers.onDisconnect : handlers.onConnect;
```

也就是说，**已连接时显示“openConnection”，但点击执行 disconnect；未连接时显示“closeConnection”，但点击执行 connect。**这个需要马上修。

应该是：

```ts
label: isConnected ? t('closeConnection') : t('openConnection');
```

### P1：查询历史顺序反了

`addEntry` 是把新记录放到数组头部：

```ts
_history = [newEntry, ..._history];
```

但 `getHistory()` 又做了：

```ts
return _history.slice().reverse();
```

结果就是 UI 上可能变成旧记录在前，新记录在后。

直接改成：

```ts
getHistory() {
  return _history.slice()
}
```

### P1：`executeEditor(editorId)` 参数被忽略

函数签名收了 `editorId`，但是实现里直接用了 `editorService.getActiveEditor()`。这会导致从非 active tab 或某些 toolbar 操作触发时，实际执行的不是传入的 editor。

建议改回：

```ts
const tab = editorService.getEditorById(editorId) ?? editorService.getActiveEditor();
```

### P1：History 恢复没有恢复连接上下文

`HistoryView.handleRestore` 只 `editorService.newQuery(entry.sql)`，没有把 `entry.connectionId` 带回编辑器，所以恢复历史 SQL 后可能没有连接或连接错。

建议改成：

```ts
editorService.openSql({
  title: 'history.sql',
  content: entry.sql,
  connectionId: entry.connectionId,
  source: {
    type: 'history',
    historyId: entry.id,
  },
});
```

### P1：连接树还没有订阅 connectionService

`ConnectionsTree` 里直接 `const profiles = connectionService.getProfiles()`，没有 `useSyncExternalStore` 订阅，所以连接新增、删除、连接状态变化时，树刷新不够可靠。

建议改成：

```ts
const snapshot = useSyncExternalStore(
  connectionService.subscribe.bind(connectionService),
  connectionService.getSnapshot.bind(connectionService),
);

const profiles = snapshot.profiles;
```

### P2：仓库里还进了 `.pnpm-store`

`.pnpm-store/v11/index.db` 已经出现在分支里，而且内容是 SQLite 数据库格式。

但 `.gitignore` 里没有忽略 `.pnpm-store`。

建议：

```bash
git rm -r --cached .pnpm-store
```

然后 `.gitignore` 加：

```gitignore
.pnpm-store
```

## 当前 MVP 完成度

我现在会这样打分：

| 模块         | 完成度 | 评价                                              |
| ------------ | -----: | ------------------------------------------------- |
| 工程结构     |    78% | 已经收敛到桌面 SQL GUI，但还有仓库污染和文档残留  |
| DB Core      |    75% | timeout、DML、truncated 已补，MVP 可用性提升明显  |
| 连接管理     |    68% | profile/password 拆分了，但删除、凭据安全还有问题 |
| SQL 编辑执行 |    72% | 执行链路清楚，但 editorId 被忽略                  |
| 查询结果     |    70% | 能用，后续要优化大结果集体验                      |
| 查询历史     |    60% | 功能有了，但顺序和恢复上下文要修                  |
| 插件系统     |    68% | reload 竞态已修，整体设计比较超前                 |
| 插件市场     |    40% | 仍然是 mock marketplace                           |
| UI 设计系统  |    65% | 开始用 `@sqlgui/ui`，但业务侧 Tailwind 仍偏多     |
| 发布准备     |    45% | 还缺测试、CI、打包验收、安全存储                  |

**综合：72% 左右。**

## 是否可以合并 main？

**现在还不建议合并。**

至少先修这 6 个点：

```txt
1. 修连接树 connect/close 文案反转
2. 实现真正 deleteConnection
3. 修 History 顺序
4. History 恢复时带回 connectionId
5. executeEditor 使用传入 editorId
6. 删除 .pnpm-store 并加入 .gitignore
```

然后再做一轮：

```bash
pnpm check
pnpm lint
cargo check --workspace
pnpm --filter @sqlgui/desktop tauri:dev
```

## 下一步分支建议

可以开一个很明确的收口分支：

```txt
fix/mvp-stability-pass
```

这个分支只做稳定性修复，不加新功能。

## 总结

这次进展比上一轮明显更好，尤其是：

```txt
✅ extension reload await 修了
✅ DB timeout 开始落地
✅ 查询历史接上了
✅ 密码不再直接保存在 connection profile
✅ 连接树开始区分 SQLite / PostgreSQL / MySQL 结构
```

但目前还属于：

```txt
功能闭环基本成立
稳定性还有明显坑
安全存储还没真正完成
不适合马上合 main
```

我建议先把它定位为 **MVP RC 前一版**，再经过一轮 `fix/mvp-stability-pass`，就可以进入真正的 MVP 候选版本。
