import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Skeleton 骨架屏 — 用于内容加载时的占位
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
    return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
