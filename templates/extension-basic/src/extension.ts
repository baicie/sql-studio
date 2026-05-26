import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.subscriptions.push(
    api.commands.registerCommand('example.hello', async () => {
      await api.window.showInformationMessage('Hello from SQL GUI extension!');
    }),
  );
}

export function deactivate() {}
