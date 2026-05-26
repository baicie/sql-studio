import type { ExtensionPermission } from '@sqlgui/extension-schema';

export const apiPermissionMap: Record<string, ExtensionPermission[]> = {
  // commands
  'commands.execute': [],
  'commands.getAll': [],
  'commands.register': [],
  'commands.unregister': [],

  // window
  'window.showInformationMessage': ['ui.notification'],
  'window.showWarningMessage': ['ui.notification'],
  'window.showErrorMessage': ['ui.notification'],
  'window.showQuickPick': ['ui.notification'],
  'window.showInputBox': ['ui.notification'],

  // editor read
  'editor.getActive': ['editor.read'],
  'editor.getAll': ['editor.read'],
  'editor.getText': ['editor.read'],
  'editor.getSelectedText': ['editor.read'],
  'editor.getSelectedTextOrDocumentText': ['editor.read'],
  'editor.getCursorPosition': ['editor.read'],

  // editor write
  'editor.openSql': ['editor.write'],
  'editor.close': ['editor.write'],
  'editor.setText': ['editor.write'],
  'editor.replaceSelection': ['editor.write'],
  'editor.insertText': ['editor.write'],
  'editor.revealRange': ['editor.read'],

  // db metadata
  'db.getActiveConnection': ['db.connection.read'],
  'db.getConnections': ['db.connection.read'],
  'db.listDatabases': ['db.schema.read'],
  'db.listSchemas': ['db.schema.read'],
  'db.listTables': ['db.schema.read'],
  'db.listColumns': ['db.schema.read'],

  // db query
  'db.query': ['db.query.read'],
  'db.explain': ['db.query.explain'],

  // storage
  'storage.get': ['storage.local'],
  'storage.set': ['storage.local'],
  'storage.delete': ['storage.local'],
  'storage.keys': ['storage.local'],
  'storage.clear': ['storage.local'],

  'memento.get': ['storage.local'],
  'memento.update': ['storage.local'],
  'memento.delete': ['storage.local'],
  'memento.keys': ['storage.local'],

  // clipboard
  'clipboard.readText': ['clipboard.read'],
  'clipboard.writeText': ['clipboard.write'],

  // diagnostics
  'diagnostics.set': ['editor.write'],
  'diagnostics.clear': ['editor.write'],
  'diagnostics.collection.set': ['editor.write'],
  'diagnostics.collection.clear': ['editor.write'],
  'diagnostics.collection.dispose': ['editor.write'],

  // result
  'result.getActiveQuery': ['db.query.read'],
  'result.getQueries': ['db.query.read'],
  'result.registerRenderer': [],
  'result.unregisterRenderer': [],

  // views
  'views.registerProvider': [],
  'views.unregisterProvider': [],
  'views.open': [],
  'views.createWebviewView': [],

  // extension log
  'extension.log': [],
};
