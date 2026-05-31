import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Flux Input — 1px border, 6px radius, surface background.
 * Focus: 1px solid primary border, no outer glow.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-8 w-full rounded-[6px] border border-outline-variant bg-surface-bright px-2.5 py-1 text-sm',
          'text-on-surface placeholder:text-on-surface-variant',
          'ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-surface-container dark:border-outline-variant',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
