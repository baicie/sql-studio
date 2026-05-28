import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_[data-icon]]:size-4 [&_[data-icon]]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3 py-1.5',
        sm: 'h-7 px-2 text-xs [&_[data-icon]]:size-3',
        lg: 'h-9 px-4',
        icon: 'h-7 w-7',
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
