import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SqlEditorTab } from '../types';

const STORAGE_KEY = 'sqlgui.editor.tabs';

export interface EditorSnapshot {
  tabs: SqlEditorTab[];
  activeEditorId?: string;
}

export const editorStorage = {
  load(): EditorSnapshot {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { tabs: [] };
    }

    try {
      return JSON.parse(raw) as EditorSnapshot;
    } catch {
      return { tabs: [] };
    }
  },

  save(snapshot: EditorSnapshot) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  },
};

function mapTab(
  tabs: SqlEditorTab[],
  editorId: string,
  mapper: (tab: SqlEditorTab) => SqlEditorTab,
): SqlEditorTab[] {
  return tabs.map((tab) => (tab.id === editorId ? mapper(tab) : tab));
}

interface EditorStore {
  tabs: SqlEditorTab[];
  activeEditorId?: string;

  openEditor: (tab: SqlEditorTab) => void;
  closeEditor: (editorId: string) => void;
  setActiveEditor: (editorId?: string) => void;

  updateEditorContent: (editorId: string, content: string) => void;
  updateEditor: (editorId: string, patch: Partial<SqlEditorTab>) => void;

  setEditorConnection: (editorId: string, connectionId?: string) => void;

  getActiveEditor: () => SqlEditorTab | undefined;
  getEditorById: (editorId: string) => SqlEditorTab | undefined;

  moveTab: (sourceId: string, targetId: string) => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeEditorId: undefined,

      openEditor: (tab) =>
        set((state) => {
          const exists = state.tabs.some((item) => item.id === tab.id);

          return {
            tabs: exists ? mapTab(state.tabs, tab.id, () => tab) : state.tabs.concat([tab]),
            activeEditorId: tab.id,
          };
        }),

      closeEditor: (editorId) =>
        set((state) => {
          const nextTabs = state.tabs.filter((item) => item.id !== editorId);

          let nextActive = state.activeEditorId;

          if (state.activeEditorId === editorId) {
            nextActive = nextTabs.at(-1)?.id;
          }

          return {
            tabs: nextTabs,
            activeEditorId: nextActive,
          };
        }),

      setActiveEditor: (editorId) =>
        set({
          activeEditorId: editorId,
        }),

      updateEditorContent: (editorId, content) =>
        set((state) => ({
          tabs: mapTab(state.tabs, editorId, (tab) =>
            Object.assign({}, tab, {
              content,
              dirty: true,
              updatedAt: Date.now(),
            }),
          ),
        })),

      updateEditor: (editorId, patch) =>
        set((state) => ({
          tabs: mapTab(state.tabs, editorId, (tab) =>
            Object.assign({}, tab, patch, { updatedAt: Date.now() }),
          ),
        })),

      setEditorConnection: (editorId, connectionId) =>
        set((state) => ({
          tabs: mapTab(state.tabs, editorId, (tab) =>
            Object.assign({}, tab, {
              connectionId,
              dirty: true,
              updatedAt: Date.now(),
            }),
          ),
        })),

      getActiveEditor: () => {
        const state = get();
        return state.tabs.find((tab) => tab.id === state.activeEditorId);
      },

      getEditorById: (editorId) => {
        return get().tabs.find((tab) => tab.id === editorId);
      },

      moveTab: (sourceId, targetId) => {
        set((state) => {
          const from = state.tabs.findIndex((tab) => tab.id === sourceId);
          const to = state.tabs.findIndex((tab) => tab.id === targetId);

          if (from < 0 || to < 0 || from === to) {
            return state;
          }

          const next = state.tabs.slice();
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);

          return { tabs: next };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs.map((tab) => {
          const result: SqlEditorTab = Object.assign({}, tab);
          result.dirty = false;
          return result;
        }),
        activeEditorId: state.activeEditorId,
      }),
    },
  ),
);
