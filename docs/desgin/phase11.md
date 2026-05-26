下面是 **Phase 11：Permission Broker 插件权限系统详细设计与代码草案**。

这一阶段目标是：

> **让插件不能“想调什么 API 就调什么 API”。所有插件能力都必须经过权限声明、用户授权、运行时校验和高危操作确认。**

Phase 10 已经让插件真正跑起来了：

```txt
Plugin Worker
  ↓
RPC
  ↓
PluginRpcDispatcher
  ↓
Host Services
```

Phase 11 要在中间加一层：

```txt
Plugin Worker
  ↓
RPC Request
  ↓
Permission Broker
  ↓
PluginRpcDispatcher Handler
  ↓
Host Services
```

---

# 1. Phase 11 总目标

## 必做功能

```txt
[ ] 定义插件权限模型
[ ] manifest permissions 校验
[ ] 插件安装/首次启用时展示权限
[ ] 保存用户授权结果
[ ] API method -> permission 映射
[ ] RPC 调用前做权限校验
[ ] editor.read / editor.write 校验
[ ] db.connection.read / db.schema.read 校验
[ ] db.query.read / db.query.write / db.query.explain 校验
[ ] storage.local 校验
[ ] clipboard.read / clipboard.write 校验
[ ] ui.notification 校验
[ ] network.fetch 默认拒绝
[ ] 高危 SQL 二次确认
[ ] 插件权限变更检测
[ ] 插件禁用后清理运行时权限缓存
[ ] 权限拒绝错误标准化
[ ] 插件 API 调用审计日志
```

## 暂不做

```txt
[ ] 不做完整签名信任体系
[ ] 不做插件市场审核
[ ] 不做细粒度数据库表级授权
[ ] 不做系统级文件权限
[ ] 不做 Native 插件权限
[ ] 不做企业管理员策略
[ ] 不做插件沙箱强隔离
```

---

# 2. 核心原则

## 2.1 默认拒绝

插件没有声明权限，不能调用对应 API。

```txt
manifest 没有 editor.write
  ↓
插件调用 editor.replaceSelection
  ↓
PermissionBroker 拒绝
```

## 2.2 声明不等于授权

manifest 里声明了权限，只表示“插件想要”。
用户启用/安装时还要确认。

```txt
manifest.permissions 包含 db.query.write
  ↓
用户未授权
  ↓
运行时仍然拒绝
```

## 2.3 高危操作需要运行时确认

某些能力即使授权了，也要二次确认：

```txt
db.query.write
DROP / DELETE / UPDATE / ALTER / TRUNCATE
  ↓
用户明确确认
  ↓
才允许执行
```

## 2.4 权限和 API method 强绑定

不允许在 handler 里到处手写判断。
统一在 `PluginRpcDispatcher` 前拦截。

---

# 3. 权限分级设计

## 3.1 权限枚举

```ts
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
  | 'clipboard.read'
  | 'clipboard.write'
  | 'network.fetch';
```

## 3.2 权限风险等级

```ts
export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';
```

| 权限                 |     风险 | 说明                     |
| -------------------- | -------: | ------------------------ |
| `ui.notification`    |      low | 显示通知                 |
| `storage.local`      |      low | 插件自身本地存储         |
| `editor.read`        |   medium | 读取 SQL 编辑器内容      |
| `editor.write`       |   medium | 修改 SQL 编辑器内容      |
| `clipboard.write`    |   medium | 写剪贴板                 |
| `clipboard.read`     |     high | 读剪贴板                 |
| `db.connection.read` |   medium | 读取连接元信息，不含密码 |
| `db.schema.read`     |   medium | 读取库表结构             |
| `db.query.read`      |     high | 执行只读查询             |
| `db.query.explain`   |     high | 执行 EXPLAIN             |
| `db.query.write`     | critical | 执行写入/DDL SQL         |
| `network.fetch`      | critical | 访问网络                 |

---

# 4. 目录设计

```txt
apps/desktop/src/plugins/permissions/
├─ types.ts
├─ permissions.ts
├─ permissionDescriptions.ts
├─ apiPermissionMap.ts
├─ PermissionBroker.ts
├─ PermissionStorage.ts
├─ PermissionError.ts
├─ PermissionPromptService.ts
├─ SqlSafetyAnalyzer.ts
├─ PluginAuditService.ts
├─ useExtensionPermissions.ts
└─ components/
   ├─ PermissionGrantDialog.tsx
   ├─ PermissionList.tsx
   ├─ PermissionRiskBadge.tsx
   ├─ PermissionChangeWarning.tsx
   └─ DangerousSqlConfirmDialog.tsx
```

需要改造：

```txt
apps/desktop/src/plugins/host/
├─ PluginRpcDispatcher.ts
└─ rpc/dbRpcHandlers.ts

apps/desktop/src/plugins/services/
└─ extensionService.ts

apps/desktop/src/plugins/components/
├─ ExtensionListItem.tsx
└─ ExtensionDetailView.tsx
```

---

# 5. 权限类型定义

```ts
// apps/desktop/src/plugins/permissions/types.ts

import type { ExtensionPermission } from '@sqlgui/api';

export type PermissionDecision = 'granted' | 'denied';

export type PermissionRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PermissionMeta {
  permission: ExtensionPermission;
  risk: PermissionRiskLevel;
  titleKey: string;
  descriptionKey: string;
}

export interface ExtensionPermissionGrant {
  extensionId: string;
  permissions: ExtensionPermission[];
  grantedAt: number;
  manifestHash: string;
}

export interface PermissionCheckContext {
  extensionId: string;
  method: string;
  params?: unknown;
  permissions: ExtensionPermission[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: ExtensionPermission[];
  requiresConfirmation?: boolean;
}

export interface DangerousOperationContext {
  extensionId: string;
  method: string;
  sql?: string;
  reason: string;
}
```

---

# 6. 权限元信息

```ts
// apps/desktop/src/plugins/permissions/permissions.ts

import type { ExtensionPermission } from '@sqlgui/api';
import type { PermissionMeta } from './types';

export const permissionMetas: Record<ExtensionPermission, PermissionMeta> = {
  'ui.notification': {
    permission: 'ui.notification',
    risk: 'low',
    titleKey: 'extension.permission.ui.notification.title',
    descriptionKey: 'extension.permission.ui.notification.description',
  },

  'storage.local': {
    permission: 'storage.local',
    risk: 'low',
    titleKey: 'extension.permission.storage.local.title',
    descriptionKey: 'extension.permission.storage.local.description',
  },

  'editor.read': {
    permission: 'editor.read',
    risk: 'medium',
    titleKey: 'extension.permission.editor.read.title',
    descriptionKey: 'extension.permission.editor.read.description',
  },

  'editor.write': {
    permission: 'editor.write',
    risk: 'medium',
    titleKey: 'extension.permission.editor.write.title',
    descriptionKey: 'extension.permission.editor.write.description',
  },

  'clipboard.read': {
    permission: 'clipboard.read',
    risk: 'high',
    titleKey: 'extension.permission.clipboard.read.title',
    descriptionKey: 'extension.permission.clipboard.read.description',
  },

  'clipboard.write': {
    permission: 'clipboard.write',
    risk: 'medium',
    titleKey: 'extension.permission.clipboard.write.title',
    descriptionKey: 'extension.permission.clipboard.write.description',
  },

  'db.connection.read': {
    permission: 'db.connection.read',
    risk: 'medium',
    titleKey: 'extension.permission.db.connection.read.title',
    descriptionKey: 'extension.permission.db.connection.read.description',
  },

  'db.schema.read': {
    permission: 'db.schema.read',
    risk: 'medium',
    titleKey: 'extension.permission.db.schema.read.title',
    descriptionKey: 'extension.permission.db.schema.read.description',
  },

  'db.query.read': {
    permission: 'db.query.read',
    risk: 'high',
    titleKey: 'extension.permission.db.query.read.title',
    descriptionKey: 'extension.permission.db.query.read.description',
  },

  'db.query.explain': {
    permission: 'db.query.explain',
    risk: 'high',
    titleKey: 'extension.permission.db.query.explain.title',
    descriptionKey: 'extension.permission.db.query.explain.description',
  },

  'db.query.write': {
    permission: 'db.query.write',
    risk: 'critical',
    titleKey: 'extension.permission.db.query.write.title',
    descriptionKey: 'extension.permission.db.query.write.description',
  },

  'network.fetch': {
    permission: 'network.fetch',
    risk: 'critical',
    titleKey: 'extension.permission.network.fetch.title',
    descriptionKey: 'extension.permission.network.fetch.description',
  },
};

export function getPermissionRisk(permission: ExtensionPermission) {
  return permissionMetas[permission]?.risk ?? 'high';
}
```

---

# 7. API Method -> Permission 映射

这是最关键的白名单。

```ts
// apps/desktop/src/plugins/permissions/apiPermissionMap.ts

import type { ExtensionPermission } from '@sqlgui/api';

export const apiPermissionMap: Record<string, ExtensionPermission[]> = {
  // commands
  'commands.execute': [],
  'commands.getAll': [],
  'commands.register': [],
  'commands.unregister': [],

  // window
  'window.showInformationMessage': ['ui.notification'],
  'window.showWarningMessage': ['ui.notification'],
  'window.showErrorMessage': ['ui.notification'],
  'window.showQuickPick': ['ui.notification'],
  'window.showInputBox': ['ui.notification'],

  // editor read
  'editor.getActive': ['editor.read'],
  'editor.getAll': ['editor.read'],
  'editor.getText': ['editor.read'],
  'editor.getSelectedText': ['editor.read'],
  'editor.getSelectedTextOrDocumentText': ['editor.read'],
  'editor.getCursorPosition': ['editor.read'],

  // editor write
  'editor.openSql': ['editor.write'],
  'editor.close': ['editor.write'],
  'editor.setText': ['editor.write'],
  'editor.replaceSelection': ['editor.write'],
  'editor.insertText': ['editor.write'],
  'editor.revealRange': ['editor.read'],

  // db metadata
  'db.getActiveConnection': ['db.connection.read'],
  'db.getConnections': ['db.connection.read'],
  'db.listDatabases': ['db.schema.read'],
  'db.listSchemas': ['db.schema.read'],
  'db.listTables': ['db.schema.read'],
  'db.listColumns': ['db.schema.read'],

  // db query
  'db.query': ['db.query.read'],
  'db.explain': ['db.query.explain'],

  // storage
  'storage.get': ['storage.local'],
  'storage.set': ['storage.local'],
  'storage.delete': ['storage.local'],
  'storage.keys': ['storage.local'],
  'storage.clear': ['storage.local'],

  'memento.get': ['storage.local'],
  'memento.update': ['storage.local'],
  'memento.delete': ['storage.local'],
  'memento.keys': ['storage.local'],

  // clipboard
  'clipboard.readText': ['clipboard.read'],
  'clipboard.writeText': ['clipboard.write'],

  // diagnostics
  'diagnostics.set': ['editor.write'],
  'diagnostics.clear': ['editor.write'],
  'diagnostics.collection.set': ['editor.write'],
  'diagnostics.collection.clear': ['editor.write'],
  'diagnostics.collection.dispose': ['editor.write'],

  // result
  'result.getActiveQuery': ['db.query.read'],
  'result.getQueries': ['db.query.read'],
  'result.registerRenderer': [],
  'result.unregisterRenderer': [],

  // views
  'views.registerProvider': [],
  'views.unregisterProvider': [],
  'views.open': [],
  'views.createWebviewView': [],

  // extension log
  'extension.log': [],
};
```

注意：

```txt
commands.execute 默认不要求权限
```

但如果插件通过 `commands.execute('editor.run')` 间接触发危险能力，后续可以在 CommandService 层继续检查命令来源。MVP 可以先只拦截 RPC API。

---

# 8. 权限错误标准化

```ts
// apps/desktop/src/plugins/permissions/PermissionError.ts

import type { ExtensionPermission } from '@sqlgui/api';

export class PermissionError extends Error {
  readonly code = 'PLUGIN_PERMISSION_DENIED';

  constructor(
    readonly extensionId: string,
    readonly method: string,
    readonly missingPermissions: ExtensionPermission[],
  ) {
    super(
      `Extension "${extensionId}" is missing permissions for "${method}": ${missingPermissions.join(', ')}`,
    );
  }
}

export class DangerousOperationError extends Error {
  readonly code = 'PLUGIN_DANGEROUS_OPERATION_DENIED';

  constructor(
    readonly extensionId: string,
    readonly method: string,
    readonly reason: string,
  ) {
    super(`Dangerous operation denied for extension "${extensionId}" on "${method}": ${reason}`);
  }
}
```

---

# 9. PermissionStorage

保存用户授权。

```ts
// apps/desktop/src/plugins/permissions/PermissionStorage.ts

import type { ExtensionPermission } from '@sqlgui/api';
import type { ExtensionPermissionGrant } from './types';

const STORAGE_KEY = 'sqlgui.extension.permission.grants';

class PermissionStorage {
  loadAll(): Record<string, ExtensionPermissionGrant> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  getGrant(extensionId: string) {
    return this.loadAll()[extensionId];
  }

  getGrantedPermissions(extensionId: string): ExtensionPermission[] {
    return this.getGrant(extensionId)?.permissions ?? [];
  }

  saveGrant(grant: ExtensionPermissionGrant) {
    const all = this.loadAll();
    all[grant.extensionId] = grant;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  revoke(extensionId: string) {
    const all = this.loadAll();
    delete all[extensionId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  updatePermissions(extensionId: string, permissions: ExtensionPermission[], manifestHash: string) {
    this.saveGrant({
      extensionId,
      permissions,
      manifestHash,
      grantedAt: Date.now(),
    });
  }

  hasPermission(extensionId: string, permission: ExtensionPermission) {
    return this.getGrantedPermissions(extensionId).includes(permission);
  }
}

export const permissionStorage = new PermissionStorage();
```

---

# 10. Manifest Hash

用于检测插件升级后权限是否变化。

```ts
// apps/desktop/src/plugins/permissions/manifestHash.ts

import type { ExtensionManifest } from '@sqlgui/api';

export async function createManifestHash(manifest: ExtensionManifest): Promise<string> {
  const relevant = {
    name: manifest.name,
    publisher: manifest.publisher,
    version: manifest.version,
    permissions: [...(manifest.permissions ?? [])].sort(),
  };

  const text = JSON.stringify(relevant);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('');
}
```

---

# 11. PermissionBroker

核心模块。

```ts
// apps/desktop/src/plugins/permissions/PermissionBroker.ts

import type { ExtensionManifest, ExtensionPermission } from '@sqlgui/api';
import type { LoadedExtension } from '@/plugins/manifest/types';
import { apiPermissionMap } from './apiPermissionMap';
import { permissionStorage } from './PermissionStorage';
import { DangerousOperationError, PermissionError } from './PermissionError';
import { sqlSafetyAnalyzer } from './SqlSafetyAnalyzer';
import { permissionPromptService } from './PermissionPromptService';
import { pluginAuditService } from './PluginAuditService';

class PermissionBroker {
  async ensureManifestGranted(extension: LoadedExtension) {
    const required = extension.manifest.permissions ?? [];
    const grant = permissionStorage.getGrant(extension.id);

    if (!required.length) return true;

    const manifestHash = await this.getManifestPermissionHash(extension.manifest);

    if (grant && grant.manifestHash === manifestHash && includesAll(grant.permissions, required)) {
      return true;
    }

    const granted = await permissionPromptService.requestPermissionGrant({
      extension,
      permissions: required,
      previousPermissions: grant?.permissions ?? [],
    });

    if (!granted) {
      return false;
    }

    permissionStorage.updatePermissions(extension.id, required, manifestHash);

    return true;
  }

  async assertAllowed(extension: LoadedExtension, method: string, params?: unknown) {
    const required = this.getRequiredPermissions(method, params);
    const granted = permissionStorage.getGrantedPermissions(extension.id);

    const missing = required.filter((permission) => !granted.includes(permission));

    pluginAuditService.record({
      extensionId: extension.id,
      method,
      requiredPermissions: required,
      grantedPermissions: granted,
      paramsSummary: summarizeParams(params),
      createdAt: Date.now(),
    });

    if (missing.length) {
      throw new PermissionError(extension.id, method, missing);
    }

    await this.assertDangerousOperationConfirmed(extension, method, params, granted);
  }

  getRequiredPermissions(method: string, params?: unknown): ExtensionPermission[] {
    const base = apiPermissionMap[method];

    if (!base) {
      return ['network.fetch']; // 未知能力默认按高危拒绝
    }

    // db.query 需要根据 SQL 类型动态提升权限
    if (method === 'db.query') {
      const sql = String((params as any)?.sql ?? '');
      const analysis = sqlSafetyAnalyzer.analyze(sql);

      if (analysis.kind === 'write' || analysis.kind === 'ddl') {
        return unique([...base, 'db.query.write']);
      }

      return base;
    }

    return base;
  }

  private async assertDangerousOperationConfirmed(
    extension: LoadedExtension,
    method: string,
    params: unknown,
    granted: ExtensionPermission[],
  ) {
    if (method !== 'db.query') return;

    const sql = String((params as any)?.sql ?? '');
    const analysis = sqlSafetyAnalyzer.analyze(sql);

    if (!analysis.dangerous) return;

    if (!granted.includes('db.query.write')) {
      throw new DangerousOperationError(
        extension.id,
        method,
        'Write query permission is required.',
      );
    }

    const confirmed = await permissionPromptService.confirmDangerousOperation({
      extensionId: extension.id,
      extensionName: extension.displayName,
      sql,
      reason: analysis.reason ?? 'Dangerous SQL operation',
    });

    if (!confirmed) {
      throw new DangerousOperationError(
        extension.id,
        method,
        analysis.reason ?? 'User denied dangerous SQL operation.',
      );
    }
  }

  private async getManifestPermissionHash(manifest: ExtensionManifest) {
    const relevant = {
      permissions: [...(manifest.permissions ?? [])].sort(),
      name: manifest.name,
      publisher: manifest.publisher,
      version: manifest.version,
    };

    const encoded = new TextEncoder().encode(JSON.stringify(relevant));
    const digest = await crypto.subtle.digest('SHA-256', encoded);

    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('');
  }
}

function includesAll<T>(source: T[], required: T[]) {
  return required.every((item) => source.includes(item));
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function summarizeParams(params: unknown) {
  if (!params || typeof params !== 'object') return undefined;

  const payload = params as Record<string, unknown>;

  if (typeof payload.sql === 'string') {
    return {
      ...payload,
      sql: payload.sql.slice(0, 500),
    };
  }

  return payload;
}

export const permissionBroker = new PermissionBroker();
```

---

# 12. SQL Safety Analyzer

MVP 不要一开始接复杂 SQL parser，先做保守识别。

```ts
// apps/desktop/src/plugins/permissions/SqlSafetyAnalyzer.ts

export type SqlOperationKind = 'read' | 'write' | 'ddl' | 'transaction' | 'unknown';

export interface SqlSafetyAnalysis {
  kind: SqlOperationKind;
  dangerous: boolean;
  readonly: boolean;
  reason?: string;
  firstKeyword?: string;
}

class SqlSafetyAnalyzer {
  analyze(sql: string): SqlSafetyAnalysis {
    const normalized = normalizeSql(sql);
    const firstKeyword = getFirstKeyword(normalized);

    if (!firstKeyword) {
      return {
        kind: 'unknown',
        dangerous: true,
        readonly: false,
        reason: 'Cannot determine SQL operation.',
      };
    }

    if (readKeywords.has(firstKeyword)) {
      return {
        kind: 'read',
        dangerous: false,
        readonly: true,
        firstKeyword,
      };
    }

    if (writeKeywords.has(firstKeyword)) {
      return {
        kind: 'write',
        dangerous: true,
        readonly: false,
        firstKeyword,
        reason: `SQL starts with ${firstKeyword.toUpperCase()}, which may modify data.`,
      };
    }

    if (ddlKeywords.has(firstKeyword)) {
      return {
        kind: 'ddl',
        dangerous: true,
        readonly: false,
        firstKeyword,
        reason: `SQL starts with ${firstKeyword.toUpperCase()}, which may change schema.`,
      };
    }

    if (transactionKeywords.has(firstKeyword)) {
      return {
        kind: 'transaction',
        dangerous: true,
        readonly: false,
        firstKeyword,
        reason: `SQL starts with ${firstKeyword.toUpperCase()}, which may affect transaction state.`,
      };
    }

    return {
      kind: 'unknown',
      dangerous: true,
      readonly: false,
      firstKeyword,
      reason: `Unknown SQL operation: ${firstKeyword}`,
    };
  }

  isReadonly(sql: string) {
    return this.analyze(sql).readonly;
  }

  isDangerous(sql: string) {
    return this.analyze(sql).dangerous;
  }
}

const readKeywords = new Set(['select', 'show', 'describe', 'desc', 'explain', 'with', 'pragma']);

const writeKeywords = new Set(['insert', 'update', 'delete', 'replace', 'merge', 'call']);

const ddlKeywords = new Set(['create', 'alter', 'drop', 'truncate', 'rename', 'grant', 'revoke']);

const transactionKeywords = new Set(['begin', 'commit', 'rollback', 'savepoint', 'release']);

function normalizeSql(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim()
    .toLowerCase();
}

function getFirstKeyword(sql: string) {
  const match = sql.match(/^[a-z_]+/);
  return match?.[0];
}

export const sqlSafetyAnalyzer = new SqlSafetyAnalyzer();
```

注意这个策略偏保守：

```txt
未知 SQL = 危险
CALL = 危险
WITH = 暂按 read
```

后续可以接 SQL parser 按方言分析。

---

# 13. PermissionPromptService

这个服务负责弹窗。MVP 先用 promise + 事件模式，UI 组件监听请求。

## 13.1 类型

```ts
// apps/desktop/src/plugins/permissions/PermissionPromptService.ts

import type { ExtensionPermission } from '@sqlgui/api';
import type { LoadedExtension } from '@/plugins/manifest/types';

export interface PermissionGrantRequest {
  id: string;
  extension: LoadedExtension;
  permissions: ExtensionPermission[];
  previousPermissions: ExtensionPermission[];
  resolve(value: boolean): void;
}

export interface DangerousSqlConfirmRequest {
  id: string;
  extensionId: string;
  extensionName: string;
  sql: string;
  reason: string;
  resolve(value: boolean): void;
}

type Listener = () => void;

class PermissionPromptService {
  private grantRequest?: PermissionGrantRequest;
  private dangerousSqlRequest?: DangerousSqlConfirmRequest;
  private listeners = new Set<Listener>();

  requestPermissionGrant(input: {
    extension: LoadedExtension;
    permissions: ExtensionPermission[];
    previousPermissions: ExtensionPermission[];
  }) {
    return new Promise<boolean>((resolve) => {
      this.grantRequest = {
        id: crypto.randomUUID(),
        extension: input.extension,
        permissions: input.permissions,
        previousPermissions: input.previousPermissions,
        resolve,
      };

      this.emit();
    });
  }

  confirmDangerousOperation(input: {
    extensionId: string;
    extensionName: string;
    sql: string;
    reason: string;
  }) {
    return new Promise<boolean>((resolve) => {
      this.dangerousSqlRequest = {
        id: crypto.randomUUID(),
        ...input,
        resolve,
      };

      this.emit();
    });
  }

  getGrantRequest() {
    return this.grantRequest;
  }

  getDangerousSqlRequest() {
    return this.dangerousSqlRequest;
  }

  resolveGrantRequest(value: boolean) {
    this.grantRequest?.resolve(value);
    this.grantRequest = undefined;
    this.emit();
  }

  resolveDangerousSqlRequest(value: boolean) {
    this.dangerousSqlRequest?.resolve(value);
    this.dangerousSqlRequest = undefined;
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const permissionPromptService = new PermissionPromptService();
```

---

# 14. 权限授权弹窗

```tsx
// apps/desktop/src/plugins/permissions/components/PermissionGrantDialog.tsx

import { useEffect, useState } from 'react';
import { permissionPromptService } from '../PermissionPromptService';
import type { PermissionGrantRequest } from '../PermissionPromptService';
import { PermissionList } from './PermissionList';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function PermissionGrantDialog() {
  const [request, setRequest] = useState<PermissionGrantRequest>();

  useEffect(() => {
    const disposable = permissionPromptService.subscribe(() => {
      setRequest(permissionPromptService.getGrantRequest());
    });

    setRequest(permissionPromptService.getGrantRequest());

    return () => disposable.dispose();
  }, []);

  const open = Boolean(request);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          permissionPromptService.resolveGrantRequest(false);
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Extension Permissions</DialogTitle>
        </DialogHeader>

        {request ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Extension <b>{request.extension.displayName}</b> requires the following permissions:
            </div>

            <PermissionList permissions={request.permissions} />

            {hasPermissionChanged(request) ? (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-sm">
                This extension has changed its requested permissions. Please review them before
                enabling.
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              permissionPromptService.resolveGrantRequest(false);
            }}
          >
            Deny
          </Button>

          <Button
            onClick={() => {
              permissionPromptService.resolveGrantRequest(true);
            }}
          >
            Allow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function hasPermissionChanged(request: PermissionGrantRequest) {
  const previous = new Set(request.previousPermissions);
  return request.permissions.some((item) => !previous.has(item));
}
```

---

# 15. PermissionList

```tsx
// apps/desktop/src/plugins/permissions/components/PermissionList.tsx

import type { ExtensionPermission } from '@sqlgui/api';
import { permissionMetas } from '../permissions';
import { PermissionRiskBadge } from './PermissionRiskBadge';

interface PermissionListProps {
  permissions: ExtensionPermission[];
}

export function PermissionList(props: PermissionListProps) {
  const { permissions } = props;

  if (!permissions.length) {
    return <div className="text-sm text-muted-foreground">No permissions required.</div>;
  }

  return (
    <div className="space-y-2">
      {permissions.map((permission) => {
        const meta = permissionMetas[permission];

        return (
          <div key={permission} className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-xs">{permission}</span>

              {meta ? <PermissionRiskBadge risk={meta.risk} /> : null}
            </div>

            <div className="text-sm">{describePermission(permission)}</div>
          </div>
        );
      })}
    </div>
  );
}

function describePermission(permission: ExtensionPermission) {
  const descriptions: Record<ExtensionPermission, string> = {
    'ui.notification': 'Show notifications and messages.',
    'storage.local': 'Store data locally for this extension.',
    'editor.read': 'Read SQL editor content.',
    'editor.write': 'Modify SQL editor content.',
    'clipboard.read': 'Read text from clipboard.',
    'clipboard.write': 'Write text to clipboard.',
    'db.connection.read': 'Read database connection metadata.',
    'db.schema.read': 'Read database schemas, tables and columns.',
    'db.query.read': 'Execute read-only SQL queries.',
    'db.query.explain': 'Execute EXPLAIN queries.',
    'db.query.write': 'Execute SQL that may modify data or schema.',
    'network.fetch': 'Access network resources.',
  };

  return descriptions[permission] ?? permission;
}
```

---

# 16. Risk Badge

```tsx
// apps/desktop/src/plugins/permissions/components/PermissionRiskBadge.tsx

import type { PermissionRiskLevel } from '../types';

export function PermissionRiskBadge(props: { risk: PermissionRiskLevel }) {
  return <span className={getClassName(props.risk)}>{props.risk}</span>;
}

function getClassName(risk: PermissionRiskLevel) {
  const base = 'rounded px-1.5 py-0.5 text-[10px] uppercase';

  if (risk === 'low') {
    return `${base} bg-green-500/10 text-green-600`;
  }

  if (risk === 'medium') {
    return `${base} bg-blue-500/10 text-blue-600`;
  }

  if (risk === 'high') {
    return `${base} bg-yellow-500/10 text-yellow-600`;
  }

  return `${base} bg-red-500/10 text-red-600`;
}
```

---

# 17. 危险 SQL 确认弹窗

```tsx
// apps/desktop/src/plugins/permissions/components/DangerousSqlConfirmDialog.tsx

import { useEffect, useState } from 'react';
import {
  permissionPromptService,
  type DangerousSqlConfirmRequest,
} from '../PermissionPromptService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function DangerousSqlConfirmDialog() {
  const [request, setRequest] = useState<DangerousSqlConfirmRequest>();

  useEffect(() => {
    const disposable = permissionPromptService.subscribe(() => {
      setRequest(permissionPromptService.getDangerousSqlRequest());
    });

    setRequest(permissionPromptService.getDangerousSqlRequest());

    return () => disposable.dispose();
  }, []);

  const open = Boolean(request);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          permissionPromptService.resolveDangerousSqlRequest(false);
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Dangerous SQL</DialogTitle>
        </DialogHeader>

        {request ? (
          <div className="space-y-3">
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
              Extension <b>{request.extensionName}</b> wants to execute a potentially dangerous SQL
              operation.
            </div>

            <div className="text-sm text-muted-foreground">Reason: {request.reason}</div>

            <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {request.sql}
            </pre>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              permissionPromptService.resolveDangerousSqlRequest(false);
            }}
          >
            Deny
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              permissionPromptService.resolveDangerousSqlRequest(true);
            }}
          >
            Allow Once
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

# 18. 在 App 根节点挂载弹窗

```tsx
// apps/desktop/src/App.tsx

import { PermissionGrantDialog } from '@/plugins/permissions/components/PermissionGrantDialog';
import { DangerousSqlConfirmDialog } from '@/plugins/permissions/components/DangerousSqlConfirmDialog';
import { Workbench } from '@/workbench/Workbench';

export function App() {
  return (
    <>
      <Workbench />
      <PermissionGrantDialog />
      <DangerousSqlConfirmDialog />
    </>
  );
}
```

---

# 19. 改造 PluginRpcDispatcher

在所有 RPC handler 之前拦截。

```ts
// apps/desktop/src/plugins/host/PluginRpcDispatcher.ts

import type { RpcNotification, RpcRequest } from '@sqlgui/api';
import type { LoadedExtension } from '@/plugins/manifest/types';
import { permissionBroker } from '@/plugins/permissions/PermissionBroker';
import { pluginLogService } from './PluginLogService';

// handlers import 省略

export type PluginRpcHandler = (
  extension: LoadedExtension,
  params: unknown,
) => Promise<unknown> | unknown;

class PluginRpcDispatcher {
  private handlers = new Map<string, PluginRpcHandler>();

  constructor() {
    this.registerGroup(commandRpcHandlers);
    this.registerGroup(windowRpcHandlers);
    this.registerGroup(editorRpcHandlers);
    this.registerGroup(dbRpcHandlers);
    this.registerGroup(storageRpcHandlers);
    this.registerGroup(clipboardRpcHandlers);
    this.registerGroup(resultRpcHandlers);
    this.registerGroup(diagnosticsRpcHandlers);
    this.registerGroup(viewRpcHandlers);
  }

  register(method: string, handler: PluginRpcHandler) {
    this.handlers.set(method, handler);
  }

  registerGroup(group: Record<string, PluginRpcHandler>) {
    for (const [method, handler] of Object.entries(group)) {
      this.register(method, handler);
    }
  }

  async handleRequest(extension: LoadedExtension, request: RpcRequest) {
    const handler = this.handlers.get(request.method);

    if (!handler) {
      throw new Error(`Unknown plugin RPC method: ${request.method}`);
    }

    await permissionBroker.assertAllowed(extension, request.method, request.params);

    return await handler(extension, request.params);
  }

  async handleNotification(extension: LoadedExtension, notification: RpcNotification) {
    if (notification.method === 'extension.log') {
      const params = notification.params as any;
      pluginLogService.log(extension.id, params.level, params.message, params.args ?? []);
      return;
    }

    const handler = this.handlers.get(notification.method);
    if (!handler) return;

    await permissionBroker.assertAllowed(extension, notification.method, notification.params);

    await handler(extension, notification.params);
  }
}

export const pluginRpcDispatcher = new PluginRpcDispatcher();
```

---

# 20. 改造 PluginHost.activate：激活前确认权限

插件激活前必须检查 manifest 权限是否已授权。

```ts
// apps/desktop/src/plugins/host/PluginHostManager.ts

import { permissionBroker } from '@/plugins/permissions/PermissionBroker'

// ...

async activateExtension(extensionId: string) {
  const extension = extensionRegistry.get(extensionId)

  if (!extension) {
    throw new Error(`Extension not found: ${extensionId}`)
  }

  if (extension.state !== 'enabled') {
    throw new Error(`Extension is not enabled: ${extensionId}`)
  }

  const granted =
    await permissionBroker.ensureManifestGranted(extension)

  if (!granted) {
    throw new Error(
      `User denied permissions for extension: ${extensionId}`,
    )
  }

  let host = this.hosts.get(extensionId)

  if (!host) {
    host = new PluginHost(extension, {
      appVersion: this.options.appVersion,
    })
    this.hosts.set(extensionId, host)
  }

  await host.activate()

  return host
}
```

---

# 21. db.query Handler 增强

Phase 10 强制 readonly。Phase 11 可以允许写，但要经过 Broker。

```ts
// apps/desktop/src/plugins/host/rpc/dbRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { dbService } from '@/services/db/dbService';
import { sqlSafetyAnalyzer } from '@/plugins/permissions/SqlSafetyAnalyzer';

// 其他 handler 省略

export const dbRpcHandlers: Record<string, PluginRpcHandler> = {
  // ...

  async 'db.query'(_extension, params) {
    const payload = params as {
      connectionId: string;
      sql: string;
      limit?: number;
      timeoutMs?: number;
      readonly?: boolean;
    };

    const analysis = sqlSafetyAnalyzer.analyze(payload.sql);

    return dbService.executeQuery({
      connectionId: payload.connectionId,
      sql: payload.sql,
      limit: payload.limit ?? 1000,
      timeoutMs: payload.timeoutMs ?? 30_000,
      readonly: analysis.readonly,
    });
  },

  async 'db.explain'(_extension, params) {
    const payload = params as {
      connectionId: string;
      sql: string;
    };

    return dbService.executeQuery({
      connectionId: payload.connectionId,
      sql: `EXPLAIN ${payload.sql}`,
      limit: 1000,
      timeoutMs: 30_000,
      readonly: true,
    });
  },
};
```

---

# 22. Rust DB 层加 readonly 保护

前端判断不够，Rust 也要做一层。

## 22.1 QueryRequest 增加 readonly

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryRequest {
    pub connection_id: String,
    pub sql: String,
    pub limit: Option<u32>,
    pub timeout_ms: Option<u64>,
    pub readonly: Option<bool>,
}
```

## 22.2 Rust 简单 SQL 判断

```rust
// crates/sqlgui-db/src/sql_safety.rs

pub fn is_readonly_sql(sql: &str) -> bool {
    let normalized = strip_comments(sql).trim().to_lowercase();

    let first = normalized
        .split_whitespace()
        .next()
        .unwrap_or("");

    matches!(
        first,
        "select" | "show" | "describe" | "desc" | "explain" | "with" | "pragma"
    )
}

fn strip_comments(sql: &str) -> String {
    let mut result = String::new();

    for line in sql.lines() {
        if let Some(index) = line.find("--") {
            result.push_str(&line[..index]);
        } else {
            result.push_str(line);
        }

        result.push('\n');
    }

    result
}
```

## 22.3 执行前校验

```rust
// crates/sqlgui-db/src/manager.rs

pub async fn query(
    &self,
    request: QueryRequest,
) -> Result<QueryResult> {
    if request.readonly.unwrap_or(false) && !crate::sql_safety::is_readonly_sql(&request.sql) {
        anyhow::bail!("Readonly query rejected: SQL may modify data");
    }

    // 原有查询逻辑
    todo!()
}
```

这样即使前端 Permission Broker 有 bug，Rust DB 层仍能挡一层。

---

# 23. 插件授权和 enable 流程

改造 `extensionService.enable`：

```ts
// apps/desktop/src/plugins/services/extensionService.ts

import { permissionBroker } from '../permissions/PermissionBroker'

async enable(extensionId: string) {
  const extension = extensionRegistry.get(extensionId)
  if (!extension) return

  const granted =
    await permissionBroker.ensureManifestGranted(extension)

  if (!granted) {
    return
  }

  extensionStorage.setEnabled(extensionId, true)
  extensionRegistry.enable(extensionId)
  contributionRegistry.registerExtension({
    ...extension,
    state: 'enabled',
  })
}
```

disable 不需要撤销权限，用户可能只是临时禁用。
卸载时可以撤销：

```ts
uninstall(extensionId: string) {
  contributionRegistry.unregisterExtension(extensionId)
  pluginHostManager.deactivateExtension(extensionId)
  extensionRegistry.unregister(extensionId)
  permissionStorage.revoke(extensionId)
}
```

---

# 24. 插件权限 UI 展示

在 ExtensionDetail 里展示。

```tsx
// apps/desktop/src/plugins/components/ExtensionPermissionsSection.tsx

import type { LoadedExtension } from '../manifest/types';
import { PermissionList } from '../permissions/components/PermissionList';
import { permissionStorage } from '../permissions/PermissionStorage';

export function ExtensionPermissionsSection(props: { extension: LoadedExtension }) {
  const required = props.extension.manifest.permissions ?? [];
  const granted = permissionStorage.getGrantedPermissions(props.extension.id);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium">Required Permissions</h3>
        <PermissionList permissions={required} />
      </div>

      <div>
        <h3 className="font-medium">Granted Permissions</h3>
        <PermissionList permissions={granted} />
      </div>
    </div>
  );
}
```

---

# 25. 权限审计日志

记录插件调用了哪些敏感 API。

```ts
// apps/desktop/src/plugins/permissions/PluginAuditService.ts

import type { ExtensionPermission } from '@sqlgui/api';

export interface PluginAuditItem {
  id: string;
  extensionId: string;
  method: string;
  requiredPermissions: ExtensionPermission[];
  grantedPermissions: ExtensionPermission[];
  paramsSummary?: unknown;
  createdAt: number;
}

type Listener = () => void;

class PluginAuditService {
  private items: PluginAuditItem[] = [];
  private listeners = new Set<Listener>();

  record(item: Omit<PluginAuditItem, 'id'>) {
    this.items.push({
      id: crypto.randomUUID(),
      ...item,
    });

    if (this.items.length > 2000) {
      this.items = this.items.slice(-2000);
    }

    this.emit();
  }

  getItems(extensionId?: string) {
    if (!extensionId) return this.items;
    return this.items.filter((item) => item.extensionId === extensionId);
  }

  clear(extensionId?: string) {
    if (!extensionId) {
      this.items = [];
    } else {
      this.items = this.items.filter((item) => item.extensionId !== extensionId);
    }

    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pluginAuditService = new PluginAuditService();
```

---

# 26. Audit UI

```tsx
// apps/desktop/src/plugins/permissions/components/PluginAuditView.tsx

import { useEffect, useState } from 'react';
import { pluginAuditService, type PluginAuditItem } from '../PluginAuditService';
import { Button } from '@/components/ui/button';

export function PluginAuditView(props: { extensionId?: string }) {
  const [items, setItems] = useState<PluginAuditItem[]>(
    pluginAuditService.getItems(props.extensionId),
  );

  useEffect(() => {
    const disposable = pluginAuditService.subscribe(() => {
      setItems(pluginAuditService.getItems(props.extensionId));
    });

    return () => disposable.dispose();
  }, [props.extensionId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center justify-between border-b px-2">
        <div className="text-xs font-medium">Permission Audit</div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => pluginAuditService.clear(props.extensionId)}
        >
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 text-xs">
        {items
          .slice()
          .reverse()
          .map((item) => (
            <div key={item.id} className="mb-2 rounded-md border p-2">
              <div className="flex gap-2">
                <span className="font-mono">{item.method}</span>

                <span className="text-muted-foreground">{item.extensionId}</span>

                <span className="text-muted-foreground">
                  {new Date(item.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="mt-1 text-muted-foreground">
                Required: {item.requiredPermissions.join(', ') || 'none'}
              </div>

              {item.paramsSummary ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2">
                  {JSON.stringify(item.paramsSummary, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
      </div>
    </div>
  );
}
```

---

# 27. i18n 权限文案补充

`extension.json` 增加：

```json
{
  "permission": {
    "ui": {
      "notification": {
        "title": "显示通知",
        "description": "允许插件显示信息、警告和错误提示。"
      }
    },
    "storage": {
      "local": {
        "title": "本地插件存储",
        "description": "允许插件保存自己的本地配置和状态。"
      }
    },
    "editor": {
      "read": {
        "title": "读取编辑器内容",
        "description": "允许插件读取当前 SQL 编辑器中的内容。"
      },
      "write": {
        "title": "修改编辑器内容",
        "description": "允许插件插入、替换或修改 SQL 编辑器内容。"
      }
    },
    "db": {
      "connection": {
        "read": {
          "title": "读取连接信息",
          "description": "允许插件读取数据库连接名称、类型等元信息，不包含密码。"
        }
      },
      "schema": {
        "read": {
          "title": "读取数据库结构",
          "description": "允许插件读取 database、schema、table 和 column 信息。"
        }
      },
      "query": {
        "read": {
          "title": "执行只读查询",
          "description": "允许插件执行 SELECT、SHOW、EXPLAIN 等只读 SQL。"
        },
        "write": {
          "title": "执行写入查询",
          "description": "允许插件执行可能修改数据或结构的 SQL。"
        },
        "explain": {
          "title": "执行 EXPLAIN",
          "description": "允许插件对 SQL 执行 EXPLAIN。"
        }
      }
    },
    "clipboard": {
      "read": {
        "title": "读取剪贴板",
        "description": "允许插件读取系统剪贴板文本。"
      },
      "write": {
        "title": "写入剪贴板",
        "description": "允许插件写入系统剪贴板文本。"
      }
    },
    "network": {
      "fetch": {
        "title": "访问网络",
        "description": "允许插件访问网络资源。"
      }
    }
  }
}
```

MVP 可以先用硬编码描述，后面接 i18n。

---

# 28. 插件 manifest 示例

只读 SQL 插件：

```json
{
  "name": "explain-viewer",
  "displayName": "Explain Viewer",
  "publisher": "baicie",
  "version": "0.1.0",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:explain.open"],
  "permissions": ["editor.read", "db.connection.read", "db.query.explain", "ui.notification"],
  "contributes": {
    "commands": [
      {
        "command": "explain.open",
        "title": "Open Explain Viewer",
        "category": "SQL"
      }
    ]
  }
}
```

危险写入插件：

```json
{
  "name": "data-cleaner",
  "displayName": "Data Cleaner",
  "publisher": "baicie",
  "version": "0.1.0",
  "main": "dist/extension.js",
  "activationEvents": ["onCommand:data.clean"],
  "permissions": ["db.connection.read", "db.query.read", "db.query.write", "ui.notification"],
  "contributes": {
    "commands": [
      {
        "command": "data.clean",
        "title": "Clean Test Data",
        "category": "Database"
      }
    ]
  }
}
```

---

# 29. SDK 层错误体验

插件侧拿到 `PermissionError` 应该是普通 Error。
可以让 SDK 包装错误码。

修改 RpcClient：

```ts
// packages/sqlgui-sdk/src/rpcClient.ts

export class RpcError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

// handle response
if (response.error) {
  pending.reject(new RpcError(response.error.code, response.error.message, response.error.data));
  return;
}
```

插件作者可以：

```ts
try {
  await api.db.query({ connectionId, sql: 'DELETE FROM users' });
} catch (error) {
  await api.window.showErrorMessage(error instanceof Error ? error.message : String(error));
}
```

---

# 30. Host 返回错误码

改造 PluginHost 的 RPC 错误返回：

```ts
// PluginHost.ts handleRpcRequest catch

catch (error) {
  const anyError = error as any

  this.worker.postMessage({
    type: 'rpc:response',
    response: {
      id: request.id,
      error: {
        code: anyError.code ?? 'PLUGIN_RPC_ERROR',
        message:
          error instanceof Error ? error.message : String(error),
        data: {
          extensionId: anyError.extensionId,
          method: anyError.method,
          missingPermissions: anyError.missingPermissions,
        },
      },
    },
  } satisfies HostToPluginMessage)
}
```

---

# 31. network.fetch 设计

Phase 11 默认不实现。
如果插件调用不存在的 `network.fetch`，Dispatcher 会 unknown method。
后续可以加 API：

```ts
export interface NetworkApi {
  fetch(input: string, init?: RequestInit): Promise<NetworkResponse>;
}
```

Phase 11 只规定：

```txt
network.fetch 权限存在，但默认不开放 API。
```

如果你想先占位：

```ts
'network.fetch': ['network.fetch']
```

handler：

```ts
async 'network.fetch'() {
  throw new Error('Network access is disabled in MVP.')
}
```

---

# 32. Permission 与 Command 间接调用问题

插件可以这样绕：

```ts
api.commands.executeCommand('editor.run');
```

这可能间接执行 SQL。

MVP 策略：

```txt
commands.execute 暂时允许
但核心高危命令本身应做来源判断
```

更严谨设计：

```ts
export interface CommandExecutionContext {
  source: 'user' | 'plugin';
  extensionId?: string;
}
```

CommandService 改造：

```ts
async execute<T = unknown>(
  id: string,
  args: unknown[] = [],
  context: CommandExecutionContext = { source: 'user' },
): Promise<T> {
  const command = this.commands.get(id)
  if (!command) throw new Error(`Command not found: ${id}`)

  if (context.source === 'plugin') {
    await commandPermissionGuard.assertCanExecute(id, context)
  }

  return await command.handler(...args) as T
}
```

Phase 11 可以先只做预留，不展开，否则复杂度会上升。

---

# 33. Phase 11 开发顺序

```txt
1. 定义权限元数据 permissions.ts
2. 定义 apiPermissionMap
3. 实现 PermissionStorage
4. 实现 PermissionError
5. 实现 SqlSafetyAnalyzer
6. 实现 PermissionPromptService
7. 实现 PermissionGrantDialog
8. 实现 DangerousSqlConfirmDialog
9. 在 App 根节点挂载两个 dialog
10. 实现 PermissionBroker
11. PluginRpcDispatcher 接入 assertAllowed
12. PluginHostManager activate 前接入 ensureManifestGranted
13. extensionService.enable 接入权限授权
14. dbRpcHandlers 支持 readonly/write 分析
15. Rust DB Core 增加 readonly 二次保护
16. 实现 PluginAuditService
17. 实现 PluginAuditView
18. ExtensionDetail 展示权限
19. 改造 RPC 错误码返回
20. 用 sql-formatter-demo 测试 editor.read/editor.write
21. 用 explain-demo 测试 db.query.explain
22. 用危险 SQL demo 测试二次确认
```

---

# 34. Phase 11 测试用例

## 单元测试

```txt
[ ] apiPermissionMap 覆盖所有已实现 RPC method
[ ] PermissionStorage save/load/revoke 正常
[ ] PermissionBroker 缺权限时拒绝
[ ] PermissionBroker 有权限时放行
[ ] SqlSafetyAnalyzer SELECT -> read
[ ] SqlSafetyAnalyzer SHOW -> read
[ ] SqlSafetyAnalyzer UPDATE -> dangerous write
[ ] SqlSafetyAnalyzer DELETE -> dangerous write
[ ] SqlSafetyAnalyzer DROP -> dangerous ddl
[ ] SqlSafetyAnalyzer unknown -> dangerous
[ ] PluginAuditService record/clear 正常
```

## 手动测试

```txt
[ ] sql-formatter-demo 首次执行弹权限确认
[ ] 拒绝权限后插件不激活
[ ] 允许权限后插件可格式化 SQL
[ ] 移除 editor.write 后插件调用 replaceSelection 被拒绝
[ ] explain 插件能执行 EXPLAIN
[ ] 无 db.query.explain 权限时 explain 被拒绝
[ ] 插件执行 SELECT 需要 db.query.read
[ ] 插件执行 DELETE 需要 db.query.write
[ ] DELETE 弹危险 SQL 确认
[ ] 拒绝危险 SQL 后不执行
[ ] 允许一次后执行
[ ] 插件禁用后 Worker 终止
[ ] 插件升级新增权限后再次弹权限确认
[ ] 审计日志能看到插件 API 调用
```

---

# 35. Phase 11 完成标准

```txt
[ ] 插件权限模型完成
[ ] 插件授权记录可持久化
[ ] 插件启用/激活前会请求权限
[ ] RPC 调用前统一经过 PermissionBroker
[ ] 未声明/未授权权限会被拒绝
[ ] db.query 能区分 read/write/ddl
[ ] 高危 SQL 会弹二次确认
[ ] Rust DB 层 readonly 保护完成
[ ] 插件权限 UI 可查看
[ ] 插件权限变更可检测
[ ] 插件 API 调用有审计日志
[ ] 错误码返回给插件侧
```

---

# 36. 最小闭环

Phase 11 最小闭环：

```txt
sql-formatter-demo manifest:
permissions = ["editor.read", "editor.write", "ui.notification"]

首次执行 Format SQL
  ↓
弹权限确认
  ↓
用户 Allow
  ↓
保存 grant
  ↓
插件激活
  ↓
插件调用 editor.getActiveEditor
  ↓
PermissionBroker 检查 editor.read
  ↓
允许
  ↓
插件调用 editor.replaceSelection
  ↓
PermissionBroker 检查 editor.write
  ↓
允许
  ↓
SQL 被格式化
```

危险 SQL 闭环：

```txt
插件调用 api.db.query("DELETE FROM users")
  ↓
PermissionBroker 识别 write SQL
  ↓
要求 db.query.write
  ↓
弹危险 SQL 确认
  ↓
用户 Deny
  ↓
RPC 返回 PLUGIN_DANGEROUS_OPERATION_DENIED
  ↓
SQL 不执行
```

---

# 37. 关键取舍

Phase 11 不要试图一次性做到“绝对安全”。
MVP 阶段的重点是：

```txt
权限声明
用户授权
API 白名单
运行时拦截
危险 SQL 二次确认
审计日志
```

它解决的是插件生态最基础的信任问题：

> **插件可以扩展能力，但不能绕过宿主边界。**

后续 Phase 12/13 做插件安装和市场时，权限系统就可以直接复用：

```txt
安装插件前展示权限
插件升级后检测新增权限
市场页面展示权限风险
用户禁用/撤销权限
企业策略禁止 critical 权限
```
