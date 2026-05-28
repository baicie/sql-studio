import { useSyncExternalStore } from 'react';

import { Button } from '@sqlgui/ui';
import { logService } from '@/services/log/log-service';
import { useAppTranslation } from '@/i18n';
import { PanelTabs } from './PanelTabs';
import { useWorkbenchStore } from '../store/workbenchStore';
import { useResultStore } from '../results/store/resultStore';
import { resultService } from '../results/services/resultService';
import { ResultGrid } from '../results/components/ResultGrid';

export function BottomPanel() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const panel = activeBottomPanel === 'logs' ? 'terminal' : activeBottomPanel;

  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <PanelTabs />

      <div className="min-h-0 flex-1 overflow-auto">
        {panel === 'results' ? <ResultsPanel /> : null}
        {panel === 'problems' ? <ProblemsPanel /> : null}
        {panel === 'terminal' ? <TerminalPanel /> : null}
      </div>
    </section>
  );
}

function ResultsPanel() {
  const { t } = useAppTranslation('result');
  const { t: tc } = useAppTranslation('common');

  const records = useResultStore((state) => state.records);

  if (records.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('empty.description')}
      </div>
    );
  }

  const latest = records.at(-1);

  if (!latest) {
    return null;
  }

  if (latest.error) {
    return (
      <div className="flex h-full flex-col p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="font-medium text-destructive">{t('error.queryFailed')}</span>
          {latest.elapsedMs !== undefined && (
            <span className="text-muted-foreground">{latest.elapsedMs}ms</span>
          )}
        </div>
        <pre className="flex-1 overflow-auto rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          {latest.error}
        </pre>
        <div className="mt-2 overflow-auto rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          {latest.sql}
        </div>
      </div>
    );
  }

  if (!latest.result) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t('status.running')}
      </div>
    );
  }

  const { result } = latest;
  const rowCount = result.rows.length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span className="text-foreground">
          {result.affectedRows !== undefined
            ? t('summary.affectedRows', { count: result.affectedRows })
            : t('summary.rowsColumns', { rows: rowCount, columns: result.columns.length })}
        </span>
        <span>{latest.elapsedMs}ms</span>
        {result.truncated && <span className="text-yellow-600">{t('status.truncated')}</span>}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-foreground"
          onClick={() => resultService.clearResults()}
        >
          {tc('actions.clear')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ResultGrid result={result} />
      </div>
    </div>
  );
}

function ProblemsPanel() {
  const { t } = useAppTranslation('result');

  return <div className="p-3 text-sm text-muted-foreground">{t('tabs.problems')}</div>;
}

function TerminalPanel() {
  const { t } = useAppTranslation('workbench');
  const logs = useSyncExternalStore(
    logService.subscribe.bind(logService),
    logService.getSnapshot.bind(logService),
  );

  if (logs.length === 0) {
    return <div className="p-3 text-sm text-muted-foreground">{t('panel.terminalEmpty')}</div>;
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
