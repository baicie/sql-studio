import { useSyncExternalStore } from 'react';

import { logService } from '@/services/log/log-service';
import { PanelTabs } from './PanelTabs';
import { useWorkbenchStore } from '../store/workbenchStore';
import { useResultStore } from '../results/store/resultStore';
import { resultService } from '../results/services/resultService';

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
  const records = useResultStore((state) => state.records);

  if (records.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Execute a query to see results.
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
          <span className="font-medium text-destructive">Query Failed</span>
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
        Running query...
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
            ? `${result.affectedRows} row(s) affected`
            : `${rowCount} row(s) returned`}
        </span>
        <span>{latest.elapsedMs}ms</span>
        {result.truncated && <span className="text-yellow-600">Truncated</span>}
        <button
          type="button"
          className="ml-auto text-muted-foreground hover:text-foreground"
          onClick={() => resultService.clearResults()}
        >
          Clear
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-muted/50">
            <tr>
              <th className="border-b px-2 py-1 text-left font-medium text-muted-foreground w-10">
                #
              </th>
              {result.columns.map((col, i) => (
                <th
                  key={i}
                  className="border-b px-2 py-1 text-left font-medium"
                  style={{ minWidth: 80 }}
                >
                  <div
                    className="truncate max-w-[200px]"
                    title={`${col.name} (${col.databaseType})`}
                  >
                    {col.name}
                  </div>
                  <div className="truncate text-xs font-normal text-muted-foreground">
                    {col.databaseType}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={result.columns.length + 1}
                  className="px-2 py-4 text-center text-muted-foreground"
                >
                  No rows returned.
                </td>
              </tr>
            ) : (
              result.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/30">
                  <td className="border-b px-2 py-1 text-muted-foreground">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b px-2 py-1">
                      <span
                        className="truncate block max-w-[200px]"
                        title={cell === null ? 'NULL' : String(cell)}
                      >
                        {cell === null ? (
                          <span className="italic text-muted-foreground">NULL</span>
                        ) : typeof cell === 'object' ? (
                          JSON.stringify(cell)
                        ) : (
                          String(cell)
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
