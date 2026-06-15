import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { PanelLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../Button/index';
import { Sheet, SheetContent } from '../Sheet/index';

interface SidebarContextValue {
    state: 'expanded' | 'collapsed';
    open: boolean;
    setOpen: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
    const ctx = React.useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
    return ctx;
}

function SidebarProvider({ defaultOpen = true, open: openProp, onOpenChange, children }: {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}) {
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback((v: boolean) => { _setOpen(v); onOpenChange?.(v); }, [onOpenChange]);

    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const state: SidebarContextValue['state'] = open ? 'expanded' : 'collapsed';
    const toggleSidebar = React.useCallback(() => setOpen(!open), [open, setOpen]);

    return (
        <SidebarContext.Provider value={{ state, open, setOpen, isMobile, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

function Sidebar({ className, children }: { className?: string; children: React.ReactNode }) {
    const { isMobile, open, setOpen } = useSidebar();

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="w-[--sidebar-width] p-0">
                    <div className="flex h-full flex-col">{children}</div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <aside
            data-state={open ? 'expanded' : 'collapsed'}
            className={cn(
                'group/sidebar flex h-screen flex-col border-r bg-background text-foreground transition-[width] duration-200',
                open ? 'w-[--sidebar-width]' : 'w-[--sidebar-width-icon]',
                className,
            )}
        >
            {children}
        </aside>
    );
}

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
    const { toggleSidebar } = useSidebar();
    return <Button variant="ghost" size="icon" className={cn('h-7 w-7', className)} onClick={toggleSidebar} {...props}><PanelLeft /><span className="sr-only">切换侧边栏</span></Button>;
}

function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col gap-2 p-2', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
    return <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
    return <li className={cn('group/menu-item relative', className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:hover:text-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
    { variants: { variant: { default: 'hover:bg-accent hover:text-accent-foreground', outline: 'bg-background shadow-[0_0_0_1px_hsl(var(--border))] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--accent))]' }, size: { default: 'h-8 text-sm', sm: 'h-7 text-xs', lg: 'h-12 text-sm' } }, defaultVariants: { variant: 'default', size: 'default' } },
);

function SidebarMenuButton({
    asChild = false, isActive = false, variant, size, className, ...props
}: React.ComponentProps<'button'> & { asChild?: boolean; isActive?: boolean } & VariantProps<typeof sidebarMenuButtonVariants>) {
    const Comp = asChild ? Slot : 'button';
    return <Comp data-active={isActive} className={cn(sidebarMenuButtonVariants({ variant, size, className }))} {...props} />;
}

function SidebarGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />;
}

function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<'div'> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'div';
    return <Comp className={cn('mb-1 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-[margin,opacity] duration-200 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0', className)} {...props} />;
}

export {
    Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel,
    SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger,
    useSidebar,
    sidebarMenuButtonVariants,
};
