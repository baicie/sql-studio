import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Flux Button — Low-profile, 1px border style.
 * Primary = accent color fill, Ghost = outline style.
 * 6px radius, 32px height for standard actions.
 */
const buttonVariants = cva(
  'inline-flex flex-row items-center justify-center gap-1.5 whitespace-nowrap transition-colors ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    '[&_[data-icon]]:size-4 [&_[data-icon]]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-on-primary hover:opacity-90 active:opacity-80',
        primary: 'bg-primary text-on-primary hover:opacity-90 active:opacity-80',
        secondary: 'bg-secondary text-on-secondary hover:opacity-90 active:opacity-80',
        ghost:
          'border border-transparent hover:bg-surface-container-high hover:text-on-surface ' +
          'active:bg-surface-container-highest',
        outline:
          'border border-outline-variant text-on-surface hover:bg-surface-container-high ' +
          'hover:border-outline active:bg-surface-container-highest',
        destructive: 'bg-error text-on-error hover:opacity-90 active:opacity-80',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 text-sm font-medium rounded-[6px]',
        sm: 'h-7 px-2.5 text-xs font-medium rounded-[4px] [&_[data-icon]]:size-3',
        lg: 'h-9 px-4 text-sm font-medium rounded-[6px]',
        icon: 'h-8 w-8 text-sm rounded-[6px]',
        'icon-sm': 'h-7 w-7 text-xs rounded-[4px] [&_[data-icon]]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size = 'icon', asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Comp>
    );
  },
);
IconButton.displayName = 'IconButton';
