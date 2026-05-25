import { useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';

import { connectionService } from '@/services/connection/connection-service';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
import { ConnectionsTree } from '../connections/ConnectionsTree';

export function ConnectionsView() {
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
                void connectionService.handleMenuCommand(item.command);
              }}
            >
              <Plus className="h-4 w-4" />
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-1">
        <ConnectionsTree />
      </div>
    </section>
  );
}
