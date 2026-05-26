import type { PluginRpcHandler } from '../PluginRpcDispatcher';

export const viewRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'views.registerProvider'(_extension, _params) {
    console.warn('views.registerProvider is not implemented yet');
  },

  async 'views.unregisterProvider'(_extension, _params) {
    console.warn('views.unregisterProvider is not implemented yet');
  },

  async 'views.open'(_extension, _params) {
    console.warn('views.open is not implemented yet');
  },

  async 'views.createWebviewView'(_extension, _params) {
    console.warn('views.createWebviewView is not implemented yet');
    return undefined;
  },
};
