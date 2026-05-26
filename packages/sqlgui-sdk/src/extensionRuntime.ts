import type { ExtensionModule } from '@sqlgui/api';
import type { RpcClient } from './rpcClient';
import { CommandRuntime } from './commandRuntime';
import { createSqlGuiApi } from './createSqlGuiApi';
import { createExtensionContext } from './extensionContext';

export interface StartExtensionRuntimeOptions {
  appVersion: string;
  extensionId: string;
  name: string;
  publisher: string;
  extensionVersion: string;
  extensionPath: string;
  globalStoragePath: string;
  rpc: RpcClient;
  module: ExtensionModule;
}

export async function startExtensionRuntime(options: StartExtensionRuntimeOptions) {
  const commandRuntime = new CommandRuntime();

  const context = createExtensionContext({
    id: options.extensionId,
    name: options.name,
    publisher: options.publisher,
    version: options.extensionVersion,
    extensionPath: options.extensionPath,
    globalStoragePath: options.globalStoragePath,
    rpc: options.rpc,
  });

  const api = createSqlGuiApi({
    version: options.appVersion,
    rpc: options.rpc,
    commandRuntime,
    context,
  });

  if (options.module.activate) {
    await options.module.activate(api, context);
  }

  return {
    api,
    context,
    commandRuntime,

    async deactivate() {
      for (const disposable of context.subscriptions) {
        disposable.dispose();
      }

      if (options.module.deactivate) {
        await options.module.deactivate();
      }

      commandRuntime.clear();
    },
  };
}
