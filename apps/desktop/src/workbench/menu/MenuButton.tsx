import { MoreHorizontal } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

import { executeCommand } from '@/services/command/execute-command';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { menuService } from '@/services/menu/menu-service';
import type { MenuContext, MenuLocation } from '@/services/menu/types';
import { cn } from '@/lib/cn';

interface MenuButtonProps {
  location: MenuLocation;
  context?: MenuContext;
  label?: string;
  className?: string;
}

export function MenuButton({ location, context, label, className }: MenuButtonProps) {
  const [open, setOpen] = useState(false);

  useSyncExternalStore(
    menuService.subscribe.bind(menuService),
    menuService.getVersion.bind(menuService),
  );

  const menuContext = context ?? getWorkbenchContext();
  const items = menuService.getMenuItems(location, menuContext);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        title={label ?? 'More actions'}
        className="flex h-7 min-w-7 items-center justify-center rounded px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        {label ?? <MoreHorizontal className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 min-w-44 rounded-md border bg-popover p-1 shadow">
          {items.map((item) => (
            <button
              key={`${location}-${item.command}`}
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                setOpen(false);
                void executeCommand(item.command);
              }}
            >
              {item.title ?? item.command}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
