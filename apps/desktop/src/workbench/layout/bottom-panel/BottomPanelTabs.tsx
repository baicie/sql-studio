import { Maximize2, Minimize2, X } from 'lucide-react';

import { IconButton, Tabs, TabsList, TabsTrigger } from '@sqlgui/ui';
import { useAppTranslation } from '@/i18n';
import { BOTTOM_PANEL_ITEMS } from '../../constants';
import { useWorkbenchStore } from '../../store/workbenchStore';

export function BottomPanelTabs() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const setActiveBottomPanel = useWorkbenchStore((state) => state.setActiveBottomPanel);
  const toggleBottomPanel = useWorkbenchStore((state) => state.toggleBottomPanel);
  const bottomPanelMaximized = useWorkbenchStore((state) => state.bottomPanelMaximized);
  const toggleBottomPanelMaximized = useWorkbenchStore((state) => state.toggleBottomPanelMaximized);

  const { t } = useAppTranslation('workbench');
  const panelValue = activeBottomPanel === 'logs' ? 'terminal' : activeBottomPanel;

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-muted/20">
      <Tabs
        value={panelValue}
        onValueChange={(value) => setActiveBottomPanel(value as typeof activeBottomPanel)}
      >
        <TabsList className="h-full bg-transparent p-0">
          {BOTTOM_PANEL_ITEMS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="h-full rounded-none border-b-2 border-transparent px-3 text-xs font-medium uppercase tracking-wide data-[state=active]:border-b-primary data-[state=active]:bg-background"
            >
              {item.titleKey ? t(item.titleKey) : item.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex-1" />

      <IconButton
        variant="ghost"
        size="icon"
        title={bottomPanelMaximized ? t('panel.restore') : t('panel.maximize')}
        onClick={toggleBottomPanelMaximized}
      >
        {bottomPanelMaximized ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </IconButton>

      <IconButton variant="ghost" size="icon" className="mr-1" onClick={toggleBottomPanel}>
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
