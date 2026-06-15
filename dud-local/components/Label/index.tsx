import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../lib/utils';

export type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>;

/**
 * Label 标签 — 表单标签组件，基于 Radix Label 原语
 * 自带无障碍关联，点击 label 会聚焦到关联的表单控件
 */
export function Label({ className, ...props }: LabelProps) {
    return (
        <LabelPrimitive.Root
            data-slot="label"
            className={cn(
                'text-sm font-medium leading-none',
                'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                className,
            )}
            {...props}
        />
    );
}
