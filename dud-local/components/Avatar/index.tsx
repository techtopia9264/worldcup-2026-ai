import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

export type AvatarProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>;

export function Avatar({ className, ...props }: AvatarProps) {
    return (
        <AvatarPrimitive.Root
            data-slot="avatar"
            className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
            {...props}
        />
    );
}

export function AvatarImage({ className, ...props }: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>) {
    return <AvatarPrimitive.Image className={cn('aspect-square h-full w-full', className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) {
    return (
        <AvatarPrimitive.Fallback
            className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
            {...props}
        />
    );
}
