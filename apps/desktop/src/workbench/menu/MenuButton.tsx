import { MoreHorizontal } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@sqlgui/ui';

import { executeCommand } from '@/services/command/execute-command';
import { getWorkbenchContext } from '@/services/context/workbench-context';
import { menuService } from '@/services/menu/menu-service';
import type { MenuContext, MenuLocation } from '@/services/menu/types';

interface MenuButtonProps {
  location: MenuLocation;
  context?: MenuContext;
  label?: string;
  className?: string;
}

export function MenuButton({ location, context, label, className }: MenuButtonProps) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          {label ?? <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={`${location}-${item.command}`}
            onClick={() => {
              void executeCommand(item.command);
            }}
          >
            {item.title ?? item.command}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
