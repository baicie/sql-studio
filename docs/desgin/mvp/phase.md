我重新看了当前 `mvp` 分支。结论：**这版已经从 75% 左右推进到 88%～90% 的 MVP 完成度**。
你已经补了很多上次建议里的收口项：`ConnectionsTree` 已接 `useSyncExternalStore`，连接树缓存清理也加了；凭据存储被拆成 `credential-types / insecure-credential-store / native-credential-store`；历史服务、连接服务、凭据存储、SQLite DB Core 都开始有测试；根脚本也有 `test/test:unit/test:rust/size` 等命令。

但要从“接近完成”推进到“可以合 main / 可以标记 MVP complete”，还剩几个关键口子。

---

# 当前进展 review

## 已经做得比较好的地方

### 1. 连接树订阅一致性基本修了

`ConnectionsTree` 现在已经通过 `useSyncExternalStore` 订阅 `connectionService`，并从 snapshot 里读取 `profiles` 和 `activeConnectionId`。同时你还加了 profiles 变化后的 stale node 清理逻辑，会清理已删除连接遗留的 expanded/loaded children。这个方向是对的。

### 2. 查询历史已经进入可测状态

`historyService` 现在导出了 `createHistoryService(storage)`，可以注入 storage，内部也维护了 `_cachedSnapshot`，适合配合 `useSyncExternalStore`。测试覆盖了最新记录在前、删除、清空、订阅通知、MAX_HISTORY 限制、unsubscribe 等场景。

### 3. 历史恢复上下文已经修到位

`HistoryView` 恢复历史 SQL 时已经传了 `connectionId` 和 `historyId`，`SqlEditorTab.source` 类型里也已经支持 `historyId`。这个已经满足 MVP 追踪需求。

### 4. 凭据存储已经被明确降级为 insecure fallback

当前 `credential-store.ts` 里已经明确写了警告：insecure fallback 是明文存储，未来切换 OS keychain。`insecure-credential-store.ts` 也改成了 `insecure_credentials` key，并有对应测试。

### 5. Rust DB Core 已经有 SQLite MVP 集成测试

`crates/sqlgui-db/tests/sqlite_mvp.rs` 覆盖了 SQLite 文件库、内存库、CREATE、INSERT、SELECT、affected rows、columns、close 等路径。这个是很关键的 MVP 信心来源。

---

# 仍然阻塞“完成”的问题

## P0：ConnectionService 的 snapshot 仍然是原地 mutation

现在 `ConnectionsTree` 虽然用了 `useSyncExternalStore`，但 `ConnectionService._refreshSnapshot()` 是直接改同一个 `_snapshot` 对象的字段：

```ts
this._snapshot.profiles = this._profiles;
this._snapshot.activeConnectionId = this._activeConnectionId;
this._snapshot.status = this._status;
this._snapshot.dialog = this._dialog;
```

对应代码在当前分支里就是原地改对象。

这会影响 `useSyncExternalStore` 的更新可靠性，因为外部 store snapshot 最好每次变更返回一个新的引用。否则 React 可能认为 snapshot 没变，导致连接树订阅了但不刷新。

同时 `addProfile` 用了 `this._profiles.push(...)`，`deleteConnection` 用了 `splice`，也是原地修改数组。

这个是当前最需要修的点。

---

## P0：CI 还不够可靠

`test.yml` 是 `workflow_call`，真正入口在 `ci.yml`。但当前 `ci.yml` 的 test job 条件比较奇怪：内部 PR 时可能不会跑 test job；同时 `continuous-release` job 在 push/PR 都会跑 build。

另外 `test.yml` 里的 rust-test 直接 `cargo test --workspace`，没有安装 Linux Tauri 相关系统依赖。如果 workspace 包含 Tauri crate，Ubuntu 上很容易因为 webkit/appindicator 依赖缺失失败。

---

## P1：native credential store 现在只是 stub

你已经写了 `native-credential-store.ts`，但实际 `credentialStore` 入口仍然只使用 `createInsecureCredentialStore()`，native 还没接入。

这不一定阻塞 MVP，但要么明确把“Remember password insecure”写进 UI 和 checklist，要么接入真正 OS keychain。当前 checklist 已经把 insecure fallback 写出来了。

---

## P1：右侧 Agent / Sync 占位会让 MVP 范围变散

`RightPanel` 里已经出现 Agent、Cell、Schema、Plugin、Sync 占位。Agent 和 Sync 是远期目标，MVP 里直接露出来容易让用户误以为这些功能应该可用。

建议 MVP 默认只露 Cell / Schema / Plugin Inspector，Agent / Sync 用 feature flag 隐藏。

---

# 完成度判断

| 模块         | 当前完成度 | 说明                                             |
| ------------ | ---------: | ------------------------------------------------ |
| 工程结构     |        90% | 桌面 SQL GUI 主线清晰                            |
| DB Core      |        85% | SQLite 测试已补，PG/MySQL 还缺集成测试           |
| 连接管理     |        86% | 删除/密码剥离/测试都有了，snapshot mutation 需修 |
| SQL 编辑执行 |        84% | editorId、historyId 已修                         |
| 查询历史     |        90% | 已经可测，结构合理                               |
| 连接树       |        82% | 已订阅，但 snapshot 引用问题要修                 |
| 插件系统     |        75% | 架构完整，但还缺插件 reload/权限测试             |
| 插件市场     |        45% | 仍是 mock marketplace                            |
| UI 完成度    |        75% | 布局更完整，但 Agent/Sync 占位要收敛             |
| CI/测试      |        70% | 有测试体系，但 CI 配置还需稳定化                 |
| 发布准备     |        70% | checklist 有了，但还没标记验收                   |

**综合：88%～90%。**

---

# 收口计划：提高到完成

建议分支：

```txt
fix/mvp-completion-pass
```

目标：**不再加新功能，只补 P0/P1 稳定性、CI、验收。**

---

# Phase 1：修 ConnectionService snapshot 引用问题

## 目标

让所有依赖 `useSyncExternalStore(connectionService.subscribe, connectionService.getSnapshot)` 的组件都能稳定刷新。

## 修改点

### 1. 改 `_refreshSnapshot`

```ts
private _refreshSnapshot() {
  this._snapshot = {
    profiles: this._profiles.slice(),
    activeConnectionId: this._activeConnectionId,
    status: this._status,
    dialog: { ...this._dialog },
  }
}
```

### 2. 改 `addProfile`

不要 `push`，改不可变数组。

```ts
async addProfile(profile: ConnectionProfile) {
  const { password, rememberPassword } = profile

  if (rememberPassword && password) {
    await credentialStore.save(profile.id, password)
  } else {
    await credentialStore.delete(profile.id)
  }

  this._profiles = this._profiles.concat(stripConnectionPassword(profile))
  this._persist()
  this._refreshSnapshot()
  this._subscription.emit()
}
```

### 3. 改 `updateConnection`

```ts
async updateConnection(profile: ConnectionProfile) {
  const { password, rememberPassword } = profile

  if (rememberPassword && password) {
    await credentialStore.save(profile.id, password)
  } else {
    await credentialStore.delete(profile.id)
  }

  const nextProfile = stripConnectionPassword(profile)

  this._profiles = this._profiles.map((item) =>
    item.id === profile.id ? nextProfile : item,
  )

  this._persist()
  this._refreshSnapshot()
  this._subscription.emit()
}
```

### 4. 改 `deleteConnection`

```ts
async deleteConnection(id: string) {
  if (this._activeConnectionId === id) {
    await this.disconnect()
  }

  await credentialStore.delete(id)

  this._profiles = this._profiles.filter((profile) => profile.id !== id)

  this._persist()
  this._refreshSnapshot()
  this._subscription.emit()
}
```

### 5. 新增 helper

```ts
function stripConnectionPassword(profile: ConnectionProfile): ConnectionProfile {
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    host: profile.host,
    port: profile.port,
    username: profile.username,
    database: profile.database,
    filePath: profile.filePath,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    rememberPassword: profile.rememberPassword,
  };
}
```

## 补测试

`apps/desktop/src/services/connection/connection-service.test.ts`

```ts
it('returns a new snapshot object after profile changes', async () => {
  const { ConnectionService } = await import('./connection-service');

  const service = new ConnectionService();
  service.initialize();

  const before = service.getSnapshot();

  await service.addProfile({
    id: 'conn-1',
    name: 'Test SQLite',
    kind: 'SQLite',
    filePath: '/tmp/test.db',
    password: 'super-secret',
    rememberPassword: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const after = service.getSnapshot();

  expect(after).not.toBe(before);
  expect(after.profiles).not.toBe(before.profiles);
  expect(after.profiles).toHaveLength(1);
});
```

再补一个删除：

```ts
it('returns a new snapshot object after deleteConnection', async () => {
  const { ConnectionService } = await import('./connection-service');

  const service = new ConnectionService();
  service.initialize();

  await service.addProfile({
    id: 'conn-1',
    name: 'Test SQLite',
    kind: 'SQLite',
    filePath: '/tmp/test.db',
    rememberPassword: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const before = service.getSnapshot();

  await service.deleteConnection('conn-1');

  const after = service.getSnapshot();

  expect(after).not.toBe(before);
  expect(after.profiles).toHaveLength(0);
});
```

---

# Phase 2：修 CI 到真正可作为合并门禁

## 目标

PR / push 都稳定执行：

```txt
pnpm lint
pnpm check
pnpm test
cargo test --workspace
```

并且不会因为 Tauri Linux 依赖缺失导致 cargo job 挂掉。

## 建议改 `.github/workflows/ci.yml`

```yaml
name: ci

on:
  push:
    branches:
      - main
      - mvp
      - 'feat/**'
      - 'fix/**'
      - 'refactor/**'
  pull_request:
    branches:
      - main
      - mvp

permissions:
  contents: read

jobs:
  test:
    uses: ./.github/workflows/test.yml

  build:
    runs-on: ubuntu-latest
    needs:
      - test
    env:
      PUPPETEER_SKIP_DOWNLOAD: 'true'
    steps:
      - uses: actions/checkout@v5

      - name: Install Linux deps for Tauri
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Install pnpm
        uses: pnpm/action-setup@v4.1.0

      - name: Install Node.js
        uses: actions/setup-node@v5
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Rust cache
        uses: Swatinem/rust-cache@v2

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build
```

## 建议改 `.github/workflows/test.yml`

```yaml
name: test

on: workflow_call

permissions:
  contents: read

jobs:
  unit-test:
    runs-on: ubuntu-latest
    env:
      PUPPETEER_SKIP_DOWNLOAD: 'true'
    steps:
      - uses: actions/checkout@v5

      - name: Install pnpm
        uses: pnpm/action-setup@v4.1.0

      - name: Install Node.js
        uses: actions/setup-node@v5
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm test

  lint-and-check:
    runs-on: ubuntu-latest
    env:
      PUPPETEER_SKIP_DOWNLOAD: 'true'
    steps:
      - uses: actions/checkout@v5

      - name: Install pnpm
        uses: pnpm/action-setup@v4.1.0

      - name: Install Node.js
        uses: actions/setup-node@v5
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript check
        run: pnpm check

  rust-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Install Linux deps for Tauri
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Rust cache
        uses: Swatinem/rust-cache@v2

      - name: Run Rust tests
        run: cargo test --workspace
```

---

# Phase 3：凭据存储最终策略二选一

当前 MVP checklist 已明确 “Remember password uses insecure local storage”。

所以有两个路线。

## 路线 A：MVP 快速完成

保持 insecure fallback，但 UI 必须明确展示风险。

### ConnectionDialog 增加提示

```tsx
{
  form.rememberPassword ? (
    <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-700">
      Remember password is stored in local insecure storage in MVP. Do not use it for production
      credentials.
    </div>
  ) : null;
}
```

### checklist 继续保留

`docs/mvp-checklist.md` 已有安全说明，不需要大改，只需要验收时勾选。

## 路线 B：真正完成安全存储

如果你想把 “Remember password” 做成真正可发布能力，就实现 native credential commands。

### Rust command 草案

`apps/desktop/src-tauri/src/commands/credential.rs`

```rust
use serde::{Deserialize, Serialize};

const SERVICE_NAME: &str = "sql-studio";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialSaveRequest {
    pub connection_id: String,
    pub password: String,
}

#[tauri::command]
pub async fn credential_save(request: CredentialSaveRequest) -> Result<(), String> {
    let connection_id = request.connection_id;
    let password = request.password;

    tauri::async_runtime::spawn_blocking(move || {
        let entry = keyring::Entry::new(SERVICE_NAME, &connection_id)
            .map_err(|err| err.to_string())?;

        entry
            .set_password(&password)
            .map_err(|err| err.to_string())
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn credential_get(connection_id: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let entry = keyring::Entry::new(SERVICE_NAME, &connection_id)
            .map_err(|err| err.to_string())?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(_) => Ok(None),
        }
    })
    .await
    .map_err(|err| err.to_string())?
}

#[tauri::command]
pub async fn credential_delete(connection_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let entry = keyring::Entry::new(SERVICE_NAME, &connection_id)
            .map_err(|err| err.to_string())?;

        match entry.delete_credential() {
            Ok(_) => Ok(()),
            Err(_) => Ok(()),
        }
    })
    .await
    .map_err(|err| err.to_string())?
}
```

### 注册 command

`apps/desktop/src-tauri/src/commands/mod.rs`

```rust
pub mod credential;
```

`apps/desktop/src-tauri/src/lib.rs`

```rust
.invoke_handler(tauri::generate_handler![
    commands::credential::credential_save,
    commands::credential::credential_get,
    commands::credential::credential_delete,
    // ...
])
```

### TS 入口改成生产使用 native

`apps/desktop/src/services/connection/credential-store.ts`

```ts
import { createInsecureCredentialStore } from './insecure-credential-store';
import { createNativeCredentialStore } from './native-credential-store';
import type { CredentialStore } from './credential-types';

export type { CredentialStore } from './credential-types';

let _credentialStore: CredentialStore | null = null;

function createCredentialStore(): CredentialStore {
  if (import.meta.env.DEV) {
    return createInsecureCredentialStore();
  }

  return createNativeCredentialStore();
}

function getCredentialStore(): CredentialStore {
  if (!_credentialStore) {
    _credentialStore = createCredentialStore();
  }

  return _credentialStore;
}

export const credentialStore: CredentialStore = {
  save(connectionId, password) {
    return getCredentialStore().save(connectionId, password);
  },

  get(connectionId) {
    return getCredentialStore().get(connectionId);
  },

  delete(connectionId) {
    return getCredentialStore().delete(connectionId);
  },

  has(connectionId) {
    return getCredentialStore().has(connectionId);
  },

  clear() {
    return getCredentialStore().clear();
  },
};
```

---

# Phase 4：收敛 MVP UI 范围

## 目标

不要让用户以为 Agent / Sync 是 MVP 功能。

`RightPanel` 当前直接展示 Agent 和 Sync 占位。

## 建议加 feature flag

`apps/desktop/src/features.ts`

```ts
export const featureFlags = {
  sqlAgent: false,
  dataSync: false,
  pluginInspector: true,
  cellDetail: true,
  schemaDetail: true,
};
```

`RightPanel.tsx`

```tsx
import { featureFlags } from '@/features';

<TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0">
  {featureFlags.sqlAgent ? (
    <TabsTrigger value="agent" className="h-full rounded-none px-3">
      <Bot className="mr-1 h-3.5 w-3.5" />
      Agent
    </TabsTrigger>
  ) : null}

  {featureFlags.cellDetail ? (
    <TabsTrigger value="cell-detail" className="h-full rounded-none px-3">
      <TableProperties className="mr-1 h-3.5 w-3.5" />
      Cell
    </TabsTrigger>
  ) : null}

  {featureFlags.schemaDetail ? (
    <TabsTrigger value="schema-detail" className="h-full rounded-none px-3">
      <Database className="mr-1 h-3.5 w-3.5" />
      Schema
    </TabsTrigger>
  ) : null}

  {featureFlags.pluginInspector ? (
    <TabsTrigger value="plugin-inspector" className="h-full rounded-none px-3">
      <Puzzle className="mr-1 h-3.5 w-3.5" />
      Plugin
    </TabsTrigger>
  ) : null}
</TabsList>;
```

同时把默认 `activeRightPanel` 从 `agent` 改成 `cell-detail` 或 `schema-detail`。

`workbenchStore.ts`

```ts
rightPanelVisible: false,
activeRightPanel: 'cell-detail',
rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
```

迁移逻辑里也修：

```ts
if (version < 4) {
  return Object.assign({}, persistedState, {
    activeRightPanel:
      (persistedState as Partial<WorkbenchStore>).activeRightPanel === 'agent'
        ? 'cell-detail'
        : (persistedState as Partial<WorkbenchStore>).activeRightPanel,
  });
}
```

---

# Phase 5：补插件系统最小测试

现在插件系统代码已经很多，但测试还集中在 connection/history/credential/SQLite。插件权限和 extension reload 是 MVP 风险点，建议补两个最小测试。

## 5.1 PermissionBroker 测试草案

```ts
import { describe, expect, it } from 'vitest';
import { permissionBroker } from './PermissionBroker';

describe('permissionBroker', () => {
  it('requires db.query.write for write SQL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: 'delete from users where id = 1',
    });

    expect(required).toContain('db.query.read');
    expect(required).toContain('db.query.write');
  });

  it('does not require db.query.write for select SQL', () => {
    const required = permissionBroker.getRequiredPermissions('db.query', {
      sql: 'select * from users',
    });

    expect(required).toContain('db.query.read');
    expect(required).not.toContain('db.query.write');
  });
});
```

如果 `getRequiredPermissions` 不是 public，就保持 public，因为这是纯规则函数，值得测试。

## 5.2 Extension reload 竞态测试草案

```ts
it('awaits scan before activating extensions on reload', async () => {
  const service = new ExtensionService();

  const calls: string[] = [];

  vi.spyOn(service as any, '_scanAndLoadExtensions').mockImplementation(async () => {
    calls.push('scan:start');
    await Promise.resolve();
    calls.push('scan:end');
  });

  vi.spyOn(service as any, '_loadStoredExtensions').mockImplementation(() => {
    calls.push('load-stored');
  });

  vi.spyOn(service as any, '_activateAll').mockImplementation(() => {
    calls.push('activate');
  });

  await service.reloadExtensions();

  expect(calls).toEqual(['scan:start', 'scan:end', 'load-stored', 'activate']);
});
```

---

# Phase 6：把 checklist 变成真正验收文档

`docs/mvp-checklist.md` 已经写得不错，但现在全是 `[ ]`。完成前建议做两件事：

## 6.1 增加验收负责人和结果

```md
## Verification Record

| Date       | Commit | Verifier | Result    | Notes |
| ---------- | ------ | -------- | --------- | ----- |
| 2026-xx-xx | <sha>  | baicie   | PASS/FAIL |       |
```

## 6.2 按实际完成勾选

例如：

```md
- [x] Connection can be deleted
- [x] Password is not persisted in connection profile
- [x] Latest history appears first
- [x] History item can restore SQL with connectionId and historyId
- [x] `pnpm test` passes
```

当前 checklist 里已经覆盖 Core / Query / Schema Tree / History / Extension / Release / Security notes。

---

# 最终完成标准

我建议把 “MVP 完成” 定义成以下全部满足：

```txt
1. ConnectionService snapshot 改成不可变引用更新
2. ConnectionsTree 增删连接、连接状态变化能稳定刷新
3. pnpm lint 通过
4. pnpm check 通过
5. pnpm test 通过
6. cargo test --workspace 通过
7. GitHub Actions CI 全绿
8. SQLite 手动验收通过
9. PostgreSQL/MySQL 至少手动连接测试通过
10. docs/mvp-checklist.md 按真实结果勾选
11. Remember password 安全策略明确：要么禁用生产保存，要么 native keychain
12. Agent / Sync 不作为 MVP 默认可见功能
```

---

# 推荐提交顺序

```txt
commit 1: fix(connection): return immutable service snapshots
commit 2: test(connection): cover snapshot identity changes
commit 3: ci: stabilize mvp test and build workflows
commit 4: chore(security): finalize credential storage strategy
commit 5: chore(workbench): hide non-mvp right panel placeholders
commit 6: test(extension): add permission and reload smoke tests
commit 7: docs: mark mvp checklist verification result
```

---

# 最终判断

现在项目已经不是“还缺大功能”的阶段了，而是：

```txt
核心闭环已成型
测试体系已开始建立
连接树/历史/凭据/DB Core 已经进入可验收状态
剩余主要是 snapshot 引用、CI 稳定性、安全策略和 MVP 范围收敛
```

把上面 6 个 Phase 做完，我认为就可以把状态从：

```txt
MVP almost completed
```

推进到：

```txt
MVP completed / ready to merge main
```
