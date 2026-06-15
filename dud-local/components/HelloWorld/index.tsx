import { Smile } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface HelloWorldProps {
    /** 要问候的名称，默认为"世界" */
    name?: string;
    /** 自定义 CSS 类名 */
    className?: string;
}

/**
 * HelloWorld 组件 — DuD 的第一个组件
 */
export function HelloWorld({
    name = '世界',
    className,
}: HelloWorldProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-6',
                'border border-border rounded-lg bg-background',
                'text-center transition-shadow hover:shadow-md',
                className,
            )}
        >
            <Smile className="w-12 h-12 text-primary mb-3" />
            <h1 className="text-2xl font-semibold text-foreground mb-2">
                你好，{name}！
            </h1>
            <p className="text-sm text-muted-foreground">
                欢迎使用 DuD 组件库 🎉
            </p>
        </div>
    );
}
