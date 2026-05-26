import type { EditorTab } from '@/workbench/types';
import type { PluginRpcHandler } from '../PluginRpcDispatcher';
import { useWorkbenchStore } from '@/workbench/store/workbenchStore';
import { sqlModelService } from '@/workbench/editor/services/sqlModelService';

export interface SerializedSqlEditor {
  id: string;
  title: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  readonly: boolean;
}

function serializeEditor(tab: EditorTab): SerializedSqlEditor {
  return {
    id: tab.id,
    title: tab.title,
    connectionId: tab.connectionId,
    database: tab.database,
    schema: tab.schema,
    readonly: Boolean(tab.readonly),
  };
}

export const editorRpcHandlers: Record<string, PluginRpcHandler> = {
  async 'editor.getActive'() {
    const state = useWorkbenchStore.getState();
    const activeId = state.activeEditorTabId;

    if (!activeId) return undefined;

    const tab = state.editorTabs.find((t) => t.id === activeId);
    if (!tab || tab.kind === 'welcome') return undefined;

    return serializeEditor(tab);
  },

  async 'editor.getAll'() {
    const state = useWorkbenchStore.getState();
    return state.editorTabs.filter((tab) => tab.kind !== 'welcome').map(serializeEditor);
  },

  async 'editor.openSql'(_extension, params) {
    const payload = params as {
      title?: string;
      content?: string;
      connectionId?: string;
      database?: string;
      schema?: string;
    };

    const id = `plugin-${Date.now()}`;
    const title = payload.title ?? 'Plugin Query';

    useWorkbenchStore.getState().openEditorTab({
      id,
      title,
      kind: 'query',
      dirty: false,
      content: payload.content ?? '',
      connectionId: payload.connectionId,
      database: payload.database,
      schema: payload.schema,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      language: 'sql' as const,
    });

    return {
      id,
      title,
      connectionId: payload.connectionId,
      database: payload.database,
      schema: payload.schema,
      readonly: false,
    } satisfies SerializedSqlEditor;
  },

  async 'editor.close'(_extension, params) {
    const payload = params as {
      editorId: string;
    };

    useWorkbenchStore.getState().closeEditorTab(payload.editorId);
  },

  async 'editor.getText'(_extension, params) {
    const { editorId } = params as { editorId: string };
    const state = useWorkbenchStore.getState();
    const tab = state.editorTabs.find((t) => t.id === editorId);
    return tab?.content ?? '';
  },

  async 'editor.setText'(_extension, params) {
    const payload = params as {
      editorId: string;
      text: string;
    };

    const state = useWorkbenchStore.getState();
    const nextTabs = state.editorTabs.map((tab) => {
      if (tab.id === payload.editorId) {
        return Object.assign({}, tab, {
          content: payload.text,
          dirty: true,
          updatedAt: Date.now(),
        });
      }
      return tab;
    });

    useWorkbenchStore.setState({ editorTabs: nextTabs });
  },

  async 'editor.getSelectedText'(_extension, params) {
    const { editorId } = params as { editorId: string };
    return sqlModelService.getSelectedText(editorId);
  },

  async 'editor.getSelectedTextOrDocumentText'(_extension, params) {
    const { editorId } = params as { editorId: string };
    const selected = sqlModelService.getSelectedText(editorId);

    if (selected.trim()) return selected;

    const state = useWorkbenchStore.getState();
    const tab = state.editorTabs.find((t) => t.id === editorId);
    return tab?.content ?? '';
  },

  async 'editor.replaceSelection'(_extension, params) {
    const payload = params as {
      editorId: string;
      text: string;
    };

    sqlModelService.replaceSelection(payload.editorId, payload.text);
  },

  async 'editor.insertText'(_extension, params) {
    const payload = params as {
      editorId: string;
      text: string;
    };

    sqlModelService.insertText(payload.editorId, payload.text);
  },

  async 'editor.getCursorPosition'(_extension, params) {
    const { editorId } = params as { editorId: string };
    const pos = sqlModelService.getActivePosition(editorId);
    if (!pos) return undefined;

    return {
      lineNumber: pos.lineNumber,
      column: pos.column,
    };
  },

  async 'editor.revealRange'(_extension, params) {
    const payload = params as {
      editorId: string;
      range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
    };

    const editor = sqlModelService.getEditor(payload.editorId);
    if (!editor) return;

    editor.revealRangeInCenter(payload.range);
  },
};
