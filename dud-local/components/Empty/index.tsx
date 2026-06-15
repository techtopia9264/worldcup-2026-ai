import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
}

/** Empty 空状态组件 */
export function Empty({ icon, title = '暂无数据', description, className, children, ...props }: EmptyProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)} {...props}>
            <div className="text-muted-foreground/50 mb-4">
                {icon || <Inbox size={48} strokeWidth={1.5} />}
            </div>
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            {children && <div className="mt-4">{children}</div>}
        </div>
    );
}
