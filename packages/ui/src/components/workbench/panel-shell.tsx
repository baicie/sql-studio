import * as React from 'react';

import { cn } from '../../lib/utils';

export interface PanelShellProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PanelShell({ className, children, ...props }: PanelShellProps) {
  return (
    <section
      className={cn('flex h-full min-h-0 min-w-0 flex-col bg-background', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export interface PanelHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <header
      className={cn('flex h-9 shrink-0 items-center gap-2 border-b bg-muted/20 px-3', className)}
      {...props}
    >
      {title ? (
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          {description ? (
            <div className="truncate text-[11px] text-muted-foreground">{description}</div>
          ) : null}
        </div>
      ) : null}

      {children}

      {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
    </header>
  );
}

export interface PanelBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
}

export function PanelBody({ scrollable = true, className, children, ...props }: PanelBodyProps) {
  return (
    <div
      className={cn('min-h-0 min-w-0 flex-1', scrollable && 'overflow-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PanelFooter({ className, children, ...props }: PanelFooterProps) {
  return (
    <footer
      className={cn(
        'flex h-7 shrink-0 items-center border-t px-3 text-xs text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}
