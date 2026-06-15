interface DayDividerProps {
    dateLabel: string;
    weekdayLabel: string;
}

/**
 * 日期分割线
 * ━━ 6月12日 · 周四 ━━
 */
export function DayDivider({ dateLabel, weekdayLabel }: DayDividerProps) {
    return (
        <div className="flex items-center gap-4 py-8 first:pt-0">
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-base font-semibold text-foreground">{dateLabel}</span>
                <span className="text-sm text-muted-foreground">{weekdayLabel}</span>
            </div>
            <div className="flex-1 h-px bg-border" />
        </div>
    );
}
