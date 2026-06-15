import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const typographyVariants = cva('', {
    variants: {
        variant: {
            h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
            h2: 'scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0',
            h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
            h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
            p: 'leading-7 [&:not(:first-child)]:mt-6',
            lead: 'text-xl text-muted-foreground',
            large: 'text-lg font-semibold',
            small: 'text-sm font-medium leading-none',
            muted: 'text-sm text-muted-foreground',
            code: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        },
    },
    defaultVariants: { variant: 'p' },
});

type HtmlTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'small' | 'code' | 'span';

export interface TypographyProps
    extends React.HTMLAttributes<HTMLElement>,
        VariantProps<typeof typographyVariants> {
    as?: HtmlTag;
}

const elementMap: Record<string, HtmlTag> = {
    h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4',
    p: 'p', lead: 'p', large: 'div', small: 'small', muted: 'p', code: 'code',
};

export function Typography({ className, variant = 'p', as, ...props }: TypographyProps) {
    const Component = as || elementMap[variant as string] || 'p';
    return <Component className={cn(typographyVariants({ variant, className }))} {...props} />;
}
