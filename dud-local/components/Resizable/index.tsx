import * as React from 'react';
import { cn } from '../../lib/utils';

/* ====== ResizablePanelGroup ====== */

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    direction?: 'horizontal' | 'vertical';
}

function ResizablePanelGroup({ className, direction = 'horizontal', children, ...props }: ResizablePanelGroupProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [sizes, setSizes] = React.useState<number[]>([]);
    const dragRef = React.useRef<{ index: number; startX: number; startY: number; startSizes: number[] } | null>(null);

    const isHorizontal = direction === 'horizontal';
    const panels = React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && (child.type as any)?.displayName === 'ResizablePanel',
    );

    React.useEffect(() => {
        if (sizes.length === 0 && panels.length > 0) {
            const defaults = panels.map((panel) => {
                if (React.isValidElement(panel)) {
                    return (panel.props as any).defaultSize ?? 100 / panels.length;
                }
                return 100 / panels.length;
            });
            setSizes(defaults);
        }
    }, [panels.length]);

    const handleMouseDown = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        dragRef.current = { index, startX: e.clientX, startY: e.clientY, startSizes: [...sizes] };
    };

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current || !containerRef.current) return;
            const { index, startX, startY, startSizes } = dragRef.current;
            const rect = containerRef.current.getBoundingClientRect();
            const totalSize = isHorizontal ? rect.width : rect.height;
            const delta = isHorizontal ? e.clientX - startX : e.clientY - startY;
            const deltaPercent = (delta / totalSize) * 100;

            const newSizes = [...startSizes];
            newSizes[index] = Math.max(10, Math.min(90, startSizes[index] + deltaPercent));
            newSizes[index + 1] = Math.max(10, Math.min(90, startSizes[index + 1] - deltaPercent));
            setSizes(newSizes);
        };

        const handleMouseUp = () => { dragRef.current = null; };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isHorizontal]);

    const handles = React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && (child.type as any)?.displayName === 'ResizableHandle',
    );

    return (
        <div
            ref={containerRef}
            className={cn('flex', isHorizontal ? 'flex-row' : 'flex-col', className)}
            {...props}
        >
            {panels.map((panel, i) => (
                <React.Fragment key={i}>
                    {React.cloneElement(panel as React.ReactElement<any>, {
                        style: { ...((panel as React.ReactElement<any>).props.style), flexBasis: `${sizes[i] ?? 0}%`, flexGrow: 0, flexShrink: 0 },
                    })}
                    {i < panels.length - 1 && handles[i] && (
                        <div
                            onMouseDown={(e) => handleMouseDown(e, i)}
                            className="flex-shrink-0"
                        >
                            {React.cloneElement(handles[i] as React.ReactElement<any>, {
                                orientation: isHorizontal ? 'vertical' : 'horizontal',
                            })}
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

ResizablePanelGroup.displayName = 'ResizablePanelGroup';

/* ====== ResizablePanel ====== */

interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultSize?: number;
}

function ResizablePanel({ className, defaultSize, style, ...props }: ResizablePanelProps) {
    return <div className={cn('overflow-auto', className)} style={style} {...props} />;
}

ResizablePanel.displayName = 'ResizablePanel';

/* ====== ResizableHandle ====== */

interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 由 ResizablePanelGroup 自动传入，无需手动设置 */
    orientation?: 'vertical' | 'horizontal';
    /** 是否显示拖拽手柄指示器 */
    withHandle?: boolean;
}

function ResizableHandle({ className, orientation = 'vertical', withHandle, ...props }: ResizableHandleProps) {
    return (
        <div
            data-slot="resizable-handle"
            aria-orientation={orientation}
            className={cn(
                'relative flex items-center justify-center bg-border ring-offset-background',
                'after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'aria-[orientation=vertical]:w-px aria-[orientation=vertical]:h-full aria-[orientation=vertical]:cursor-col-resize',
                'aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:cursor-row-resize',
                'aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full',
                'aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2',
                className,
            )}
            {...props}
        >
            {withHandle && (
                <div
                    className={cn(
                        'z-10 flex shrink-0 rounded-lg bg-border',
                        orientation === 'vertical' ? 'h-6 w-1' : 'h-1 w-6',
                    )}
                />
            )}
        </div>
    );
}

ResizableHandle.displayName = 'ResizableHandle';

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
