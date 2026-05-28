import * as React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center justify-center gap-2 p-6 text-center', className)}
      >
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  },
);
EmptyState.displayName = 'EmptyState';
