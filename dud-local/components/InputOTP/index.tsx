import * as React from 'react';
import { OTPInput } from 'input-otp';
import { cn } from '../../lib/utils';

export type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput>;

export function InputOTP({ containerClassName, className, ...props }: InputOTPProps & { containerClassName?: string }) {
    return (
        <OTPInput
            containerClassName={cn('flex items-center gap-2 has-[:disabled]:opacity-50', containerClassName)}
            className={cn('disabled:cursor-not-allowed', className)}
            {...props}
        />
    );
}

export function InputOTPGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

export function InputOTPSlot({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'relative flex h-9 w-9 items-center justify-center border border-input rounded-md text-sm font-medium shadow-sm',
                className,
            )}
            {...props}
        />
    );
}
