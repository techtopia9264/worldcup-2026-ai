import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'dud';
import { Calendar, MessageCircle, ArrowRightLeft } from 'lucide-react';
import { AI_NAMES } from '../data/computeAIStats';
import { translateWinner as translate } from '../data/translations';
import type { PredictionSnapshot } from '../data/useMatchData';

const AI_NAME_TO_KEY: Record<string, string> = {
    'DeepSeek': 'deepseek', '豆包': 'doubao', 'ChatGPT': 'chatgpt',
    'Gemini': 'gemini', 'MiniMax': 'minimax', 'Qwen': 'qwen',
};

const AI_COLORS: Record<string, string> = {
    'DeepSeek': 'border-l-blue-500',
    '豆包': 'border-l-green-500',
    'ChatGPT': 'border-l-purple-500',
    'Gemini': 'border-l-amber-500',
    'MiniMax': 'border-l-rose-500',
    'Qwen': 'border-l-cyan-500',
};

interface CommentaryDialogProps {
    open: boolean;
    onClose: () => void;
    snapshots: Record<string, PredictionSnapshot[]>;
}

/** 扁平化后的锐评条目 */
interface CommentaryEntry {
    date: string;
    aiName: string;
    aiKey: string;
    commentary: string;
    nextMatchday?: string;
    changedPredictions: { match: string; oldWinner: string; newWinner: string; reason: string }[];
}

/**
 * AI 每日锐评弹窗
 * 汇集 6 个 AI 的每日点评，按日期倒序展示
 */
export function CommentaryDialog({ open, onClose, snapshots }: CommentaryDialogProps) {
    const [selectedAI, setSelectedAI] = useState<string>('all');

    // 扁平化所有 AI 的锐评
    const allEntries = useMemo(() => {
        const entries: CommentaryEntry[] = [];
        for (const [aiKey, aiSnapshots] of Object.entries(snapshots)) {
            const aiName = AI_NAMES.find((n) => AI_NAME_TO_KEY[n] === aiKey) || aiKey;
            for (const snap of aiSnapshots) {
                if (snap.commentary) {
                    entries.push({
                        date: snap.date,
                        aiName,
                        aiKey,
                        commentary: snap.commentary,
                        nextMatchday: snap.nextMatchday,
                        changedPredictions: snap.changedPredictions || [],
                    });
                }
            }
        }
        entries.sort((a, b) => b.date.localeCompare(a.date) || a.aiName.localeCompare(b.aiName));
        return entries;
    }, [snapshots]);

    const filteredEntries = useMemo(() => {
        if (selectedAI === 'all') return allEntries;
        const targetKey = AI_NAME_TO_KEY[selectedAI] || selectedAI;
        return allEntries.filter((e) => e.aiKey === targetKey);
    }, [allEntries, selectedAI]);

    // 按日期分组
    const dateGroups = useMemo(() => {
        const map: Record<string, CommentaryEntry[]> = {};
        for (const entry of filteredEntries) {
            if (!map[entry.date]) map[entry.date] = [];
            map[entry.date].push(entry);
        }
        return map;
    }, [filteredEntries]);

    const sortedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));

    // 统计每个 AI 的发言次数
    const aiCounts = useMemo(() => {
        const counts: Record<string, number> = { all: allEntries.length };
        for (const name of AI_NAMES) {
            counts[name] = allEntries.filter((e) => e.aiName === name).length;
        }
        return counts;
    }, [allEntries]);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle size={18} />
                        AI 每日锐评
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        6 个 AI 老哥的每日辣评，谁最懂球？
                    </p>
                </DialogHeader>

                {/* AI 筛选按钮 — 紧凑文本风格 */}
                <div className="flex gap-0.5 mt-2 flex-wrap">
                    <button onClick={() => setSelectedAI('all')}
                        className={
                            'text-[11px] px-2 py-1 rounded transition-colors'
                            + (selectedAI === 'all'
                                ? ' text-foreground font-semibold underline underline-offset-4'
                                : ' text-muted-foreground hover:text-foreground')
                        }>
                        全部 ({aiCounts.all})
                    </button>
                    {AI_NAMES.map((name) => (
                        <button key={name} onClick={() => setSelectedAI(name)}
                            className={
                                'text-[11px] px-2 py-1 rounded transition-colors'
                                + (name === selectedAI
                                    ? ' text-foreground font-semibold underline underline-offset-4'
                                    : ' text-muted-foreground hover:text-foreground')
                            }>
                            {name} ({aiCounts[name] || 0})
                        </button>
                    ))}
                </div>

                {/* 锐评列表 */}
                <div className="flex-1 overflow-auto mt-3 space-y-4">
                    {filteredEntries.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-12">
                            暂无锐评，AI 老哥们还没开始唠 🍿
                        </p>
                    )}

                    {sortedDates.map((date) => (
                        <div key={date}>
                            {/* 日期标题 */}
                            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1 z-10">
                                <Calendar size={13} className="text-muted-foreground shrink-0" />
                                <span className="text-xs font-bold text-foreground">{date}</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* 该日期下所有 AI 的锐评 */}
                            <div className="space-y-2">
                                {dateGroups[date].map((entry, idx) => (
                                    <div key={`${entry.date}-${entry.aiKey}-${idx}`}
                                        className={'border rounded-lg p-3 border-l-[3px] '
                                            + (AI_COLORS[entry.aiName] || 'border-l-muted-foreground/30')}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-medium text-foreground">
                                                {entry.aiName}
                                            </span>
                                            {entry.nextMatchday && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    → 预测 {entry.nextMatchday}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                            {entry.commentary}
                                        </p>
                                        {entry.changedPredictions.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <ArrowRightLeft size={10} className="text-muted-foreground" />
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        预测调整
                                                    </span>
                                                </div>
                                                {entry.changedPredictions.map((c, i) => (
                                                    <div key={i} className="text-[10px] text-muted-foreground ml-4">
                                                        {c.match} · {translate(c.oldWinner)} →{' '}
                                                        <span className="text-foreground font-medium">
                                                            {translate(c.newWinner)}
                                                        </span>
                                                        <span className="ml-1">— {c.reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
