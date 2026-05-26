下面是 **Phase 10：Web Worker Plugin Host 详细设计与代码草案**。

这一阶段目标是：

> **让 Phase 8/9 设计好的插件真正运行起来。插件代码运行在 Web Worker 沙箱中，通过 RPC 调用宿主提供的受限 API。**

Phase 10 做完后，最小闭环应该是：

```txt
用户安装/加载 sql-formatter-demo
  ↓
插件 manifest 注册 sql.format 命令
  ↓
用户执行 sql.format
  ↓
宿主按 onCommand:sql.format 激活插件
  ↓
创建 Web Worker
  ↓
加载 dist/extension.js
  ↓
调用 activate(api, context)
  ↓
插件注册 command handler
  ↓
宿主再次调用插件 handler
  ↓
插件通过 api.editor 读取 SQL
  ↓
插件格式化 SQL
  ↓
插件通过 api.editor.replaceSelection 写回编辑器
```

---

# Phase 10 总目标

## 1. 必做功能

```txt
[ ] 实现 PluginHostManager
[ ] 每个插件独立 Worker
[ ] 支持加载插件 dist/extension.js
[ ] 支持调用插件 activate
[ ] 支持调用插件 deactivate
[ ] 支持 onCommand 激活插件
[ ] 支持插件注册 command handler
[ ] 支持宿主执行插件 command
[ ] 支持插件调用宿主 RPC API
[ ] 支持 editor API RPC
[ ] 支持 window notification RPC
[ ] 支持 db schema/query readonly RPC
[ ] 支持 storage/memento RPC
[ ] 支持 clipboard RPC
[ ] 支持插件日志转发
[ ] 支持插件异常捕获
[ ] 支持 Reload Extension Host
[ ] 插件崩溃不影响主应用
```

## 2. 暂不做

```txt
[ ] 不做完整权限弹窗
[ ] 不做签名校验
[ ] 不做 Native 插件
[ ] 不做 WASM 插件
[ ] 不做插件调试器
[ ] 不做插件 WebView UI
[ ] 不做远程插件市场
[ ] 不做复杂插件网络权限
```

权限检查可以先做一个简化版，但完整的 Permission Broker 放到 Phase 11。

---

# 1. Phase 10 架构

整体结构：

```txt
React Workbench 主线程
  ├─ PluginHostManager
  ├─ PluginHost
  ├─ PluginRpcDispatcher
  ├─ ExtensionService
  ├─ CommandService
  ├─ EditorService
  ├─ DBService
  └─ ResultService

          │ postMessage / RPC

Web Worker：pluginHostWorker
  ├─ 加载插件 bundle
  ├─ 创建 SqlGuiApi Proxy
  ├─ 创建 ExtensionContext
  ├─ 调用 activate
  ├─ 保存 command handlers
  └─ 调用 deactivate
```

消息流：

```txt
插件调用 api.editor.getActiveEditor()
  ↓
Worker RpcClient 发送 rpc:request editor.getActive
  ↓
主线程 PluginRpcDispatcher
  ↓
EditorService
  ↓
返回 SerializedSqlEditor
  ↓
Worker SqlGuiApi Proxy 包装成 SqlEditor proxy
```

命令执行流：

```txt
用户执行 sql.format
  ↓
CommandService.execute('sql.format')
  ↓
PluginCommandBridge
  ↓
PluginHostManager.activateByEvent('onCommand:sql.format')
  ↓
PluginHost.invokeCommand('sql.format')
  ↓
Worker CommandRuntime.executeLocalCommand
  ↓
插件 handler
```

---

# 2. 目录设计

## 2.1 前端 Host 目录

```txt
apps/desktop/src/plugins/host/
├─ PluginHost.ts
├─ PluginHostManager.ts
├─ PluginRpcDispatcher.ts
├─ PluginCommandBridge.ts
├─ PluginActivationService.ts
├─ PluginLogService.ts
├─ PluginStorageService.ts
├─ PluginWorkerFactory.ts
├─ pluginRpcMethods.ts
├─ pluginTypes.ts
└─ worker/
   ├─ pluginHostWorker.ts
   ├─ workerBootstrap.ts
   └─ sandbox.ts
```

## 2.2 插件服务扩展

```txt
apps/desktop/src/plugins/services/
├─ extensionService.ts
├─ extensionScanner.ts
├─ extensionStorage.ts
└─ extensionFileService.ts
```

## 2.3 Rust 扩展命令

```txt
apps/desktop/src-tauri/src/commands/
└─ extension.rs

crates/sqlgui-extension/src/
├─ scanner.rs
├─ file.rs
└─ types.rs
```

---

# 3. 关键设计选择

## 3.1 每个插件一个 Worker

推荐第一版：

```txt
一个插件 = 一个 Worker
```

优点：

```txt
1. 插件隔离更清晰
2. 插件崩溃只影响自己
3. disable 插件时直接 terminate worker
4. 日志和生命周期更好管理
```

缺点：

```txt
1. 插件多了 Worker 数量多
2. 内存略高
```

MVP 阶段插件数量不会很多，优先可控性。

后续可以升级成：

```txt
一个 Extension Host Worker 管多个插件
```

---

## 3.2 插件 bundle 加载方式

Tauri 前端不能随便从本地文件系统 import 插件文件。推荐方式：

```txt
Rust 读取 dist/extension.js 内容
  ↓
前端拿到 source string
  ↓
创建 Blob URL
  ↓
传给 Worker
  ↓
Worker dynamic import(blobUrl)
```

也就是：

```ts
const blob = new Blob([source], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
await import(url);
```

注意：插件 bundle 应该是 ESM。

---

## 3.3 插件不能直接 import `@sqlgui/sdk`

插件代码只应该：

```ts
import type { SqlGuiApi, ExtensionContext } from '@sqlgui/api';
```

因为插件运行时的 `api` 是宿主注入的，不是插件自己创建的。

插件 bundle 里不应该包含：

```txt
@sqlgui/sdk
@tauri-apps/api
monaco
react
```

Phase 10 的 Worker runtime 由宿主提供。

---

# 4. Rust：读取插件文件

Phase 8 已经有 `extension_scan`。Phase 10 需要读取插件入口文件。

## 4.1 Rust 类型

```rust
// crates/sqlgui-extension/src/types.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionEntryRequest {
    pub extension_path: String,
    pub main: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionEntrySource {
    pub source: String,
    pub path: String,
}
```

---

## 4.2 Rust 文件读取

```rust
// crates/sqlgui-extension/src/file.rs

use anyhow::{anyhow, Result};
use std::fs;
use std::path::{Path, PathBuf};

pub fn read_extension_entry(
    extension_path: impl AsRef<Path>,
    main: &str,
) -> Result<(String, PathBuf)> {
    if main.contains("..") {
        return Err(anyhow!("Invalid extension main path"));
    }

    let extension_path = extension_path.as_ref();
    let entry_path = extension_path.join(main);

    if !entry_path.exists() {
        return Err(anyhow!(
            "Extension entry file not found: {}",
            entry_path.display()
        ));
    }

    if !entry_path.starts_with(extension_path) {
        return Err(anyhow!("Extension entry path escapes extension directory"));
    }

    let source = fs::read_to_string(&entry_path)?;

    Ok((source, entry_path))
}
```

---

## 4.3 Tauri command

```rust
// apps/desktop/src-tauri/src/commands/extension.rs

use sqlgui_extension::file::read_extension_entry;
use sqlgui_extension::types::{
    ExtensionEntryRequest,
    ExtensionEntrySource,
};

#[tauri::command]
pub async fn extension_read_entry(
    request: ExtensionEntryRequest,
) -> Result<ExtensionEntrySource, String> {
    let (source, path) = read_extension_entry(
        request.extension_path,
        &request.main,
    )
    .map_err(|err| err.to_string())?;

    Ok(ExtensionEntrySource {
        source,
        path: path.to_string_lossy().to_string(),
    })
}
```

注册：

```rust
.invoke_handler(tauri::generate_handler![
    commands::extension::extension_scan,
    commands::extension::extension_read_entry,
])
```

---

# 5. 前端 extensionFileService

```ts
// apps/desktop/src/plugins/services/extensionFileService.ts

import { callNative } from '@/services/native/invoke';

export interface ExtensionEntrySource {
  source: string;
  path: string;
}

export const extensionFileService = {
  readEntry(request: { extensionPath: string; main: string }) {
    return callNative<ExtensionEntrySource>('extension_read_entry', {
      request: {
        extensionPath: request.extensionPath,
        main: request.main,
      },
    });
  },
};
```

---

# 6. Worker 消息协议

基于 Phase 9 的协议补全。

```ts
// apps/desktop/src/plugins/host/pluginTypes.ts

import type { RpcRequest, RpcResponse, RpcNotification } from '@sqlgui/api';

export interface SerializedExtensionContext {
  id: string;
  name: string;
  publisher: string;
  version: string;
  extensionPath: string;
  globalStoragePath: string;
}

export type HostToPluginMessage =
  | {
      type: 'plugin:activate';
      appVersion: string;
      extensionSourceUrl: string;
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
      stack?: string;
    }
  | {
      type: 'plugin:deactivated';
      extensionId: string;
    }
  | {
      type: 'plugin:commandResult';
      requestId: string;
      result?: unknown;
      error?: string;
      stack?: string;
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
      extensionId: string;
      level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
      message: string;
      args: unknown[];
    };
```

---

# 7. Worker 沙箱入口

## 7.1 pluginHostWorker.ts

这个文件会被 Vite 打包成 Worker。

```ts
// apps/desktop/src/plugins/host/worker/pluginHostWorker.ts

import type { ExtensionModule, RpcRequest, RpcResponse } from '@sqlgui/api';
import {
  CommandRuntime,
  RpcClient,
  createSqlGuiApi,
  createExtensionContext,
  createWorkerTransport,
} from '@sqlgui/sdk';
import type {
  HostToPluginMessage,
  PluginToHostMessage,
  SerializedExtensionContext,
} from '../pluginTypes';
import { installWorkerSandbox } from './sandbox';

installWorkerSandbox();

let extensionId: string | undefined;
let commandRuntime: CommandRuntime | undefined;
let deactivateFn: (() => Promise<void>) | undefined;

const transport = createWorkerTransport();
const rpc = new RpcClient(transport);

self.addEventListener('message', async (event) => {
  const message = event.data as HostToPluginMessage;

  try {
    switch (message.type) {
      case 'plugin:activate':
        await handleActivate(message);
        break;

      case 'plugin:deactivate':
        await handleDeactivate();
        break;

      case 'plugin:invokeCommand':
        await handleInvokeCommand(message);
        break;

      case 'rpc:response':
        // RpcClient 已经监听了 message，这里不需要处理
        break;
    }
  } catch (error) {
    post({
      type: 'plugin:activationError',
      extensionId: extensionId ?? 'unknown',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

async function handleActivate(message: {
  appVersion: string;
  extensionSourceUrl: string;
  context: SerializedExtensionContext;
}) {
  extensionId = message.context.id;

  const mod = (await import(
    /* @vite-ignore */
    message.extensionSourceUrl
  )) as ExtensionModule;

  commandRuntime = new CommandRuntime();

  const context = createExtensionContext({
    id: message.context.id,
    name: message.context.name,
    publisher: message.context.publisher,
    version: message.context.version,
    extensionPath: message.context.extensionPath,
    globalStoragePath: message.context.globalStoragePath,
    rpc,
  });

  const api = createSqlGuiApi({
    version: message.appVersion,
    rpc,
    commandRuntime,
    context,
  });

  if (mod.activate) {
    await mod.activate(api, context);
  }

  deactivateFn = async () => {
    for (const item of context.subscriptions) {
      item.dispose();
    }

    if (mod.deactivate) {
      await mod.deactivate();
    }

    commandRuntime?.clear();
  };

  post({
    type: 'plugin:activated',
    extensionId: message.context.id,
  });
}

async function handleDeactivate() {
  if (deactivateFn) {
    await deactivateFn();
  }

  post({
    type: 'plugin:deactivated',
    extensionId: extensionId ?? 'unknown',
  });
}

async function handleInvokeCommand(message: {
  command: string;
  args: unknown[];
  requestId: string;
}) {
  try {
    if (!commandRuntime) {
      throw new Error('Extension is not activated.');
    }

    const result = await commandRuntime.executeLocalCommand(message.command, message.args);

    post({
      type: 'plugin:commandResult',
      requestId: message.requestId,
      result,
    });
  } catch (error) {
    post({
      type: 'plugin:commandResult',
      requestId: message.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

function post(message: PluginToHostMessage) {
  self.postMessage(message);
}
```

---

## 7.2 sandbox.ts

MVP 做基础限制。

```ts
// apps/desktop/src/plugins/host/worker/sandbox.ts

export function installWorkerSandbox() {
  // 插件不应该直接访问网络。Phase 11 会做权限 broker。
  // 这里先禁用全局 fetch，后续可以改成走 api.network.fetch。
  try {
    Object.defineProperty(globalThis, 'fetch', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {
    // ignore
  }

  // Worker 没有 DOM，但有部分全局能力。
  // 这里可以继续收紧一些高风险 API。
  try {
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {
    // ignore
  }
}
```

注意：

> 这不是强安全沙箱，只是 MVP 级限制。真正的安全还要依赖 Tauri CSP、权限 Broker、插件签名和市场审核。

---

# 8. PluginWorkerFactory

```ts
// apps/desktop/src/plugins/host/PluginWorkerFactory.ts

export function createPluginWorker() {
  return new Worker(new URL('./worker/pluginHostWorker.ts', import.meta.url), {
    type: 'module',
    name: 'sqlgui-plugin-host',
  });
}

export function createExtensionSourceUrl(source: string) {
  const blob = new Blob([source], {
    type: 'text/javascript',
  });

  return URL.createObjectURL(blob);
}
```

---

# 9. PluginHost

`PluginHost` 管理单个插件 Worker。

```ts
// apps/desktop/src/plugins/host/PluginHost.ts

import type { LoadedExtension } from '@/plugins/manifest/types';
import type { HostToPluginMessage, PluginToHostMessage } from './pluginTypes';
import { createExtensionSourceUrl, createPluginWorker } from './PluginWorkerFactory';
import { extensionFileService } from '@/plugins/services/extensionFileService';
import { pluginRpcDispatcher } from './PluginRpcDispatcher';
import { pluginLogService } from './PluginLogService';

interface PendingCommand {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export type PluginHostState =
  | 'created'
  | 'activating'
  | 'activated'
  | 'deactivating'
  | 'deactivated'
  | 'error';

export class PluginHost {
  private worker?: Worker;
  private state: PluginHostState = 'created';
  private sourceUrl?: string;
  private pendingCommands = new Map<string, PendingCommand>();

  constructor(
    readonly extension: LoadedExtension,
    private readonly options: {
      appVersion: string;
    },
  ) {}

  getState() {
    return this.state;
  }

  async activate() {
    if (this.state === 'activated') return;
    if (this.state === 'activating') return;

    if (!this.extension.main) {
      throw new Error(`Extension ${this.extension.id} has no main entry.`);
    }

    this.state = 'activating';

    const entry = await extensionFileService.readEntry({
      extensionPath: this.extension.extensionPath,
      main: this.extension.main,
    });

    this.sourceUrl = createExtensionSourceUrl(entry.source);
    this.worker = createPluginWorker();

    this.worker.onmessage = (event) => {
      this.handleMessage(event.data as PluginToHostMessage);
    };

    this.worker.onerror = (event) => {
      this.state = 'error';
      pluginLogService.error(this.extension.id, event.message, event.error);
    };

    this.worker.postMessage({
      type: 'plugin:activate',
      appVersion: this.options.appVersion,
      extensionSourceUrl: this.sourceUrl,
      context: {
        id: this.extension.id,
        name: this.extension.name,
        publisher: this.extension.publisher,
        version: this.extension.version,
        extensionPath: this.extension.extensionPath,
        globalStoragePath: `${this.extension.id}/global`,
      },
    } satisfies HostToPluginMessage);
  }

  async deactivate() {
    if (!this.worker) return;

    this.state = 'deactivating';

    this.worker.postMessage({
      type: 'plugin:deactivate',
    } satisfies HostToPluginMessage);

    // MVP：给一点时间让插件清理，之后 terminate
    window.setTimeout(() => {
      this.terminate();
    }, 300);
  }

  terminate() {
    this.worker?.terminate();
    this.worker = undefined;

    if (this.sourceUrl) {
      URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = undefined;
    }

    this.pendingCommands.forEach((pending) => {
      pending.reject(new Error('Extension host terminated.'));
    });
    this.pendingCommands.clear();

    this.state = 'deactivated';
  }

  invokeCommand(command: string, args: unknown[]) {
    if (!this.worker || this.state !== 'activated') {
      return Promise.reject(new Error(`Extension ${this.extension.id} is not activated.`));
    }

    const requestId = crypto.randomUUID();

    return new Promise<unknown>((resolve, reject) => {
      this.pendingCommands.set(requestId, {
        resolve,
        reject,
      });

      this.worker!.postMessage({
        type: 'plugin:invokeCommand',
        command,
        args,
        requestId,
      } satisfies HostToPluginMessage);
    });
  }

  private async handleMessage(message: PluginToHostMessage) {
    switch (message.type) {
      case 'plugin:activated':
        this.state = 'activated';
        pluginLogService.info(this.extension.id, 'activated');
        break;

      case 'plugin:activationError':
        this.state = 'error';
        pluginLogService.error(this.extension.id, message.error, message.stack);
        break;

      case 'plugin:deactivated':
        this.terminate();
        pluginLogService.info(this.extension.id, 'deactivated');
        break;

      case 'plugin:commandResult':
        this.handleCommandResult(message);
        break;

      case 'rpc:request':
        await this.handleRpcRequest(message.request);
        break;

      case 'rpc:notification':
        await pluginRpcDispatcher.handleNotification(this.extension, message.notification);
        break;

      case 'plugin:log':
        pluginLogService.log(message.extensionId, message.level, message.message, message.args);
        break;
    }
  }

  private handleCommandResult(
    message: Extract<PluginToHostMessage, { type: 'plugin:commandResult' }>,
  ) {
    const pending = this.pendingCommands.get(message.requestId);
    if (!pending) return;

    this.pendingCommands.delete(message.requestId);

    if (message.error) {
      pending.reject(new Error(message.error));
      return;
    }

    pending.resolve(message.result);
  }

  private async handleRpcRequest(request: { id: string; method: string; params?: unknown }) {
    if (!this.worker) return;

    try {
      const result = await pluginRpcDispatcher.handleRequest(this.extension, request);

      this.worker.postMessage({
        type: 'rpc:response',
        response: {
          id: request.id,
          result,
        },
      } satisfies HostToPluginMessage);
    } catch (error) {
      this.worker.postMessage({
        type: 'rpc:response',
        response: {
          id: request.id,
          error: {
            code: 'PLUGIN_RPC_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        },
      } satisfies HostToPluginMessage);
    }
  }
}
```

---

# 10. PluginHostManager

负责所有插件 host 的创建、激活、卸载、命令执行。

```ts
// apps/desktop/src/plugins/host/PluginHostManager.ts

import type { LoadedExtension } from '@/plugins/manifest/types';
import { extensionRegistry } from '@/plugins/registry/extensionRegistry';
import { activationRegistry } from '@/plugins/registry/activationRegistry';
import { PluginHost } from './PluginHost';

class PluginHostManager {
  private hosts = new Map<string, PluginHost>();

  constructor(
    private readonly options: {
      appVersion: string;
    },
  ) {}

  getHost(extensionId: string) {
    return this.hosts.get(extensionId);
  }

  async activateExtension(extensionId: string) {
    const extension = extensionRegistry.get(extensionId);

    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    if (extension.state !== 'enabled') {
      throw new Error(`Extension is not enabled: ${extensionId}`);
    }

    let host = this.hosts.get(extensionId);

    if (!host) {
      host = new PluginHost(extension, {
        appVersion: this.options.appVersion,
      });
      this.hosts.set(extensionId, host);
    }

    await host.activate();

    return host;
  }

  async activateByEvent(event: string) {
    const extensionIds = activationRegistry.getExtensionsForEvent(event);

    await Promise.all(
      extensionIds.map((extensionId) =>
        this.activateExtension(extensionId).catch((error) => {
          console.error(`[PluginHost] activate ${extensionId} by ${event} failed`, error);
        }),
      ),
    );
  }

  async invokeCommand(extensionId: string, command: string, args: unknown[]) {
    await this.activateByEvent(`onCommand:${command}`);

    const host = await this.activateExtension(extensionId);

    return host.invokeCommand(command, args);
  }

  async deactivateExtension(extensionId: string) {
    const host = this.hosts.get(extensionId);
    if (!host) return;

    await host.deactivate();
    this.hosts.delete(extensionId);
  }

  async reloadExtension(extensionId: string) {
    await this.deactivateExtension(extensionId);
    await this.activateExtension(extensionId);
  }

  async reloadAll() {
    const ids = Array.from(this.hosts.keys());

    for (const id of ids) {
      await this.deactivateExtension(id);
    }

    this.hosts.clear();
  }

  terminateAll() {
    for (const host of this.hosts.values()) {
      host.terminate();
    }

    this.hosts.clear();
  }
}

export const pluginHostManager = new PluginHostManager({
  appVersion: '0.1.0',
});
```

后面可以从 `package.json` 或 Tauri config 获取 appVersion。

---

# 11. ActivationRegistry 接入

Phase 8 已经有 `activationRegistry`，Phase 10 要确认 contribution 注册时也注册 activation events。

```ts
// apps/desktop/src/plugins/registry/activationRegistry.ts

import type { LoadedExtension } from '../manifest/types';

class ActivationRegistry {
  private eventToExtensions = new Map<string, Set<string>>();

  register(extension: LoadedExtension) {
    for (const event of extension.manifest.activationEvents ?? []) {
      const set = this.eventToExtensions.get(event) ?? new Set<string>();
      set.add(extension.id);
      this.eventToExtensions.set(event, set);
    }

    return {
      dispose: () => {
        this.unregister(extension.id);
      },
    };
  }

  unregister(extensionId: string) {
    for (const set of this.eventToExtensions.values()) {
      set.delete(extensionId);
    }
  }

  getExtensionsForEvent(event: string) {
    return Array.from(this.eventToExtensions.get(event) ?? []);
  }
}

export const activationRegistry = new ActivationRegistry();
```

ContributionRegistry：

```ts
// apps/desktop/src/plugins/registry/contributionRegistry.ts

import { activationRegistry } from './activationRegistry'

registerExtension(extension: LoadedExtension) {
  this.unregisterExtension(extension.id)

  if (extension.state !== 'enabled') return

  const list: ContributionDisposable[] = []

  list.push(activationRegistry.register(extension))
  list.push(...registerCommandContributions(extension))
  list.push(...registerMenuContributions(extension))
  list.push(...registerKeybindingContributions(extension))
  list.push(...registerViewContributions(extension))

  this.disposables.set(extension.id, list)
}
```

---

# 12. 改造 Command Contribution

Phase 8 的 command handler 是占位。Phase 10 改为调用插件 host。

```ts
// apps/desktop/src/plugins/registry/commandContribution.ts

import { commandService } from '@/services/commandService';
import type { LoadedExtension } from '../manifest/types';
import type { ContributionDisposable } from './contributionRegistry';
import { pluginHostManager } from '../host/PluginHostManager';

export function registerCommandContributions(extension: LoadedExtension): ContributionDisposable[] {
  const commands = extension.manifest.contributes?.commands ?? [];

  return commands.map((item) => {
    return commandService.register({
      id: item.command,
      title: item.title,
      category: item.category,
      source: 'plugin',
      extensionId: extension.id,
      handler: async (...args) => {
        return pluginHostManager.invokeCommand(extension.id, item.command, args);
      },
    });
  });
}
```

---

# 13. PluginRpcDispatcher

这是主线程最重要的模块。

插件调用的所有 API 都会到这里。

```txt
rpc.method
  ↓
PluginRpcDispatcher
  ↓
权限检查，Phase 11 完整实现
  ↓
调用宿主服务
  ↓
返回结果
```

---

## 13.1 Dispatcher 骨架

```ts
// apps/desktop/src/plugins/host/PluginRpcDispatcher.ts

import type { RpcNotification, RpcRequest } from '@sqlgui/api';
import type { LoadedExtension } from '@/plugins/manifest/types';
import { editorRpcHandlers } from './rpc/editorRpcHandlers';
import { windowRpcHandlers } from './rpc/windowRpcHandlers';
import { dbRpcHandlers } from './rpc/dbRpcHandlers';
import { storageRpcHandlers } from './rpc/storageRpcHandlers';
import { clipboardRpcHandlers } from './rpc/clipboardRpcHandlers';
import { resultRpcHandlers } from './rpc/resultRpcHandlers';
import { diagnosticsRpcHandlers } from './rpc/diagnosticsRpcHandlers';
import { viewRpcHandlers } from './rpc/viewRpcHandlers';
import { commandRpcHandlers } from './rpc/commandRpcHandlers';
import { pluginLogService } from './PluginLogService';

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

    // Phase 11 做完整权限检查
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

    await handler(extension, notification.params);
  }
}

export const pluginRpcDispatcher = new PluginRpcDispatcher();
```

---

# 14. RPC Handlers 目录

```txt
apps/desktop/src/plugins/host/rpc/
├─ commandRpcHandlers.ts
├─ windowRpcHandlers.ts
├─ editorRpcHandlers.ts
├─ dbRpcHandlers.ts
├─ storageRpcHandlers.ts
├─ clipboardRpcHandlers.ts
├─ resultRpcHandlers.ts
├─ diagnosticsRpcHandlers.ts
└─ viewRpcHandlers.ts
```

---

# 15. Command RPC Handlers

插件内部调用：

```ts
api.commands.executeCommand('editor.newQuery');
api.commands.getCommands();
```

```ts
// apps/desktop/src/plugins/host/rpc/commandRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { commandService } from '@/services/commandService';

export const commandRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'commands.execute'(_extension, params) {
    const payload = params as {
      command: string;
      args?: unknown[];
    };

    return commandService.execute(payload.command, ...(payload.args ?? []));
  },

  async 'commands.getAll'() {
    return commandService.getAll().map((command) => command.id);
  },

  async 'commands.register'() {
    // 插件侧注册 command handler 时通知宿主。
    // 但 manifest command 已经在 Phase 8 注册过了。
    // MVP 暂时不允许插件动态注册 manifest 外命令。
    return undefined;
  },

  async 'commands.unregister'() {
    return undefined;
  },
};
```

第一版建议：

> 插件只能实现 manifest 里声明过的 command handler，不允许 activate 时动态新增未声明命令。

否则命令权限和菜单不好控。

---

# 16. Window RPC Handlers

```ts
// apps/desktop/src/plugins/host/rpc/windowRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { notificationService } from '@/services/notificationService';

export const windowRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'window.showInformationMessage'(_extension, params) {
    const payload = params as {
      message: string;
      items?: string[];
    };

    return notificationService.info(payload.message, payload.items);
  },

  async 'window.showWarningMessage'(_extension, params) {
    const payload = params as {
      message: string;
      items?: string[];
    };

    return notificationService.warn(payload.message, payload.items);
  },

  async 'window.showErrorMessage'(_extension, params) {
    const payload = params as {
      message: string;
      items?: string[];
    };

    return notificationService.error(payload.message, payload.items);
  },

  async 'window.showQuickPick'(_extension, params) {
    // Phase 10 可以先简单返回 undefined
    console.warn('showQuickPick is not implemented yet', params);
    return undefined;
  },

  async 'window.showInputBox'(_extension, params) {
    console.warn('showInputBox is not implemented yet', params);
    return undefined;
  },
};
```

如果你还没有 `notificationService`，先写简单版：

```ts
// apps/desktop/src/services/notificationService.ts

export const notificationService = {
  async info(message: string, items?: string[]) {
    console.info(message);
    return items?.[0];
  },

  async warn(message: string, items?: string[]) {
    console.warn(message);
    return items?.[0];
  },

  async error(message: string, items?: string[]) {
    console.error(message);
    return items?.[0];
  },
};
```

后面换成 shadcn toast / dialog。

---

# 17. Editor RPC Handlers

这里要接 Phase 5 的 `editorService` 和 `sqlModelService`。

## 17.1 SerializedSqlEditor

插件不能拿真实 editor 对象，所以返回可序列化对象。

```ts
// apps/desktop/src/plugins/host/rpc/serializedEditor.ts

import type { SqlEditorTab } from '@/workbench/editor/types';

export interface SerializedSqlEditor {
  id: string;
  title: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  readonly: boolean;
}

export function serializeEditor(tab: SqlEditorTab): SerializedSqlEditor {
  return {
    id: tab.id,
    title: tab.title,
    connectionId: tab.connectionId,
    database: tab.database,
    schema: tab.schema,
    readonly: Boolean(tab.readonly),
  };
}
```

---

## 17.2 editorRpcHandlers

```ts
// apps/desktop/src/plugins/host/rpc/editorRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { editorService } from '@/workbench/editor/services/editorService';
import { sqlModelService } from '@/workbench/editor/services/sqlModelService';
import { serializeEditor } from './serializedEditor';

export const editorRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'editor.getActive'() {
    const editor = editorService.getActiveEditor();
    return editor ? serializeEditor(editor) : undefined;
  },

  async 'editor.getAll'() {
    return editorService.getEditors().map((editor) => serializeEditor(editor));
  },

  async 'editor.openSql'(_extension, params) {
    const editorId = editorService.openSql(params as any);
    const editor = editorService.getEditorById(editorId);

    return editor ? serializeEditor(editor) : undefined;
  },

  async 'editor.close'(_extension, params) {
    const payload = params as {
      editorId: string;
    };

    editorService.closeEditor(payload.editorId);
  },

  async 'editor.getText'(_extension, params) {
    const { editorId } = params as { editorId: string };
    const editor = editorService.getEditorById(editorId);

    return editor?.content ?? '';
  },

  async 'editor.setText'(_extension, params) {
    const payload = params as {
      editorId: string;
      text: string;
    };

    editorService.updateContent(payload.editorId, payload.text);
  },

  async 'editor.getSelectedText'(_extension, params) {
    const { editorId } = params as { editorId: string };
    return sqlModelService.getSelectedText(editorId);
  },

  async 'editor.getSelectedTextOrDocumentText'(_extension, params) {
    const { editorId } = params as { editorId: string };
    const selected = sqlModelService.getSelectedText(editorId);

    if (selected.trim()) return selected;

    const editor = editorService.getEditorById(editorId);
    return editor?.content ?? '';
  },

  async 'editor.replaceSelection'(_extension, params) {
    const payload = params as {
      editorId: string;
      text: string;
    };

    sqlModelService.replaceSelection(payload.editorId, payload.text);
  },

  async 'editor.insertText'(_extension, params) {
    const payload = params as {
      editorId: string;
      text: string;
    };

    sqlModelService.insertText(payload.editorId, payload.text);
  },

  async 'editor.getCursorPosition'(_extension, params) {
    const payload = params as {
      editorId: string;
    };

    return sqlModelService.getCursorPosition(payload.editorId);
  },

  async 'editor.revealRange'(_extension, params) {
    const payload = params as {
      editorId: string;
      range: any;
    };

    sqlModelService.revealRange(payload.editorId, payload.range);
  },
};
```

需要补齐 `editorService` 方法：

```ts
// apps/desktop/src/workbench/editor/services/editorService.ts

getEditors() {
  return useEditorStore.getState().tabs
},

getEditorById(editorId: string) {
  return useEditorStore
    .getState()
    .tabs
    .find((tab) => tab.id === editorId)
},

updateContent(editorId: string, content: string) {
  useEditorStore.getState().updateEditorContent(editorId, content)
},
```

需要补齐 `sqlModelService`：

```ts
// apps/desktop/src/workbench/editor/services/sqlModelService.ts

getCursorPosition(editorId: string) {
  return this.getEditor(editorId)?.getPosition() ?? undefined
}

revealRange(editorId: string, range: any) {
  const editor = this.getEditor(editorId)
  if (!editor) return

  editor.revealRangeInCenter(range)
}
```

---

# 18. Worker 侧 SqlEditor Proxy 修正

Phase 9 里 `editor.getActiveEditor()` 返回的是普通对象，但插件调用 `editor.getText()` 时需要走 RPC。

所以 `@sqlgui/sdk` 的 `createSqlGuiApi` 要包装 editor。

```ts
// packages/sqlgui-sdk/src/editorProxy.ts

import type { RpcClient } from './rpcClient';
import type { SqlEditor } from '@sqlgui/api';

interface SerializedSqlEditor {
  id: string;
  title: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  readonly: boolean;
}

export function createSqlEditorProxy(rpc: RpcClient, data: SerializedSqlEditor): SqlEditor {
  return {
    id: data.id,
    title: data.title,
    connectionId: data.connectionId,
    database: data.database,
    schema: data.schema,
    readonly: data.readonly,

    getText() {
      return rpc.request('editor.getText', {
        editorId: data.id,
      });
    },

    setText(text) {
      return rpc.request('editor.setText', {
        editorId: data.id,
        text,
      });
    },

    getSelectedText() {
      return rpc.request('editor.getSelectedText', {
        editorId: data.id,
      });
    },

    getSelectedTextOrDocumentText() {
      return rpc.request('editor.getSelectedTextOrDocumentText', {
        editorId: data.id,
      });
    },

    replaceSelection(text) {
      return rpc.request('editor.replaceSelection', {
        editorId: data.id,
        text,
      });
    },

    insertText(text) {
      return rpc.request('editor.insertText', {
        editorId: data.id,
        text,
      });
    },

    getCursorPosition() {
      return rpc.request('editor.getCursorPosition', {
        editorId: data.id,
      });
    },

    revealRange(range) {
      return rpc.request('editor.revealRange', {
        editorId: data.id,
        range,
      });
    },
  };
}
```

改造 `createSqlGuiApi`：

```ts
// packages/sqlgui-sdk/src/createSqlGuiApi.ts

import { createSqlEditorProxy } from './editorProxy';

// ...

const editorApi: EditorApi = {
  onDidOpenEditor: new Emitter<any>().event,
  onDidCloseEditor: new Emitter<string>().event,
  onDidChangeActiveEditor: activeEditorEmitter.event,

  async getActiveEditor() {
    const data = await rpc.request<any>('editor.getActive');
    return data ? createSqlEditorProxy(rpc, data) : undefined;
  },

  async getEditors() {
    const list = await rpc.request<any[]>('editor.getAll');
    return list.map((item) => createSqlEditorProxy(rpc, item));
  },

  async openSql(openOptions) {
    const data = await rpc.request<any>('editor.openSql', openOptions);
    return createSqlEditorProxy(rpc, data);
  },

  closeEditor(editorId) {
    return rpc.request('editor.close', {
      editorId,
    });
  },
};
```

`window.activeSqlEditor` 可以先保留 undefined，推荐插件使用：

```ts
const editor = await api.editor.getActiveEditor();
```

---

# 19. DB RPC Handlers

```ts
// apps/desktop/src/plugins/host/rpc/dbRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { dbService } from '@/services/db/dbService';
import { connectionService } from '@/workbench/connections/services/connectionService';
import { useConnectionStore } from '@/workbench/connections/store/connectionStore';

export const dbRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'db.getActiveConnection'() {
    const state = useConnectionStore.getState();
    const id = state.activeConnectionId;

    if (!id) return undefined;

    const profile = state.profiles.find((item) => item.id === id);
    const runtime = state.runtime[id];

    if (!profile) return undefined;

    return {
      id: profile.id,
      name: profile.name,
      kind: profile.kind,
      database: profile.database,
      connected: runtime?.status === 'connected',
    };
  },

  async 'db.getConnections'() {
    const state = useConnectionStore.getState();

    return state.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      kind: profile.kind,
      database: profile.database,
      connected: state.runtime[profile.id]?.status === 'connected',
    }));
  },

  async 'db.listDatabases'(_extension, params) {
    const { connectionId } = params as { connectionId: string };
    return connectionService.listDatabases(connectionId);
  },

  async 'db.listSchemas'(_extension, params) {
    const payload = params as {
      connectionId: string;
      database?: string;
    };

    return connectionService.listSchemas(payload.connectionId, payload.database);
  },

  async 'db.listTables'(_extension, params) {
    const payload = params as {
      connectionId: string;
      database?: string;
      schema?: string;
    };

    return connectionService.listTables(payload.connectionId, {
      database: payload.database,
      schema: payload.schema,
    });
  },

  async 'db.listColumns'(_extension, params) {
    const payload = params as {
      connectionId: string;
      database?: string;
      schema?: string;
      table: string;
    };

    return connectionService.listColumns(payload.connectionId, {
      database: payload.database,
      schema: payload.schema,
      table: payload.table,
    });
  },

  async 'db.query'(_extension, params) {
    const payload = params as {
      connectionId: string;
      sql: string;
      limit?: number;
      timeoutMs?: number;
      readonly?: boolean;
    };

    // Phase 10 临时策略：强制 readonly
    return dbService.executeQuery({
      connectionId: payload.connectionId,
      sql: payload.sql,
      limit: payload.limit ?? 1000,
      timeoutMs: payload.timeoutMs ?? 30_000,
      readonly: true,
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

Phase 10 建议：

> 插件 `db.query` 强制 readonly，写操作到 Phase 11 再放开。

---

# 20. Storage RPC Handlers

插件存储隔离。

```ts
// apps/desktop/src/plugins/host/PluginStorageService.ts

const STORAGE_PREFIX = 'sqlgui.plugin.storage';

class PluginStorageService {
  private createKey(extensionId: string, scope: string, key: string) {
    return `${STORAGE_PREFIX}.${extensionId}.${scope}.${key}`;
  }

  get<T>(
    extensionId: string,
    scope: 'global' | 'workspace',
    key: string,
    defaultValue?: T,
  ): T | undefined {
    const raw = localStorage.getItem(this.createKey(extensionId, scope, key));

    if (raw === null) return defaultValue;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  set<T>(extensionId: string, scope: 'global' | 'workspace', key: string, value: T) {
    localStorage.setItem(this.createKey(extensionId, scope, key), JSON.stringify(value));
  }

  delete(extensionId: string, scope: 'global' | 'workspace', key: string) {
    localStorage.removeItem(this.createKey(extensionId, scope, key));
  }

  keys(extensionId: string, scope: 'global' | 'workspace') {
    const prefix = `${STORAGE_PREFIX}.${extensionId}.${scope}.`;

    return Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  }

  clear(extensionId: string, scope: 'global' | 'workspace') {
    const prefix = `${STORAGE_PREFIX}.${extensionId}.${scope}.`;

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  }
}

export const pluginStorageService = new PluginStorageService();
```

Handlers：

```ts
// apps/desktop/src/plugins/host/rpc/storageRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { pluginStorageService } from '../PluginStorageService';

export const storageRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'storage.get'(extension, params) {
    const payload = params as {
      key: string;
      defaultValue?: unknown;
    };

    return pluginStorageService.get(extension.id, 'global', payload.key, payload.defaultValue);
  },

  async 'storage.set'(extension, params) {
    const payload = params as {
      key: string;
      value: unknown;
    };

    pluginStorageService.set(extension.id, 'global', payload.key, payload.value);
  },

  async 'storage.delete'(extension, params) {
    const payload = params as {
      key: string;
    };

    pluginStorageService.delete(extension.id, 'global', payload.key);
  },

  async 'storage.keys'(extension) {
    return pluginStorageService.keys(extension.id, 'global');
  },

  async 'storage.clear'(extension) {
    pluginStorageService.clear(extension.id, 'global');
  },

  async 'memento.get'(extension, params) {
    const payload = params as {
      scope: 'global' | 'workspace';
      key: string;
      defaultValue?: unknown;
    };

    return pluginStorageService.get(extension.id, payload.scope, payload.key, payload.defaultValue);
  },

  async 'memento.update'(extension, params) {
    const payload = params as {
      scope: 'global' | 'workspace';
      key: string;
      value: unknown;
    };

    pluginStorageService.set(extension.id, payload.scope, payload.key, payload.value);
  },

  async 'memento.delete'(extension, params) {
    const payload = params as {
      scope: 'global' | 'workspace';
      key: string;
    };

    pluginStorageService.delete(extension.id, payload.scope, payload.key);
  },

  async 'memento.keys'(extension, params) {
    const payload = params as {
      scope: 'global' | 'workspace';
    };

    return pluginStorageService.keys(extension.id, payload.scope);
  },
};
```

---

# 21. Clipboard RPC Handlers

```ts
// apps/desktop/src/plugins/host/rpc/clipboardRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';

export const clipboardRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'clipboard.readText'() {
    return navigator.clipboard.readText();
  },

  async 'clipboard.writeText'(_extension, params) {
    const payload = params as {
      text: string;
    };

    await navigator.clipboard.writeText(payload.text);
  },
};
```

后续可以换 Tauri clipboard plugin。

---

# 22. Result RPC Handlers

```ts
// apps/desktop/src/plugins/host/rpc/resultRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { useResultStore } from '@/workbench/results/store/resultStore';

export const resultRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'result.getActiveQuery'() {
    return useResultStore.getState().getActiveQuery();
  },

  async 'result.getQueries'() {
    return useResultStore.getState().queries;
  },

  async 'result.registerRenderer'(_extension, params) {
    console.warn('result.registerRenderer is not implemented yet', params);
  },

  async 'result.unregisterRenderer'(_extension, params) {
    console.warn('result.unregisterRenderer is not implemented yet', params);
  },
};
```

---

# 23. Diagnostics RPC Handlers

MVP 可以先占位，或者接 Monaco markers。

```ts
// apps/desktop/src/plugins/host/rpc/diagnosticsRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';

export const diagnosticsRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'diagnostics.set'(_extension, params) {
    console.warn('diagnostics.set is not implemented yet', params);
  },

  async 'diagnostics.clear'(_extension, params) {
    console.warn('diagnostics.clear is not implemented yet', params);
  },

  async 'diagnostics.collection.set'(_extension, params) {
    console.warn('diagnostics.collection.set is not implemented yet', params);
  },

  async 'diagnostics.collection.clear'(_extension, params) {
    console.warn('diagnostics.collection.clear is not implemented yet', params);
  },

  async 'diagnostics.collection.dispose'(_extension, params) {
    console.warn('diagnostics.collection.dispose is not implemented yet', params);
  },
};
```

---

# 24. View RPC Handlers

```ts
// apps/desktop/src/plugins/host/rpc/viewRpcHandlers.ts

import type { PluginRpcHandler } from '../PluginRpcDispatcher';

export const viewRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'views.registerProvider'(_extension, params) {
    console.warn('views.registerProvider is not implemented yet', params);
  },

  async 'views.unregisterProvider'(_extension, params) {
    console.warn('views.unregisterProvider is not implemented yet', params);
  },

  async 'views.open'(_extension, params) {
    console.warn('views.open is not implemented yet', params);
  },

  async 'views.createWebviewView'(_extension, params) {
    console.warn('views.createWebviewView is not implemented yet', params);
    return undefined;
  },
};
```

---

# 25. PluginLogService

```ts
// apps/desktop/src/plugins/host/PluginLogService.ts

export interface PluginLogItem {
  id: string;
  extensionId: string;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  args: unknown[];
  createdAt: number;
}

type Listener = () => void;

class PluginLogService {
  private logs: PluginLogItem[] = [];
  private listeners = new Set<Listener>();

  log(extensionId: string, level: PluginLogItem['level'], message: string, args: unknown[] = []) {
    this.logs.push({
      id: crypto.randomUUID(),
      extensionId,
      level,
      message,
      args,
      createdAt: Date.now(),
    });

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    this.emit();
  }

  trace(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'trace', message, args);
  }

  debug(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'debug', message, args);
  }

  info(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'info', message, args);
  }

  warn(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'warn', message, args);
  }

  error(extensionId: string, message: string, ...args: unknown[]) {
    this.log(extensionId, 'error', message, args);
  }

  getLogs(extensionId?: string) {
    if (!extensionId) return this.logs;

    return this.logs.filter((item) => item.extensionId === extensionId);
  }

  clear(extensionId?: string) {
    if (!extensionId) {
      this.logs = [];
    } else {
      this.logs = this.logs.filter((item) => item.extensionId !== extensionId);
    }

    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return {
      dispose: () => this.listeners.delete(listener),
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const pluginLogService = new PluginLogService();
```

---

# 26. 插件日志 UI

```tsx
// apps/desktop/src/plugins/components/PluginLogsView.tsx

import { useEffect, useState } from 'react';
import { pluginLogService, type PluginLogItem } from '../host/PluginLogService';
import { Button } from '@/components/ui/button';

interface PluginLogsViewProps {
  extensionId?: string;
}

export function PluginLogsView(props: PluginLogsViewProps) {
  const [logs, setLogs] = useState<PluginLogItem[]>(pluginLogService.getLogs(props.extensionId));

  useEffect(() => {
    const disposable = pluginLogService.subscribe(() => {
      setLogs(pluginLogService.getLogs(props.extensionId));
    });

    return () => disposable.dispose();
  }, [props.extensionId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center justify-between border-b px-2">
        <div className="text-xs font-medium">Plugin Logs</div>

        <Button size="sm" variant="ghost" onClick={() => pluginLogService.clear(props.extensionId)}>
          Clear
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 text-xs">
        {logs.map((log) => (
          <div key={log.id} className="mb-1 rounded border p-2">
            <div className="flex gap-2">
              <span className={levelClassName(log.level)}>{log.level.toUpperCase()}</span>
              <span className="text-muted-foreground">{log.extensionId}</span>
              <span className="text-muted-foreground">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="mt-1">{log.message}</div>

            {log.args.length ? (
              <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(log.args, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function levelClassName(level: PluginLogItem['level']) {
  if (level === 'error') return 'text-destructive';
  if (level === 'warn') return 'text-yellow-600';
  if (level === 'info') return 'text-blue-600';
  return 'text-muted-foreground';
}
```

---

# 27. ExtensionService 改造：disable 时停 Host

Phase 8 的 disable 只卸载 contribution。Phase 10 还要停 Worker。

```ts
// apps/desktop/src/plugins/services/extensionService.ts

import { pluginHostManager } from '../host/PluginHostManager'

// ...

disable(extensionId: string) {
  extensionStorage.setEnabled(extensionId, false)
  contributionRegistry.unregisterExtension(extensionId)
  extensionRegistry.disable(extensionId)
  pluginHostManager.deactivateExtension(extensionId)
},

async reload(extensionId: string) {
  await pluginHostManager.reloadExtension(extensionId)
},

async reloadAllHosts() {
  await pluginHostManager.reloadAll()
},
```

---

# 28. 插件管理 UI 增加 Reload

```tsx
// apps/desktop/src/plugins/components/ExtensionListItem.tsx

<Button size="sm" variant="ghost" onClick={() => extensionService.reload(extension.id)}>
  Reload
</Button>
```

---

# 29. 命令注册

Phase 10 新增核心命令：

```txt
extensions.reloadHost
extensions.reloadExtension
extensions.showLogs
extensions.activateExtension
extensions.deactivateExtension
```

```ts
// apps/desktop/src/plugins/registerExtensionCommands.ts

import { commandService } from '@/services/commandService';
import { extensionService } from './services/extensionService';
import { pluginHostManager } from './host/PluginHostManager';

export function registerExtensionCommands() {
  commandService.register({
    id: 'extensions.reloadHost',
    title: 'Reload Extension Host',
    category: 'Extensions',
    source: 'core',
    handler: async () => {
      await extensionService.reloadAllHosts();
    },
  });

  commandService.register({
    id: 'extensions.activateExtension',
    title: 'Activate Extension',
    category: 'Extensions',
    source: 'core',
    handler: async (extensionId: string) => {
      await pluginHostManager.activateExtension(extensionId);
    },
  });

  commandService.register({
    id: 'extensions.deactivateExtension',
    title: 'Deactivate Extension',
    category: 'Extensions',
    source: 'core',
    handler: async (extensionId: string) => {
      await pluginHostManager.deactivateExtension(extensionId);
    },
  });
}
```

---

# 30. `@sqlgui/sdk` 需要修正的点

Phase 10 要确保 SDK 支持命令结果回传。

在 Worker 里 `plugin:invokeCommand` 是宿主发来的，不走 RPC。`CommandRuntime` 已经支持本地执行。

但 SDK 的 `commands.registerCommand` 只 notify 宿主，不知道具体 extensionId。这个没问题，因为宿主知道 Worker 对应哪个 extension。

---

# 31. 插件 Demo：sql-formatter-demo

插件代码：

```ts
// extensions/sql-formatter-demo/src/extension.ts

import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.logger.info('SQL Formatter Demo activated');

  context.subscriptions.push(
    api.commands.registerCommand('sql.format', async () => {
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
    }),
  );
}

export function deactivate() {}

function formatSql(sql: string) {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\bselect\b/gi, 'SELECT')
    .replace(/\bfrom\b/gi, '\nFROM')
    .replace(/\bwhere\b/gi, '\nWHERE')
    .replace(/\border\s+by\b/gi, '\nORDER BY')
    .replace(/\bgroup\s+by\b/gi, '\nGROUP BY')
    .replace(/\blimit\b/gi, '\nLIMIT')
    .trim();
}
```

构建：

```bash
pnpm --filter sqlgui-extension-sql-formatter-demo build
```

---

# 32. 运行流程验收

1. 启动应用。
2. `extension_scan` 扫描到 `baicie.sql-formatter-demo`。
3. Phase 8 注册 `sql.format` 命令。
4. 打开 SQL Editor，输入：

```sql
select * from users where id = 1 order by created_at limit 10
```

5. 执行 Command Palette：`Format SQL`。
6. CommandService 调用 `pluginHostManager.invokeCommand(...)`。
7. Host 激活插件。
8. Worker import 插件 bundle。
9. 插件 activate 注册 `sql.format` handler。
10. Host 调用 `plugin:invokeCommand`。
11. 插件读取 editor 内容。
12. 插件写回格式化 SQL。

结果：

```sql
SELECT *
FROM users
WHERE id = 1
ORDER BY created_at
LIMIT 10
```

---

# 33. Worker 激活时序问题

这里有一个关键问题：

```txt
宿主执行 sql.format
  ↓
activate 插件
  ↓
插件 activate 内 registerCommand
  ↓
宿主立即 invokeCommand
```

如果 activate 还没完成，invoke 会失败。

所以 `PluginHost.activate()` 应该返回一个 Promise，直到收到 `plugin:activated`。

改造 `PluginHost`：

```ts
private activationPromise?: Promise<void>
private resolveActivation?: () => void
private rejectActivation?: (error: Error) => void

async activate() {
  if (this.state === 'activated') return

  if (this.activationPromise) {
    return this.activationPromise
  }

  this.activationPromise = new Promise<void>((resolve, reject) => {
    this.resolveActivation = resolve
    this.rejectActivation = reject
  })

  // 原 activate 逻辑...

  return this.activationPromise
}
```

在 handleMessage：

```ts
case 'plugin:activated':
  this.state = 'activated'
  this.resolveActivation?.()
  break

case 'plugin:activationError':
  this.state = 'error'
  this.rejectActivation?.(new Error(message.error))
  break
```

完整补丁：

```ts
// PluginHost.ts 关键补丁

private activationPromise?: Promise<void>
private resolveActivation?: () => void
private rejectActivation?: (error: Error) => void

async activate() {
  if (this.state === 'activated') return

  if (this.activationPromise) {
    return this.activationPromise
  }

  this.activationPromise = new Promise<void>((resolve, reject) => {
    this.resolveActivation = resolve
    this.rejectActivation = reject
  })

  try {
    await this.startWorker()
  } catch (error) {
    this.state = 'error'
    this.rejectActivation?.(
      error instanceof Error ? error : new Error(String(error)),
    )
  }

  return this.activationPromise
}

private async startWorker() {
  if (!this.extension.main) {
    throw new Error(`Extension ${this.extension.id} has no main entry.`)
  }

  this.state = 'activating'

  const entry = await extensionFileService.readEntry({
    extensionPath: this.extension.extensionPath,
    main: this.extension.main,
  })

  this.sourceUrl = createExtensionSourceUrl(entry.source)
  this.worker = createPluginWorker()

  this.worker.onmessage = (event) => {
    this.handleMessage(event.data as PluginToHostMessage)
  }

  this.worker.onerror = (event) => {
    this.state = 'error'
    this.rejectActivation?.(new Error(event.message))
  }

  this.worker.postMessage({
    type: 'plugin:activate',
    appVersion: this.options.appVersion,
    extensionSourceUrl: this.sourceUrl,
    context: {
      id: this.extension.id,
      name: this.extension.name,
      publisher: this.extension.publisher,
      version: this.extension.version,
      extensionPath: this.extension.extensionPath,
      globalStoragePath: `${this.extension.id}/global`,
    },
  } satisfies HostToPluginMessage)
}
```

---

# 34. PluginHostManager invokeCommand 修正

```ts
async invokeCommand(
  extensionId: string,
  command: string,
  args: unknown[],
) {
  await this.activateByEvent(`onCommand:${command}`)

  const host = await this.activateExtension(extensionId)

  // activateExtension 内部已经等待 plugin:activated
  return host.invokeCommand(command, args)
}
```

---

# 35. 事件通知预留

Phase 10 可先不做，但建议留方法：

```ts
// apps/desktop/src/plugins/host/PluginHost.ts

notify(method: string, params?: unknown) {
  this.worker?.postMessage({
    type: 'rpc:notification',
    notification: {
      method,
      params,
    },
  } satisfies HostToPluginMessage)
}
```

后续可以通知：

```txt
editor.activeChanged
db.activeConnectionChanged
result.queryFinished
i18n.languageChanged
```

---

# 36. 插件崩溃处理

Worker 运行时可能：

```txt
1. activate 抛错
2. command handler 抛错
3. Worker onerror
4. import 插件失败
5. RPC 超时
```

MVP 策略：

```txt
activate 失败：
  extension state = error
  logs 记录错误

command handler 失败：
  命令执行 reject
  notification 展示错误

worker onerror：
  terminate
  state = error

disable 插件：
  deactivate + terminate
```

可以在 `PluginHostManager` 里添加：

```ts
markExtensionError(extensionId, error);
```

调用 `extensionRegistry.markError(extensionId, error)`。

---

# 37. RPC 超时

防止插件调用宿主能力挂死。

在 `RpcClient` 里加 timeout：

```ts
// packages/sqlgui-sdk/src/rpcClient.ts

request<T>(
  method: string,
  params?: unknown,
  timeoutMs = 30_000,
): Promise<T> {
  const id = String(++this.seq)

  const request: RpcRequest = {
    id,
    method,
    params,
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      this.pending.delete(id)
      reject(new Error(`RPC timeout: ${method}`))
    }, timeoutMs)

    this.pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })

    this.transport.postMessage({
      type: 'rpc:request',
      request,
    })
  })
}
```

---

# 38. 安全边界说明

Phase 10 的安全边界是：

```txt
插件不能访问 DOM
插件不能访问 Tauri invoke
插件不能访问宿主 Store
插件不能访问真实数据库密码
插件只能通过 RPC 调用白名单 API
插件 Worker 可以被 terminate
```

但还不是完整安全模型，因为：

```txt
Worker 仍可能消耗 CPU
Worker 仍可能占用内存
JS 沙箱不是强隔离
Blob import 插件仍需要签名校验
MVP fetch 禁用不是绝对安全策略
```

完整安全留到：

```txt
Phase 11 Permission Broker
Phase 12 Package / Local Install
Phase 13 Mock Marketplace
Phase 14 Signature / Trust
```

---

# 39. Phase 10 开发顺序

推荐按这个顺序写：

```txt
1. Rust extension_read_entry
2. extensionFileService.readEntry
3. PluginWorkerFactory
4. pluginHostWorker.ts
5. sandbox.ts
6. PluginHost 基础 activate/deactivate
7. PluginHostManager
8. ActivationRegistry 接入
9. 改造 commandContribution 调 pluginHostManager
10. PluginRpcDispatcher
11. windowRpcHandlers
12. editorRpcHandlers
13. 修正 @sqlgui/sdk editor proxy
14. storageRpcHandlers
15. dbRpcHandlers
16. clipboardRpcHandlers
17. PluginLogService
18. 插件日志 UI
19. 改造 extensionService.disable/reload
20. 跑通 sql-formatter-demo
```

---

# 40. Phase 10 测试用例

## 40.1 单元测试

```txt
[ ] PluginHost 创建 worker
[ ] PluginHost activate 成功后 state = activated
[ ] PluginHost activation error 后 state = error
[ ] PluginHost invokeCommand 能 resolve
[ ] PluginHost invokeCommand 错误能 reject
[ ] PluginStorageService 按 extensionId 隔离
[ ] PluginRpcDispatcher 未知 method 抛错
[ ] editorRpcHandlers.getActive 返回 serialized editor
[ ] storageRpcHandlers get/set/delete 正常
```

## 40.2 手动测试

```txt
[ ] 启动应用能扫描 demo 插件
[ ] Command Palette 出现 Format SQL
[ ] 执行 Format SQL 时插件被激活
[ ] 插件日志显示 activated
[ ] SQL 被格式化并写回编辑器
[ ] 禁用插件后 Format SQL 消失
[ ] 重新启用后 Format SQL 恢复
[ ] Reload Extension Host 后插件可重新执行
[ ] 插件 activate 抛错时 UI 不崩
[ ] 插件 command 抛错时主应用不崩
```

---

# 41. Phase 10 完成标准

做到下面这些就算完成：

```txt
[ ] 插件 Worker Host 可启动
[ ] 插件 ESM bundle 可被加载
[ ] 插件 activate 可被调用
[ ] 插件 deactivate 可被调用
[ ] 插件 command handler 可被调用
[ ] 插件能调用 api.window.showInformationMessage
[ ] 插件能调用 api.editor.getActiveEditor
[ ] 插件能读取 SQL
[ ] 插件能替换选中 SQL
[ ] 插件能使用 storage/globalState
[ ] 插件能写日志
[ ] disable 插件能 terminate worker
[ ] reload host 可用
[ ] 插件异常不影响主应用
```

---

# 42. 最小闭环

Phase 10 的最小闭环就是：

```txt
sql-formatter-demo
  ↓
Format SQL 命令
  ↓
PluginHost 激活
  ↓
Worker import extension.js
  ↓
activate 注册 handler
  ↓
invokeCommand
  ↓
api.editor.getActiveEditor
  ↓
editor.getSelectedTextOrDocumentText
  ↓
editor.replaceSelection
```

这条链路跑通后，你的 SQL GUI 插件系统就从“声明系统”进入“可执行系统”。

---

# 43. 关键提醒

Phase 10 不要一口气做太多 API。

先保证这几个 API 真正稳定：

```txt
api.commands.registerCommand
api.window.showInformationMessage
api.editor.getActiveEditor
editor.getText
editor.getSelectedTextOrDocumentText
editor.replaceSelection
context.globalState.get/update
context.logger.info/error
```

只要这些跑通，你就可以做出第一个真实插件：

```txt
SQL Formatter
SQL Snippets
Insert SELECT Template
Copy Table Name
Simple Explain Runner
```

Phase 10 的核心价值是：

> **建立插件运行时边界：Worker 隔离 + RPC API + 命令回调 + 生命周期管理。**

这一步完成后，后面的 Phase 11 权限系统、Phase 12 插件安装打包、Phase 13 插件市场，就都是在这个运行时基础上继续增强。
