import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
}

/**
 * Spinner 加载旋转器 — 简单的加载状态指示器
 */
export function Spinner({ className, size = 16, ...props }: SpinnerProps) {
    return (
        <div role="status" className={cn('inline-flex', className)} {...props}>
            <Loader2 className="animate-spin text-muted-foreground" size={size} />
            <span className="sr-only">加载中...</span>
        </div>
    );
}
