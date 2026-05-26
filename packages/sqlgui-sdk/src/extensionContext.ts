import type { ExtensionContext, ExtensionLogger, Memento } from '@sqlgui/api';
import type { RpcClient } from './rpcClient';

export interface CreateExtensionContextOptions {
  id: string;
  name: string;
  publisher: string;
  version: string;
  extensionPath: string;
  globalStoragePath: string;
  rpc: RpcClient;
}

export function createExtensionContext(options: CreateExtensionContextOptions): ExtensionContext {
  return {
    id: options.id,
    name: options.name,
    publisher: options.publisher,
    version: options.version,
    extensionPath: options.extensionPath,
    globalStoragePath: options.globalStoragePath,
    subscriptions: [],
    globalState: createMemento(options.rpc, 'global'),
    workspaceState: createMemento(options.rpc, 'workspace'),
    logger: createLogger(options.id, options.rpc),
  };
}

function createMemento(rpc: RpcClient, scope: 'global' | 'workspace'): Memento {
  return {
    async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
      const value = await rpc.request<T | undefined>('memento.get', {
        scope,
        key,
      });

      return value === undefined ? defaultValue : value;
    },

    update<T>(key: string, value: T): Promise<void> {
      return rpc.request('memento.update', {
        scope,
        key,
        value,
      });
    },

    delete(key: string): Promise<void> {
      return rpc.request('memento.delete', {
        scope,
        key,
      });
    },

    keys(): Promise<string[]> {
      return rpc.request('memento.keys', {
        scope,
      });
    },
  };
}

function createLogger(extensionId: string, rpc: RpcClient): ExtensionLogger {
  function send(
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
    message: string,
    args: unknown[],
  ) {
    rpc.notify('extension.log', {
      extensionId,
      level,
      message,
      args,
    });
  }

  return {
    trace(message, ...args) {
      send('trace', message, args);
    },
    debug(message, ...args) {
      send('debug', message, args);
    },
    info(message, ...args) {
      send('info', message, args);
    },
    warn(message, ...args) {
      send('warn', message, args);
    },
    error(message, ...args) {
      send('error', message, args);
    },
  };
}
