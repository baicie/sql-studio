import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@sqlgui/ui';

interface ContextMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const visibleItems = items.filter((item) => !item.disabled);

  if (visibleItems.length === 0) {
    return null;
  }

  const handleItemClick = (item: ContextMenuItem) => {
    item.onClick();
    onClose();
  };

  const menu = (
    <DropdownMenu open onOpenChange={(open) => !open && onClose()}>
      <DropdownMenuContent
        style={{ left: x, top: y }}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        {visibleItems.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => handleItemClick(item)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return createPortal(menu, document.body);
}
