import type { PluginRpcHandler } from '../PluginRpcDispatcher';

export const diagnosticsRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'diagnostics.set'(_extension, _params) {
    console.warn('diagnostics.set is not implemented yet');
  },

  async 'diagnostics.clear'(_extension, _params) {
    console.warn('diagnostics.clear is not implemented yet');
  },

  async 'diagnostics.collection.set'(_extension, _params) {
    console.warn('diagnostics.collection.set is not implemented yet');
  },

  async 'diagnostics.collection.clear'(_extension, _params) {
    console.warn('diagnostics.collection.clear is not implemented yet');
  },

  async 'diagnostics.collection.dispose'(_extension, _params) {
    console.warn('diagnostics.collection.dispose is not implemented yet');
  },
};
