import * as React from 'react';
import { cn } from '../../lib/utils';

interface DrawerProps {
    open?: boolean;
    onClose?: () => void;
    children: React.ReactNode;
    side?: 'left' | 'right' | 'top' | 'bottom';
    className?: string;
    overlayClassName?: string;
}

/** 简易 Drawer 抽屉 — 不依赖 vaul，纯 CSS 实现 */
export function Drawer({ open = false, onClose, children, side = 'right', className, overlayClassName }: DrawerProps) {
    if (!open) return null;

    const sideClasses: Record<string, string> = {
        right: 'right-0 top-0 h-full w-80 border-l animate-in slide-in-from-right',
        left: 'left-0 top-0 h-full w-80 border-r animate-in slide-in-from-left',
        top: 'top-0 left-0 w-full h-80 border-b animate-in slide-in-from-top',
        bottom: 'bottom-0 left-0 w-full h-80 border-t animate-in slide-in-from-bottom',
    };

    return (
        <>
            <div className={cn('fixed inset-0 z-50 bg-black/50', overlayClassName)} onClick={onClose} />
            <div className={cn('fixed z-50 bg-background shadow-lg', sideClasses[side], className)}>
                {children}
            </div>
        </>
    );
}
