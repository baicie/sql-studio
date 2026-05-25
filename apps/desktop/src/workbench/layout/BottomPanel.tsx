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
