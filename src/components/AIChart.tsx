import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'dud';
import { computeAIStats, getScoredMatches, AI_NAMES } from '../data/computeAIStats';
import type { MatchWithPredictions } from '../data/useMatchData';
import type { RealResult } from './MatchCard';

interface AIChartProps {
    open: boolean;
    onClose: () => void;
    allMatches: MatchWithPredictions[];
    realResults: Record<string, RealResult>;
}

/**
 * AI 预测成绩图表弹窗
 * 水平柱状图：展示每个 AI 的正确率
 */
export function AIChart({ open, onClose, allMatches, realResults }: AIChartProps) {
    const scoredMatches = useMemo(() => getScoredMatches(allMatches, realResults), [allMatches, realResults]);
    const aiStats = useMemo(() => computeAIStats(allMatches, realResults), [allMatches, realResults]);

    // 最高正确数
    const maxCorrect = useMemo(() => {
        let max = 0;
        for (const name of AI_NAMES) {
            const s = aiStats[name];
            if (s && s.correct > max) max = s.correct;
        }
        return max;
    }, [aiStats]);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>AI 预测正确率</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        已统计 {scoredMatches.length} 场比赛
                    </p>
                </DialogHeader>

                <div className="mt-6 space-y-4">
                    {AI_NAMES.map((name) => {
                        const s = aiStats[name];
                        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                        const barWidth = pct; // 直接使用百分比，以 100% 为基准

                        return (
                            <div key={name} className="flex items-center gap-3">
                                {/* 标签 */}
                                <span className="text-sm text-foreground w-20 shrink-0 text-right">
                                    {s.correct === maxCorrect && '👑 '}{name}
                                </span>
                                {/* 进度条 */}
                                <div className="flex-1 h-7 bg-muted rounded-sm relative overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-foreground rounded-sm transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                                {/* 数字 */}
                                <span className="text-sm text-muted-foreground w-24 shrink-0">
                                    <span className="font-semibold text-foreground">{s.correct}</span>
                                    <span>/{s.total}</span>
                                    <span className="ml-1 text-xs">({pct}%)</span>
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* 图例 */}
                <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-foreground rounded-sm" />
                        正确
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-muted rounded-sm" />
                        错误/无预测
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
