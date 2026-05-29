下面这版目标不是继续加功能，而是把当前 **75% MVP** 收口到 **可合并 / 可发布 MVP**。
我建议把“完成”定义为：**核心 SQL GUI 闭环稳定、没有明显 P0、能跑 check/lint/cargo check、至少有最小测试保护、可以给别人 clone 后按 README 跑起来。**

当前还差的主要不是功能，而是：

```txt
1. 订阅一致性：ConnectionsTree 还没订阅 connectionService
2. 凭据安全：credentialStore 仍然是 appStorage 明文
3. 测试缺失：目前 package.json 没有 test 脚本，也没搜到测试文件
4. 发布验收：缺一套 MVP checklist / CI / 手动验收流程
5. 小型类型债：History source 缺 historyId，后续追踪不方便
```

其中凭据问题来自当前 `credentialStore` 仍把 `{ connectionId, password }` 写进 `appStorage` 的 `credentials` key。
`ConnectionsTree` 目前仍是直接 `connectionService.getProfiles()`，没有通过 `useSyncExternalStore` 订阅。
根 `package.json` 目前有 `check/lint/build`，但没有 test 脚本。

---

# 总体计划

建议新开分支：

```txt
fix/mvp-final-completion
```

完成后再合 `mvp`，然后从 `mvp` 合 `main`。

## 阶段划分

| 阶段    | 目标                          |     完成后提升 |
| ------- | ----------------------------- | -------------: |
| Phase A | 修订阅一致性和小型逻辑债      |      75% → 80% |
| Phase B | 凭据存储安全化 / 明确降级策略 |      80% → 86% |
| Phase C | 补最小测试体系                |      86% → 92% |
| Phase D | CI / 文档 / MVP 验收清单      |      92% → 96% |
| Phase E | 发布前 smoke test 和体验补洞  | 96% → 100% MVP |

---

# Phase A：修订阅一致性与小型逻辑债

## A1. ConnectionsTree 接入 useSyncExternalStore

当前问题：`ConnectionsTree` 直接取 `connectionService.getProfiles()`，连接新增/删除/连接状态变化后，树不一定可靠刷新。虽然 `connectionService` 已经有 `subscribe()` 和 `getSnapshot()`。

### 修改草案

`apps/desktop/src/workbench/connections/ConnectionsTree.tsx`

```tsx
import type { UseTranslationResponse } from 'react-i18next';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronRight, Columns3, Database, Loader2, Table } from 'lucide-react';
import { IconButton } from '@sqlgui/ui';

import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import {
  createNodeId,
  createRootNode,
  loadNodeChildren,
} from '@/services/connection/connectionTreeService';
import { editorService } from '@/workbench/editor/services/editorService';
import { logService } from '@/services/log/log-service';
import { notificationService } from '@/services/notification/notification-service';
import { generateSelectTopSql, getTableDisplayName } from '@/services/connection/sqlGenerator';
import { ContextMenu } from './ContextMenu';
import type { ConnectionProfile, ConnectionTreeNode } from '@/services/connection/types';

export function ConnectionsTree() {
  const { t } = useAppTranslation('connection');

  const connectionSnapshot = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
  );

  const profiles = connectionSnapshot.profiles;
  const activeConnectionId = connectionSnapshot.activeConnectionId;

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadedChildren, setLoadedChildren] = useState<Map<string, ConnectionTreeNode[]>>(
    new Map(),
  );
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: ConnectionTreeNode;
  } | null>(null);

  const rootNodes = useMemo(() => {
    return profiles.map((profile) => createRootNode(profile));
  }, [profiles]);

  const getProfileById = useCallback(
    (id: string) => profiles.find((profile) => profile.id === id),
    [profiles],
  );

  // 后续逻辑保持原样，只把所有 connectionService.getActiveConnectionId()
  // 替换为 activeConnectionId，把 profiles.find 抽成 getProfileById
}
```

### 同时改 ConnectionStatusBadge

```tsx
function ConnectionStatusBadge({
  profile,
  activeConnectionId,
}: {
  profile?: ConnectionProfile;
  activeConnectionId: string | null;
}) {
  const { t } = useAppTranslation('connection');

  if (!profile) return null;

  const isConnected = activeConnectionId === profile.id;

  return (
    <span className={`ml-auto text-xs ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
      {isConnected ? t('status.connected') : t('status.disconnected')}
    </span>
  );
}
```

调用处：

```tsx
{
  node.type === 'connection' && (
    <ConnectionStatusBadge
      profile={getProfileById(node.connectionId)}
      activeConnectionId={activeConnectionId}
    />
  );
}
```

## A2. History source 补 historyId

当前 History 恢复已经带上 `connectionId`，但 source 只有 `{ type: 'history' }`。

### 修改草案

`apps/desktop/src/workbench/views/HistoryView.tsx`

```tsx
const handleRestore = useCallback((entry: HistoryEntry) => {
  editorService.openSql({
    title: 'history.sql',
    content: entry.sql,
    connectionId: entry.connectionId,
    source: {
      type: 'history',
      historyId: entry.id,
    },
  });

  notificationService.info(
    `Restored: ${entry.sql.slice(0, 50)}${entry.sql.length > 50 ? '...' : ''}`,
  );
}, []);
```

如果 `EditorSource` 类型目前不支持 `historyId`，补：

```ts
export type EditorSource =
  | {
      type: 'connection-tree';
      nodeId: string;
    }
  | {
      type: 'history';
      historyId?: string;
    }
  | {
      type: 'manual';
    };
```

---

# Phase B：凭据存储安全化

这里有两个方案。

## 方案 1：MVP 完成推荐方案

先把当前明文存储明确标为 **insecure fallback**，默认不保存密码。只有用户勾选 “Remember password” 才保存，并在 UI 上明确提示：

```txt
Remember password uses local insecure storage in MVP.
Secure OS keychain storage will be enabled in a later release.
```

这个方案工程量小，能保证 MVP 不“假装安全”。

## 方案 2：更完整方案

抽象 CredentialStore，默认走 native secure store，失败才 fallback insecure store。这个更接近“完成”。

我建议你现在直接做方案 2 的接口，但第一版 native 可以先留空或按平台逐步补。

## B1. 改成 async CredentialStore 接口

`apps/desktop/src/services/connection/credential-store.ts`

```ts
export interface CredentialStore {
  save(connectionId: string, password: string): Promise<void>;
  get(connectionId: string): Promise<string | null>;
  delete(connectionId: string): Promise<void>;
  has(connectionId: string): Promise<boolean>;
  clear(): Promise<void>;
}
```

## B2. 保留 insecure fallback，但改名

```ts
import { appStorage } from '../storage/storage-service';
import type { CredentialStore } from './types';

const CREDENTIALS_KEY = 'insecure_credentials';

interface CredentialEntry {
  connectionId: string;
  password: string;
}

/**
 * MVP fallback only.
 *
 * This store persists passwords in appStorage and is NOT secure.
 * Prefer nativeCredentialStore when available.
 */
export function createInsecureCredentialStore(): CredentialStore {
  function load(): CredentialEntry[] {
    return appStorage.getJSON<CredentialEntry[]>(CREDENTIALS_KEY) ?? [];
  }

  function saveAll(entries: CredentialEntry[]) {
    appStorage.setJSON(CREDENTIALS_KEY, entries);
  }

  return {
    async save(connectionId, password) {
      const entries = load();
      const existing = entries.findIndex((entry) => entry.connectionId === connectionId);

      if (existing >= 0) {
        entries[existing] = { connectionId, password };
      } else {
        entries.push({ connectionId, password });
      }

      saveAll(entries);
    },

    async get(connectionId) {
      return load().find((entry) => entry.connectionId === connectionId)?.password ?? null;
    },

    async delete(connectionId) {
      saveAll(load().filter((entry) => entry.connectionId !== connectionId));
    },

    async has(connectionId) {
      return load().some((entry) => entry.connectionId === connectionId);
    },

    async clear() {
      saveAll([]);
    },
  };
}
```

## B3. nativeCredentialStore 草案

`apps/desktop/src/services/connection/native-credential-store.ts`

```ts
import { callNative } from '@/services/native/invoke';
import type { CredentialStore } from './types';

export function createNativeCredentialStore(): CredentialStore {
  return {
    save(connectionId, password) {
      return callNative<void>('credential_save', {
        request: {
          connectionId,
          password,
        },
      });
    },

    get(connectionId) {
      return callNative<string | null>('credential_get', {
        connectionId,
      });
    },

    delete(connectionId) {
      return callNative<void>('credential_delete', {
        connectionId,
      });
    },

    async has(connectionId) {
      const value = await this.get(connectionId);
      return value !== null;
    },

    clear() {
      return callNative<void>('credential_clear');
    },
  };
}
```

## B4. 统一导出 credentialStore

```ts
import { createInsecureCredentialStore } from './insecure-credential-store';
import { createNativeCredentialStore } from './native-credential-store';
import type { CredentialStore } from './types';

function createCredentialStore(): CredentialStore {
  if (import.meta.env.DEV) {
    return createInsecureCredentialStore();
  }

  return createNativeCredentialStore();
}

export const credentialStore = createCredentialStore();
```

## B5. ConnectionService 改成 await

现在 `credentialStore.save/get/delete` 是同步方法，改 async 后，`addProfile/updateConnection/connect/testConnectionById/deleteConnection/restoreActiveConnection` 都需要 await。

示例：

```ts
async addProfile(profile: ConnectionProfile) {
  const { password, rememberPassword } = profile

  if (rememberPassword && password) {
    await credentialStore.save(profile.id, password)
  } else {
    await credentialStore.delete(profile.id)
  }

  this._profiles = this._profiles.concat(stripPassword(profile))
  this._persist()
  this._refreshSnapshot()
  this._subscription.emit()
}
```

抽一个 helper：

```ts
function stripPassword(profile: ConnectionProfile): ConnectionProfile {
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

`connect`：

```ts
const password = profile.rememberPassword ? await credentialStore.get(profile.id) : undefined;
```

`deleteConnection`：

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

---

# Phase C：补最小测试体系

当前根脚本没有 test，建议先用 Vitest 兜住 TS 侧逻辑，再用 Rust integration test 兜住 DB Core。

## C1. package.json 增加 test 脚本

`package.json`

```json
{
  "scripts": {
    "test": "pnpm -r --if-present test",
    "test:unit": "pnpm -r --if-present test:unit",
    "test:rust": "cargo test --workspace",
    "check": "pnpm -r --if-present check && cargo check --workspace"
  },
  "devDependencies": {
    "vitest": "^latest"
  }
}
```

每个 TS 包按需加：

`apps/desktop/package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run"
  }
}
```

## C2. HistoryService 改成可测试

当前 `historyService` 是闭包 singleton，测试会受 appStorage 影响。建议导出 factory，并支持 storage 注入。

```ts
export interface HistoryStorage {
  getJSON<T>(key: string): T | null;
  setJSON<T>(key: string, value: T): void;
}

export function createHistoryService(storage: HistoryStorage = appStorage): HistoryService {
  let _history: HistoryEntry[] = storage.getJSON<HistoryEntry[]>(HISTORY_KEY) ?? [];

  function persist() {
    storage.setJSON(HISTORY_KEY, _history);
  }

  // ...
}

export const historyService = createHistoryService();
```

测试：

`apps/desktop/src/services/history/history-service.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createHistoryService } from './history-service';

function createMemoryStorage() {
  const data = new Map<string, unknown>();

  return {
    getJSON<T>(key: string): T | null {
      return (data.get(key) as T | undefined) ?? null;
    },
    setJSON<T>(key: string, value: T): void {
      data.set(key, value);
    },
  };
}

describe('historyService', () => {
  it('keeps latest history at first position', () => {
    const service = createHistoryService(createMemoryStorage());

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 2',
      status: 'success',
      elapsedMs: 1,
      startedAt: 3,
      finishedAt: 4,
    });

    expect(service.getHistory()[0]?.sql).toBe('select 2');
  });

  it('can delete a history entry', () => {
    const service = createHistoryService(createMemoryStorage());

    service.addEntry({
      connectionId: 'conn-1',
      connectionName: 'local',
      sql: 'select 1',
      status: 'success',
      elapsedMs: 1,
      startedAt: 1,
      finishedAt: 2,
    });

    const [entry] = service.getHistory();
    service.deleteEntry(entry.id);

    expect(service.getHistory()).toHaveLength(0);
  });
});
```

## C3. CredentialStore 测试

```ts
import { describe, expect, it } from 'vitest';
import { createInsecureCredentialStore } from './insecure-credential-store';

function createMemoryAppStorage() {
  const data = new Map<string, unknown>();

  return {
    getJSON<T>(key: string): T | null {
      return (data.get(key) as T | undefined) ?? null;
    },
    setJSON<T>(key: string, value: T): void {
      data.set(key, value);
    },
  };
}

describe('credentialStore', () => {
  it('saves and deletes credentials by connection id', async () => {
    const store = createInsecureCredentialStore(createMemoryAppStorage());

    await store.save('conn-1', 'secret');
    expect(await store.get('conn-1')).toBe('secret');
    expect(await store.has('conn-1')).toBe(true);

    await store.delete('conn-1');
    expect(await store.get('conn-1')).toBeNull();
  });
});
```

## C4. ConnectionService 测试重点

建议不要一上来测整个服务，只测两个关键行为：

```txt
1. addProfile/updateConnection 不把 password 放进 profiles
2. deleteConnection 会删除 profile 和 credential
```

草案：

```ts
it('does not persist password in profile', async () => {
  const service = createConnectionService({
    storage: memoryStorage,
    credentialStore: memoryCredentialStore,
    dbService: fakeDbService,
  });

  await service.addProfile({
    id: 'conn-1',
    name: 'Local',
    kind: 'PostgreSQL',
    username: 'postgres',
    password: 'secret',
    rememberPassword: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  expect(service.getProfile('conn-1')).not.toHaveProperty('password');
  expect(await memoryCredentialStore.get('conn-1')).toBe('secret');
});
```

这需要把 `ConnectionService` 构造函数依赖注入化：

```ts
interface ConnectionServiceDeps {
  storage: typeof appStorage;
  credentialStore: CredentialStore;
  dbService: typeof dbService;
}

export class ConnectionService {
  constructor(private readonly deps: ConnectionServiceDeps = defaultDeps) {}
}
```

## C5. Rust SQLite 集成测试

`crates/sqlgui-db/tests/sqlite_mvp.rs`

```rust
use sqlgui_db::{DbManager, types::*};
use tempfile::NamedTempFile;

#[tokio::test]
async fn sqlite_can_open_insert_and_query() {
    let file = NamedTempFile::new().unwrap();
    let path = file.path().to_string_lossy().to_string();

    let manager = DbManager::new();

    manager
        .open_connection(ConnectionConfig {
            id: Some("test-sqlite".into()),
            name: "Test SQLite".into(),
            kind: DbKind::SQLite,
            file_path: Some(path),
            host: None,
            port: None,
            username: None,
            password: None,
            database: None,
        })
        .await
        .unwrap();

    manager
        .execute_query(QueryRequest {
            connection_id: "test-sqlite".into(),
            sql: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT)".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: false,
        })
        .await
        .unwrap();

    let insert_result = manager
        .execute_query(QueryRequest {
            connection_id: "test-sqlite".into(),
            sql: "INSERT INTO users(name) VALUES ('alice')".into(),
            limit: None,
            timeout_ms: Some(30_000),
            readonly: false,
        })
        .await
        .unwrap();

    assert_eq!(insert_result.affected_rows, Some(1));

    let query_result = manager
        .execute_query(QueryRequest {
            connection_id: "test-sqlite".into(),
            sql: "SELECT name FROM users".into(),
            limit: Some(100),
            timeout_ms: Some(30_000),
            readonly: true,
        })
        .await
        .unwrap();

    assert_eq!(query_result.rows.len(), 1);
}
```

---

# Phase D：CI 和 MVP 验收清单

## D1. GitHub Actions

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches:
      - main
      - mvp
  pull_request:

jobs:
  check:
    name: Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

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

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm check

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test

      - name: Rust tests
        run: cargo test --workspace
```

## D2. MVP checklist

新增：

`docs/mvp-checklist.md`

```md
# SQL Studio MVP Checklist

## Core

- [ ] App can start in dev mode
- [ ] SQLite connection can be created
- [ ] PostgreSQL connection can be created
- [ ] MySQL connection can be created
- [ ] Connection can be tested
- [ ] Connection can be edited
- [ ] Connection can be deleted
- [ ] Password is not persisted in connection profile
- [ ] Remember password behavior is documented

## Query

- [ ] New SQL editor can be opened
- [ ] SQL can be executed from active editor
- [ ] SQL can be executed from selected text
- [ ] Empty SQL has clear error
- [ ] Dangerous SQL shows confirmation
- [ ] SELECT result is displayed in result grid
- [ ] DML affected rows are displayed
- [ ] Query timeout works
- [ ] Query errors are displayed

## Schema Tree

- [ ] Connection tree refreshes after add/delete connection
- [ ] Connected state updates in tree
- [ ] Tables can be expanded
- [ ] Columns can be displayed
- [ ] Select top 1000 opens SQL editor

## History

- [ ] Query history records success
- [ ] Query history records error
- [ ] Latest history appears first
- [ ] History item can restore SQL with connectionId
- [ ] History item can be deleted
- [ ] History can be cleared

## Extension

- [ ] Extensions can be scanned
- [ ] Local extension can be installed
- [ ] Extension can be disabled/enabled
- [ ] Extension permissions dialog appears
- [ ] Dangerous plugin SQL requires confirmation
- [ ] Reload extension does not race scanner

## Release

- [ ] pnpm check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes
- [ ] cargo check --workspace passes
- [ ] cargo test --workspace passes
- [ ] Desktop app can start
```

---

# Phase E：发布前体验补洞

这些不一定阻塞合并，但能明显提升“完成感”。

## E1. 连接删除后清理树缓存

删除连接后，`expandedNodes/loadedChildren` 可能还残留被删连接的 node id。可以在 ConnectionsTree 里监听 profiles 变化后清理。

```tsx
useEffect(() => {
  const validConnectionIds = new Set(profiles.map((profile) => profile.id));

  setExpandedNodes((prev) => {
    const next = new Set<string>();

    for (const nodeId of prev) {
      const parsed = parseNodeId(nodeId);
      if (validConnectionIds.has(parsed.connectionId)) {
        next.add(nodeId);
      }
    }

    return next;
  });

  setLoadedChildren((prev) => {
    const next = new Map<string, ConnectionTreeNode[]>();

    for (const [nodeId, children] of prev) {
      const parsed = parseNodeId(nodeId);
      if (validConnectionIds.has(parsed.connectionId)) {
        next.set(
          nodeId,
          children.filter((child) => validConnectionIds.has(child.connectionId)),
        );
      }
    }

    return next;
  });
}, [profiles]);
```

需要导入：

```ts
import { parseNodeId } from '@/services/connection/connectionTreeService';
```

## E2. ResultGrid 大结果体验

当前 MVP 可以先限制 1000 行，但最好在结果栏显示：

```txt
Returned 1000 rows. Result may be truncated.
```

草案：

```tsx
{
  result.truncated ? (
    <div className="border-b bg-yellow-500/10 px-3 py-1 text-xs text-yellow-700">
      Result is truncated. Increase limit or refine your query.
    </div>
  ) : null;
}
```

## E3. 错误消息归一化

现在很多地方直接 `error.message`，后续建议统一：

```ts
export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
```

---

# 最终完成标准

做到下面这些，我认为 MVP 就可以标记为完成：

```txt
1. mvp 分支无已知 P0
2. 连接增删改查稳定
3. 查询执行、结果展示、历史恢复闭环稳定
4. 插件 reload / install 基本可用
5. 密码不进入 connection profile，明文 fallback 有明确提示
6. ConnectionsTree 使用订阅，不依赖偶然重渲染
7. pnpm check / pnpm lint / pnpm test 通过
8. cargo check --workspace / cargo test --workspace 通过
9. README 和 docs/mvp-checklist 与现状一致
10. 能在本地 tauri:dev 跑起来并手动完成 SQLite 查询
```

---

# 推荐提交顺序

```txt
commit 1: fix(connection): subscribe connection tree to service snapshot
commit 2: fix(history): persist restore source history id
commit 3: refactor(connection): introduce credential store abstraction
commit 4: test(desktop): add history and credential unit tests
commit 5: test(db): add sqlite integration smoke test
commit 6: ci: add mvp check workflow
commit 7: docs: add mvp completion checklist
```

---

# 最终路线

短期不要再加 AI Agent、数据同步、分布式、真插件市场。
这轮只做：

```txt
稳定性
安全边界表达
测试
CI
文档
验收
```

完成后，项目状态就可以从：

```txt
MVP RC 前一版
```

推进到：

```txt
MVP completed / ready to merge main
```
