import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { workbenchStorage } from '../../services/storage/localStorage';
import type { ActivityId, BottomPanelId, EditorTab, ThemeMode } from '../types';

interface WorkbenchStore {
  activeActivity: ActivityId;
  sideBarVisible: boolean;
  bottomPanelVisible: boolean;
  activeBottomPanel: BottomPanelId;

  sideBarWidth: number;
  bottomPanelHeight: number;

  editorTabs: EditorTab[];
  activeEditorTabId: string | null;

  commandPaletteOpen: boolean;
  theme: ThemeMode;

  setActiveActivity: (activity: ActivityId) => void;
  toggleSideBar: () => void;
  toggleBottomPanel: () => void;
  setActiveBottomPanel: (panel: BottomPanelId) => void;

  setSideBarWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;

  openEditorTab: (tab: EditorTab) => void;
  closeEditorTab: (id: string) => void;
  setActiveEditorTab: (id: string) => void;

  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  setTheme: (theme: ThemeMode) => void;
}

const initialWelcomeTab: EditorTab = {
  id: 'welcome',
  title: 'Welcome',
  kind: 'welcome',
};

export const useWorkbenchStore = create<WorkbenchStore>()(
  persist(
    (set) => ({
      activeActivity: 'connections',
      sideBarVisible: true,
      bottomPanelVisible: true,
      activeBottomPanel: 'results',

      sideBarWidth: 280,
      bottomPanelHeight: 240,

      editorTabs: [initialWelcomeTab],
      activeEditorTabId: 'welcome',

      commandPaletteOpen: false,
      theme: 'system',

      setActiveActivity: (activity) => {
        set({
          activeActivity: activity,
          sideBarVisible: true,
        });
      },

      toggleSideBar: () => {
        set((state) => ({
          sideBarVisible: !state.sideBarVisible,
        }));
      },

      toggleBottomPanel: () => {
        set((state) => ({
          bottomPanelVisible: !state.bottomPanelVisible,
        }));
      },

      setActiveBottomPanel: (panel) => {
        set({
          activeBottomPanel: panel,
          bottomPanelVisible: true,
        });
      },

      setSideBarWidth: (width) => {
        set({
          sideBarWidth: Math.max(220, Math.min(width, 520)),
        });
      },

      setBottomPanelHeight: (height) => {
        set({
          bottomPanelHeight: Math.max(160, Math.min(height, 520)),
        });
      },

      openEditorTab: (tab) => {
        set((state) => {
          const exists = state.editorTabs.some((item) => item.id === tab.id);

          if (exists) {
            return {
              editorTabs: state.editorTabs,
              activeEditorTabId: tab.id,
            };
          }

          return {
            editorTabs: state.editorTabs.concat(tab),
            activeEditorTabId: tab.id,
          };
        });
      },

      closeEditorTab: (id) => {
        set((state) => {
          const nextTabs = state.editorTabs.filter((tab) => tab.id !== id);
          const activeStillExists = nextTabs.some((tab) => tab.id === state.activeEditorTabId);

          return {
            editorTabs: nextTabs,
            activeEditorTabId: activeStillExists
              ? state.activeEditorTabId
              : (nextTabs.at(-1)?.id ?? null),
          };
        });
      },

      setActiveEditorTab: (id) => {
        set({ activeEditorTabId: id });
      },

      openCommandPalette: () => {
        set({ commandPaletteOpen: true });
      },

      closeCommandPalette: () => {
        set({ commandPaletteOpen: false });
      },

      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: 'sqlgui.workbench',
      storage: createJSONStorage(() => workbenchStorage),
      partialize: (state) => ({
        activeActivity: state.activeActivity,
        sideBarVisible: state.sideBarVisible,
        bottomPanelVisible: state.bottomPanelVisible,
        activeBottomPanel: state.activeBottomPanel,
        sideBarWidth: state.sideBarWidth,
        bottomPanelHeight: state.bottomPanelHeight,
        theme: state.theme,
      }),
    },
  ),
);
