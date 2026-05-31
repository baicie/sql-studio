import * as React from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Flux Badge — Small, caps-heavy labels for data types (VARCHAR, INT, etc.).
 * High contrast between text and background for quick scanning.
 */
const badgeVariants = cva(
  'inline-flex items-center font-semibold tracking-wider uppercase transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
  {
    variants: {
      variant: {
        default: 'rounded-[4px] border-transparent bg-primary text-on-primary',
        primary: 'rounded-[4px] border border-primary/40 bg-primary/20 text-primary',
        secondary: 'rounded-[4px] border border-secondary/40 bg-secondary/20 text-secondary',
        outline: 'rounded-[4px] border border-outline text-on-surface',
        success: 'rounded-[4px] border-transparent bg-green-500/20 text-green-400',
        warning: 'rounded-[4px] border-transparent bg-amber-500/20 text-amber-400',
        destructive: 'rounded-[4px] border-transparent bg-error/20 text-error',
        // SQL data type badges
        'sql-int':
          'rounded-[4px] border border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px] px-1.5 py-0',
        'sql-varchar':
          'rounded-[4px] border border-green-500/40 bg-green-500/10 text-green-300 text-[10px] px-1.5 py-0',
        'sql-numeric':
          'rounded-[4px] border border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px] px-1.5 py-0',
        'sql-date':
          'rounded-[4px] border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] px-1.5 py-0',
        'sql-uuid':
          'rounded-[4px] border border-pink-500/40 bg-pink-500/10 text-pink-300 text-[10px] px-1.5 py-0',
        'sql-bool':
          'rounded-[4px] border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-[10px] px-1.5 py-0',
        'sql-json':
          'rounded-[4px] border border-orange-500/40 bg-orange-500/10 text-orange-300 text-[10px] px-1.5 py-0',
        'sql-null':
          'rounded-[4px] border border-outline text-muted-foreground italic text-[10px] px-1.5 py-0',
      },
      size: {
        default: 'px-2 py-0.5 text-[11px]',
        sm: 'px-1.5 py-0 text-[10px]',
        lg: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
