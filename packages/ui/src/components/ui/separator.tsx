import * as React from 'react';
import { cn } from '../../lib/utils';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className,
        )}
        role={decorative ? 'none' : undefined}
      />
    );
  },
);
Separator.displayName = 'Separator';
