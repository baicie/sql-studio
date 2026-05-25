下面是 **Phase 4：连接管理 UI 的详细设计**。

这一阶段目标是：

> **让用户能创建、测试、保存、打开数据库连接，并在左侧连接树里浏览 database / schema / table / column。**

Phase 4 做完以后，你的 SQL GUI 就从“能执行 SQL 的壳”变成“真正像数据库工具”的状态。

---

# Phase 4：连接管理 UI

## 1. 阶段目标

Phase 4 主要解决 5 件事：

```txt
1. 新建连接
2. 测试连接
3. 保存连接
4. 打开/关闭连接
5. 展示连接树
```

第一版支持：

```txt
SQLite
PostgreSQL
MySQL
```

不过开发顺序建议：

```txt
SQLite -> PostgreSQL -> MySQL
```

因为 SQLite 最容易跑通 UI + Rust DB Core 闭环。

---

# 2. 功能范围

## 2.1 必做功能

```txt
[ ] 新建连接弹窗
[ ] 编辑连接弹窗
[ ] 删除连接
[ ] 测试连接
[ ] 保存连接配置
[ ] 打开连接
[ ] 关闭连接
[ ] 连接状态展示
[ ] 左侧连接树
[ ] 展开 database/schema/table
[ ] 查看 columns
[ ] 右键表生成 SELECT
[ ] 右键表查看结构
[ ] 连接失败错误提示
[ ] 密码不明文展示
```

## 2.2 暂不做

```txt
[ ] SSH Tunnel
[ ] SSL 证书高级配置
[ ] 连接分组
[ ] 连接颜色标签
[ ] 连接导入导出
[ ] 云同步
[ ] 多用户权限
[ ] 密码主密码加密
[ ] Oracle / SQL Server / ClickHouse
```

---

# 3. 最终交互效果

左侧 SideBar 里有一个 Connections View。

```txt
Connections

+ New Connection

SQLite Local
└─ main
   └─ Tables
      ├─ users
      │  ├─ id          INTEGER
      │  ├─ name        TEXT
      │  └─ created_at  DATETIME
      └─ orders

PostgreSQL Dev
└─ postgres
   └─ public
      └─ Tables
         ├─ users
         ├─ logs
         └─ products

MySQL Test
└─ test_db
   └─ Tables
      ├─ user
      └─ order
```

右键表：

```txt
Open Table
Select Top 1000
Show Columns
Copy Table Name
Copy Full Name
Generate SELECT
Generate INSERT
Refresh
```

MVP 只做：

```txt
Select Top 1000
Show Columns
Copy Table Name
Refresh
```

---

# 4. 目录设计

## 4.1 前端目录

```txt
apps/desktop/src/workbench/connections/
├─ components/
│  ├─ ConnectionView.tsx
│  ├─ ConnectionTree.tsx
│  ├─ ConnectionTreeNode.tsx
│  ├─ ConnectionDialog.tsx
│  ├─ ConnectionForm.tsx
│  ├─ ConnectionToolbar.tsx
│  ├─ ConnectionContextMenu.tsx
│  ├─ ColumnListView.tsx
│  └─ EmptyConnectionState.tsx
│
├─ hooks/
│  ├─ useConnections.ts
│  ├─ useConnectionTree.ts
│  └─ useConnectionActions.ts
│
├─ services/
│  ├─ connectionService.ts
│  ├─ connectionStorage.ts
│  └─ connectionTreeService.ts
│
├─ store/
│  └─ connectionStore.ts
│
├─ types.ts
└─ index.ts
```

## 4.2 Rust 目录

```txt
apps/desktop/src-tauri/src/commands/
└─ db.rs

crates/sqlgui-db/src/
├─ types.rs
├─ manager.rs
├─ pool.rs
├─ schema.rs
├─ sqlite.rs
├─ postgres.rs
├─ mysql.rs
└─ error.rs
```

---

# 5. 数据模型设计

## 5.1 前端连接类型

```ts
// apps/desktop/src/workbench/connections/types.ts

export type DbKind = 'sqlite' | 'postgres' | 'mysql';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionProfile {
  id: string;
  name: string;
  kind: DbKind;

  host?: string;
  port?: number;
  username?: string;
  password?: string;
  passwordRef?: string;
  database?: string;
  filePath?: string;

  ssl?: boolean;

  createdAt: number;
  updatedAt: number;
}

export interface ConnectionRuntimeState {
  connectionId: string;
  status: ConnectionStatus;
  error?: string;
  openedAt?: number;
}

export interface ConnectionTreeNode {
  id: string;
  type: 'connection' | 'database' | 'schema' | 'tables' | 'table' | 'columns' | 'column';

  name: string;
  connectionId: string;

  database?: string;
  schema?: string;
  table?: string;

  icon?: string;
  isLeaf?: boolean;
  isLoading?: boolean;
  children?: ConnectionTreeNode[];
  meta?: Record<string, unknown>;
}

export interface ColumnMeta {
  name: string;
  databaseType: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
}
```

---

# 6. Rust 类型设计

前端和 Rust 类型保持 camelCase。

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
    pub password: Option<String>,
    pub password_ref: Option<String>,
    pub database: Option<String>,
    pub file_path: Option<String>,

    pub ssl: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseMeta {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaMeta {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableMeta {
    pub name: String,
    pub schema: Option<String>,
    pub table_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColumnMeta {
    pub name: String,
    pub database_type: String,
    pub nullable: Option<bool>,
    pub primary_key: Option<bool>,
    pub default_value: Option<String>,
}
```

---

# 7. 连接状态 Store

建议用 Zustand。

```ts
// apps/desktop/src/workbench/connections/store/connectionStore.ts

import { create } from 'zustand';
import type { ConnectionProfile, ConnectionRuntimeState, ConnectionTreeNode } from '../types';

interface ConnectionStore {
  profiles: ConnectionProfile[];
  runtime: Record<string, ConnectionRuntimeState>;
  tree: Record<string, ConnectionTreeNode[]>;

  activeConnectionId?: string;

  setProfiles: (profiles: ConnectionProfile[]) => void;
  upsertProfile: (profile: ConnectionProfile) => void;
  removeProfile: (connectionId: string) => void;

  setConnectionStatus: (connectionId: string, state: Partial<ConnectionRuntimeState>) => void;

  setTreeChildren: (nodeId: string, children: ConnectionTreeNode[]) => void;

  setActiveConnection: (connectionId?: string) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  profiles: [],
  runtime: {},
  tree: {},
  activeConnectionId: undefined,

  setProfiles: (profiles) => set({ profiles }),

  upsertProfile: (profile) =>
    set((state) => {
      const exists = state.profiles.some((item) => item.id === profile.id);

      return {
        profiles: exists
          ? state.profiles.map((item) => (item.id === profile.id ? profile : item))
          : [...state.profiles, profile],
      };
    }),

  removeProfile: (connectionId) =>
    set((state) => ({
      profiles: state.profiles.filter((item) => item.id !== connectionId),
      activeConnectionId:
        state.activeConnectionId === connectionId ? undefined : state.activeConnectionId,
    })),

  setConnectionStatus: (connectionId, next) =>
    set((state) => ({
      runtime: {
        ...state.runtime,
        [connectionId]: {
          connectionId,
          status: 'disconnected',
          ...state.runtime[connectionId],
          ...next,
        },
      },
    })),

  setTreeChildren: (nodeId, children) =>
    set((state) => ({
      tree: {
        ...state.tree,
        [nodeId]: children,
      },
    })),

  setActiveConnection: (connectionId) =>
    set({
      activeConnectionId: connectionId,
    }),
}));
```

---

# 8. 本地连接配置存储

MVP 阶段可以先用前端 localStorage，但更推荐走 Rust 存储到 app data 目录。

## 8.1 MVP 存储策略

先这样：

```txt
连接配置：本地 JSON
密码：Phase 4 暂时存在本地，但 UI 警告；Phase 5/6 接 keyring
```

后续改成：

```txt
连接配置：connections.json
密码：系统 keychain / Windows Credential Manager / macOS Keychain
```

## 8.2 前端存储草案

```ts
// apps/desktop/src/workbench/connections/services/connectionStorage.ts

import type { ConnectionProfile } from '../types';

const STORAGE_KEY = 'sqlgui.connections';

export const connectionStorage = {
  load(): ConnectionProfile[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      return JSON.parse(raw) as ConnectionProfile[];
    } catch {
      return [];
    }
  },

  save(profiles: ConnectionProfile[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  },
};
```

Phase 4 先能跑起来。后面可以替换为 Tauri command：

```ts
connection_config_load;
connection_config_save;
```

---

# 9. Native DB Service

```ts
// apps/desktop/src/workbench/connections/services/connectionService.ts

import { callNative } from '@/services/native/invoke';
import type { ConnectionProfile, ColumnMeta } from '../types';

export const connectionService = {
  testConnection(profile: ConnectionProfile) {
    return callNative<void>('db_test_connection', {
      config: normalizeProfile(profile),
    });
  },

  openConnection(profile: ConnectionProfile) {
    return callNative<string>('db_open_connection', {
      config: normalizeProfile(profile),
    });
  },

  closeConnection(connectionId: string) {
    return callNative<void>('db_close_connection', {
      connectionId,
    });
  },

  listDatabases(connectionId: string) {
    return callNative<Array<{ name: string }>>('db_list_databases', {
      connectionId,
    });
  },

  listSchemas(connectionId: string, database?: string) {
    return callNative<Array<{ name: string }>>('db_list_schemas', {
      connectionId,
      database,
    });
  },

  listTables(
    connectionId: string,
    payload: {
      database?: string;
      schema?: string;
    },
  ) {
    return callNative<
      Array<{
        name: string;
        schema?: string;
        tableType: string;
      }>
    >('db_list_tables', {
      connectionId,
      ...payload,
    });
  },

  listColumns(
    connectionId: string,
    payload: {
      database?: string;
      schema?: string;
      table: string;
    },
  ) {
    return callNative<ColumnMeta[]>('db_list_columns', {
      connectionId,
      ...payload,
    });
  },
};

function normalizeProfile(profile: ConnectionProfile) {
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    host: profile.host,
    port: profile.port,
    username: profile.username,
    password: profile.password,
    passwordRef: profile.passwordRef,
    database: profile.database,
    filePath: profile.filePath,
    ssl: profile.ssl,
  };
}
```

---

# 10. Rust Commands

```rust
// apps/desktop/src-tauri/src/commands/db.rs

use tauri::State;
use crate::state::AppState;
use sqlgui_db::types::*;

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
        .open_connection(config)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_close_connection(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<(), String> {
    state
        .db
        .close_connection(&connection_id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_databases(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<DatabaseMeta>, String> {
    state
        .db
        .list_databases(&connection_id)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_schemas(
    state: State<'_, AppState>,
    connection_id: String,
    database: Option<String>,
) -> Result<Vec<SchemaMeta>, String> {
    state
        .db
        .list_schemas(&connection_id, database)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_tables(
    state: State<'_, AppState>,
    connection_id: String,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<TableMeta>, String> {
    state
        .db
        .list_tables(&connection_id, database, schema)
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn db_list_columns(
    state: State<'_, AppState>,
    connection_id: String,
    database: Option<String>,
    schema: Option<String>,
    table: String,
) -> Result<Vec<ColumnMeta>, String> {
    state
        .db
        .list_columns(&connection_id, database, schema, table)
        .await
        .map_err(|err| err.to_string())
}
```

注册：

```rust
// apps/desktop/src-tauri/src/lib.rs

.invoke_handler(tauri::generate_handler![
    commands::db::db_test_connection,
    commands::db::db_open_connection,
    commands::db::db_close_connection,
    commands::db::db_list_databases,
    commands::db::db_list_schemas,
    commands::db::db_list_tables,
    commands::db::db_list_columns,
])
```

---

# 11. Connection Dialog 设计

## 11.1 UI 字段

### SQLite

```txt
Name
Database File Path
```

### PostgreSQL

```txt
Name
Host
Port 默认 5432
Username
Password
Database
SSL
```

### MySQL

```txt
Name
Host
Port 默认 3306
Username
Password
Database
SSL
```

---

## 11.2 表单默认值

```ts
// apps/desktop/src/workbench/connections/components/ConnectionForm.tsx

import type { ConnectionProfile, DbKind } from '../types';

export function createDefaultConnection(kind: DbKind): ConnectionProfile {
  const now = Date.now();

  if (kind === 'sqlite') {
    return {
      id: crypto.randomUUID(),
      name: 'Local SQLite',
      kind,
      filePath: '',
      createdAt: now,
      updatedAt: now,
    };
  }

  if (kind === 'postgres') {
    return {
      id: crypto.randomUUID(),
      name: 'PostgreSQL',
      kind,
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      database: 'postgres',
      ssl: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: crypto.randomUUID(),
    name: 'MySQL',
    kind,
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: '',
    ssl: false,
    createdAt: now,
    updatedAt: now,
  };
}
```

---

## 11.3 Dialog 代码草案

```tsx
// apps/desktop/src/workbench/connections/components/ConnectionDialog.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ConnectionProfile } from '../types';
import { ConnectionForm } from './ConnectionForm';
import { connectionService } from '../services/connectionService';
import { useConnectionStore } from '../store/connectionStore';
import { connectionStorage } from '../services/connectionStorage';

interface ConnectionDialogProps {
  open: boolean;
  initialValue: ConnectionProfile;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionDialog(props: ConnectionDialogProps) {
  const { open, initialValue, onOpenChange } = props;

  const [value, setValue] = useState(initialValue);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const profiles = useConnectionStore((state) => state.profiles);
  const upsertProfile = useConnectionStore((state) => state.upsertProfile);

  async function handleTest() {
    setTesting(true);
    setError(undefined);

    try {
      await connectionService.testConnection(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(undefined);

    try {
      const next = {
        ...value,
        updatedAt: Date.now(),
      };

      upsertProfile(next);

      const exists = profiles.some((item) => item.id === next.id);
      const nextProfiles = exists
        ? profiles.map((item) => (item.id === next.id ? next : item))
        : [...profiles, next];

      connectionStorage.save(nextProfiles);

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Connection</DialogTitle>
        </DialogHeader>

        <ConnectionForm value={value} onChange={setValue} />

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 12. Connection Form 代码草案

```tsx
// apps/desktop/src/workbench/connections/components/ConnectionForm.tsx

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { ConnectionProfile, DbKind } from '../types';

interface ConnectionFormProps {
  value: ConnectionProfile;
  onChange: (value: ConnectionProfile) => void;
}

export function ConnectionForm(props: ConnectionFormProps) {
  const { value, onChange } = props;

  function patch(next: Partial<ConnectionProfile>) {
    onChange({
      ...value,
      ...next,
    });
  }

  function handleKindChange(kind: DbKind) {
    if (kind === value.kind) return;

    const port = kind === 'postgres' ? 5432 : kind === 'mysql' ? 3306 : undefined;

    patch({
      kind,
      port,
      filePath: kind === 'sqlite' ? (value.filePath ?? '') : undefined,
      host: kind === 'sqlite' ? undefined : (value.host ?? 'localhost'),
      username: kind === 'sqlite' ? undefined : (value.username ?? ''),
      password: kind === 'sqlite' ? undefined : (value.password ?? ''),
      database: kind === 'sqlite' ? undefined : (value.database ?? ''),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Name</Label>
        <Input
          value={value.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="Connection name"
        />
      </div>

      <div className="grid gap-2">
        <Label>Database Type</Label>
        <Select value={value.kind} onValueChange={handleKindChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sqlite">SQLite</SelectItem>
            <SelectItem value="postgres">PostgreSQL</SelectItem>
            <SelectItem value="mysql">MySQL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.kind === 'sqlite' ? (
        <div className="grid gap-2">
          <Label>Database File</Label>
          <Input
            value={value.filePath ?? ''}
            onChange={(event) => patch({ filePath: event.target.value })}
            placeholder="/path/to/database.sqlite"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label>Host</Label>
              <Input
                value={value.host ?? ''}
                onChange={(event) => patch({ host: event.target.value })}
                placeholder="localhost"
              />
            </div>

            <div className="grid gap-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={value.port ?? ''}
                onChange={(event) => patch({ port: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Username</Label>
            <Input
              value={value.username ?? ''}
              onChange={(event) => patch({ username: event.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={value.password ?? ''}
              onChange={(event) => patch({ password: event.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Database</Label>
            <Input
              value={value.database ?? ''}
              onChange={(event) => patch({ database: event.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={Boolean(value.ssl)}
              onCheckedChange={(checked) => patch({ ssl: Boolean(checked) })}
            />
            <Label>Use SSL</Label>
          </div>
        </>
      )}
    </div>
  );
}
```

---

# 13. Connection View 设计

```tsx
// apps/desktop/src/workbench/connections/components/ConnectionView.tsx

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';
import { connectionStorage } from '../services/connectionStorage';
import { createDefaultConnection } from './ConnectionForm';
import { ConnectionDialog } from './ConnectionDialog';
import { ConnectionTree } from './ConnectionTree';
import type { ConnectionProfile } from '../types';

export function ConnectionView() {
  const profiles = useConnectionStore((state) => state.profiles);
  const setProfiles = useConnectionStore((state) => state.setProfiles);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectionProfile>();

  useEffect(() => {
    setProfiles(connectionStorage.load());
  }, [setProfiles]);

  function handleNewConnection() {
    setEditing(createDefaultConnection('postgres'));
    setDialogOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-2 py-1">
        <div className="text-xs font-medium uppercase text-muted-foreground">Connections</div>

        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={handleNewConnection}>
            <Plus className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {profiles.length ? (
          <ConnectionTree profiles={profiles} />
        ) : (
          <div className="p-3 text-sm text-muted-foreground">No connections yet.</div>
        )}
      </div>

      {editing ? (
        <ConnectionDialog open={dialogOpen} initialValue={editing} onOpenChange={setDialogOpen} />
      ) : null}
    </div>
  );
}
```

---

# 14. 连接树懒加载设计

## 14.1 为什么懒加载

数据库可能非常大：

```txt
几百个 database
几千张表
每张表几十/几百列
```

不能打开连接后一次性全加载。应该：

```txt
展开连接 -> 加载 database/schema
展开 schema -> 加载 tables
展开 table -> 加载 columns
```

---

## 14.2 节点 ID 设计

```ts
function createNodeId(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(':')
}

// 示例
connection:postgres-dev
database:postgres-dev:main
schema:postgres-dev:main:public
table:postgres-dev:main:public:users
column:postgres-dev:main:public:users:id
```

---

## 14.3 Tree Service

```ts
// apps/desktop/src/workbench/connections/services/connectionTreeService.ts

import type { ConnectionProfile, ConnectionTreeNode } from '../types';
import { connectionService } from './connectionService';

export const connectionTreeService = {
  createRootNodes(profiles: ConnectionProfile[]): ConnectionTreeNode[] {
    return profiles.map((profile) => ({
      id: `connection:${profile.id}`,
      type: 'connection',
      name: profile.name,
      connectionId: profile.id,
      isLeaf: false,
      meta: {
        kind: profile.kind,
      },
    }));
  },

  async loadChildren(node: ConnectionTreeNode): Promise<ConnectionTreeNode[]> {
    if (node.type === 'connection') {
      const databases = await connectionService.listDatabases(node.connectionId);

      return databases.map((database) => ({
        id: `database:${node.connectionId}:${database.name}`,
        type: 'database',
        name: database.name,
        connectionId: node.connectionId,
        database: database.name,
        isLeaf: false,
      }));
    }

    if (node.type === 'database') {
      const schemas = await connectionService.listSchemas(node.connectionId, node.database);

      if (!schemas.length) {
        return [
          {
            id: `tables:${node.connectionId}:${node.database}`,
            type: 'tables',
            name: 'Tables',
            connectionId: node.connectionId,
            database: node.database,
            isLeaf: false,
          },
        ];
      }

      return schemas.map((schema) => ({
        id: `schema:${node.connectionId}:${node.database}:${schema.name}`,
        type: 'schema',
        name: schema.name,
        connectionId: node.connectionId,
        database: node.database,
        schema: schema.name,
        isLeaf: false,
      }));
    }

    if (node.type === 'schema') {
      return [
        {
          id: `tables:${node.connectionId}:${node.database}:${node.schema}`,
          type: 'tables',
          name: 'Tables',
          connectionId: node.connectionId,
          database: node.database,
          schema: node.schema,
          isLeaf: false,
        },
      ];
    }

    if (node.type === 'tables') {
      const tables = await connectionService.listTables(node.connectionId, {
        database: node.database,
        schema: node.schema,
      });

      return tables.map((table) => ({
        id: `table:${node.connectionId}:${node.database}:${table.schema}:${table.name}`,
        type: 'table',
        name: table.name,
        connectionId: node.connectionId,
        database: node.database,
        schema: table.schema,
        table: table.name,
        isLeaf: false,
        meta: {
          tableType: table.tableType,
        },
      }));
    }

    if (node.type === 'table') {
      const columns = await connectionService.listColumns(node.connectionId, {
        database: node.database,
        schema: node.schema,
        table: node.table!,
      });

      return columns.map((column) => ({
        id: `column:${node.connectionId}:${node.database}:${node.schema}:${node.table}:${column.name}`,
        type: 'column',
        name: `${column.name}  ${column.databaseType}`,
        connectionId: node.connectionId,
        database: node.database,
        schema: node.schema,
        table: node.table,
        isLeaf: true,
        meta: column,
      }));
    }

    return [];
  },
};
```

---

# 15. ConnectionTree 代码草案

```tsx
// apps/desktop/src/workbench/connections/components/ConnectionTree.tsx

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Database, Table, Columns3 } from 'lucide-react';
import type { ConnectionProfile, ConnectionTreeNode } from '../types';
import { connectionTreeService } from '../services/connectionTreeService';
import { useConnectionStore } from '../store/connectionStore';

interface ConnectionTreeProps {
  profiles: ConnectionProfile[];
}

export function ConnectionTree(props: ConnectionTreeProps) {
  const { profiles } = props;

  const rootNodes = useMemo(() => connectionTreeService.createRootNodes(profiles), [profiles]);

  return (
    <div className="text-sm">
      {rootNodes.map((node) => (
        <ConnectionTreeItem key={node.id} node={node} level={0} />
      ))}
    </div>
  );
}

function ConnectionTreeItem(props: { node: ConnectionTreeNode; level: number }) {
  const { node, level } = props;

  const tree = useConnectionStore((state) => state.tree);
  const setTreeChildren = useConnectionStore((state) => state.setTreeChildren);

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const children = tree[node.id] ?? [];

  async function toggle() {
    if (node.isLeaf) return;

    if (!expanded && !children.length) {
      setLoading(true);
      setError(undefined);

      try {
        const next = await connectionTreeService.loadChildren(node);
        setTreeChildren(node.id, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    setExpanded(!expanded);
  }

  return (
    <div>
      <div
        className="flex cursor-default items-center gap-1 rounded px-1 py-0.5 hover:bg-accent"
        style={{ paddingLeft: level * 12 + 4 }}
        onDoubleClick={toggle}
      >
        <button className="flex h-4 w-4 items-center justify-center" onClick={toggle}>
          {node.isLeaf ? null : expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        <NodeIcon node={node} />

        <span className="truncate">{node.name}</span>

        {loading ? <span className="ml-auto text-xs text-muted-foreground">loading</span> : null}
      </div>

      {error ? (
        <div
          className="px-2 py-1 text-xs text-destructive"
          style={{ paddingLeft: level * 12 + 24 }}
        >
          {error}
        </div>
      ) : null}

      {expanded
        ? children.map((child) => (
            <ConnectionTreeItem key={child.id} node={child} level={level + 1} />
          ))
        : null}
    </div>
  );
}

function NodeIcon(props: { node: ConnectionTreeNode }) {
  const { node } = props;

  if (node.type === 'connection' || node.type === 'database') {
    return <Database className="h-4 w-4 text-muted-foreground" />;
  }

  if (node.type === 'table') {
    return <Table className="h-4 w-4 text-muted-foreground" />;
  }

  if (node.type === 'column') {
    return <Columns3 className="h-4 w-4 text-muted-foreground" />;
  }

  return <Database className="h-4 w-4 text-muted-foreground" />;
}
```

---

# 16. 打开连接流程

## 16.1 流程

```txt
用户点击连接
  ↓
前端设置 connecting
  ↓
调用 db_open_connection
  ↓
Rust 创建连接池
  ↓
PoolManager 保存 pool
  ↓
返回 connectionId
  ↓
前端设置 connected
  ↓
连接树允许展开
```

## 16.2 Action Hook

```ts
// apps/desktop/src/workbench/connections/hooks/useConnectionActions.ts

import type { ConnectionProfile } from '../types';
import { connectionService } from '../services/connectionService';
import { useConnectionStore } from '../store/connectionStore';

export function useConnectionActions() {
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus);
  const setActiveConnection = useConnectionStore((state) => state.setActiveConnection);

  async function openConnection(profile: ConnectionProfile) {
    setConnectionStatus(profile.id, {
      status: 'connecting',
      error: undefined,
    });

    try {
      const connectionId = await connectionService.openConnection(profile);

      setConnectionStatus(profile.id, {
        status: 'connected',
        openedAt: Date.now(),
      });

      setActiveConnection(connectionId);
    } catch (err) {
      setConnectionStatus(profile.id, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function closeConnection(connectionId: string) {
    await connectionService.closeConnection(connectionId);

    setConnectionStatus(connectionId, {
      status: 'disconnected',
      error: undefined,
    });

    setActiveConnection(undefined);
  }

  return {
    openConnection,
    closeConnection,
  };
}
```

---

# 17. Rust DB Manager 设计

```rust
// crates/sqlgui-db/src/manager.rs

use crate::types::*;
use crate::pool::{AnyDbPool, PoolManager};
use anyhow::{anyhow, Result};

#[derive(Clone)]
pub struct DbManager {
    pool_manager: PoolManager,
}

impl DbManager {
    pub fn new() -> Self {
        Self {
            pool_manager: PoolManager::new(),
        }
    }

    pub async fn test_connection(
        &self,
        config: ConnectionConfig,
    ) -> Result<()> {
        match config.kind {
            DbKind::SQLite => crate::sqlite::test_connection(config).await,
            DbKind::PostgreSQL => crate::postgres::test_connection(config).await,
            DbKind::MySQL => crate::mysql::test_connection(config).await,
        }
    }

    pub async fn open_connection(
        &self,
        config: ConnectionConfig,
    ) -> Result<String> {
        let connection_id = config.id.clone();

        let pool = match config.kind {
            DbKind::SQLite => {
                AnyDbPool::Sqlite(crate::sqlite::create_pool(config).await?)
            }
            DbKind::PostgreSQL => {
                AnyDbPool::Postgres(crate::postgres::create_pool(config).await?)
            }
            DbKind::MySQL => {
                AnyDbPool::MySql(crate::mysql::create_pool(config).await?)
            }
        };

        self.pool_manager.insert(connection_id.clone(), pool);

        Ok(connection_id)
    }

    pub async fn close_connection(
        &self,
        connection_id: &str,
    ) -> Result<()> {
        self.pool_manager.remove(connection_id);
        Ok(())
    }

    pub async fn list_databases(
        &self,
        connection_id: &str,
    ) -> Result<Vec<DatabaseMeta>> {
        let pool = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| anyhow!("Connection not opened"))?;

        crate::schema::list_databases(pool).await
    }

    pub async fn list_schemas(
        &self,
        connection_id: &str,
        database: Option<String>,
    ) -> Result<Vec<SchemaMeta>> {
        let pool = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| anyhow!("Connection not opened"))?;

        crate::schema::list_schemas(pool, database).await
    }

    pub async fn list_tables(
        &self,
        connection_id: &str,
        database: Option<String>,
        schema: Option<String>,
    ) -> Result<Vec<TableMeta>> {
        let pool = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| anyhow!("Connection not opened"))?;

        crate::schema::list_tables(pool, database, schema).await
    }

    pub async fn list_columns(
        &self,
        connection_id: &str,
        database: Option<String>,
        schema: Option<String>,
        table: String,
    ) -> Result<Vec<ColumnMeta>> {
        let pool = self
            .pool_manager
            .get(connection_id)
            .ok_or_else(|| anyhow!("Connection not opened"))?;

        crate::schema::list_columns(pool, database, schema, table).await
    }
}
```

---

# 18. Schema 查询设计

## 18.1 SQLite

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;
```

columns：

```sql
PRAGMA table_info(table_name);
```

## 18.2 PostgreSQL

schemas：

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema_name;
```

tables：

```sql
SELECT table_schema, table_name, table_type
FROM information_schema.tables
WHERE table_schema = $1
ORDER BY table_name;
```

columns：

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = $1
  AND table_name = $2
ORDER BY ordinal_position;
```

## 18.3 MySQL

databases：

```sql
SHOW DATABASES;
```

tables：

```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = ?
ORDER BY table_name;
```

columns：

```sql
SELECT
  column_name,
  column_type,
  is_nullable,
  column_default,
  column_key
FROM information_schema.columns
WHERE table_schema = ?
  AND table_name = ?
ORDER BY ordinal_position;
```

---

# 19. 表右键菜单

## 19.1 菜单项

```txt
Select Top 1000
Copy Table Name
Copy Full Name
Show Columns
Refresh
```

## 19.2 生成 SQL

```ts
// apps/desktop/src/workbench/connections/services/sqlGenerator.ts

import type { ConnectionTreeNode } from '../types';

export function generateSelectTopSql(node: ConnectionTreeNode) {
  const tableName = quoteTableName(node);

  if (node.meta?.kind === 'mysql') {
    return `SELECT * FROM ${tableName} LIMIT 1000;`;
  }

  if (node.meta?.kind === 'postgres') {
    return `SELECT * FROM ${tableName} LIMIT 1000;`;
  }

  return `SELECT * FROM ${tableName} LIMIT 1000;`;
}

export function quoteTableName(node: ConnectionTreeNode) {
  const parts = [node.schema, node.table].filter(Boolean);

  return parts.map((item) => `"${String(item).replaceAll('"', '""')}"`).join('.');
}
```

后面要按数据库方言处理：

```txt
PostgreSQL: "public"."users"
MySQL: `test`.`users`
SQLite: "users"
```

MVP 可以先简单处理。

---

# 20. 与 EditorService 联动

表右键 `Select Top 1000` 后：

```txt
生成 SQL
  ↓
打开/聚焦 SQL Editor
  ↓
插入 SQL
  ↓
设置 active connection
  ↓
可选择自动执行
```

```ts
async function handleSelectTop1000(node: ConnectionTreeNode) {
  const sql = generateSelectTopSql(node);

  await editorService.openSql({
    connectionId: node.connectionId,
    content: sql,
    title: `${node.table}.sql`,
  });
}
```

---

# 21. 命令系统注册

Phase 4 需要注册这些核心命令：

```txt
connection.new
connection.edit
connection.delete
connection.test
connection.open
connection.close
connection.refresh
connection.copyName
connection.selectTop1000
connection.showColumns
```

示例：

```ts
// apps/desktop/src/workbench/connections/registerConnectionCommands.ts

import { commandService } from '@/services/commandService';

export function registerConnectionCommands() {
  commandService.register({
    id: 'connection.new',
    title: 'New Connection',
    category: 'Connection',
    source: 'core',
    handler: async () => {
      // open dialog
    },
  });

  commandService.register({
    id: 'connection.refresh',
    title: 'Refresh Connection',
    category: 'Connection',
    source: 'core',
    handler: async (connectionId: string) => {
      // refresh tree
    },
  });

  commandService.register({
    id: 'connection.selectTop1000',
    title: 'Select Top 1000',
    category: 'Connection',
    source: 'core',
    handler: async (node) => {
      // generate sql and open editor
    },
  });
}
```

---

# 22. 错误处理设计

## 22.1 连接失败

错误要分层：

```txt
网络错误
认证失败
数据库不存在
超时
驱动不支持
未知错误
```

前端展示不要直接丢一大串 Rust 错误。

```ts
export function normalizeConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('password authentication failed')) {
    return 'Authentication failed. Please check username or password.';
  }

  if (message.includes('Connection refused')) {
    return 'Connection refused. Please check host and port.';
  }

  if (message.includes('timeout')) {
    return 'Connection timeout. Please check network.';
  }

  return message;
}
```

## 22.2 UI 展示

连接节点旁边显示状态：

```txt
connected      绿色点
connecting     spinner
error          红色点
disconnected   灰色点
```

---

# 23. 安全设计

Phase 4 必须先立规矩。

## 23.1 密码处理

MVP 暂时可以保存，但要明确 TODO：

```txt
[ ] Phase 4 MVP：本地保存，标记为 insecure
[ ] Phase 5：接入 keyring
[ ] Phase 6：支持 master password
```

更建议 Phase 4 就先这样：

```txt
连接配置保存 passwordRef
真实 password 先存在内存
应用重启后需要重新输入密码
```

这样安全一点，但体验差。

我建议你的 MVP 选择：

> **默认记住密码，但在代码里单独封装 SecretStorage，后面替换 keyring。**

不要把密码散落在业务代码里。

## 23.2 不打印密码

所有日志必须脱敏：

```ts
function maskConnectionProfile(profile: ConnectionProfile) {
  return {
    ...profile,
    password: profile.password ? '******' : undefined,
  };
}
```

Rust 里也不要 `Debug` 直接打印 config。

---

# 24. 测试用例

## 24.1 前端测试

```txt
[ ] createDefaultConnection 返回正确默认值
[ ] ConnectionForm 切换数据库类型时 port 正确变化
[ ] connectionStorage load/save 正常
[ ] connectionTreeService root nodes 正确
[ ] generateSelectTopSql 正确
[ ] ConnectionDialog 测试失败显示错误
```

## 24.2 Rust 测试

```txt
[ ] SQLite test_connection
[ ] SQLite list_tables
[ ] SQLite list_columns
[ ] PostgreSQL url 构造
[ ] MySQL url 构造
[ ] PoolManager insert/get/remove
```

## 24.3 手动验收

```txt
[ ] 新建 SQLite 连接
[ ] 测试 SQLite 连接成功
[ ] 保存后重启仍存在
[ ] 展开连接能看到 tables
[ ] 展开 table 能看到 columns
[ ] 右键 table 生成 SELECT
[ ] 执行 SELECT 能看到结果
[ ] 错误密码能显示错误
[ ] 删除连接后本地配置移除
```

---

# 25. Phase 4 开发顺序

推荐按这个顺序写：

```txt
1. 前端 ConnectionProfile 类型
2. connectionStore
3. connectionStorage
4. ConnectionView 静态 UI
5. ConnectionDialog + ConnectionForm
6. Rust db_test_connection
7. Rust db_open_connection
8. 前端 test connection
9. 前端 save connection
10. ConnectionTree root nodes
11. Rust list_databases/list_tables/list_columns
12. connectionTreeService 懒加载
13. 表右键菜单
14. 生成 SELECT 并打开编辑器
15. 错误处理和状态展示
```

---

# 26. Phase 4 完成标准

做到下面这些就算 Phase 4 完成：

```txt
[ ] 可以创建 SQLite 连接
[ ] 可以创建 PostgreSQL 连接
[ ] 可以测试连接
[ ] 可以保存连接
[ ] 可以打开连接
[ ] 可以关闭连接
[ ] 左侧能展示连接列表
[ ] 展开连接能加载数据库/表
[ ] 展开表能加载字段
[ ] 表右键能生成 SELECT
[ ] 生成的 SELECT 能进入 SQL Editor
[ ] 查询能执行并展示结果
[ ] 错误密码/错误端口有友好提示
[ ] 本地重启后连接配置还在
```

---

# 27. 我建议的 MVP 取舍

Phase 4 不要追求太完整，最优先闭环是：

```txt
SQLite 文件连接
  ↓
保存连接
  ↓
展开表
  ↓
右键 Select Top 1000
  ↓
SQL Editor 打开
  ↓
执行查询
  ↓
ResultGrid 展示
```

这个闭环一旦跑通，PostgreSQL 和 MySQL 只是补 connector 和 schema query。

最终 Phase 4 的核心价值是：

> **让 SQL GUI 具备“连接树 + 查询入口”的基本数据库工具形态。**

后面的 Phase 5 插件系统才能基于这些连接、表、编辑器、结果表格做扩展。
