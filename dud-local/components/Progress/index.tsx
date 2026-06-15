import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../lib/utils';

export type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>;

/**
 * Progress 进度条
 */
export function Progress({ className, value, ...props }: ProgressProps) {
    return (
        <ProgressPrimitive.Root
            data-slot="progress"
            className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </ProgressPrimitive.Root>
    );
}
