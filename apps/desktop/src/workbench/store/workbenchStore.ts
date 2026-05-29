import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { workbenchStorage } from '../../services/storage/localStorage';
import type {
  ActivityId,
  BottomPanelId,
  EditorTab,
  LayoutPreset,
  RightPanelId,
  ThemeMode,
} from '../types';

export const DEFAULT_SIDE_BAR_WIDTH = 280;
export const MIN_SIDE_BAR_WIDTH = 220;
export const MAX_SIDE_BAR_WIDTH = 520;

export const DEFAULT_BOTTOM_PANEL_HEIGHT = 240;
export const MIN_BOTTOM_PANEL_HEIGHT = 160;
export const MAX_BOTTOM_PANEL_HEIGHT = 520;

export const DEFAULT_RIGHT_PANEL_WIDTH = 360;
export const MIN_RIGHT_PANEL_WIDTH = 280;
export const MAX_RIGHT_PANEL_WIDTH = 640;

interface WorkbenchStore {
  activeActivity: ActivityId;
  sideBarVisible: boolean;
  bottomPanelVisible: boolean;
  activeBottomPanel: BottomPanelId;

  sideBarWidth: number;
  bottomPanelHeight: number;
  bottomPanelMaximized: boolean;

  rightPanelVisible: boolean;
  activeRightPanel: RightPanelId;
  rightPanelWidth: number;

  layoutPreset: LayoutPreset;

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
  toggleBottomPanelMaximized: () => void;
  resetLayout: () => void;

  setActiveRightPanel: (panel: RightPanelId) => void;
  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;

  applyLayoutPreset: (preset: LayoutPreset) => void;

  openEditorTab: (tab: EditorTab) => void;
  closeEditorTab: (id: string) => void;
  setActiveEditorTab: (id: string) => void;
  moveTab: (sourceId: string, targetId: string) => void;

  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  setTheme: (theme: ThemeMode) => void;
}

const initialWelcomeTab: EditorTab = {
  id: 'welcome',
  title: 'Welcome',
  kind: 'welcome',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const useWorkbenchStore = create<WorkbenchStore>()(
  persist(
    (set) => ({
      activeActivity: 'connections',
      sideBarVisible: true,
      bottomPanelVisible: true,
      activeBottomPanel: 'terminal',

      sideBarWidth: DEFAULT_SIDE_BAR_WIDTH,
      bottomPanelHeight: DEFAULT_BOTTOM_PANEL_HEIGHT,
      bottomPanelMaximized: false,

      rightPanelVisible: false,
      activeRightPanel: 'cell-detail',
      rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,

      layoutPreset: 'default',

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
          bottomPanelMaximized: false,
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
          sideBarWidth: clamp(width, MIN_SIDE_BAR_WIDTH, MAX_SIDE_BAR_WIDTH),
        });
      },

      setBottomPanelHeight: (height) => {
        set({
          bottomPanelHeight: clamp(height, MIN_BOTTOM_PANEL_HEIGHT, MAX_BOTTOM_PANEL_HEIGHT),
          bottomPanelMaximized: false,
        });
      },

      toggleBottomPanelMaximized: () => {
        set((state) => ({
          bottomPanelVisible: true,
          bottomPanelMaximized: !state.bottomPanelMaximized,
        }));
      },

      resetLayout: () => {
        set({
          sideBarVisible: true,
          bottomPanelVisible: true,
          bottomPanelMaximized: false,
          rightPanelVisible: false,
          sideBarWidth: DEFAULT_SIDE_BAR_WIDTH,
          bottomPanelHeight: DEFAULT_BOTTOM_PANEL_HEIGHT,
          layoutPreset: 'default',
        });
      },

      setActiveRightPanel: (panel) => {
        set({
          activeRightPanel: panel,
          rightPanelVisible: true,
        });
      },

      toggleRightPanel: () => {
        set((state) => ({
          rightPanelVisible: !state.rightPanelVisible,
        }));
      },

      setRightPanelWidth: (width) => {
        set({
          rightPanelWidth: clamp(width, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH),
        });
      },

      applyLayoutPreset: (preset) => {
        if (preset === 'default') {
          set({
            sideBarVisible: true,
            bottomPanelVisible: true,
            rightPanelVisible: false,
            sideBarWidth: DEFAULT_SIDE_BAR_WIDTH,
            bottomPanelHeight: DEFAULT_BOTTOM_PANEL_HEIGHT,
            bottomPanelMaximized: false,
            layoutPreset: 'default',
          });
          return;
        }

        if (preset === 'compact') {
          set({
            sideBarVisible: true,
            bottomPanelVisible: true,
            rightPanelVisible: false,
            sideBarWidth: 240,
            bottomPanelHeight: 180,
            bottomPanelMaximized: false,
            layoutPreset: 'compact',
          });
          return;
        }

        if (preset === 'focus') {
          set({
            sideBarVisible: false,
            bottomPanelVisible: false,
            rightPanelVisible: false,
            bottomPanelMaximized: false,
            layoutPreset: 'focus',
          });
          return;
        }

        if (preset === 'analysis') {
          set({
            sideBarVisible: true,
            bottomPanelVisible: true,
            rightPanelVisible: false,
            sideBarWidth: DEFAULT_SIDE_BAR_WIDTH,
            bottomPanelHeight: 420,
            bottomPanelMaximized: false,
            activeBottomPanel: 'results',
            layoutPreset: 'analysis',
          });
          return;
        }

        if (preset === 'agent') {
          set({
            sideBarVisible: true,
            bottomPanelVisible: true,
            rightPanelVisible: true,
            activeRightPanel: 'cell-detail',
            sideBarWidth: DEFAULT_SIDE_BAR_WIDTH,
            rightPanelWidth: 380,
            bottomPanelHeight: DEFAULT_BOTTOM_PANEL_HEIGHT,
            layoutPreset: 'agent',
          });
        }
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

      moveTab: (sourceId, targetId) => {
        set((state) => {
          const from = state.editorTabs.findIndex((tab) => tab.id === sourceId);
          const to = state.editorTabs.findIndex((tab) => tab.id === targetId);

          if (from < 0 || to < 0 || from === to) {
            return state;
          }

          return {
            editorTabs: moveItem(state.editorTabs, from, to),
          };
        });
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
      version: 4,
      storage: createJSONStorage(() => workbenchStorage),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        if (version < 1) {
          return Object.assign({}, persistedState, {
            bottomPanelVisible: true,
            activeBottomPanel: 'terminal',
          });
        }

        if (version < 2) {
          return Object.assign({}, persistedState, {
            bottomPanelMaximized: false,
          });
        }

        if (version < 3) {
          return Object.assign({}, persistedState, {
            rightPanelVisible: false,
            activeRightPanel: 'agent',
            rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
            layoutPreset: 'default',
          });
        }

        if (version < 4) {
          const p = persistedState as Partial<WorkbenchStore>;
          return Object.assign({}, persistedState, {
            activeRightPanel: p.activeRightPanel === 'agent' ? 'cell-detail' : p.activeRightPanel,
          });
        }

        return persistedState;
      },
      partialize: (state) => ({
        activeActivity: state.activeActivity,
        sideBarVisible: state.sideBarVisible,
        bottomPanelVisible: state.bottomPanelVisible,
        activeBottomPanel: state.activeBottomPanel,
        sideBarWidth: state.sideBarWidth,
        bottomPanelHeight: state.bottomPanelHeight,
        bottomPanelMaximized: state.bottomPanelMaximized,
        rightPanelVisible: state.rightPanelVisible,
        activeRightPanel: state.activeRightPanel,
        rightPanelWidth: state.rightPanelWidth,
        layoutPreset: state.layoutPreset,
        theme: state.theme,
      }),
    },
  ),
);
