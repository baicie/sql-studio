import { Plus } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { IconButton } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
import { ConnectionsTree } from '../connections/ConnectionsTree';

export function ConnectionsView() {
  const { t } = useAppTranslation('connection');

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
          {t('title')}
        </span>

        <div className="flex items-center gap-1">
          {toolbarItems.map((item) => (
            <IconButton
              key={item.command}
              variant="ghost"
              size="icon"
              title={item.title ?? item.command}
              onClick={() => {
                void connectionService.handleMenuCommand(item.command);
              }}
            >
              <Plus className="h-4 w-4" />
            </IconButton>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-1">
        <ConnectionsTree />
      </div>
    </section>
  );
}
