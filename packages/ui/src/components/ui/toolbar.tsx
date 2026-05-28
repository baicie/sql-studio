import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('inline-flex items-center gap-1', className)} {...props} />
  ),
);
Toolbar.displayName = 'Toolbar';

export interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  active?: boolean;
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, asChild = false, active = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1 rounded px-2 py-1',
          'text-xs transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:opacity-50',
          active && 'bg-accent text-accent-foreground',
          className,
        )}
        {...props}
      />
    );
  },
);
ToolbarButton.displayName = 'ToolbarButton';

export interface ToolbarSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ToolbarSeparator = React.forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mx-0.5 h-4 w-px bg-border', className)} {...props} />
  ),
);
ToolbarSeparator.displayName = 'ToolbarSeparator';
