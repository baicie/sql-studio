import { ActivityBar } from './layout/ActivityBar';
import { BottomPanel } from './layout/BottomPanel';
import { EditorArea } from './layout/EditorArea';
import { SideBar } from './layout/SideBar';
import { StatusBar } from './layout/StatusBar';

interface WorkbenchProps {
  health: {
    appName: string;
    rustCoreReady: boolean;
  } | null;
}

export function Workbench({ health }: WorkbenchProps) {
  return (
    <div className="grid h-screen grid-rows-[1fr_28px] bg-background text-foreground">
      <div className="grid min-h-0 grid-cols-[48px_280px_1fr]">
        <ActivityBar />
        <SideBar />
        <div className="grid min-h-0 grid-rows-[1fr_240px]">
          <EditorArea />
          <BottomPanel />
        </div>
      </div>

      <StatusBar health={health} />
    </div>
  );
}
