import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';
