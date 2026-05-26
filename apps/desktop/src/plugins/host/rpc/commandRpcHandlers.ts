import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { commandService } from '@/services/command/command-service';

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
    return undefined;
  },

  async 'commands.unregister'() {
    return undefined;
  },
};
