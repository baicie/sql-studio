import { useSyncExternalStore } from 'react';
import { Database, Plus } from 'lucide-react';

import { connectionService } from '@/services/connection/connection-service';
import { executeCommand } from '@/services/command/execute-command';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
import { cn } from '@/lib/cn';

export function ConnectionsView() {
  const snapshot = useSyncExternalStore(
    connectionService.subscribe.bind(connectionService),
    connectionService.getSnapshot.bind(connectionService),
  );
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
    <section className="flex h-full flex-col">
      <header className="flex h-9 items-center justify-between border-b px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Connections
        </span>

        <div className="flex items-center gap-1">
          {toolbarItems.map((item) => (
            <button
              key={item.command}
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={item.title ?? item.command}
              onClick={() => {
                void executeCommand(item.command);
              }}
            >
              <Plus className="h-4 w-4" />
            </button>
          ))}
        </div>
      </header>

      {snapshot.profiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No connections yet.
        </div>
      ) : (
        <div className="flex-1 space-y-1 overflow-auto p-2">
          {snapshot.profiles.map((profile) => {
            const isActive = snapshot.activeConnectionId === profile.id;
            const isConnected = isActive && snapshot.status === 'connected';

            return (
              <div
                key={profile.id}
                className={cn(
                  'rounded-md border px-3 py-2',
                  isConnected ? 'border-primary/40 bg-primary/5' : 'hover:bg-accent/40',
                )}
              >
                <div className="flex items-start gap-2">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{profile.name}</div>
                    <div className="text-xs uppercase text-muted-foreground">{profile.kind}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="rounded px-2 py-0.5 text-xs hover:bg-accent"
                      onClick={() => {
                        void executeCommand('connection.connectActive', profile.id);
                      }}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-0.5 text-xs hover:bg-accent"
                      onClick={() => connectionService.openEditDialog(profile.id)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
