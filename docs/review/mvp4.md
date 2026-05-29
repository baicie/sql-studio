这版 `mvp` 分支已经非常接近 **MVP completed / ready to merge main** 了。相比上一轮，几个关键收口点都已经补上：**ConnectionService snapshot 不可变更新、CI 重构、RightPanel feature flag、PermissionBroker 测试、ExtensionService reload 测试** 都已经进入分支。

我的结论：**当前完成度约 93%～95%。**
剩下主要不是功能问题，而是 **CI 细节、少量测试强度、发布验收 checklist**。

---

## 已经明显修好的点

### 1. ConnectionService snapshot 不可变问题已修

上一轮最大 P0 是 `_refreshSnapshot()` 原地 mutation。现在已经改成每次生成新对象，并且 `profiles` 也用 `slice()` 生成新引用：

```ts
this._snapshot = {
  profiles: this._profiles.slice(),
  activeConnectionId: this._activeConnectionId,
  status: this._status,
  dialog: { ...this._dialog },
};
```

同时 `addProfile/updateConnection/deleteConnection` 都已经改成不可变数组写法，避免 `push/splice` 原地修改。这个修得比较关键，因为 `ConnectionsTree` 现在依赖 `useSyncExternalStore`。

### 2. snapshot 行为测试也补上了

`connection-service.test.ts` 已经新增了 “addProfile 后 snapshot 新引用” 和 “deleteConnection 后 snapshot 新引用” 的测试，这正好覆盖了之前最担心的 React 外部 store 刷新问题。

### 3. CI 入口已经比之前合理很多

`ci.yml` 现在明确在 `main/mvp/feat/**/fix/**/refactor/**` push 和 PR 上触发，并把 test workflow 作为 build 前置依赖。build job 也补了 Tauri Linux 依赖、Rust toolchain、Rust cache。

`test.yml` 也拆成了 unit-test、lint-and-check、rust-test 三个 job，rust-test 里也安装了 Tauri Linux 依赖。

### 4. MVP 范围开始收敛

`featureFlags` 已经把 `sqlAgent` 和 `dataSync` 关掉，只保留 pluginInspector、cellDetail、schemaDetail。

`RightPanel` 也已经基于 feature flag 渲染，Agent 和 Sync 不会默认暴露，避免 MVP 范围发散。

### 5. workbench 默认右侧面板也改合理了

默认 `activeRightPanel` 已经从 `agent` 改成 `cell-detail`，并且持久化 version 升到 4，迁移时会把旧的 agent 切到 cell-detail。

### 6. 插件权限和扩展 reload 测试已经补了

`PermissionBroker.test.ts` 覆盖了 select/delete/insert/update/create table 等 SQL 权限判断，能兜住插件 DB 权限的基础规则。

`ExtensionService.reloadExtensions()` 真实代码里已经是先 deactivate，再 `await _scanAndLoadExtensions()`，再 load stored 和 activate；测试也覆盖了 scan 异步执行。

---

## 仍然需要修的点

### P0：CI 的 `lint-and-check` 可能仍会失败

当前 root `package.json` 的 `check` 是：

```json
"check": "pnpm -r --if-present check && cargo check --workspace"
```

也就是说 `pnpm check` 会跑 `cargo check --workspace`。

但是 `test.yml` 的 `lint-and-check` job 只安装了 pnpm 和 Node，没有安装 Rust，也没有安装 Tauri Linux deps，然后直接跑 `pnpm check`。这很可能导致 CI 在 `lint-and-check` 阶段失败。

建议二选一。

**方案 A：拆 root check，推荐**

```json
{
  "scripts": {
    "check": "pnpm check:ts && pnpm check:rust",
    "check:ts": "pnpm -r --if-present check",
    "check:rust": "cargo check --workspace"
  }
}
```

然后 CI 改成：

```yaml
- name: Run TypeScript check
  run: pnpm check:ts
```

rust-test 或单独 rust-check job 再跑：

```yaml
- name: Run Rust check
  run: pnpm check:rust
```

**方案 B：lint-and-check 也安装 Rust/Tauri deps**

这个会变慢，不如方案 A 清晰。

---

### P1：ExtensionService reload 测试还不够强

现在测试只判断 `scan:start` 在 `scan:end` 前发生，但没有断言 `activate` 一定在 `scan:end` 后。真实代码是对的，但测试力度偏弱。

建议把 mock 再补一下，让 callLog 覆盖完整顺序：

```ts
it('awaits scan before loading and activating extensions on reload', async () => {
  const { ExtensionService } = await import('./extension-service');

  const service = new ExtensionService();

  vi.spyOn(service as any, '_loadStoredExtensions').mockImplementation(() => {
    callLog.push('load-stored');
  });

  vi.spyOn(service as any, '_activateAll').mockImplementation(() => {
    callLog.push('activate');
  });

  await service.reloadExtensions();

  expect(callLog).toEqual(['scan:start', 'scan:end', 'load-stored', 'activate']);
});
```

---

### P1：ConnectionService 测试 mock 有一个隐患

`connection-service.test.ts` 用的是 dynamic import，但 `afterEach` 只 `vi.restoreAllMocks()`，没有 `vi.resetModules()`。如果后面测试更多 singleton/module state，容易串。当前大概率还能跑，但建议加上：

```ts
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});
```

尤其 `credentialStore` 内部是 module-level lazy singleton，这类结构长期看最好隔离。

---

### P1：MVP checklist 需要最终勾选和记录

现在 checklist 已经有了，但应该在合 main 前补一段验收记录，并把已完成项勾上。之前文档已经覆盖 Core/Query/Schema Tree/History/Extension/Release/Security。

建议加：

```md
## Verification Record

| Date       | Commit         | Verifier | Result | Notes                              |
| ---------- | -------------- | -------- | ------ | ---------------------------------- |
| 2026-05-29 | <mvp-head-sha> | baicie   | PASS   | SQLite smoke test passed; CI green |
```

---

## 当前完成度

| 模块         | 完成度 | 评价                                           |
| ------------ | -----: | ---------------------------------------------- |
| 工程结构     |    92% | 主线已收敛，模板垃圾基本清掉                   |
| DB Core      |    88% | SQLite 集成测试已有，PG/MySQL 仍主要靠手动验收 |
| 连接管理     |    94% | password 剥离、delete、snapshot 不可变都修了   |
| 连接树       |    92% | useSyncExternalStore + stale node 清理已完成   |
| SQL 编辑执行 |    88% | editorId/historyId 等关键上下文已修            |
| 查询历史     |    92% | factory + snapshot + 测试覆盖较好              |
| 插件系统     |    82% | reload/权限开始有测试，但市场仍是 mock         |
| UI 范围      |    85% | Agent/Sync 已通过 feature flag 收敛            |
| CI/测试      |    82% | 体系成型，但 `pnpm check` 拆分问题要修         |
| 发布准备     |    80% | checklist 有，需最终勾选和一次手动验收         |

**综合：93%～95%。**

---

## 是否可以合 main？

**还差一个很小的 final pass。**

我建议合 main 前只做这 4 件事：

```txt
1. 拆 root check：check:ts / check:rust，修 CI lint-and-check 不装 Rust 的问题
2. 强化 ExtensionService reload 顺序测试
3. connection-service.test.ts afterEach 增加 vi.resetModules()
4. docs/mvp-checklist.md 补 Verification Record，并按真实结果勾选
```

做完这几个，我认为就可以：

```txt
mvp -> main
打 v0.1.0-mvp 或 v0.1.0-alpha
```

---

## 最终判断

这轮 `mvp` 已经不是“功能开发中”了，状态更像：

```txt
MVP feature complete
waiting for CI / verification hardening
```

再补一个 `fix/mvp-final-ci-and-verification` 分支就能收口。
