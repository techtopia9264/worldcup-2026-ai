import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '../../lib/utils';

export type SeparatorProps = React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>;

/**
 * Separator 分割线 — 水平或垂直分割线
 */
export function Separator({
    className,
    orientation = 'horizontal',
    decorative = true,
    ...props
}: SeparatorProps) {
    return (
        <SeparatorPrimitive.Root
            decorative={decorative}
            orientation={orientation}
            className={cn(
                'shrink-0 bg-border',
                orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
                className,
            )}
            {...props}
        />
    );
}
