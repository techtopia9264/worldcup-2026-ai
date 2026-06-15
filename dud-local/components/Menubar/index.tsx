import * as React from 'react';
import * as MenubarPrimitive from '@radix-ui/react-menubar';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

function Menubar({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Root>) {
    return <MenubarPrimitive.Root className={cn('flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm', className)} {...props} />;
}

function MenubarMenu({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
    return <MenubarPrimitive.Menu data-slot="menubar-menu" {...props} />;
}

function MenubarTrigger({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
    return (
        <MenubarPrimitive.Trigger
            className={cn('flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground', className)}
            {...props}
        />
    );
}

function MenubarContent({ className, align = 'start', sideOffset = 8, ...props }: React.ComponentProps<typeof MenubarPrimitive.Content>) {
    return (
        <MenubarPrimitive.Portal>
            <MenubarPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                    'z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
                    'data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    className,
                )}
                {...props}
            />
        </MenubarPrimitive.Portal>
    );
}

function MenubarItem({ className, inset, ...props }: React.ComponentProps<typeof MenubarPrimitive.Item> & { inset?: boolean }) {
    return (
        <MenubarPrimitive.Item
            className={cn('relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0', inset && 'pl-8', className)}
            {...props}
        />
    );
}

function MenubarCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem>) {
    return (
        <MenubarPrimitive.CheckboxItem className={cn('relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} checked={checked} {...props}>
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><MenubarPrimitive.ItemIndicator><Check className="h-4 w-4" /></MenubarPrimitive.ItemIndicator></span>
            {children}
        </MenubarPrimitive.CheckboxItem>
    );
}

function MenubarRadioItem({ className, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.RadioItem>) {
    return (
        <MenubarPrimitive.RadioItem className={cn('relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props}>
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><MenubarPrimitive.ItemIndicator><Circle className="h-2 w-2 fill-current" /></MenubarPrimitive.ItemIndicator></span>
            {children}
        </MenubarPrimitive.RadioItem>
    );
}

function MenubarSeparator({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
    return <MenubarPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />;
}

function MenubarShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
    return <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />;
}

function MenubarSub({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
    return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }) {
    return (
        <MenubarPrimitive.SubTrigger className={cn('flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0', inset && 'pl-8', className)} {...props}>
            {children}<ChevronRight className="ml-auto h-4 w-4" />
        </MenubarPrimitive.SubTrigger>
    );
}

function MenubarSubContent({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
    return (
        <MenubarPrimitive.SubContent className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95', className)} {...props} />
    );
}

export {
    Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
    MenubarSeparator, MenubarShortcut, MenubarCheckboxItem, MenubarRadioItem,
    MenubarSub, MenubarSubTrigger, MenubarSubContent,
};
