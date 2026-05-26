import type * as monaco from 'monaco-editor';

export function getSelectedSqlOrFullText(editor: monaco.editor.IStandaloneCodeEditor) {
  const model = editor.getModel();
  if (!model) return '';

  const selection = editor.getSelection();

  if (selection && !selection.isEmpty()) {
    return model.getValueInRange(selection).trim();
  }

  return model.getValue().trim();
}

export function isDangerousSql(sql: string) {
  const normalized = sql.trim().toLowerCase();

  return (
    normalized.startsWith('drop ') ||
    normalized.startsWith('truncate ') ||
    normalized.startsWith('alter ') ||
    normalized.startsWith('delete ') ||
    normalized.startsWith('update ') ||
    normalized.startsWith('insert ')
  );
}
