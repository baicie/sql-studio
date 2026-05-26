export const PluginRpcMethods = {
  CommandsRegister: 'commands.register',
  CommandsUnregister: 'commands.unregister',
  CommandsExecute: 'commands.execute',
  CommandsGetAll: 'commands.getAll',

  WindowInfo: 'window.showInformationMessage',
  WindowWarn: 'window.showWarningMessage',
  WindowError: 'window.showErrorMessage',
  WindowQuickPick: 'window.showQuickPick',
  WindowInputBox: 'window.showInputBox',

  EditorGetActive: 'editor.getActive',
  EditorGetAll: 'editor.getAll',
  EditorOpenSql: 'editor.openSql',
  EditorClose: 'editor.close',
  EditorGetText: 'editor.getText',
  EditorSetText: 'editor.setText',
  EditorGetSelectedText: 'editor.getSelectedText',
  EditorGetSelectedTextOrDocumentText: 'editor.getSelectedTextOrDocumentText',
  EditorReplaceSelection: 'editor.replaceSelection',
  EditorInsertText: 'editor.insertText',
  EditorGetCursorPosition: 'editor.getCursorPosition',
  EditorRevealRange: 'editor.revealRange',

  DbGetActiveConnection: 'db.getActiveConnection',
  DbGetConnections: 'db.getConnections',
  DbListDatabases: 'db.listDatabases',
  DbListSchemas: 'db.listSchemas',
  DbListTables: 'db.listTables',
  DbListColumns: 'db.listColumns',
  DbQuery: 'db.query',
  DbExplain: 'db.explain',

  StorageGet: 'storage.get',
  StorageSet: 'storage.set',
  StorageDelete: 'storage.delete',
  StorageKeys: 'storage.keys',
  StorageClear: 'storage.clear',

  MementoGet: 'memento.get',
  MementoUpdate: 'memento.update',
  MementoDelete: 'memento.delete',
  MementoKeys: 'memento.keys',

  ClipboardReadText: 'clipboard.readText',
  ClipboardWriteText: 'clipboard.writeText',

  DiagnosticsSet: 'diagnostics.set',
  DiagnosticsClear: 'diagnostics.clear',
  DiagnosticsCollectionSet: 'diagnostics.collection.set',
  DiagnosticsCollectionClear: 'diagnostics.collection.clear',
  DiagnosticsCollectionDispose: 'diagnostics.collection.dispose',

  ResultGetActiveQuery: 'result.getActiveQuery',
  ResultGetQueries: 'result.getQueries',
  ResultRegisterRenderer: 'result.registerRenderer',
  ResultUnregisterRenderer: 'result.unregisterRenderer',

  ViewsRegisterProvider: 'views.registerProvider',
  ViewsUnregisterProvider: 'views.unregisterProvider',
  ViewsOpen: 'views.open',
  ViewsCreateWebviewView: 'views.createWebviewView',

  ExtensionLog: 'extension.log',
} as const;

export type PluginRpcMethod = (typeof PluginRpcMethods)[keyof typeof PluginRpcMethods];
