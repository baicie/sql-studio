import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TreeItemProps extends React.HTMLAttributes<HTMLDivElement> {
  indent?: number;
  expandIcon?: React.ReactNode;
  leafIcon?: React.ReactNode;
  isLeaf?: boolean;
  isExpanded?: boolean;
  selected?: boolean;
}

export const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      indent = 0,
      expandIcon,
      leafIcon,
      isLeaf = false,
      isExpanded = false,
      selected = false,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'group flex cursor-default items-center gap-1 rounded px-1 py-0.5',
          'hover:bg-accent hover:text-accent-foreground',
          selected && 'bg-accent text-accent-foreground',
          className,
        )}
        style={{ paddingLeft: `${indent * 16 + 4}px` }}
        {...props}
      >
        {!isLeaf ? (
          expandIcon ||
          (isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          ))
        ) : leafIcon ? (
          <span className="flex-shrink-0">{leafIcon}</span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span className="truncate text-xs">{children}</span>
      </div>
    );
  },
);
TreeItem.displayName = 'TreeItem';

export interface TreeIndentProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: number;
}

export const TreeIndent = React.forwardRef<HTMLDivElement, TreeIndentProps>(
  ({ level = 0, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-shrink-0', className)}
      style={{ width: `${level * 16}px` }}
      {...props}
    />
  ),
);
TreeIndent.displayName = 'TreeIndent';
