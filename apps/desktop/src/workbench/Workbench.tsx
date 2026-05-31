import { useSyncExternalStore } from 'react';
import { ResizablePanel } from '@sqlgui/ui';
import { useKeybindingListener } from '@/services/keybinding/use-keybinding-listener';
import { ConnectionDialog } from './connections/ConnectionDialog';
import { connectionService } from '@/services/connection/connection-service';
import { CommandPalette } from './command/CommandPalette';
import { ActivityBar } from './layout/ActivityBar';
import { MainArea } from './layout/MainArea';
import { RightPanel } from './layout/RightPanel';
import { SideBar } from './layout/SideBar';
import { StatusBar } from './layout/StatusBar';
import { NotificationCenter } from './notification/NotificationCenter';
import {
  DEFAULT_RIGHT_PANEL_WIDTH,
  DEFAULT_SIDE_BAR_WIDTH,
  MAX_RIGHT_PANEL_WIDTH,
  MAX_SIDE_BAR_WIDTH,
  MIN_RIGHT_PANEL_WIDTH,
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

/**
 * Flux Workbench — Fixed grid desktop layout.
 * Activity Bar (48px) + Sidebar (240px, resizable) + Main Stage + Right Panel.
 * All panels separated by 1px border (no heavy shadows).
 */
export function Workbench({ health }: WorkbenchProps) {
  useApplyTheme();
  useKeybindingListener();

  const sideBarVisible = useWorkbenchStore((state) => state.sideBarVisible);
  const sideBarWidth = useWorkbenchStore((state) => state.sideBarWidth);
  const setSideBarWidth = useWorkbenchStore((state) => state.setSideBarWidth);
  const rightPanelVisible = useWorkbenchStore((state) => state.rightPanelVisible);
  const rightPanelWidth = useWorkbenchStore((state) => state.rightPanelWidth);
  const setRightPanelWidth = useWorkbenchStore((state) => state.setRightPanelWidth);

  const connectionDialogOpen = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    () => connectionService.getSnapshot().dialog.open,
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Main content row: ActivityBar + SideBar + MainArea + RightPanel */}
      <div className="flex min-h-0 flex-1">
        {/* Flux Activity Bar */}
        <ActivityBar />

        {/* Flux Sidebar */}
        {sideBarVisible ? (
          <ResizablePanel
            value={sideBarWidth}
            min={MIN_SIDE_BAR_WIDTH}
            max={MAX_SIDE_BAR_WIDTH}
            defaultValue={DEFAULT_SIDE_BAR_WIDTH}
            direction="horizontal"
            handlePosition="right"
            onResize={setSideBarWidth}
            className="flex h-full flex-col border-r border-outline-variant bg-surface"
          >
            <SideBar />
          </ResizablePanel>
        ) : null}

        {/* Main Stage */}
        <MainArea />

        {/* Right Panel */}
        {rightPanelVisible ? (
          <ResizablePanel
            value={rightPanelWidth}
            min={MIN_RIGHT_PANEL_WIDTH}
            max={MAX_RIGHT_PANEL_WIDTH}
            defaultValue={DEFAULT_RIGHT_PANEL_WIDTH}
            direction="horizontal"
            handlePosition="left"
            onResize={setRightPanelWidth}
            className="flex h-full flex-col border-l border-outline-variant bg-surface"
          >
            <RightPanel />
          </ResizablePanel>
        ) : null}
      </div>

      {/* Flux Status Bar */}
      <StatusBar health={health} />

      {/* Overlays */}
      <CommandPalette />
      {connectionDialogOpen ? <ConnectionDialog /> : null}
      <NotificationCenter />
    </div>
  );
}
