import type { RpcNotification, RpcRequest } from '@sqlgui/api';
import type { InstalledExtension } from '@/services/extension/types';
import { commandRpcHandlers } from './rpc/commandRpcHandlers';
import { windowRpcHandlers } from './rpc/windowRpcHandlers';
import { editorRpcHandlers } from './rpc/editorRpcHandlers';
import { dbRpcHandlers } from './rpc/dbRpcHandlers';
import { storageRpcHandlers } from './rpc/storageRpcHandlers';
import { clipboardRpcHandlers } from './rpc/clipboardRpcHandlers';
import { resultRpcHandlers } from './rpc/resultRpcHandlers';
import { diagnosticsRpcHandlers } from './rpc/diagnosticsRpcHandlers';
import { viewRpcHandlers } from './rpc/viewRpcHandlers';
import { pluginLogService } from './PluginLogService';

export type PluginRpcHandler = (
  extension: InstalledExtension,
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

  async handleRequest(extension: InstalledExtension, request: RpcRequest): Promise<unknown> {
    const handler = this.handlers.get(request.method);

    if (!handler) {
      throw new Error(`Unknown plugin RPC method: ${request.method}`);
    }

    return await handler(extension, request.params);
  }

  async handleNotification(extension: InstalledExtension, notification: RpcNotification) {
    if (notification.method === 'extension.log') {
      const params = notification.params as {
        extensionId: string;
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
        message: string;
        args?: unknown[];
      };
      pluginLogService.log(
        params.extensionId ?? extension.id,
        params.level,
        params.message,
        params.args ?? [],
      );
      return;
    }

    const handler = this.handlers.get(notification.method);
    if (!handler) return;

    await handler(extension, notification.params);
  }
}

export const pluginRpcDispatcher = new PluginRpcDispatcher();
