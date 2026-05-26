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
