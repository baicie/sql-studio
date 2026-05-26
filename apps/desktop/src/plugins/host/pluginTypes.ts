import type { RpcNotification, RpcRequest, RpcResponse } from '@sqlgui/api';

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
