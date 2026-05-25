import { useKeybindingListener } from '@/services/keybinding/use-keybinding-listener';
import { ConnectionDialog } from './connections/ConnectionDialog';
import { CommandPalette } from './command/CommandPalette';
import { ActivityBar } from './layout/ActivityBar';
import { MainArea } from './layout/MainArea';
import { SideBar } from './layout/SideBar';
import { StatusBar } from './layout/StatusBar';
import { NotificationCenter } from './notification/NotificationCenter';
import { useWorkbenchStore } from './store/workbenchStore';
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
      <ConnectionDialog />
      <NotificationCenter />
    </div>
  );
}
