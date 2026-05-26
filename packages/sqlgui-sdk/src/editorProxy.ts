import type { RpcClient } from './rpcClient';
import type { CursorPosition, SqlEditor, TextRange } from '@sqlgui/api';

interface SerializedSqlEditor {
  id: string;
  title: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  readonly: boolean;
}

export function createSqlEditorProxy(rpc: RpcClient, data: SerializedSqlEditor): SqlEditor {
  return {
    id: data.id,
    title: data.title,
    connectionId: data.connectionId,
    database: data.database,
    schema: data.schema,
    readonly: data.readonly,

    getText() {
      return rpc.request<string>('editor.getText', {
        editorId: data.id,
      });
    },

    setText(text: string) {
      return rpc.request<void>('editor.setText', {
        editorId: data.id,
        text,
      });
    },

    getSelectedText() {
      return rpc.request<string>('editor.getSelectedText', {
        editorId: data.id,
      });
    },

    getSelectedTextOrDocumentText() {
      return rpc.request<string>('editor.getSelectedTextOrDocumentText', {
        editorId: data.id,
      });
    },

    replaceSelection(text: string) {
      return rpc.request<void>('editor.replaceSelection', {
        editorId: data.id,
        text,
      });
    },

    insertText(text: string) {
      return rpc.request<void>('editor.insertText', {
        editorId: data.id,
        text,
      });
    },

    getCursorPosition() {
      return rpc.request<CursorPosition | undefined>('editor.getCursorPosition', {
        editorId: data.id,
      });
    },

    revealRange(range: TextRange) {
      return rpc.request<void>('editor.revealRange', {
        editorId: data.id,
        range,
      });
    },
  };
}
