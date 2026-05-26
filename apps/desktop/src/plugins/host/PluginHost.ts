import type { InstalledExtension } from '@/services/extension/types';
import type { HostToPluginMessage, PluginToHostMessage } from './pluginTypes';
import { createExtensionSourceUrl, createPluginWorker } from './PluginWorkerFactory';
import { pluginRpcDispatcher } from './PluginRpcDispatcher';
import { pluginLogService } from './PluginLogService';
import { extensionFileService } from '@/plugins/services/extensionFileService';

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
  private activationPromise?: Promise<void>;
  private resolveActivation?: () => void;
  private rejectActivation?: (error: Error) => void;

  constructor(
    readonly extension: InstalledExtension,
    private readonly options: {
      appVersion: string;
    },
  ) {}

  getState() {
    return this.state;
  }

  async activate(): Promise<void> {
    if (this.state === 'activated') return;

    if (this.activationPromise) {
      return this.activationPromise;
    }

    this.activationPromise = new Promise<void>((resolve, reject) => {
      this.resolveActivation = resolve;
      this.rejectActivation = reject;
    });

    try {
      await this.startWorker();
    } catch (error) {
      this.state = 'error';
      this.rejectActivation?.(error instanceof Error ? error : new Error(String(error)));
    }

    return this.activationPromise;
  }

  private async startWorker(): Promise<void> {
    if (!this.extension.manifest.main) {
      throw new Error(`Extension ${this.extension.id} has no main entry.`);
    }

    this.state = 'activating';

    const entry = await this.readEntry();

    this.sourceUrl = createExtensionSourceUrl(entry.source);
    this.worker = createPluginWorker();

    this.worker.onmessage = (event) => {
      this.handleMessage(event.data as PluginToHostMessage);
    };

    this.worker.onerror = (event) => {
      this.state = 'error';
      this.rejectActivation?.(new Error(event.message));
    };

    this.worker.postMessage({
      type: 'plugin:activate',
      appVersion: this.options.appVersion,
      extensionSourceUrl: this.sourceUrl,
      context: {
        id: this.extension.id,
        name: this.extension.manifest.displayName ?? this.extension.manifest.name,
        publisher: this.extension.manifest.publisher,
        version: this.extension.manifest.version,
        extensionPath: this.extension.extensionPath ?? '',
        globalStoragePath: `${this.extension.id}/global`,
      },
    } satisfies HostToPluginMessage);
  }

  private async readEntry() {
    const main = this.extension.manifest.main;
    if (!main) {
      throw new Error(`Extension ${this.extension.id} has no main entry.`);
    }

    return extensionFileService.readEntry({
      extensionPath: this.extension.extensionPath ?? '',
      main,
    });
  }

  async deactivate() {
    if (!this.worker) return;

    this.state = 'deactivating';

    this.worker.postMessage({
      type: 'plugin:deactivate',
    } satisfies HostToPluginMessage);

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

  invokeCommand(command: string, args: unknown[]): Promise<unknown> {
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

  notify(method: string, params?: unknown) {
    this.worker?.postMessage({
      type: 'rpc:notification',
      notification: {
        method,
        params,
      },
    } satisfies HostToPluginMessage);
  }

  private handleMessage(message: PluginToHostMessage) {
    switch (message.type) {
      case 'plugin:activated':
        this.state = 'activated';
        this.resolveActivation?.();
        pluginLogService.info(this.extension.id, 'activated');
        break;

      case 'plugin:activationError':
        this.state = 'error';
        pluginLogService.error(this.extension.id, message.error, message.stack);
        this.rejectActivation?.(new Error(message.error));
        break;

      case 'plugin:deactivated':
        this.terminate();
        pluginLogService.info(this.extension.id, 'deactivated');
        break;

      case 'plugin:commandResult':
        this.handleCommandResult(message);
        break;

      case 'rpc:request':
        void this.handleRpcRequest(message.request);
        break;

      case 'rpc:notification':
        void pluginRpcDispatcher.handleNotification(this.extension, message.notification);
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
      const anyError = error as {
        code?: string;
        extensionId?: string;
        method?: string;
        missingPermissions?: unknown;
      };

      this.worker.postMessage({
        type: 'rpc:response',
        response: {
          id: request.id,
          error: {
            code: anyError.code ?? 'PLUGIN_RPC_ERROR',
            message: error instanceof Error ? error.message : String(error),
            data: {
              extensionId: anyError.extensionId,
              method: anyError.method,
              missingPermissions: anyError.missingPermissions,
            },
          },
        },
      } satisfies HostToPluginMessage);
    }
  }
}
