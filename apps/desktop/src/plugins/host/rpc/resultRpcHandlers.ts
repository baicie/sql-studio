import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { useResultStore } from '@/workbench/results/store/resultStore';

export const resultRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'result.getActiveQuery'() {
    return useResultStore.getState().getActiveRecord();
  },

  async 'result.getQueries'() {
    return useResultStore.getState().records;
  },

  async 'result.registerRenderer'(_extension, _params) {
    console.warn('result.registerRenderer is not implemented yet');
  },

  async 'result.unregisterRenderer'(_extension, _params) {
    console.warn('result.unregisterRenderer is not implemented yet');
  },
};
