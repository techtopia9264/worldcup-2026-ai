import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { toggleVariants } from '../Toggle/index';

type ToggleGroupRootProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>;

function ToggleGroup({ className, variant, size, children, ...props }: ToggleGroupRootProps & VariantProps<typeof toggleVariants>) {
    return (
        <ToggleGroupPrimitive.Root
            className={cn('inline-flex items-center justify-center gap-1', className)}
            {...props}
        >
            {children}
        </ToggleGroupPrimitive.Root>
    );
}

type ToggleGroupItemProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>;

function ToggleGroupItem({ className, variant, size, ...props }: ToggleGroupItemProps) {
    return (
        <ToggleGroupPrimitive.Item
            className={cn(
                toggleVariants({ variant, size, className }),
            )}
            {...props}
        />
    );
}

export { ToggleGroup, ToggleGroupItem };
