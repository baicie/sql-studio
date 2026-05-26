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
