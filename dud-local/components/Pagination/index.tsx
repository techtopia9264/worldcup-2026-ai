import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, type ButtonProps } from '../Button/index';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
    return <nav role="navigation" aria-label="分页" className={cn('mx-auto flex w-full justify-center', className)} {...props} />;
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
    return <ul className={cn('flex flex-row items-center gap-1', className)} {...props} />;
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
    return <li {...props} />;
}

function PaginationLink({ className, isActive, size = 'icon', ...props }: ButtonProps & { isActive?: boolean }) {
    return (
        <Button
            aria-current={isActive ? 'page' : undefined}
            variant={isActive ? 'outline' : 'ghost'}
            size={size}
            className={cn(isActive && 'border-primary text-primary', className)}
            {...props}
        />
    );
}

function PaginationPrevious({ className, ...props }: ButtonProps) {
    return (
        <PaginationLink aria-label="上一页" size="default" className={cn('gap-1 pl-2.5', className)} {...props}>
            <ChevronLeft className="h-4 w-4" />
            <span>上一页</span>
        </PaginationLink>
    );
}

function PaginationNext({ className, ...props }: ButtonProps) {
    return (
        <PaginationLink aria-label="下一页" size="default" className={cn('gap-1 pr-2.5', className)} {...props}>
            <span>下一页</span>
            <ChevronRight className="h-4 w-4" />
        </PaginationLink>
    );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span aria-hidden className={cn('flex h-9 w-9 items-center justify-center', className)} {...props}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">更多页</span>
        </span>
    );
}

export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
