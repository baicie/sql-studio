import type { ExtensionPermission } from '@sqlgui/api';

export const apiPermissionMap: Record<string, ExtensionPermission[]> = {
  'editor.getActive': ['editor.read'],
  'editor.getAll': ['editor.read'],
  'editor.getText': ['editor.read'],
  'editor.getSelectedText': ['editor.read'],
  'editor.getSelectedTextOrDocumentText': ['editor.read'],

  'editor.setText': ['editor.write'],
  'editor.replaceSelection': ['editor.write'],
  'editor.insertText': ['editor.write'],

  'db.getActiveConnection': ['db.connection.read'],
  'db.getConnections': ['db.connection.read'],
  'db.listDatabases': ['db.schema.read'],
  'db.listSchemas': ['db.schema.read'],
  'db.listTables': ['db.schema.read'],
  'db.listColumns': ['db.schema.read'],

  'db.query': ['db.query.read'],
  'db.explain': ['db.query.explain'],

  'storage.get': ['storage.local'],
  'storage.set': ['storage.local'],
  'storage.delete': ['storage.local'],
  'storage.keys': ['storage.local'],
  'storage.clear': ['storage.local'],

  'memento.get': ['storage.local'],
  'memento.update': ['storage.local'],
  'memento.delete': ['storage.local'],
  'memento.keys': ['storage.local'],

  'clipboard.readText': ['clipboard.read'],
  'clipboard.writeText': ['clipboard.write'],

  'window.showInformationMessage': ['ui.notification'],
  'window.showWarningMessage': ['ui.notification'],
  'window.showErrorMessage': ['ui.notification'],
};
