import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

const Tabs = TabsPrimitive.Root;

/**
 * Flux TabsList — Editor-style tabs for SQL workbench.
 * Square corners, no rounded background. Active tab has 2px bottom border in primary color.
 */
const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn('flex h-8 items-end', className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * Flux TabsTrigger — Square-ish tabs for editor.
 * Active state: 2px primary color bottom border.
 * Inactive: no background, text muted.
 * Contains: file icon, tab name, close button, dirty indicator.
 */
const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'group relative flex h-full min-w-0 max-w-[180px] items-center gap-1.5 overflow-hidden',
      'border-b-2 border-transparent px-3 pb-0',
      'text-xs font-medium text-on-surface-variant transition-colors',
      'focus-visible:outline-none focus-visible:ring-0',
      'disabled:pointer-events-none disabled:opacity-40',
      'data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-on-surface',
      '[&_svg]:size-3.5 [&_svg]:shrink-0',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * Flux TabClose — Close button for editor tabs.
 * Only visible on hover. Small circle icon.
 */
export interface TabCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const TabClose = React.forwardRef<HTMLButtonElement, TabCloseProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded',
        'opacity-0 transition-opacity group-hover:opacity-100',
        'hover:bg-surface-container-highest hover:text-on-surface',
        'focus-visible:outline-none focus-visible:ring-0',
        className,
      )}
      {...props}
    />
  ),
);
TabClose.displayName = 'TabClose';

/**
 * Flux TabDirty — Small dot indicating unsaved changes.
 */
export interface TabDirtyProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const TabDirty: React.ForwardRefExoticComponent<
  TabDirtyProps & React.RefAttributes<HTMLSpanElement>
> = React.forwardRef<HTMLSpanElement, TabDirtyProps>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('h-1.5 w-1.5 shrink-0 rounded-full bg-secondary', className)}
    {...props}
  />
));
TabDirty.displayName = 'TabDirty';

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('flex-1 overflow-auto focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
