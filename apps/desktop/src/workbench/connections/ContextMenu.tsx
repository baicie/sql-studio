import { useEffect, useRef } from 'react';

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const visibleItems = items.filter((item) => !item.disabled);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-40 rounded-md border bg-popover py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {visibleItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
