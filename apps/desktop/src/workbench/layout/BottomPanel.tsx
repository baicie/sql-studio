import { useSyncExternalStore } from 'react';

import { logService } from '@/services/log/log-service';
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
  const logs = useSyncExternalStore(
    logService.subscribe.bind(logService),
    logService.getSnapshot.bind(logService),
  );

  if (logs.length === 0) {
    return <div className="p-3 text-sm text-muted-foreground">No logs.</div>;
  }

  return (
    <div className="h-full overflow-auto p-3 font-mono text-xs">
      {logs.map((item) => (
        <div key={item.id} className="whitespace-pre-wrap py-0.5">
          <span className="text-muted-foreground">
            {new Date(item.timestamp).toLocaleTimeString()}
          </span>{' '}
          <span>[{item.level}]</span> <span>[{item.scope}]</span> <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}
