import * as React from 'react';
import { cn } from '../../lib/utils';

export interface PanelShellProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PanelShell({ className, children, ...props }: PanelShellProps) {
  return (
    <section
      className={cn('flex h-full min-h-0 min-w-0 flex-col bg-surface', className)}
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
      className={cn(
        'flex h-8 shrink-0 items-center gap-2 border-b border-outline-variant bg-surface-container px-3',
        className,
      )}
      {...props}
    >
      {title ? (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-on-surface">
            {title}
          </div>
          {description ? (
            <div className="truncate text-[11px] text-on-surface-variant">{description}</div>
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

export function PanelBody({
  scrollable: _scrollable,
  className,
  children,
  ...props
}: PanelBodyProps) {
  return (
    <div
      className={cn('min-h-0 min-w-0 flex-1 overflow-auto flux-scrollbar', className)}
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
        'flex h-7 shrink-0 items-center border-t border-outline-variant px-3 text-[11px] text-on-surface-variant',
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}
