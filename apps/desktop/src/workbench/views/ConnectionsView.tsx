import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useSyncExternalStore } from 'react';

import { IconButton, Input, PanelBody, PanelHeader, PanelShell } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { connectionService } from '@/services/connection/connection-service';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { evaluateWhenClause } from '@/services/menu/evaluate-when-clause';
import { menuService } from '@/services/menu/menu-service';
import { ConnectionsTree } from '../connections/ConnectionsTree';

export function ConnectionsView() {
  const { t } = useAppTranslation('connection');
  const [keyword, setKeyword] = useState('');

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
    <PanelShell>
      <PanelHeader
        title={t('title')}
        actions={
          <>
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

            <IconButton
              variant="ghost"
              size="icon"
              title={t('contextMenu.refresh')}
              onClick={() => {
                void connectionService.restoreActiveConnection();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </IconButton>
          </>
        }
      />

      <div className="border-b px-2 py-1">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="h-7 text-xs"
        />
      </div>

      <PanelBody className="p-1">
        <ConnectionsTree keyword={keyword} />
      </PanelBody>
    </PanelShell>
  );
}
