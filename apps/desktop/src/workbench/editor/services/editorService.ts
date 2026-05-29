import type { SqlEditorTab } from '../types';
import { useEditorStore } from '../store/editorStore';

export interface OpenSqlOptions {
  title?: string;
  content?: string;
  connectionId?: string;
  database?: string;
  schema?: string;
  source?: SqlEditorTab['source'];
}

export const editorService = {
  newQuery(connectionId?: string) {
    const now = Date.now();

    const tab: SqlEditorTab = {
      id: crypto.randomUUID(),
      title: 'Untitled.sql',
      kind: 'query',
      language: 'sql',
      content: '',
      connectionId,
      dirty: false,
      createdAt: now,
      updatedAt: now,
      source: {
        type: 'manual',
      },
    };

    useEditorStore.getState().openEditor(tab);

    return tab.id;
  },

  openSql(options: OpenSqlOptions) {
    const now = Date.now();

    const tab: SqlEditorTab = {
      id: crypto.randomUUID(),
      title: options.title ?? 'Query.sql',
      kind: 'query',
      language: 'sql',
      content: options.content ?? '',
      connectionId: options.connectionId,
      database: options.database,
      schema: options.schema,
      dirty: false,
      createdAt: now,
      updatedAt: now,
      source: options.source ?? {
        type: 'manual',
      },
    };

    useEditorStore.getState().openEditor(tab);

    return tab.id;
  },

  closeEditor(editorId: string) {
    useEditorStore.getState().closeEditor(editorId);
  },

  setActiveEditor(editorId: string) {
    useEditorStore.getState().setActiveEditor(editorId);
  },

  getActiveEditor() {
    return useEditorStore.getState().getActiveEditor();
  },

  getEditorById(editorId: string) {
    return useEditorStore.getState().getEditorById(editorId);
  },

  updateContent(editorId: string, content: string) {
    useEditorStore.getState().updateEditorContent(editorId, content);
  },

  setConnection(editorId: string, connectionId?: string) {
    useEditorStore.getState().setEditorConnection(editorId, connectionId);
  },

  updateEditor(editorId: string, patch: Partial<SqlEditorTab>) {
    useEditorStore.getState().updateEditor(editorId, patch);
  },

  moveTab(sourceId: string, targetId: string) {
    useEditorStore.getState().moveTab(sourceId, targetId);
  },
};
