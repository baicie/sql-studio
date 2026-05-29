下面给你一版 **Phase 1：Workbench 基础布局详细设计**。

这一阶段目标不是做数据库功能，而是先把整个 SQL GUI 的“壳”搭出来，类似 VS Code 的工作台结构：

> **ActivityBar + SideBar + EditorArea + BottomPanel + StatusBar + CommandPalette**

Phase 1 完成后，应用应该已经有一个稳定的桌面工具布局，后续连接树、SQL 编辑器、结果表格、插件市场都只是往这些区域里填内容。

---

# Phase 1 总目标

## 要完成什么

```txt
1. 搭建 VS Code 风格 Workbench 布局
2. 左侧 ActivityBar 可切换不同视图
3. SideBar 根据当前 Activity 展示不同面板
4. EditorArea 支持基础 Tab 容器
5. BottomPanel 支持 Results / Problems / Logs 多面板
6. StatusBar 显示基础状态
7. CommandPalette 可以打开并展示命令列表
8. 布局状态可以持久化
9. 暗色/亮色主题基础打通
10. 为 Phase 2 的 CommandService / MenuService 留接口
```

## 暂时不做什么

```txt
1. 不接真实数据库
2. 不接 Monaco Editor
3. 不做 ResultGrid
4. 不做真实插件加载
5. 不做复杂拖拽布局
6. 不做多窗口
7. 不做命令系统完整实现
8. 不做完整右键菜单系统
```

Phase 1 的核心是：

> **先把区域、状态、布局、基础交互定下来。**

---

# 1. Workbench 结构设计

整体布局建议：

```txt
┌─────────────────────────────────────────────────────────────┐
│ TitleBar / AppHeader，可选                                  │
├──────┬───────────────────┬──────────────────────────────────┤
│      │                   │ Editor Tabs                      │
│ Act  │ SideBar           ├──────────────────────────────────┤
│ Bar  │                   │ Editor Area                      │
│      │                   │                                  │
├──────┴───────────────────┼──────────────────────────────────┤
│                          │ Bottom Panel                     │
├──────────────────────────┴──────────────────────────────────┤
│ StatusBar                                                   │
└─────────────────────────────────────────────────────────────┘
```

React 组件树：

```txt
App
└─ Workbench
   ├─ ActivityBar
   ├─ SideBar
   │  ├─ ConnectionsView
   │  ├─ ExtensionsView
   │  ├─ HistoryView
   │  └─ SettingsView
   ├─ MainArea
   │  ├─ EditorArea
   │  │  ├─ EditorTabs
   │  │  └─ WelcomeEditor
   │  └─ BottomPanel
   │     ├─ PanelTabs
   │     ├─ ResultsPanel
   │     ├─ ProblemsPanel
   │     └─ LogsPanel
   ├─ StatusBar
   └─ CommandPalette
```

---

# 2. 目录结构

建议 Phase 1 后目录变成这样：

```txt
apps/desktop/src/
├─ App.tsx
├─ main.tsx
├─ styles/
│  └─ globals.css
│
├─ workbench/
│  ├─ Workbench.tsx
│  ├─ types.ts
│  │
│  ├─ layout/
│  │  ├─ ActivityBar.tsx
│  │  ├─ SideBar.tsx
│  │  ├─ MainArea.tsx
│  │  ├─ EditorArea.tsx
│  │  ├─ EditorTabs.tsx
│  │  ├─ BottomPanel.tsx
│  │  ├─ PanelTabs.tsx
│  │  └─ StatusBar.tsx
│  │
│  ├─ views/
│  │  ├─ ConnectionsView.tsx
│  │  ├─ ExtensionsView.tsx
│  │  ├─ HistoryView.tsx
│  │  └─ SettingsView.tsx
│  │
│  ├─ command/
│  │  ├─ CommandPalette.tsx
│  │  └─ commandRegistry.ts
│  │
│  ├─ store/
│  │  └─ workbenchStore.ts
│  │
│  └─ constants.ts
│
├─ components/
│  └─ ui/
│
├─ services/
│  ├─ native/
│  │  └─ invoke.ts
│  └─ storage/
│     └─ localStorage.ts
│
└─ lib/
   └─ cn.ts
```

---

# 3. Workbench 状态设计

Phase 1 先用 Zustand 管布局状态。

## 3.1 状态内容

```ts
export type ActivityId = 'connections' | 'extensions' | 'history' | 'settings';

export type BottomPanelId = 'results' | 'problems' | 'logs';

export interface EditorTab {
  id: string;
  title: string;
  kind: 'welcome' | 'query';
  dirty?: boolean;
}

export interface WorkbenchState {
  activeActivity: ActivityId;
  sideBarVisible: boolean;
  bottomPanelVisible: boolean;
  activeBottomPanel: BottomPanelId;

  sideBarWidth: number;
  bottomPanelHeight: number;

  editorTabs: EditorTab[];
  activeEditorTabId: string | null;

  commandPaletteOpen: boolean;
  theme: 'light' | 'dark' | 'system';
}
```

## 3.2 状态文件

`workbench/store/workbenchStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

          return {
            editorTabs: exists ? state.editorTabs : [...state.editorTabs, tab],
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
```

---

# 4. 类型定义

`workbench/types.ts`

```ts
export type ActivityId = 'connections' | 'extensions' | 'history' | 'settings';

export type BottomPanelId = 'results' | 'problems' | 'logs';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface EditorTab {
  id: string;
  title: string;
  kind: 'welcome' | 'query' | 'extension';
  dirty?: boolean;
}

export interface ActivityItem {
  id: ActivityId;
  title: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

export interface BottomPanelItem {
  id: BottomPanelId;
  title: string;
}
```

---

# 5. 常量设计

`workbench/constants.ts`

```ts
import { Blocks, Database, History, Settings } from 'lucide-react';
import type { ActivityItem, BottomPanelItem } from './types';

export const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'connections',
    title: 'Connections',
    icon: Database,
  },
  {
    id: 'extensions',
    title: 'Extensions',
    icon: Blocks,
  },
  {
    id: 'history',
    title: 'History',
    icon: History,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
  },
];

export const BOTTOM_PANEL_ITEMS: BottomPanelItem[] = [
  {
    id: 'results',
    title: 'Results',
  },
  {
    id: 'problems',
    title: 'Problems',
  },
  {
    id: 'logs',
    title: 'Logs',
  },
];
```

---

# 6. Workbench 根组件

`workbench/Workbench.tsx`

```tsx
import { CommandPalette } from './command/CommandPalette';
import { ActivityBar } from './layout/ActivityBar';
import { MainArea } from './layout/MainArea';
import { SideBar } from './layout/SideBar';
import { StatusBar } from './layout/StatusBar';
import { useWorkbenchStore } from './store/workbenchStore';

interface WorkbenchProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function Workbench({ health }: WorkbenchProps) {
  const sideBarVisible = useWorkbenchStore((state) => state.sideBarVisible);
  const sideBarWidth = useWorkbenchStore((state) => state.sideBarWidth);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        <ActivityBar />

        {sideBarVisible ? (
          <div className="min-h-0 shrink-0 border-r bg-sidebar" style={{ width: sideBarWidth }}>
            <SideBar />
          </div>
        ) : null}

        <MainArea />
      </div>

      <StatusBar health={health} />

      <CommandPalette />
    </div>
  );
}
```

---

# 7. ActivityBar 设计

## 功能

```txt
1. 展示左侧主功能入口
2. 点击切换 activeActivity
3. 当前活动高亮
4. 再次点击当前活动可以隐藏 SideBar，可选
5. 底部放 Settings
```

`layout/ActivityBar.tsx`

```tsx
import { ACTIVITY_ITEMS } from '../constants';
import { useWorkbenchStore } from '../store/workbenchStore';
import type { ActivityId } from '../types';
import { cn } from '@/lib/cn';

export function ActivityBar() {
  const activeActivity = useWorkbenchStore((state) => state.activeActivity);
  const setActiveActivity = useWorkbenchStore((state) => state.setActiveActivity);
  const toggleSideBar = useWorkbenchStore((state) => state.toggleSideBar);

  function handleClick(id: ActivityId) {
    if (id === activeActivity) {
      toggleSideBar();
      return;
    }

    setActiveActivity(id);
  }

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center border-r bg-muted/40 py-2">
      <div className="flex flex-1 flex-col items-center gap-1">
        {ACTIVITY_ITEMS.filter((item) => item.id !== 'settings').map((item) => {
          const Icon = item.icon;
          const active = item.id === activeActivity;

          return (
            <button
              key={item.id}
              type="button"
              title={item.title}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                active && 'bg-accent text-accent-foreground',
              )}
              onClick={() => handleClick(item.id)}
            >
              {active ? <span className="absolute left-0 h-5 w-0.5 rounded-r bg-primary" /> : null}

              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>

      {ACTIVITY_ITEMS.filter((item) => item.id === 'settings').map((item) => {
        const Icon = item.icon;
        const active = item.id === activeActivity;

        return (
          <button
            key={item.id}
            type="button"
            title={item.title}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              active && 'bg-accent text-accent-foreground',
            )}
            onClick={() => handleClick(item.id)}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </aside>
  );
}
```

---

# 8. SideBar 设计

## 功能

```txt
1. 根据 activeActivity 渲染不同视图
2. 每个视图有自己的标题
3. 后续可加工具按钮
4. Phase 1 用占位内容
```

`layout/SideBar.tsx`

```tsx
import { ConnectionsView } from '../views/ConnectionsView';
import { ExtensionsView } from '../views/ExtensionsView';
import { HistoryView } from '../views/HistoryView';
import { SettingsView } from '../views/SettingsView';
import { useWorkbenchStore } from '../store/workbenchStore';

export function SideBar() {
  const activeActivity = useWorkbenchStore((state) => state.activeActivity);

  if (activeActivity === 'connections') {
    return <ConnectionsView />;
  }

  if (activeActivity === 'extensions') {
    return <ExtensionsView />;
  }

  if (activeActivity === 'history') {
    return <HistoryView />;
  }

  if (activeActivity === 'settings') {
    return <SettingsView />;
  }

  return null;
}
```

---

## `ConnectionsView.tsx`

```tsx
import { Plus } from 'lucide-react';

export function ConnectionsView() {
  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Connections
        </span>

        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="New connection"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No connections yet.
      </div>
    </section>
  );
}
```

---

## `ExtensionsView.tsx`

```tsx
export function ExtensionsView() {
  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Extensions
        </span>
      </header>

      <div className="space-y-2 p-3">
        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">Marketplace</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Extension marketplace will be here.
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="text-sm font-medium">Installed</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Installed extensions will be here.
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## `HistoryView.tsx`

```tsx
export function HistoryView() {
  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Query history will be here.
      </div>
    </section>
  );
}
```

---

## `SettingsView.tsx`

```tsx
import { useWorkbenchStore } from '../store/workbenchStore';

export function SettingsView() {
  const theme = useWorkbenchStore((state) => state.theme);
  const setTheme = useWorkbenchStore((state) => state.setTheme);

  return (
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </span>
      </header>

      <div className="space-y-3 p-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-muted-foreground">Theme</span>

          <select
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            value={theme}
            onChange={(event) => {
              setTheme(event.target.value as 'light' | 'dark' | 'system');
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </section>
  );
}
```

---

# 9. MainArea 设计

`layout/MainArea.tsx`

```tsx
import { BottomPanel } from './BottomPanel';
import { EditorArea } from './EditorArea';
import { useWorkbenchStore } from '../store/workbenchStore';

export function MainArea() {
  const bottomPanelVisible = useWorkbenchStore((state) => state.bottomPanelVisible);
  const bottomPanelHeight = useWorkbenchStore((state) => state.bottomPanelHeight);

  return (
    <main className="grid min-w-0 flex-1 grid-rows-[1fr_auto]">
      <EditorArea />

      {bottomPanelVisible ? (
        <div className="min-h-0 border-t" style={{ height: bottomPanelHeight }}>
          <BottomPanel />
        </div>
      ) : null}
    </main>
  );
}
```

---

# 10. EditorArea 设计

## 功能

```txt
1. 展示 editor tabs
2. 展示 active editor 内容
3. Phase 1 默认只有 Welcome
4. 后续 Phase 5 接 Monaco
```

`layout/EditorArea.tsx`

```tsx
import { EditorTabs } from './EditorTabs';
import { useWorkbenchStore } from '../store/workbenchStore';

export function EditorArea() {
  const editorTabs = useWorkbenchStore((state) => state.editorTabs);
  const activeEditorTabId = useWorkbenchStore((state) => state.activeEditorTabId);

  const activeTab = editorTabs.find((tab) => tab.id === activeEditorTabId);

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <EditorTabs />

      <div className="min-h-0 flex-1">
        {activeTab?.kind === 'welcome' ? <WelcomeEditor /> : null}

        {activeTab?.kind === 'query' ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Query editor placeholder.
          </div>
        ) : null}

        {!activeTab ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No editor opened.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function WelcomeEditor() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">SQL GUI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lightweight and extensible database workbench.
        </p>

        <div className="mt-6 grid gap-2 text-left text-sm">
          <button className="rounded-md border px-3 py-2 text-left hover:bg-accent">
            New Connection
          </button>
          <button className="rounded-md border px-3 py-2 text-left hover:bg-accent">
            New Query
          </button>
          <button className="rounded-md border px-3 py-2 text-left hover:bg-accent">
            Open Extensions
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## `EditorTabs.tsx`

```tsx
import { X } from 'lucide-react';
import { useWorkbenchStore } from '../store/workbenchStore';
import { cn } from '@/lib/cn';

export function EditorTabs() {
  const editorTabs = useWorkbenchStore((state) => state.editorTabs);
  const activeEditorTabId = useWorkbenchStore((state) => state.activeEditorTabId);
  const setActiveEditorTab = useWorkbenchStore((state) => state.setActiveEditorTab);
  const closeEditorTab = useWorkbenchStore((state) => state.closeEditorTab);

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-muted/20">
      {editorTabs.map((tab) => {
        const active = tab.id === activeEditorTabId;

        return (
          <div
            key={tab.id}
            className={cn(
              'group flex h-full min-w-32 max-w-52 items-center gap-2 border-r px-3 text-sm',
              active ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-muted/40',
            )}
            onClick={() => setActiveEditorTab(tab.id)}
          >
            <span className="truncate">
              {tab.title}
              {tab.dirty ? ' •' : ''}
            </span>

            <button
              type="button"
              className="ml-auto rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                closeEditorTab(tab.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

---

# 11. BottomPanel 设计

## 功能

```txt
1. Results / Problems / Logs 三个面板
2. 可以切换 activeBottomPanel
3. Phase 1 仅占位
4. 后续 Results 接查询结果
5. Logs 接插件日志 / SQL 日志
```

`layout/BottomPanel.tsx`

```tsx
import { PanelTabs } from './PanelTabs';
import { useWorkbenchStore } from '../store/workbenchStore';

export function BottomPanel() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <PanelTabs />

      <div className="min-h-0 flex-1 overflow-auto">
        {activeBottomPanel === 'results' ? <ResultsPanel /> : null}
        {activeBottomPanel === 'problems' ? <ProblemsPanel /> : null}
        {activeBottomPanel === 'logs' ? <LogsPanel /> : null}
      </div>
    </section>
  );
}

function ResultsPanel() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Query results will be here.
    </div>
  );
}

function ProblemsPanel() {
  return <div className="p-3 text-sm text-muted-foreground">No problems.</div>;
}

function LogsPanel() {
  return (
    <div className="p-3 font-mono text-xs text-muted-foreground">
      [system] Workbench initialized.
    </div>
  );
}
```

---

## `PanelTabs.tsx`

```tsx
import { X } from 'lucide-react';
import { BOTTOM_PANEL_ITEMS } from '../constants';
import { useWorkbenchStore } from '../store/workbenchStore';
import { cn } from '@/lib/cn';

export function PanelTabs() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const setActiveBottomPanel = useWorkbenchStore((state) => state.setActiveBottomPanel);
  const toggleBottomPanel = useWorkbenchStore((state) => state.toggleBottomPanel);

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-muted/20">
      <div className="flex h-full">
        {BOTTOM_PANEL_ITEMS.map((item) => {
          const active = item.id === activeBottomPanel;

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-full px-3 text-xs font-medium uppercase tracking-wide',
                active
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveBottomPanel(item.id)}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        className="mr-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={toggleBottomPanel}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

---

# 12. StatusBar 设计

## 功能

```txt
1. 显示当前连接状态
2. 显示当前数据库类型
3. 显示 Rust Core 状态
4. 显示插件宿主状态
5. 显示当前语言
```

Phase 1 先展示假数据。

`layout/StatusBar.tsx`

```tsx
interface StatusBarProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function StatusBar({ health }: StatusBarProps) {
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t bg-primary px-3 text-xs text-primary-foreground">
      <div className="flex items-center gap-4">
        <span>SQL GUI</span>
        <span>No Connection</span>
        <span>Dialect: SQL</span>
      </div>

      <div className="flex items-center gap-4">
        <span>Plugins: Idle</span>
        <span>Rust Core: {health?.rustCoreReady ? 'Ready' : 'Checking'}</span>
      </div>
    </footer>
  );
}
```

---

# 13. CommandPalette 设计

Phase 1 先做一个轻量版命令面板，Phase 2 再接完整 `CommandService`。

## 功能

```txt
1. Cmd/Ctrl + Shift + P 打开
2. Esc 关闭
3. 输入关键字过滤命令
4. 点击命令执行 handler
```

`command/commandRegistry.ts`

```ts
export interface CommandItem {
  id: string;
  title: string;
  category?: string;
  run: () => void | Promise<void>;
}

const commands: CommandItem[] = [];

export function registerCommand(command: CommandItem) {
  commands.push(command);

  return {
    dispose() {
      const index = commands.findIndex((item) => item.id === command.id);
      if (index >= 0) {
        commands.splice(index, 1);
      }
    },
  };
}

export function getCommands() {
  return [...commands];
}
```

---

## `CommandPalette.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react';
import { getCommands } from './commandRegistry';
import { useWorkbenchStore } from '../store/workbenchStore';

export function CommandPalette() {
  const open = useWorkbenchStore((state) => state.commandPaletteOpen);
  const openCommandPalette = useWorkbenchStore((state) => state.openCommandPalette);
  const closeCommandPalette = useWorkbenchStore((state) => state.closeCommandPalette);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommand = event.metaKey || event.ctrlKey;

      if (isCommand && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        openCommandPalette();
      }

      if (event.key === 'Escape') {
        closeCommandPalette();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCommandPalette, closeCommandPalette]);

  const commands = useMemo(() => {
    const lowerKeyword = keyword.toLowerCase();

    return getCommands().filter((command) => {
      return (
        command.title.toLowerCase().includes(lowerKeyword) ||
        command.id.toLowerCase().includes(lowerKeyword) ||
        command.category?.toLowerCase().includes(lowerKeyword)
      );
    });
  }, [keyword, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-background/40 pt-24 backdrop-blur-sm">
      <div className="h-fit w-[640px] overflow-hidden rounded-lg border bg-popover shadow-xl">
        <input
          autoFocus
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Type a command..."
          className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none"
        />

        <div className="max-h-80 overflow-auto p-1">
          {commands.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            commands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={async () => {
                  await command.run();
                  closeCommandPalette();
                  setKeyword('');
                }}
              >
                <span>{command.title}</span>
                <span className="text-xs text-muted-foreground">{command.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

# 14. 注册 Phase 1 核心命令

`workbench/command/registerWorkbenchCommands.ts`

```ts
import { registerCommand } from './commandRegistry';
import { useWorkbenchStore } from '../store/workbenchStore';

export function registerWorkbenchCommands() {
  registerCommand({
    id: 'workbench.toggleSideBar',
    title: 'Toggle Side Bar',
    category: 'Workbench',
    run: () => {
      useWorkbenchStore.getState().toggleSideBar();
    },
  });

  registerCommand({
    id: 'workbench.toggleBottomPanel',
    title: 'Toggle Bottom Panel',
    category: 'Workbench',
    run: () => {
      useWorkbenchStore.getState().toggleBottomPanel();
    },
  });

  registerCommand({
    id: 'workbench.showConnections',
    title: 'Show Connections',
    category: 'Workbench',
    run: () => {
      useWorkbenchStore.getState().setActiveActivity('connections');
    },
  });

  registerCommand({
    id: 'workbench.showExtensions',
    title: 'Show Extensions',
    category: 'Workbench',
    run: () => {
      useWorkbenchStore.getState().setActiveActivity('extensions');
    },
  });

  registerCommand({
    id: 'editor.newQuery',
    title: 'New Query',
    category: 'SQL',
    run: () => {
      const id = `query-${Date.now()}`;

      useWorkbenchStore.getState().openEditorTab({
        id,
        title: 'Untitled Query',
        kind: 'query',
        dirty: false,
      });
    },
  });
}
```

在 `App.tsx` 里调用一次：

```tsx
import { useEffect, useState } from 'react';
import { callNative } from './services/native/invoke';
import { Workbench } from './workbench/Workbench';
import { registerWorkbenchCommands } from './workbench/command/registerWorkbenchCommands';

interface HealthCheckResponse {
  appName: string;
  rustCoreReady: boolean;
}

let registered = false;

export default function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    if (!registered) {
      registerWorkbenchCommands();
      registered = true;
    }

    callNative<HealthCheckResponse>('system_health_check').then(setHealth).catch(console.error);
  }, []);

  return <Workbench health={health} />;
}
```

---

# 15. 主题系统

## 15.1 `lib/cn.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 15.2 CSS 变量

`styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;

  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;

  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;

  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;

  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;

  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;

  --sidebar: 240 4.8% 96%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;

  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;

  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;

  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;

  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;

  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;

  --sidebar: 240 5% 8%;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  overflow: hidden;
}
```

---

## 15.3 Tailwind 配置

`apps/desktop/tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        sidebar: 'hsl(var(--sidebar))',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 15.4 主题应用器

`workbench/theme/useApplyTheme.ts`

```ts
import { useEffect } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';

export function useApplyTheme() {
  const theme = useWorkbenchStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    function applyDark(isDark: boolean) {
      root.classList.toggle('dark', isDark);
    }

    if (theme === 'light') {
      applyDark(false);
      return;
    }

    if (theme === 'dark') {
      applyDark(true);
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    applyDark(media.matches);

    function handleChange(event: MediaQueryListEvent) {
      applyDark(event.matches);
    }

    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [theme]);
}
```

在 `Workbench.tsx` 调用：

```tsx
import { useApplyTheme } from './theme/useApplyTheme';

export function Workbench({ health }: WorkbenchProps) {
  useApplyTheme();

  // ...
}
```

---

# 16. 可调整布局：Phase 1 简化方案

Phase 1 不需要完整拖拽布局，但建议先实现“状态可存储”。

## 16.1 先做固定值

```txt
sideBarWidth = 280
bottomPanelHeight = 240
```

## 16.2 后续 Phase 1.5 再做拖拽

如果你想现在加，可以引入：

```bash
pnpm --filter @sqlgui/desktop add react-resizable-panels
```

但我建议 Phase 1 先别加复杂度。

---

# 17. 快捷键设计

Phase 1 可以先直接在 `CommandPalette` 里监听快捷键。

第一批快捷键：

```txt
Cmd/Ctrl + Shift + P    打开命令面板
Cmd/Ctrl + B            显示/隐藏 SideBar
Cmd/Ctrl + J            显示/隐藏 BottomPanel
Cmd/Ctrl + N            新建 Query Tab
```

可以新增：

`workbench/keyboard/useWorkbenchShortcuts.ts`

```ts
import { useEffect } from 'react';
import { useWorkbenchStore } from '../store/workbenchStore';

export function useWorkbenchShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommand = event.metaKey || event.ctrlKey;

      if (!isCommand) return;

      if (event.key.toLowerCase() === 'b') {
        event.preventDefault();
        useWorkbenchStore.getState().toggleSideBar();
      }

      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        useWorkbenchStore.getState().toggleBottomPanel();
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();

        useWorkbenchStore.getState().openEditorTab({
          id: `query-${Date.now()}`,
          title: 'Untitled Query',
          kind: 'query',
        });
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
```

在 `Workbench.tsx` 调用：

```tsx
import { useWorkbenchShortcuts } from './keyboard/useWorkbenchShortcuts';

export function Workbench({ health }: WorkbenchProps) {
  useApplyTheme();
  useWorkbenchShortcuts();

  // ...
}
```

---

# 18. Phase 1 的 shadcn 组件选择

这一阶段只需要少量组件：

```txt
button
input
command
dialog
separator
scroll-area
tabs
dropdown-menu
tooltip
```

建议安装：

```bash
pnpm dlx shadcn@latest add button input command dialog separator scroll-area tabs dropdown-menu tooltip
```

但命令面板如果你想先减少依赖，可以像上面一样自己写。

我的建议：

> Phase 1 自己写轻量 CommandPalette，Phase 2 再换成 shadcn `command` 组件。

这样先降低接入复杂度。

---

# 19. 验收标准

Phase 1 完成时，你应该能做到：

```txt
[ ] Tauri 桌面窗口打开
[ ] 左侧 ActivityBar 正常显示
[ ] 点击 Connections / Extensions / History / Settings 能切换 SideBar
[ ] 点击当前 Activity 可以隐藏 SideBar
[ ] EditorArea 有 Welcome Tab
[ ] Cmd/Ctrl + N 可以新建 Query Tab
[ ] EditorTabs 可以切换和关闭
[ ] BottomPanel 显示 Results / Problems / Logs
[ ] BottomPanel 可以关闭
[ ] Cmd/Ctrl + Shift + P 可以打开 CommandPalette
[ ] CommandPalette 可以执行 Toggle SideBar / New Query 等命令
[ ] StatusBar 显示 Rust Core 状态
[ ] Theme 可以在 Settings 里切换
[ ] 刷新后布局状态仍然保留
```

---

# 20. Phase 1 Todo 清单

```txt
目录结构
[ ] 创建 workbench 目录
[ ] 创建 layout 目录
[ ] 创建 views 目录
[ ] 创建 command 目录
[ ] 创建 store 目录
[ ] 创建 theme 目录
[ ] 创建 keyboard 目录

状态
[ ] 定义 ActivityId
[ ] 定义 BottomPanelId
[ ] 定义 EditorTab
[ ] 实现 useWorkbenchStore
[ ] Zustand persist 保存布局状态

布局
[ ] 实现 Workbench
[ ] 实现 ActivityBar
[ ] 实现 SideBar
[ ] 实现 MainArea
[ ] 实现 EditorArea
[ ] 实现 EditorTabs
[ ] 实现 BottomPanel
[ ] 实现 PanelTabs
[ ] 实现 StatusBar

视图
[ ] 实现 ConnectionsView
[ ] 实现 ExtensionsView
[ ] 实现 HistoryView
[ ] 实现 SettingsView

命令面板
[ ] 实现 commandRegistry
[ ] 实现 CommandPalette
[ ] 注册 workbench.toggleSideBar
[ ] 注册 workbench.toggleBottomPanel
[ ] 注册 workbench.showConnections
[ ] 注册 workbench.showExtensions
[ ] 注册 editor.newQuery

快捷键
[ ] Cmd/Ctrl + Shift + P 打开命令面板
[ ] Cmd/Ctrl + B 切换 SideBar
[ ] Cmd/Ctrl + J 切换 BottomPanel
[ ] Cmd/Ctrl + N 新建 Query Tab
[ ] Esc 关闭命令面板

主题
[ ] 添加 globals.css CSS 变量
[ ] 配置 tailwind.config.ts
[ ] 实现 cn 工具函数
[ ] 实现 useApplyTheme
[ ] SettingsView 支持 theme 切换

验证
[ ] pnpm --filter @sqlgui/desktop check
[ ] pnpm --filter @sqlgui/desktop tauri:dev
[ ] 页面无报错
[ ] 快捷键正常
[ ] 状态持久化正常
```

---

# 21. 推荐实现顺序

最稳的顺序：

```txt
1. 先实现 types.ts / constants.ts
2. 实现 useWorkbenchStore
3. 实现 Workbench + ActivityBar + SideBar
4. 实现 views 占位
5. 实现 MainArea + EditorArea + EditorTabs
6. 实现 BottomPanel + PanelTabs
7. 实现 StatusBar
8. 实现 commandRegistry
9. 实现 CommandPalette
10. 注册基础命令
11. 实现快捷键
12. 实现主题切换
13. 验收状态持久化
```

---

# 22. Phase 1 最终效果

完成后你会得到一个可用的 SQL GUI 桌面壳：

```txt
左侧：
- Connections
- Extensions
- History
- Settings

中间：
- Welcome Tab
- Query Tab 占位

底部：
- Results
- Problems
- Logs

底栏：
- SQL GUI
- No Connection
- Dialect: SQL
- Plugins: Idle
- Rust Core: Ready

命令面板：
- Toggle Side Bar
- Toggle Bottom Panel
- Show Connections
- Show Extensions
- New Query
```

这一步完成后，Phase 2 就可以正式做：

> **CommandService / MenuService / KeybindingService / NotificationService / StorageService / EditorService**

也就是把现在 Phase 1 的“临时 commandRegistry”升级成真正的服务层。
