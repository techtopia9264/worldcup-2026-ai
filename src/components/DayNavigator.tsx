import { useEffect, useState } from 'react';
import type { DayGroup } from '../data/useMatchData';

interface DayNavigatorProps {
    days: DayGroup[];
}

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

/** 格式化日期为缩写，如 "06/12" */
function shortDate(dateStr: string): string {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
}

/**
 * 右侧固定日期导航
 * 点击跳转到对应日期，高亮当前可视日期
 */
export function DayNavigator({ days }: DayNavigatorProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // 监听滚动，高亮当前可视区域内的日期
    useEffect(() => {
        const handleScroll = () => {
            for (let i = days.length - 1; i >= 0; i--) {
                const el = document.getElementById(`day-${days[i].date}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // 分割线进入视口上半部就算当前天
                    if (rect.top <= window.innerHeight * 0.3) {
                        setActiveIndex(i);
                        return;
                    }
                }
            }
            setActiveIndex(0);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [days]);

    /** 点击跳转 */
    function scrollToDay(date: string) {
        const el = document.getElementById(`day-${date}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    return (
        <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
            <div className="grid grid-cols-3 gap-0.5 bg-background/80 backdrop-blur rounded-lg border p-1.5 shadow-sm">
                {days.map((day, i) => {
                    const isToday = day.date === getTodayStr();
                    const isPast = day.date < getTodayStr();

                    let btnClass = 'text-[11px] px-1.5 py-1 rounded text-center transition-colors hover:bg-muted whitespace-nowrap w-11';

                    if (i === activeIndex) {
                        btnClass += ' bg-foreground text-background hover:bg-foreground/90 font-medium';
                    } else if (isPast) {
                        btnClass += ' text-muted-foreground/40';
                    } else {
                        btnClass += ' text-muted-foreground';
                    }

                    return (
                        <button
                            key={day.date}
                            onClick={() => scrollToDay(day.date)}
                            className={btnClass}
                            title={day.dateLabel + ' ' + day.weekdayLabel}
                        >
                            {isToday ? '今天' : shortDate(day.date)}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
