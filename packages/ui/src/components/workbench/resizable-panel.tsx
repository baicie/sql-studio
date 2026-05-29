import * as React from 'react';

import { cn } from '../../lib/utils';

export type ResizeDirection = 'horizontal' | 'vertical';
export type ResizeHandlePosition = 'left' | 'right' | 'top' | 'bottom';

export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  min?: number;
  max?: number;
  defaultValue?: number;
  direction: ResizeDirection;
  handlePosition: ResizeHandlePosition;
  disabled?: boolean;
  onResize: (value: number) => void;
  onResizeEnd?: (value: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getDelta(
  direction: ResizeDirection,
  handlePosition: ResizeHandlePosition,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
) {
  const rawDelta = direction === 'horizontal' ? currentX - startX : currentY - startY;
  const reversed = handlePosition === 'left' || handlePosition === 'top';

  return reversed ? -rawDelta : rawDelta;
}

export function ResizablePanel({
  value,
  min = 160,
  max = 640,
  defaultValue,
  direction,
  handlePosition,
  disabled,
  onResize,
  onResizeEnd,
  className,
  style,
  children,
  ...props
}: ResizablePanelProps) {
  const valueRef = React.useRef(value);

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const panelStyle: React.CSSProperties =
    direction === 'horizontal'
      ? {
          width: value,
          minWidth: min,
          maxWidth: max,
          ...style,
        }
      : {
          height: value,
          minHeight: min,
          maxHeight: max,
          ...style,
        };

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startValue = valueRef.current;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    function handlePointerMove(moveEvent: PointerEvent) {
      const delta = getDelta(
        direction,
        handlePosition,
        startX,
        startY,
        moveEvent.clientX,
        moveEvent.clientY,
      );

      const nextValue = clamp(startValue + delta, min, max);

      valueRef.current = nextValue;
      onResize(nextValue);
    }

    function handlePointerUp() {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      onResizeEnd?.(valueRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handleDoubleClick() {
    if (defaultValue == null) return;

    const nextValue = clamp(defaultValue, min, max);

    valueRef.current = nextValue;
    onResize(nextValue);
    onResizeEnd?.(nextValue);
  }

  return (
    <div
      className={cn('relative min-h-0 min-w-0 shrink-0', className)}
      style={panelStyle}
      {...props}
    >
      {children}

      {!disabled ? (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation={direction === 'horizontal' ? 'vertical' : 'horizontal'}
          className={cn(
            'absolute z-30 bg-transparent transition-colors hover:bg-primary/40 active:bg-primary/60',
            handlePosition === 'right' && 'right-[-2px] top-0 h-full w-1 cursor-col-resize',
            handlePosition === 'left' && 'left-[-2px] top-0 h-full w-1 cursor-col-resize',
            handlePosition === 'top' && 'left-0 top-[-2px] h-1 w-full cursor-row-resize',
            handlePosition === 'bottom' && 'bottom-[-2px] left-0 h-1 w-full cursor-row-resize',
          )}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
        />
      ) : null}
    </div>
  );
}
