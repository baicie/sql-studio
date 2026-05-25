import { useState, useSyncExternalStore } from 'react';

import { connectionService } from '@/services/connection/connection-service';
import { dbService } from '@/services/db/dbService';
import { logService } from '@/services/log/log-service';
import { notificationService } from '@/services/notification/notification-service';
import { commandService } from '@/services/command/command-service';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
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

        {activeTab?.kind === 'query' ? <QueryEditor /> : null}

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
  useSyncExternalStore(
    menuService.subscribe.bind(menuService),
    menuService.getVersion.bind(menuService),
  );

  const actions = menuService.getMenu('welcome/actions', getWorkbenchContext(), evaluateWhenClause);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">SQL GUI</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lightweight and extensible database workbench.
        </p>

        <div className="mt-6 grid gap-2 text-left text-sm">
          {actions.map((item) => (
            <button
              key={item.command}
              type="button"
              className="rounded-md border px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                void commandService.executeCommand(item.command);
              }}
            >
              {item.title ?? item.command}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueryEditor() {
  const [sql, setSql] = useState('SELECT 1');
  const [result, setResult] = useState<{
    columns: Array<{ name: string; databaseType: string }>;
    rows: unknown[][];
    elapsedMs: number;
    rowCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useSyncExternalStore(
    menuService.subscribe.bind(menuService),
    menuService.getVersion.bind(menuService),
  );

  const contextItems = menuService.getMenu(
    'editor/context',
    getWorkbenchContext(),
    evaluateWhenClause,
  );

  async function execute() {
    const active = connectionService.getActiveConnection();

    if (!active) {
      notificationService.warning('No active connection. Please connect to a database first.');
      return;
    }

    if (!sql.trim()) {
      notificationService.warning('Please enter a SQL query.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      logService.info('sql', `Executing: ${sql.substring(0, 100)}...`);

      const queryResult = await dbService.executeQuery({
        connectionId: active.id,
        sql: sql.trim(),
        limit: 1000,
      });

      setResult({
        columns: queryResult.columns,
        rows: queryResult.rows.map((row) =>
          row.map((cell) => {
            if ('String' in cell) return cell.String;
            if ('I64' in cell) return cell.I64;
            if ('F64' in cell) return cell.F64;
            if ('Bool' in cell) return cell.Bool;
            if ('Json' in cell) return JSON.stringify(cell.Json);
            if ('Bytes' in cell) {
              const bytes = cell.Bytes;
              return `[BLOB: ${typeof bytes === 'string' ? bytes.substring(0, 20) : String(bytes)}...]`;
            }
            return null;
          }),
        ),
        elapsedMs: queryResult.elapsedMs,
        rowCount: queryResult.rows.length,
      });

      logService.info(
        'sql',
        `Query completed: ${queryResult.rows.length} rows in ${queryResult.elapsedMs}ms`,
      );
      notificationService.success(`Query executed: ${queryResult.rows.length} rows returned.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logService.error('sql', `Query failed: ${message}`, error);
      notificationService.error(`Query failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setMenuOpen(true);
  }

  return (
    <div
      className="flex h-full flex-col"
      onContextMenu={handleContextMenu}
      onClick={() => setMenuOpen(false)}
    >
      <div className="flex border-b p-2">
        <textarea
          className="min-h-[80px] w-full resize-none rounded-md border bg-background p-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={sql}
          onChange={(event) => setSql(event.target.value)}
          placeholder="Enter SQL query..."
        />
      </div>

      <div className="flex items-center gap-2 border-b px-2 py-1.5">
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
          onClick={execute}
          disabled={loading}
        >
          {loading ? 'Executing...' : 'Execute (Ctrl+Enter)'}
        </button>

        {result && (
          <span className="text-xs text-muted-foreground">
            {result.rowCount} rows in {result.elapsedMs}ms
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Executing query...
          </div>
        ) : result ? (
          <div className="overflow-auto rounded-md border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {result.columns.map((col, i) => (
                    <th
                      key={i}
                      className="border-b px-2 py-1 text-left font-medium"
                      style={{ minWidth: 80 }}
                    >
                      <div className="truncate max-w-[200px]" title={col.name}>
                        {col.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
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
                      colSpan={result.columns.length}
                      className="px-2 py-4 text-center text-muted-foreground"
                    >
                      No rows returned.
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-muted/30">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border-b px-2 py-1">
                          <span className="truncate block max-w-[200px]" title={String(cell ?? '')}>
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
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Execute a query to see results.
          </div>
        )}
      </div>

      {menuOpen && contextItems.length > 0 ? (
        <div
          className="fixed z-40 min-w-40 rounded-md border bg-popover py-1 shadow-lg"
          style={{ left: menuPosition.x, top: menuPosition.y }}
        >
          {contextItems.map((item) => (
            <button
              key={item.command}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                void commandService.executeCommand(item.command);
                setMenuOpen(false);
              }}
            >
              {item.title ?? commandService.get(item.command)?.title ?? item.command}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
