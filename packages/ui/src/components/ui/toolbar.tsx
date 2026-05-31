import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Flux Toolbar — Low-profile horizontal toolbar for SQL editor actions.
 * Uses ghost/outline button style, tight spacing.
 */
export const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-8 shrink-0 items-center gap-0.5 px-1',
        'border-b border-outline-variant bg-surface-container',
        className,
      )}
      {...props}
    />
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
          'flex items-center justify-center gap-1 rounded-[4px] border border-transparent px-2 py-1',
          'text-xs font-medium transition-colors',
          'text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-high hover:text-on-surface',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0',
          'disabled:pointer-events-none disabled:opacity-40',
          active && 'border-outline-variant bg-surface-container-high text-primary',
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
    <div ref={ref} className={cn('mx-0.5 h-4 w-px bg-outline-variant', className)} {...props} />
  ),
);
ToolbarSeparator.displayName = 'ToolbarSeparator';
