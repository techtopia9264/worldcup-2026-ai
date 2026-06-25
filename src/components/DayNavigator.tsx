import { useEffect, useRef } from 'react';
import type { DayGroup } from '../data/useMatchData';

interface DayNavigatorProps {
    days: DayGroup[];
    activeDate: string;
    onSelectDate: (date: string) => void;
}

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

/**
 * 底部固定日期导航条
 * 横向平铺，可滚动，自动滚动到今天，上阴影
 */
export function DayNavigator({ days, activeDate, onSelectDate }: DayNavigatorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLButtonElement>(null);

    // 自动滚动到今天
    useEffect(() => {
        if (todayRef.current && containerRef.current) {
            const container = containerRef.current;
            const todayBtn = todayRef.current;
            const scrollLeft = todayBtn.offsetLeft - container.clientWidth / 2 + todayBtn.clientWidth / 2;
            container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
    }, []);

    // 选中项变化时也滚动到可视区域
    useEffect(() => {
        if (!containerRef.current) return;
        const activeBtn = containerRef.current.querySelector(`[data-date="${activeDate}"]`) as HTMLElement;
        if (activeBtn) {
            const scrollLeft = activeBtn.offsetLeft - containerRef.current.clientWidth / 2 + activeBtn.clientWidth / 2;
            containerRef.current.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
    }, [activeDate]);

    const today = getTodayStr();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] pb-safe">
            <div
                ref={containerRef}
                className="flex gap-0.5 overflow-x-auto px-3 pt-2 pb-1 no-scrollbar items-end"
            >
                {days.map((day, i) => {
                    const isToday = day.date === today;
                    const isActive = day.date === activeDate;
                    const isPast = day.date < today;
                    // 只在阶段变化时显示标签
                    const prevStage = i > 0 ? days[i - 1].stageLabel : '';
                    const showLabel = day.stageLabel && day.stageLabel !== prevStage;

                    let btnClass =
                        'text-[11px] py-1 rounded-full transition-colors shrink-0 whitespace-nowrap flex flex-col items-center min-w-[42px]';

                    if (isActive) {
                        btnClass += ' bg-foreground text-background font-semibold px-2.5';
                    } else if (isPast) {
                        btnClass += ' text-muted-foreground/50 hover:bg-muted px-2';
                    } else {
                        btnClass += ' text-muted-foreground hover:bg-muted px-2';
                    }

                    return (
                        <button
                            key={day.date}
                            ref={isToday ? todayRef : undefined}
                            data-date={day.date}
                            onClick={() => onSelectDate(day.date)}
                            className={btnClass}
                        >
                            {isToday ? '今天' : day.dateLabel.replace(/月/, '/').replace('日', '')}
                            {showLabel && (
                                <span className="text-[9px] opacity-60 leading-tight">
                                    {day.stageLabel}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
