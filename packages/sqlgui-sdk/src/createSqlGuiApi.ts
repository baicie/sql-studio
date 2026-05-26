import type {
  ClipboardApi,
  CommandApi,
  DatabaseApi,
  DbConnection,
  DiagnosticsApi,
  EditorApi,
  ExtensionContext,
  I18nApi,
  QueryRecord,
  ResultApi,
  SqlEditor,
  SqlGuiApi,
  StorageApi,
  ViewApi,
  WindowApi,
} from '@sqlgui/api';
import type { RpcClient } from './rpcClient';
import type { CommandRuntime } from './commandRuntime';
import { Emitter } from '@sqlgui/api';

export interface CreateSqlGuiApiOptions {
  version: string;
  rpc: RpcClient;
  commandRuntime: CommandRuntime;
  context: ExtensionContext;
}

export function createSqlGuiApi(options: CreateSqlGuiApiOptions): SqlGuiApi {
  const { rpc, commandRuntime } = options;

  const commands: CommandApi = {
    registerCommand(command, handler) {
      return commandRuntime.registerCommand(
        command,
        handler,
        (registeredCommand) => {
          rpc.notify('commands.register', {
            command: registeredCommand,
          });
        },
        (unregisteredCommand) => {
          rpc.notify('commands.unregister', {
            command: unregisteredCommand,
          });
        },
      );
    },

    executeCommand(command, ...args) {
      return rpc.request('commands.execute', {
        command,
        args,
      });
    },

    getCommands() {
      return rpc.request('commands.getAll');
    },
  };

  const activeEditorEmitter = new Emitter<SqlEditor | undefined>();

  const windowApi: WindowApi = {
    activeSqlEditor: undefined,

    onDidChangeActiveSqlEditor: activeEditorEmitter.event,

    showInformationMessage(message, ...items) {
      return rpc.request('window.showInformationMessage', {
        message,
        items,
      });
    },

    showWarningMessage(message, ...items) {
      return rpc.request('window.showWarningMessage', {
        message,
        items,
      });
    },

    showErrorMessage(message, ...items) {
      return rpc.request('window.showErrorMessage', {
        message,
        items,
      });
    },

    showQuickPick(items, quickPickOptions) {
      return rpc.request('window.showQuickPick', {
        items,
        options: quickPickOptions,
      });
    },

    showInputBox(inputBoxOptions) {
      return rpc.request('window.showInputBox', {
        options: inputBoxOptions,
      });
    },
  };

  const editorApi: EditorApi = {
    onDidOpenEditor: new Emitter<SqlEditor>().event,
    onDidCloseEditor: new Emitter<string>().event,
    onDidChangeActiveEditor: activeEditorEmitter.event,

    getActiveEditor() {
      return rpc.request('editor.getActive');
    },

    getEditors() {
      return rpc.request('editor.getAll');
    },

    openSql(openOptions) {
      return rpc.request('editor.openSql', openOptions);
    },

    closeEditor(editorId) {
      return rpc.request('editor.close', {
        editorId,
      });
    },
  };

  const dbConnectionsEmitter = new Emitter<DbConnection[]>();
  const dbActiveConnectionEmitter = new Emitter<DbConnection | undefined>();

  const dbApi: DatabaseApi = {
    onDidChangeConnections: dbConnectionsEmitter.event,
    onDidChangeActiveConnection: dbActiveConnectionEmitter.event,

    getActiveConnection() {
      return rpc.request('db.getActiveConnection');
    },

    getConnections() {
      return rpc.request('db.getConnections');
    },

    listDatabases(connectionId) {
      return rpc.request('db.listDatabases', {
        connectionId,
      });
    },

    listSchemas(connectionId, database) {
      return rpc.request('db.listSchemas', {
        connectionId,
        database,
      });
    },

    listTables(connectionId, listOptions) {
      return rpc.request('db.listTables', {
        connectionId,
        ...listOptions,
      });
    },

    listColumns(connectionId, listOptions) {
      return rpc.request('db.listColumns', {
        connectionId,
        ...listOptions,
      });
    },

    query(request) {
      return rpc.request('db.query', request);
    },

    explain(request) {
      return rpc.request('db.explain', request);
    },
  };

  const viewsApi: ViewApi = {
    registerViewProvider(viewId) {
      rpc.notify('views.registerProvider', {
        viewId,
      });

      return {
        dispose() {
          rpc.notify('views.unregisterProvider', {
            viewId,
          });
        },
      };
    },

    openView(viewId, payload) {
      return rpc.request('views.open', {
        viewId,
        payload,
      });
    },

    createWebviewView(viewId, webviewOptions) {
      return rpc.request('views.createWebviewView', {
        viewId,
        options: webviewOptions,
      });
    },
  };

  const storageApi: StorageApi = {
    get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
      return rpc.request('storage.get', {
        key,
        defaultValue,
      });
    },

    set<T>(key: string, value: T): Promise<void> {
      return rpc.request('storage.set', {
        key,
        value,
      });
    },

    delete(key) {
      return rpc.request('storage.delete', {
        key,
      });
    },

    keys() {
      return rpc.request('storage.keys');
    },

    clear() {
      return rpc.request('storage.clear');
    },
  };

  const i18nApi: I18nApi = {
    language: 'en-US',

    onDidChangeLanguage: new Emitter<string>().event,

    t(key) {
      return `[${key}]`;
    },
  };

  const clipboardApi: ClipboardApi = {
    readText() {
      return rpc.request('clipboard.readText');
    },

    writeText(text) {
      return rpc.request('clipboard.writeText', {
        text,
      });
    },
  };

  const diagnosticsApi: DiagnosticsApi = {
    setDiagnostics(editorId, diagnostics) {
      return rpc.request('diagnostics.set', {
        editorId,
        diagnostics,
      });
    },

    clearDiagnostics(editorId) {
      return rpc.request('diagnostics.clear', {
        editorId,
      });
    },

    createDiagnosticCollection(name) {
      return {
        async set(editorId, diagnostics) {
          await rpc.request('diagnostics.collection.set', {
            name,
            editorId,
            diagnostics,
          });
        },

        async clear(editorId) {
          await rpc.request('diagnostics.collection.clear', {
            name,
            editorId,
          });
        },

        dispose() {
          rpc.notify('diagnostics.collection.dispose', {
            name,
          });
        },
      };
    },
  };

  const queryRecordEmitter = new Emitter<QueryRecord>();

  const resultApi: ResultApi = {
    onDidFinishQuery: queryRecordEmitter.event,

    getActiveQuery() {
      return rpc.request('result.getActiveQuery');
    },

    getQueries() {
      return rpc.request('result.getQueries');
    },

    registerResultRenderer(rendererId) {
      rpc.notify('result.registerRenderer', {
        rendererId,
      });

      return {
        dispose() {
          rpc.notify('result.unregisterRenderer', {
            rendererId,
          });
        },
      };
    },
  };

  return {
    version: options.version,
    commands,
    window: windowApi,
    editor: editorApi,
    db: dbApi,
    views: viewsApi,
    storage: storageApi,
    i18n: i18nApi,
    clipboard: clipboardApi,
    diagnostics: diagnosticsApi,
    result: resultApi,
  };
}
