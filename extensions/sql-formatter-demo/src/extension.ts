import type { ExtensionContext, SqlGuiApi } from '@sqlgui/api';

export async function activate(api: SqlGuiApi, context: ExtensionContext) {
  context.logger.info('SQL Formatter activated');

  const disposable = api.commands.registerCommand('sql.format', async () => {
    const editor = await api.editor.getActiveEditor();

    if (!editor) {
      await api.window.showWarningMessage('No active SQL editor.');
      return;
    }

    const sql = await editor.getSelectedTextOrDocumentText();

    if (!sql.trim()) {
      await api.window.showWarningMessage('SQL is empty.');
      return;
    }

    const formatted = formatSql(sql);

    await editor.replaceSelection(formatted);

    await api.window.showInformationMessage('SQL formatted.');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

function formatSql(sql: string) {
  return sql
    .replace(/\bselect\b/gi, 'SELECT')
    .replace(/\bfrom\b/gi, '\nFROM')
    .replace(/\bwhere\b/gi, '\nWHERE')
    .replace(/\border\s+by\b/gi, '\nORDER BY')
    .replace(/\bgroup\s+by\b/gi, '\nGROUP BY')
    .replace(/\blimit\b/gi, '\nLIMIT');
}
