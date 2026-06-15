import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'dud';
import { Check, X, Minus } from 'lucide-react';
import type { MatchWithPredictions } from '../data/useMatchData';
import type { RealResult } from './MatchCard';

interface AIScoreboardProps {
    open: boolean;
    onClose: () => void;
    allMatches: MatchWithPredictions[];
    realResults: Record<string, RealResult>;
}

/** AI 名称列表 */
const AI_NAMES = ['DeepSeek', '豆包', 'ChatGPT', 'Gemini', 'MiniMax', 'Qwen'];

/** 短日期 */
function shortDate(date: string): string {
    const parts = date.split('-');
    return `${parts[1]}/${parts[2]}`;
}

/**
 * AI 预测成绩弹窗
 * 表格：行 = 已出结果的比赛，列 = AI，底部汇总
 */
export function AIScoreboard({ open, onClose, allMatches, realResults }: AIScoreboardProps) {
    // 只取已出结果的比赛
    const scoredMatches = useMemo(() =>
        allMatches.filter((m) => realResults[m.match.id]),
    [allMatches, realResults]);

    // 计算每个 AI 猜对的场次
    const aiStats = useMemo(() => {
        const stats: Record<string, { correct: number; total: number }> = {};
        for (const name of AI_NAMES) {
            stats[name] = { correct: 0, total: 0 };
        }
        for (const m of scoredMatches) {
            const result = realResults[m.match.id];
            const realWinner = result.winner;
            for (const p of m.predictions) {
                if (stats[p.aiName]) {
                    stats[p.aiName].total++;
                    if (p.winner === realWinner) {
                        stats[p.aiName].correct++;
                    }
                }
            }
        }
        return stats;
    }, [scoredMatches, realResults]);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>AI 预测成绩单</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        仅统计已出结果的 {scoredMatches.length} 场比赛
                    </p>
                </DialogHeader>

                {/* 表格 —— 可滚动 */}
                <div className="flex-1 overflow-auto mt-4 rounded-md border -mx-1 sm:mx-0">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[120px] text-xs">比赛</TableHead>
                                {AI_NAMES.map((name) => (
                                    <TableHead key={name} className="text-center text-xs w-[72px]">
                                        {name}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scoredMatches.map((m) => {
                                const result = realResults[m.match.id];
                                const realWinner = result.winner;

                                return (
                                    <TableRow key={m.match.id}>
                                        <TableCell className="text-xs py-1.5">
                                            <span className="text-muted-foreground">{shortDate(m.match.date)}</span>
                                            <br />
                                            <span className="whitespace-nowrap">{m.match.home} vs {m.match.away}</span>
                                        </TableCell>
                                        {AI_NAMES.map((aiName) => {
                                            const pred = m.predictions.find((p) => p.aiName === aiName);
                                            if (!pred || !pred.winner) {
                                                return (
                                                    <TableCell key={aiName} className="text-center py-1.5">
                                                        <Minus size={12} className="text-muted-foreground/30 inline" />
                                                    </TableCell>
                                                );
                                            }
                                            const correct = pred.winner === realWinner;
                                            return (
                                                <TableCell key={aiName} className="text-center py-1.5">
                                                    {correct
                                                        ? <Check size={14} className="text-predict-correct inline" />
                                                        : <X size={14} className="text-muted-foreground/30 inline" />
                                                    }
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>

                        {/* 汇总行 */}
                        <TableHeader>
                            <TableRow className="border-t-2">
                                <TableHead className="text-xs font-bold">猜对场次</TableHead>
                                {AI_NAMES.map((name) => {
                                    const s = aiStats[name];
                                    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                                    return (
                                        <TableHead key={name} className="text-center text-xs">
                                            <span className="font-bold text-foreground">{s.correct}</span>
                                            <span className="text-muted-foreground font-normal">/{s.total}</span>
                                            <br />
                                            <span className="text-[10px] text-muted-foreground">{pct}%</span>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                    </Table>
                </div>

            </DialogContent>
        </Dialog>
    );
}
