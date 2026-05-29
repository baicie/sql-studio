我建议按 **P0 = 必须先合并的布局能力**、**P1 = UI 组件化和视觉收敛**、**P2 = IDE 化增强能力** 三层做。当前分支已经有 `@sqlgui/ui`，桌面端也已经依赖它；Workbench 里已经有 `sideBarWidth`、`bottomPanelHeight` 这些状态，只是还没有真正接入拖拽 resize。

---

# P0：布局拖拽能力，必须先做

## P0-1：新增 `ResizablePanel`

### 目标

做一个通用 resize 面板组件，放到 `@sqlgui/ui`，不要写死在 `apps/desktop`。原因是后续 SideBar、BottomPanel、RightPanel、插件调试面板、SQL Agent 面板都会复用。

### 新增文件

```txt
packages/ui/src/components/workbench/resizable-panel.tsx
```

### 设计

```ts
direction = 'horizontal' | 'vertical'

horizontal:
  - 用于左右拖动
  - 控制 width

vertical:
  - 用于上下拖动
  - 控制 height

handlePosition:
  - right: 左侧面板右边缘拖动
  - left: 右侧面板左边缘拖动
  - top: 底部面板上边缘拖动
  - bottom: 顶部面板下边缘拖动
```

### 代码草案

```tsx
import * as React from 'react';

import { cn } from '../../lib/utils';

export type ResizeDirection = 'horizontal' | 'vertical';
export type ResizeHandlePosition = 'left' | 'right' | 'top' | 'bottom';

export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  min?: number;
  max?: number;
  defaultValue?: number;
  direction: ResizeDirection;
  handlePosition: ResizeHandlePosition;
  disabled?: boolean;
  onResize: (value: number) => void;
  onResizeEnd?: (value: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getDelta(
  direction: ResizeDirection,
  handlePosition: ResizeHandlePosition,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
) {
  const rawDelta = direction === 'horizontal' ? currentX - startX : currentY - startY;
  const reversed = handlePosition === 'left' || handlePosition === 'top';

  return reversed ? -rawDelta : rawDelta;
}

export function ResizablePanel({
  value,
  min = 160,
  max = 640,
  defaultValue,
  direction,
  handlePosition,
  disabled,
  onResize,
  onResizeEnd,
  className,
  style,
  children,
  ...props
}: ResizablePanelProps) {
  const valueRef = React.useRef(value);

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const panelStyle: React.CSSProperties =
    direction === 'horizontal'
      ? {
          width: value,
          minWidth: min,
          maxWidth: max,
          ...style,
        }
      : {
          height: value,
          minHeight: min,
          maxHeight: max,
          ...style,
        };

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startValue = valueRef.current;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    function handlePointerMove(moveEvent: PointerEvent) {
      const delta = getDelta(
        direction,
        handlePosition,
        startX,
        startY,
        moveEvent.clientX,
        moveEvent.clientY,
      );

      const nextValue = clamp(startValue + delta, min, max);

      valueRef.current = nextValue;
      onResize(nextValue);
    }

    function handlePointerUp() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      onResizeEnd?.(valueRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handleDoubleClick() {
    if (defaultValue == null) return;

    const nextValue = clamp(defaultValue, min, max);

    valueRef.current = nextValue;
    onResize(nextValue);
    onResizeEnd?.(nextValue);
  }

  return (
    <div
      className={cn('relative min-h-0 min-w-0 shrink-0', className)}
      style={panelStyle}
      {...props}
    >
      {children}

      {!disabled ? (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
          className={cn(
            'absolute z-30 bg-transparent transition-colors hover:bg-primary/40 active:bg-primary/60',
            handlePosition === 'right' && 'right-[-2px] top-0 h-full w-1 cursor-col-resize',
            handlePosition === 'left' && 'left-[-2px] top-0 h-full w-1 cursor-col-resize',
            handlePosition === 'top' && 'left-0 top-[-2px] h-1 w-full cursor-row-resize',
            handlePosition === 'bottom' && 'bottom-[-2px] left-0 h-1 w-full cursor-row-resize',
          )}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
        />
      ) : null}
    </div>
  );
}
```

### 导出

修改：

```txt
packages/ui/src/index.tsx
```

```ts
export {
  ResizablePanel,
  type ResizablePanelProps,
  type ResizeDirection,
  type ResizeHandlePosition,
} from './components/workbench/resizable-panel';
```

---

## P0-2：增强 `workbenchStore`

当前 store 已经有 `sideBarWidth`、`bottomPanelHeight`，并且有 `setSideBarWidth` 和 `setBottomPanelHeight`，这是拖拽面板最重要的基础。

### 目标

增加：

```ts
resetLayout();
setSideBarWidth();
setBottomPanelHeight();
setBottomPanelMaximized();
```

### 修改文件

```txt
apps/desktop/src/workbench/store/workbenchStore.ts
```

### 代码草案

```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { workbenchStorage } from '../../services/storage/localStorage';
import type { ActivityId, BottomPanelId, EditorTab, ThemeMode } from '../types';

export const DEFAULT_SIDE_BAR_WIDTH = 280;
export const MIN_SIDE_BAR_WIDTH = 220;
export const MAX_SIDE_BAR_WIDTH = 520;

export const DEFAULT_BOTTOM_PANEL_HEIGHT = 240;
export const MIN_BOTTOM_PANEL_HEIGHT = 160;
export const MAX_BOTTOM_PANEL_HEIGHT = 640;

interface WorkbenchStore {
  activeActivity: ActivityId;
  sideBarVisible: boolean;
  bottomPanelVisible: boolean;
  activeBottomPanel: BottomPanelId;

  sideBarWidth: number;
  bottomPanelHeight: number;
  bottomPanelMaximized: boolean;

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
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
          sideBarWidth: DEFAULT_SIDE_BAR_WIDTH,
          bottomPanelHeight: DEFAULT_BOTTOM_PANEL_HEIGHT,
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
      version: 2,
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
        theme: state.theme,
      }),
    },
  ),
);
```

---

## P0-3：接入 SideBar 横向拖拽

### 修改文件

```txt
apps/desktop/src/workbench/Workbench.tsx
```

当前 `Workbench` 已经读取 `sideBarVisible` 和 `sideBarWidth`，并用 `style={{ width: sideBarWidth }}` 固定侧栏宽度。

### 代码草案

```tsx
import { ResizablePanel } from '@sqlgui/ui';

import { useKeybindingListener } from '@/services/keybinding/use-keybinding-listener';
import { ConnectionDialog } from './connections/ConnectionDialog';
import { CommandPalette } from './command/CommandPalette';
import { ActivityBar } from './layout/ActivityBar';
import { MainArea } from './layout/MainArea';
import { SideBar } from './layout/SideBar';
import { StatusBar } from './layout/StatusBar';
import { NotificationCenter } from './notification/NotificationCenter';
import {
  DEFAULT_SIDE_BAR_WIDTH,
  MAX_SIDE_BAR_WIDTH,
  MIN_SIDE_BAR_WIDTH,
  useWorkbenchStore,
} from './store/workbenchStore';
import { useApplyTheme } from './theme/useApplyTheme';

interface WorkbenchProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function Workbench({ health }: WorkbenchProps) {
  useApplyTheme();
  useKeybindingListener();

  const sideBarVisible = useWorkbenchStore((state) => state.sideBarVisible);
  const sideBarWidth = useWorkbenchStore((state) => state.sideBarWidth);
  const setSideBarWidth = useWorkbenchStore((state) => state.setSideBarWidth);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 flex-1">
        <ActivityBar />

        {sideBarVisible ? (
          <ResizablePanel
            value={sideBarWidth}
            min={MIN_SIDE_BAR_WIDTH}
            max={MAX_SIDE_BAR_WIDTH}
            defaultValue={DEFAULT_SIDE_BAR_WIDTH}
            direction="horizontal"
            handlePosition="right"
            onResize={setSideBarWidth}
            className="border-r bg-sidebar"
          >
            <SideBar />
          </ResizablePanel>
        ) : null}

        <MainArea />
      </div>

      <StatusBar health={health} />

      <CommandPalette />
      <ConnectionDialog />
      <NotificationCenter />
    </div>
  );
}
```

---

## P0-4：接入 BottomPanel 纵向拖拽

### 修改文件

```txt
apps/desktop/src/workbench/layout/MainArea.tsx
```

当前底部面板也是直接 `style={{ height: bottomPanelHeight }}`。

### 代码草案

```tsx
import { ResizablePanel } from '@sqlgui/ui';

import { BottomPanel } from './BottomPanel';
import { EditorArea } from './EditorArea';
import {
  DEFAULT_BOTTOM_PANEL_HEIGHT,
  MAX_BOTTOM_PANEL_HEIGHT,
  MIN_BOTTOM_PANEL_HEIGHT,
  useWorkbenchStore,
} from '../store/workbenchStore';

export function MainArea() {
  const bottomPanelVisible = useWorkbenchStore((state) => state.bottomPanelVisible);
  const bottomPanelHeight = useWorkbenchStore((state) => state.bottomPanelHeight);
  const bottomPanelMaximized = useWorkbenchStore((state) => state.bottomPanelMaximized);
  const setBottomPanelHeight = useWorkbenchStore((state) => state.setBottomPanelHeight);

  const height = bottomPanelMaximized ? '70vh' : bottomPanelHeight;

  return (
    <main className="grid min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto]">
      <EditorArea />

      {bottomPanelVisible ? (
        <ResizablePanel
          value={typeof height === 'number' ? height : Math.round(window.innerHeight * 0.7)}
          min={MIN_BOTTOM_PANEL_HEIGHT}
          max={MAX_BOTTOM_PANEL_HEIGHT}
          defaultValue={DEFAULT_BOTTOM_PANEL_HEIGHT}
          direction="vertical"
          handlePosition="top"
          onResize={setBottomPanelHeight}
          className="border-t bg-background"
        >
          <BottomPanel />
        </ResizablePanel>
      ) : null}
    </main>
  );
}
```

更严谨的版本可以加一个 hook，避免 render 中直接读 `window.innerHeight`：

```txt
apps/desktop/src/hooks/use-window-size.ts
```

```ts
import * as React from 'react';

export function useWindowSize() {
  const [size, setSize] = React.useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  React.useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
```

然后：

```tsx
const { height: windowHeight } = useWindowSize();

const panelHeight = bottomPanelMaximized ? Math.round(windowHeight * 0.7) : bottomPanelHeight;
```

---

## P0-5：新增 reset layout 命令

当前项目已经有 `registerCoreCommands`，里面已经注册了 `workbench.toggleSideBar`、`workbench.toggleBottomPanel`、`workbench.showConnections` 等 Workbench 命令。

### 修改 `workbench-service.ts`

```txt
apps/desktop/src/services/workbench/workbench-service.ts
```

```ts
import { useWorkbenchStore } from '../../workbench/store/workbenchStore';
import type { ActivityId, BottomPanelId } from '../../workbench/types';

export class WorkbenchService {
  showActivity(activity: ActivityId) {
    useWorkbenchStore.getState().setActiveActivity(activity);
  }

  toggleSideBar() {
    useWorkbenchStore.getState().toggleSideBar();
  }

  toggleBottomPanel() {
    useWorkbenchStore.getState().toggleBottomPanel();
  }

  toggleBottomPanelMaximized() {
    useWorkbenchStore.getState().toggleBottomPanelMaximized();
  }

  showBottomPanel(panel: BottomPanelId) {
    useWorkbenchStore.getState().setActiveBottomPanel(panel);
  }

  resetLayout() {
    useWorkbenchStore.getState().resetLayout();
  }

  openCommandPalette() {
    useWorkbenchStore.getState().openCommandPalette();
  }

  closeCommandPalette() {
    useWorkbenchStore.getState().closeCommandPalette();
  }
}

export const workbenchService = new WorkbenchService();
```

### 修改 `register-core-commands.ts`

追加：

```ts
commandService.register({
  id: 'workbench.resetLayout',
  title: 'Reset Layout',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.resetLayout();
    notificationService.info('Layout reset.');
  },
});

commandService.register({
  id: 'workbench.toggleBottomPanelMaximized',
  title: 'Toggle Bottom Panel Maximized',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.toggleBottomPanelMaximized();
  },
});
```

### P0 验收标准

```txt
[ ] 左侧 SideBar 可以拖拽改变宽度
[ ] 底部 BottomPanel 可以拖拽改变高度
[ ] 双击拖拽条可以恢复默认尺寸
[ ] 刷新应用后布局尺寸仍然保留
[ ] Command Palette 可以执行 Reset Layout
[ ] 不影响现有 ActivityBar / Editor / BottomPanel 渲染
```

---

# P1：UI 组件化和视觉收敛

P1 的核心不是功能，而是“别继续在 app 层堆 H5”。当前 `@sqlgui/ui` 已经导出了 Button、Tabs、Toolbar、Tree、DataTable 等基础组件，说明方向是对的，但 Workbench 专用 UI 组件还缺。

---

## P1-1：新增 `PanelShell`

### 新增文件

```txt
packages/ui/src/components/workbench/panel-shell.tsx
```

### 目标

统一所有面板结构：

```txt
PanelShell
  PanelHeader
  PanelBody
  PanelFooter
```

连接面板、历史面板、扩展面板、结果面板、终端面板都用它。

### 代码草案

```tsx
import * as React from 'react';

import { cn } from '../../lib/utils';

export interface PanelShellProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PanelShell({ className, children, ...props }: PanelShellProps) {
  return (
    <section
      className={cn('flex h-full min-h-0 min-w-0 flex-col bg-background', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <header
      className={cn('flex h-9 shrink-0 items-center gap-2 border-b bg-muted/20 px-3', className)}
      {...props}
    >
      {title ? (
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          {description ? (
            <div className="truncate text-[11px] text-muted-foreground">{description}</div>
          ) : null}
        </div>
      ) : null}

      {children}

      {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
    </header>
  );
}

export interface PanelBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}

export function PanelBody({ scrollable = true, className, children, ...props }: PanelBodyProps) {
  return (
    <div
      className={cn('min-h-0 min-w-0 flex-1', scrollable && 'overflow-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PanelFooter({ className, children, ...props }: PanelFooterProps) {
  return (
    <footer
      className={cn(
        'flex h-7 shrink-0 items-center border-t px-3 text-xs text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}
```

### 导出

```ts
export {
  PanelShell,
  PanelHeader,
  PanelBody,
  PanelFooter,
  type PanelShellProps,
  type PanelHeaderProps,
  type PanelBodyProps,
  type PanelFooterProps,
} from './components/workbench/panel-shell';
```

---

## P1-2：重构 `ConnectionsView`

当前 `ConnectionsView` 自己写了 header 和 body。

### 修改后

```tsx
import { Plus, RefreshCw } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { IconButton, PanelBody, PanelHeader, PanelShell } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
import { ConnectionsTree } from '../connections/ConnectionsTree';

export function ConnectionsView() {
  const { t } = useAppTranslation('connection');

  useSyncExternalStore(
    menuService.subscribe.bind(menuService),
    menuService.getVersion.bind(menuService),
  );

  const toolbarItems = menuService.getMenu(
    'connections/toolbar',
    getWorkbenchContext(),
    evaluateWhenClause,
  );

  return (
    <PanelShell>
      <PanelHeader
        title={t('title')}
        actions={
          <>
            {toolbarItems.map((item) => (
              <IconButton
                key={item.command}
                variant="ghost"
                size="icon"
                title={item.title ?? item.command}
                onClick={() => {
                  void connectionService.handleMenuCommand(item.command);
                }}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
            ))}

            <IconButton
              variant="ghost"
              size="icon"
              title={t('contextMenu.refresh')}
              onClick={() => {
                void connectionService.restoreActiveConnection();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </IconButton>
          </>
        }
      />

      <PanelBody className="p-1">
        <ConnectionsTree />
      </PanelBody>
    </PanelShell>
  );
}
```

---

## P1-3：拆分 BottomPanel

当前 `BottomPanel.tsx` 同时包含 Tabs、ResultsPanel、ProblemsPanel、TerminalPanel，文件职责过重。

### 目标目录

```txt
apps/desktop/src/workbench/layout/bottom-panel/
  BottomPanel.tsx
  BottomPanelTabs.tsx
  ResultsPanel.tsx
  ProblemsPanel.tsx
  TerminalPanel.tsx
```

### `BottomPanel.tsx`

```tsx
import { PanelBody, PanelShell } from '@sqlgui/ui';

import { useWorkbenchStore } from '../../store/workbenchStore';
import { BottomPanelTabs } from './BottomPanelTabs';
import { ProblemsPanel } from './ProblemsPanel';
import { ResultsPanel } from './ResultsPanel';
import { TerminalPanel } from './TerminalPanel';

export function BottomPanel() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const panel = activeBottomPanel === 'logs' ? 'terminal' : activeBottomPanel;

  return (
    <PanelShell>
      <BottomPanelTabs />

      <PanelBody scrollable={false}>
        {panel === 'results' ? <ResultsPanel /> : null}
        {panel === 'problems' ? <ProblemsPanel /> : null}
        {panel === 'terminal' ? <TerminalPanel /> : null}
      </PanelBody>
    </PanelShell>
  );
}
```

### `BottomPanelTabs.tsx`

```tsx
import { Maximize2, Minimize2, X } from 'lucide-react';

import { IconButton, Tabs, TabsList, TabsTrigger } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { BOTTOM_PANEL_ITEMS } from '../../constants';
import { useWorkbenchStore } from '../../store/workbenchStore';

export function BottomPanelTabs() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const setActiveBottomPanel = useWorkbenchStore((state) => state.setActiveBottomPanel);
  const toggleBottomPanel = useWorkbenchStore((state) => state.toggleBottomPanel);
  const bottomPanelMaximized = useWorkbenchStore((state) => state.bottomPanelMaximized);
  const toggleBottomPanelMaximized = useWorkbenchStore((state) => state.toggleBottomPanelMaximized);

  const { t } = useAppTranslation('workbench');
  const panelValue = activeBottomPanel === 'logs' ? 'terminal' : activeBottomPanel;

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-muted/20">
      <Tabs
        value={panelValue}
        onValueChange={(value) => setActiveBottomPanel(value as typeof activeBottomPanel)}
      >
        <TabsList className="h-full bg-transparent p-0">
          {BOTTOM_PANEL_ITEMS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="h-full rounded-none border-b-2 border-transparent px-3 text-xs font-medium uppercase tracking-wide data-[state=active]:border-b-primary data-[state=active]:bg-background"
            >
              {item.titleKey ? t(item.titleKey) : item.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex-1" />

      <IconButton
        variant="ghost"
        size="icon"
        title={bottomPanelMaximized ? t('panel.restore') : t('panel.maximize')}
        onClick={toggleBottomPanelMaximized}
      >
        {bottomPanelMaximized ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </IconButton>

      <IconButton variant="ghost" size="icon" className="mr-1" onClick={toggleBottomPanel}>
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
```

---

## P1-4：编辑器 Toolbar 产品化

当前 `EditorToolbar` 只有连接选择、运行、保存草稿、状态文案。

### 目标

变成 SQL 工具的常见操作条：

```txt
[Connection] | Run | Run Selected | Format | Explain | Save Draft | status
```

### 代码草案

```tsx
import { Play, Save, SearchCode, Wand2 } from 'lucide-react';

import { Button, Toolbar, ToolbarButton, ToolbarSeparator } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import type { SqlEditorTab } from '../types';
import { ConnectionSelector } from './ConnectionSelector';
import { editorService } from '../services/editorService';
import { sqlExecutionService } from '../services/sqlExecutionService';

interface EditorToolbarProps {
  tab: SqlEditorTab;
}

export function EditorToolbar({ tab }: EditorToolbarProps) {
  const { t } = useAppTranslation('editor');

  return (
    <Toolbar className="h-9 shrink-0 border-b px-2">
      <ConnectionSelector
        value={tab.connectionId}
        onChange={(connectionId) => {
          editorService.setConnection(tab.id, connectionId);
        }}
      />

      <ToolbarSeparator />

      <Button
        variant="default"
        size="sm"
        className="h-6 gap-1 px-2 text-xs"
        onClick={() => {
          void sqlExecutionService.executeEditor(tab.id);
        }}
      >
        <Play className="h-3 w-3" />
        {t('run')}
      </Button>

      <ToolbarButton
        title={t('runSelected')}
        onClick={() => {
          void sqlExecutionService.executeSelected?.(tab.id);
        }}
      >
        <Play className="h-3 w-3" />
        {t('runSelected')}
      </ToolbarButton>

      <ToolbarButton
        title={t('format')}
        onClick={() => {
          editorService.formatSql?.(tab.id);
        }}
      >
        <Wand2 className="h-3 w-3" />
        {t('format')}
      </ToolbarButton>

      <ToolbarButton
        title={t('explain')}
        onClick={() => {
          editorService.explainSql?.(tab.id);
        }}
      >
        <SearchCode className="h-3 w-3" />
        {t('explain')}
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        title={t('saveDraft')}
        onClick={() => {
          editorService.updateEditor(tab.id, { dirty: false });
        }}
      >
        <Save className="h-3 w-3" />
        {t('saveDraft')}
      </ToolbarButton>

      <div className="ml-auto truncate text-xs text-muted-foreground">
        {tab.connectionId ? t('selectConnection') : t('noConnection')}
      </div>
    </Toolbar>
  );
}
```

需要补 i18n：

```json
{
  "runSelected": "Run Selected",
  "format": "Format",
  "explain": "Explain"
}
```

---

## P1-5：ResultGrid 增强摘要栏

当前 `ResultGrid` 已经有复制单元格、导出 CSV/JSON、TanStack Table 和虚拟滚动。

### 目标

让结果面板更像数据库工具，而不是普通表格。

### 修改 `ResultGrid.tsx`

新增 props：

```ts
export interface ResultGridProps {
  result: QueryResult;
  elapsedMs?: number;
  onClose?: () => void;
}
```

新增摘要栏：

```tsx
interface ResultSummaryBarProps {
  rowCount: number;
  columnCount: number;
  elapsedMs?: number;
  truncated?: boolean;
}

function ResultSummaryBar({ rowCount, columnCount, elapsedMs, truncated }: ResultSummaryBarProps) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-3 border-b bg-muted/20 px-3 text-xs">
      <span className="font-medium text-foreground">Result</span>
      <span className="text-muted-foreground">{rowCount} rows</span>
      <span className="text-muted-foreground">{columnCount} columns</span>
      {elapsedMs != null ? <span className="text-muted-foreground">{elapsedMs}ms</span> : null}
      {truncated ? <span className="text-yellow-600">truncated</span> : null}
    </div>
  );
}
```

接入：

```tsx
return (
  <div className="flex h-full flex-col">
    <ResultSummaryBar
      rowCount={rows.length}
      columnCount={columns.length}
      elapsedMs={result.elapsedMs}
      truncated={result.truncated}
    />

    {result.truncated ? (
      <div className="shrink-0 border-b border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-500">
        Returned {result.rows.length} rows. Result may be truncated.
      </div>
    ) : null}

    <ResultToolbar
      onCopyCell={handleCopyCell}
      onExportCSV={() => downloadFile(csvContent, 'result.csv', 'text/csv')}
      onExportJSON={() => downloadFile(jsonContent, 'result.json', 'application/json')}
      selectedCell={selectedCell}
    />

    <div className="min-h-0 flex-1 overflow-auto">
      <DataTable
        columns={tableColumns}
        data={data}
        enableSorting={false}
        enablePagination={false}
        enableColumnVisibility={false}
        enableRowSelection={false}
        getRowId={(row) => String(row.__rowIndex)}
      />
    </div>
  </div>
);
```

### P1 验收标准

```txt
[ ] ConnectionsView 不再手写 header/body
[ ] BottomPanel 拆成多个小文件
[ ] EditorToolbar 视觉更像 SQL IDE
[ ] ResultGrid 有摘要栏
[ ] app 层减少重复 className
[ ] @sqlgui/ui 新增 Workbench 组件
```

---

# P2：IDE 化增强能力

P2 是为后面的 **SQL Agent、数据同步、分布式任务、插件市场** 做空间预留。

---

## P2-1：新增 RightPanel

### 目标

未来右侧面板用于：

```txt
SQL Agent
Explain Result
Cell Detail
Schema Detail
Sync Task Detail
Plugin Inspector
```

### 类型设计

修改：

```txt
apps/desktop/src/workbench/types.ts
```

```ts
export type RightPanelId =
  | 'agent'
  | 'cell-detail'
  | 'schema-detail'
  | 'sync-task'
  | 'plugin-inspector';
```

### Store 设计

```ts
import type { RightPanelId } from '../types';

interface WorkbenchStore {
  rightPanelVisible: boolean;
  activeRightPanel: RightPanelId;
  rightPanelWidth: number;

  setActiveRightPanel: (panel: RightPanelId) => void;
  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;
}
```

实现：

```ts
export const DEFAULT_RIGHT_PANEL_WIDTH = 360;
export const MIN_RIGHT_PANEL_WIDTH = 280;
export const MAX_RIGHT_PANEL_WIDTH = 640;
```

```ts
rightPanelVisible: false,
activeRightPanel: 'agent',
rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,

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
```

`partialize` 加：

```ts
rightPanelVisible: state.rightPanelVisible,
activeRightPanel: state.activeRightPanel,
rightPanelWidth: state.rightPanelWidth,
```

### 新增组件

```txt
apps/desktop/src/workbench/layout/RightPanel.tsx
```

```tsx
import { Bot, Database, Puzzle, TableProperties, X } from 'lucide-react';

import {
  IconButton,
  PanelBody,
  PanelHeader,
  PanelShell,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@sqlgui/ui';
import { useWorkbenchStore } from '../store/workbenchStore';

export function RightPanel() {
  const activeRightPanel = useWorkbenchStore((state) => state.activeRightPanel);
  const setActiveRightPanel = useWorkbenchStore((state) => state.setActiveRightPanel);
  const toggleRightPanel = useWorkbenchStore((state) => state.toggleRightPanel);

  return (
    <PanelShell className="border-l">
      <PanelHeader
        title="Inspector"
        actions={
          <IconButton variant="ghost" size="icon" onClick={toggleRightPanel}>
            <X className="h-4 w-4" />
          </IconButton>
        }
      />

      <Tabs value={activeRightPanel} onValueChange={(value) => setActiveRightPanel(value as never)}>
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="agent" className="h-full rounded-none px-3">
            <Bot className="mr-1 h-3.5 w-3.5" />
            Agent
          </TabsTrigger>

          <TabsTrigger value="cell-detail" className="h-full rounded-none px-3">
            <TableProperties className="mr-1 h-3.5 w-3.5" />
            Cell
          </TabsTrigger>

          <TabsTrigger value="schema-detail" className="h-full rounded-none px-3">
            <Database className="mr-1 h-3.5 w-3.5" />
            Schema
          </TabsTrigger>

          <TabsTrigger value="plugin-inspector" className="h-full rounded-none px-3">
            <Puzzle className="mr-1 h-3.5 w-3.5" />
            Plugin
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <PanelBody className="p-3">
        {activeRightPanel === 'agent' ? <SqlAgentPanel /> : null}
        {activeRightPanel === 'cell-detail' ? <CellDetailPanel /> : null}
        {activeRightPanel === 'schema-detail' ? <SchemaDetailPanel /> : null}
        {activeRightPanel === 'plugin-inspector' ? <PluginInspectorPanel /> : null}
      </PanelBody>
    </PanelShell>
  );
}

function SqlAgentPanel() {
  return <div className="text-sm text-muted-foreground">SQL Agent will appear here.</div>;
}

function CellDetailPanel() {
  return <div className="text-sm text-muted-foreground">Select a cell to inspect value.</div>;
}

function SchemaDetailPanel() {
  return (
    <div className="text-sm text-muted-foreground">Select schema object to inspect metadata.</div>
  );
}

function PluginInspectorPanel() {
  return <div className="text-sm text-muted-foreground">Plugin inspector.</div>;
}
```

### 修改 `Workbench.tsx`

```tsx
import { RightPanel } from './layout/RightPanel';
```

```tsx
const rightPanelVisible = useWorkbenchStore((state) => state.rightPanelVisible);
const rightPanelWidth = useWorkbenchStore((state) => state.rightPanelWidth);
const setRightPanelWidth = useWorkbenchStore((state) => state.setRightPanelWidth);
```

```tsx
<MainArea />;

{
  rightPanelVisible ? (
    <ResizablePanel
      value={rightPanelWidth}
      min={MIN_RIGHT_PANEL_WIDTH}
      max={MAX_RIGHT_PANEL_WIDTH}
      defaultValue={DEFAULT_RIGHT_PANEL_WIDTH}
      direction="horizontal"
      handlePosition="left"
      onResize={setRightPanelWidth}
      className="bg-background"
    >
      <RightPanel />
    </ResizablePanel>
  ) : null;
}
```

---

## P2-2：Layout Presets

### 目标

支持几种布局：

```txt
default：默认开发布局
compact：紧凑布局，适合小屏幕
focus：专注写 SQL，隐藏 sideBar 和 bottomPanel
analysis：结果面板更高，适合看数据
agent：打开右侧 SQL Agent
```

### 类型设计

```ts
export type LayoutPreset = 'default' | 'compact' | 'focus' | 'analysis' | 'agent';
```

### Store 增加

```ts
applyLayoutPreset: (preset: LayoutPreset) => void;
```

### 实现

```ts
applyLayoutPreset: (preset) => {
  if (preset === 'default') {
    set({
      sideBarVisible: true,
      bottomPanelVisible: true,
      rightPanelVisible: false,
      sideBarWidth: 280,
      bottomPanelHeight: 240,
      bottomPanelMaximized: false,
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
    });
    return;
  }

  if (preset === 'focus') {
    set({
      sideBarVisible: false,
      bottomPanelVisible: false,
      rightPanelVisible: false,
      bottomPanelMaximized: false,
    });
    return;
  }

  if (preset === 'analysis') {
    set({
      sideBarVisible: true,
      bottomPanelVisible: true,
      rightPanelVisible: false,
      sideBarWidth: 280,
      bottomPanelHeight: 420,
      bottomPanelMaximized: false,
      activeBottomPanel: 'results',
    });
    return;
  }

  if (preset === 'agent') {
    set({
      sideBarVisible: true,
      bottomPanelVisible: true,
      rightPanelVisible: true,
      activeRightPanel: 'agent',
      sideBarWidth: 280,
      rightPanelWidth: 380,
      bottomPanelHeight: 240,
    });
  }
},
```

---

## P2-3：Command Palette 接入 layout preset

在 `register-core-commands.ts` 追加：

```ts
commandService.register({
  id: 'workbench.layout.default',
  title: 'Layout: Default',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.applyLayoutPreset('default');
  },
});

commandService.register({
  id: 'workbench.layout.compact',
  title: 'Layout: Compact',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.applyLayoutPreset('compact');
  },
});

commandService.register({
  id: 'workbench.layout.focus',
  title: 'Layout: Focus',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.applyLayoutPreset('focus');
  },
});

commandService.register({
  id: 'workbench.layout.analysis',
  title: 'Layout: Analysis',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.applyLayoutPreset('analysis');
  },
});

commandService.register({
  id: 'workbench.layout.agent',
  title: 'Layout: SQL Agent',
  category: 'Workbench',
  source: 'core',
  handler: () => {
    workbenchService.applyLayoutPreset('agent');
  },
});
```

`workbench-service.ts`：

```ts
import type { ActivityId, BottomPanelId, LayoutPreset } from '../../workbench/types';

applyLayoutPreset(preset: LayoutPreset) {
  useWorkbenchStore.getState().applyLayoutPreset(preset);
}
```

---

## P2-4：Connection Tree 搜索和过滤

当前 `ConnectionsTree` 是手动递归渲染节点，适合 MVP，但后续节点多了会卡。当前节点渲染是 `rootNodes.map((node) => renderNode(node, 0))`，每个节点继续递归 children。

### 第一版先做搜索，不急着虚拟滚动

新增状态：

```tsx
const [keyword, setKeyword] = useState('');
```

在 `ConnectionsView` header 下方加搜索框：

```tsx
<Input
  value={keyword}
  onChange={(event) => setKeyword(event.target.value)}
  placeholder={t('searchPlaceholder')}
  className="h-7 rounded-none border-x-0 border-t-0 text-xs"
/>
```

把 `keyword` 传给树：

```tsx
<ConnectionsTree keyword={keyword} />
```

`ConnectionsTree` props：

```ts
interface ConnectionsTreeProps {
  keyword?: string;
}
```

过滤函数：

```ts
function matchNode(node: ConnectionTreeNode, keyword: string) {
  if (!keyword.trim()) return true;

  const normalized = keyword.trim().toLowerCase();

  return [node.name, node.database, node.schema, node.table]
    .filter(Boolean)
    .some((item) => item!.toLowerCase().includes(normalized));
}
```

渲染时：

```tsx
const rootNodes = profiles
  .map((profile) => createRootNode(profile))
  .filter((node) => matchNode(node, keyword ?? ''));
```

更完整的过滤要递归 children，需要把 loadedChildren 一起 flatten。P2 第一版可以只做 loaded nodes 搜索。

---

## P2-5：编辑器 Tab 拖拽排序

### 目标

编辑器 tab 支持拖拽重排。现在 `EditorTabs` 是简单 `tabs.map` 渲染。

### Store 增加

在 editor store 里加：

```ts
moveTab: (sourceId: string, targetId: string) => void;
```

实现：

```ts
function moveItem<T>(items: T[], from: number, to: number) {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
```

```ts
moveTab: (sourceId, targetId) => {
  set((state) => {
    const from = state.tabs.findIndex((tab) => tab.id === sourceId);
    const to = state.tabs.findIndex((tab) => tab.id === targetId);

    if (from < 0 || to < 0 || from === to) {
      return state;
    }

    return {
      tabs: moveItem(state.tabs, from, to),
    };
  });
},
```

### `EditorTabs.tsx` 草案

先不用引第三方 dnd，用 HTML drag 够 MVP：

```tsx
const [draggingId, setDraggingId] = useState<string | null>(null);
```

tab 节点：

```tsx
<div
  key={tab.id}
  draggable
  onDragStart={() => setDraggingId(tab.id)}
  onDragEnd={() => setDraggingId(null)}
  onDragOver={(event) => {
    event.preventDefault();
  }}
  onDrop={() => {
    if (!draggingId || draggingId === tab.id) return;
    editorService.moveTab(draggingId, tab.id);
    setDraggingId(null);
  }}
  className={cn(
    'group flex h-full min-w-32 max-w-52 cursor-pointer items-center gap-2 border-r px-3 text-sm',
    active ? 'bg-background text-foreground' : 'text-muted-foreground hover:bg-muted/40',
    draggingId === tab.id && 'opacity-50',
  )}
  onClick={() => editorService.setActiveEditor(tab.id)}
>
  ...
</div>
```

`editorService` 增加：

```ts
moveTab(sourceId: string, targetId: string) {
  useEditorStore.getState().moveTab(sourceId, targetId);
}
```

---

# 推荐落地顺序

## 第 1 个 commit：P0 resize 基础

```txt
feat(ui): add resizable panel
```

包含：

```txt
ResizablePanel
index export
```

---

## 第 2 个 commit：P0 Workbench 接入

```txt
feat(workbench): support resizable sidebar and bottom panel
```

包含：

```txt
Workbench.tsx
MainArea.tsx
workbenchStore.ts
workbench-service.ts
register-core-commands.ts
```

---

## 第 3 个 commit：P1 panel shell

```txt
feat(ui): add workbench panel shell components
```

包含：

```txt
PanelShell
PanelHeader
PanelBody
PanelFooter
```

---

## 第 4 个 commit：P1 app UI 收敛

```txt
refactor(desktop): migrate workbench panels to ui shell
```

包含：

```txt
ConnectionsView
BottomPanel 拆分
EditorToolbar
ResultGrid summary
```

---

## 第 5 个 commit：P2 布局增强

```txt
feat(workbench): add right panel and layout presets
```

包含：

```txt
RightPanel
LayoutPreset
Command Palette commands
```

---

# 最终 TODO

```txt
P0
[ ] @sqlgui/ui 新增 ResizablePanel
[ ] Workbench SideBar 接入横向拖拽
[ ] BottomPanel 接入纵向拖拽
[ ] Store 增加 resetLayout / bottomPanelMaximized
[ ] Command Palette 增加 Reset Layout

P1
[ ] @sqlgui/ui 新增 PanelShell / PanelHeader / PanelBody / PanelFooter
[ ] ConnectionsView 迁移到 PanelShell
[ ] BottomPanel 拆分为多个文件
[ ] EditorToolbar 重写为 Toolbar 风格
[ ] ResultGrid 增加摘要栏

P2
[ ] Store 增加 RightPanel 状态
[ ] 新增 RightPanel 组件
[ ] 新增 LayoutPreset
[ ] Command Palette 接入 layout preset
[ ] ConnectionsTree 增加搜索
[ ] EditorTabs 支持拖拽排序
```

整体上，**P0 做完才算具备桌面软件基础体验**；**P1 做完 UI 代码会明显干净很多**；**P2 做完才开始像一个能承载 SQL Agent、数据同步和插件系统的 IDE Workbench**。
