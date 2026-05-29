import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@sqlgui/ui';

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
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const visibleItems = items.filter((item) => !item.disabled);

  if (visibleItems.length === 0) {
    return null;
  }

  const menu = (
    <div
      className="fixed inset-0 z-[100] cursor-default"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-context-menu]')) {
          onClose();
        }
      }}
    >
      <div
        data-context-menu
        className={cn(
          'absolute z-[101] min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 shadow-lg',
          'text-popover-foreground',
        )}
        style={{ left: x, top: y }}
      >
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
              'transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
            )}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
