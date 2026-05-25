import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  const disposable = api.commands.registerCommand('sql.format', async () => {
    await api.window.showInformationMessage('Format SQL from demo extension.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
