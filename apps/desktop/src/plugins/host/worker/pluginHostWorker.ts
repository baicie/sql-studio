import type { ExtensionModule } from '@sqlgui/api';
import {
  CommandRuntime,
  RpcClient,
  createExtensionContext,
  createSqlGuiApi,
  createWorkerTransport,
} from '@sqlgui/sdk';
import type {
  HostToPluginMessage,
  PluginToHostMessage,
  SerializedExtensionContext,
} from '../pluginTypes';
import { installWorkerSandbox } from './sandbox';

installWorkerSandbox();

let extensionId: string | undefined;
let commandRuntime: CommandRuntime | undefined;
let deactivateFn: (() => Promise<void>) | undefined;

const transport = createWorkerTransport();
const rpc = new RpcClient(transport);

self.addEventListener('message', async (event) => {
  const message = event.data as HostToPluginMessage;

  try {
    switch (message.type) {
      case 'plugin:activate':
        await handleActivate(message);
        break;

      case 'plugin:deactivate':
        await handleDeactivate();
        break;

      case 'plugin:invokeCommand':
        await handleInvokeCommand(message);
        break;

      case 'rpc:response':
        break;

      case 'rpc:notification':
        break;
    }
  } catch (error) {
    post({
      type: 'plugin:activationError',
      extensionId: extensionId ?? 'unknown',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
});

async function handleActivate(message: {
  appVersion: string;
  extensionSourceUrl: string;
  context: SerializedExtensionContext;
}) {
  extensionId = message.context.id;

  const mod = (await import(
    /* @vite-ignore */
    message.extensionSourceUrl
  )) as ExtensionModule;

  commandRuntime = new CommandRuntime();

  const context = createExtensionContext({
    id: message.context.id,
    name: message.context.name,
    publisher: message.context.publisher,
    version: message.context.version,
    extensionPath: message.context.extensionPath,
    globalStoragePath: message.context.globalStoragePath,
    rpc,
  });

  const api = createSqlGuiApi({
    version: message.appVersion,
    rpc,
    commandRuntime,
    context,
  });

  if (mod.activate) {
    await mod.activate(api, context);
  }

  deactivateFn = async () => {
    for (const item of context.subscriptions) {
      item.dispose();
    }

    if (mod.deactivate) {
      await mod.deactivate();
    }

    commandRuntime?.clear();
  };

  post({
    type: 'plugin:activated',
    extensionId: message.context.id,
  });
}

async function handleDeactivate() {
  if (deactivateFn) {
    await deactivateFn();
  }

  post({
    type: 'plugin:deactivated',
    extensionId: extensionId ?? 'unknown',
  });
}

async function handleInvokeCommand(message: {
  command: string;
  args: unknown[];
  requestId: string;
}) {
  try {
    if (!commandRuntime) {
      throw new Error('Extension is not activated.');
    }

    const result = await commandRuntime.executeLocalCommand(message.command, message.args);

    post({
      type: 'plugin:commandResult',
      requestId: message.requestId,
      result,
    });
  } catch (error) {
    post({
      type: 'plugin:commandResult',
      requestId: message.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

function post(message: PluginToHostMessage) {
  self.postMessage(message);
}
