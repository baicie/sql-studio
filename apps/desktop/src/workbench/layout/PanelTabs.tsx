import { X } from 'lucide-react';

import { BOTTOM_PANEL_ITEMS } from '../constants';
import { useWorkbenchStore } from '../store/workbenchStore';
import { cn } from '@/lib/cn';

export function PanelTabs() {
  const activeBottomPanel = useWorkbenchStore((state) => state.activeBottomPanel);
  const setActiveBottomPanel = useWorkbenchStore((state) => state.setActiveBottomPanel);
  const toggleBottomPanel = useWorkbenchStore((state) => state.toggleBottomPanel);

  return (
    <div className="flex h-9 shrink-0 items-center border-b bg-muted/20">
      <div className="flex h-full">
        {BOTTOM_PANEL_ITEMS.map((item) => {
          const active = item.id === activeBottomPanel;

          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-full px-3 text-xs font-medium uppercase tracking-wide',
                active
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveBottomPanel(item.id)}
            >
              {item.title}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        className="mr-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={toggleBottomPanel}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
