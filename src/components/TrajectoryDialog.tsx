import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'dud';
import { Check, X } from 'lucide-react';
import { AI_NAMES, computeAIStats } from '../data/computeAIStats';
import { translateWinner as translate } from '../data/translations';
import type { MatchWithPredictions, PredictionSnapshot } from '../data/useMatchData';
import type { RealResult } from './MatchCard';

function shortDate(date: string): string {
    const parts = date.split('-');
    return `${parts[1]}/${parts[2]}`;
}

const AI_NAME_TO_KEY: Record<string, string> = {
    'DeepSeek': 'deepseek', '豆包': 'doubao', 'ChatGPT': 'chatgpt',
    'Gemini': 'gemini', 'MiniMax': 'minimax', 'Qwen': 'qwen',
};

/* ====== 子组件 ====== */

/** 圆形状态图标 */
function StatusIcon({ ok }: { ok: boolean | null }) {
    if (ok === null) return null;
    return (
        <span className={
            'inline-flex items-center justify-center w-[16px] h-[16px] rounded-full shrink-0'
            + (ok ? ' bg-predict-correct' : ' bg-muted-foreground/30')
        }>
            {ok
                ? <Check size={9} className="text-white" strokeWidth={3} />
                : <X size={9} className="text-white" strokeWidth={3} />
            }
        </span>
    );
}

/* ====== 主组件 ====== */

interface TrajectoryDialogProps {
    open: boolean;
    onClose: () => void;
    allMatches: MatchWithPredictions[];
    realResults: Record<string, RealResult>;
    snapshots: Record<string, PredictionSnapshot[]>;
}

export function TrajectoryDialog({ open, onClose, allMatches, realResults, snapshots }: TrajectoryDialogProps) {
    const [selectedAI, setSelectedAI] = useState(AI_NAMES[0]);
    const aiStats = useMemo(() => computeAIStats(allMatches, realResults), [allMatches, realResults]);

    const stats = aiStats[selectedAI] || { correct: 0, total: 0 };
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

    const aiKey = AI_NAME_TO_KEY[selectedAI] || '';
    const aiSnapshots = snapshots[aiKey] || [];
    const latestSnapshot = aiSnapshots.length > 0 ? aiSnapshots[aiSnapshots.length - 1] : null;

    function getTodayStr(): string {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    }

    /** 下一个比赛日的日期 */
    const nextMatchday = latestSnapshot?.nextMatchday || '';

    /** 从所有快照中聚合最新预测：遍历快照（从新到旧），取每个 match 的最近一次预测 */
    const aggregatedLatest = useMemo(() => {
        const map: Record<string, string> = {};
        for (let i = aiSnapshots.length - 1; i >= 0; i--) {
            const snap = aiSnapshots[i];
            for (const [matchId, pred] of Object.entries(snap.predictions)) {
                if (pred.winner && !map[matchId]) {
                    map[matchId] = pred.winner;
                }
            }
        }
        return map;
    }, [aiSnapshots]);

    /** 所有出现在任意快照中的 matchId */
    const allPredictedIds = useMemo(() => {
        const ids = new Set<string>();
        for (const snap of aiSnapshots) {
            for (const id of Object.keys(snap.predictions)) {
                if (snap.predictions[id]?.winner) ids.add(id);
            }
        }
        // 也加入初始预测的 match（用于赛前预测列）
        for (const m of allMatches) {
            const init = m.initialPredictions?.find((p) => p.aiName === selectedAI);
            if (init?.winner) ids.add(m.match.id);
        }
        return ids;
    }, [aiSnapshots, allMatches, selectedAI]);

    const predictedMatches = useMemo(() => {
        return allMatches.filter((m) => allPredictedIds.has(m.match.id));
    }, [allMatches, allPredictedIds]);

    function getLatestPrediction(matchId: string): string | null {
        // 聚合的最新预测优先
        if (aggregatedLatest[matchId]) return aggregatedLatest[matchId];
        // 过去的比赛：回退到赛前预测
        const matchDate = allMatches.find((m) => m.match.id === matchId)?.match.date || '';
        if (matchDate < getTodayStr()) {
            const match = allMatches.find((m) => m.match.id === matchId);
            return match?.initialPredictions?.find((p) => p.aiName === selectedAI)?.winner || null;
        }
        return null;
    }

    function hasDailyUpdate(matchId: string): boolean {
        return !!aggregatedLatest[matchId];
    }

    /** 弹窗打开或切换到预测记录时，自动滚动到今天 */
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            const today = getTodayStr();
            const el = document.getElementById(`traj-${today}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        return () => clearTimeout(timer);
    }, [open]);

    function isCorrect(matchId: string, predictedWinner: string | null): boolean | null {
        const result = realResults[matchId];
        if (!result || !predictedWinner) return null;
        return predictedWinner === result.winner;
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>AI 视角 · {selectedAI}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        正确率 {pct}%（{stats.correct}/{stats.total}）
                        {aiSnapshots.length > 0 && ` · ${aiSnapshots.length} 条评论`}
                    </p>
                </DialogHeader>

                <div className="flex gap-1.5 mt-3 flex-wrap">
                    {AI_NAMES.map((name) => (
                        <button key={name} onClick={() => setSelectedAI(name)}
                            className={
                                'text-xs px-3 py-1.5 rounded-md transition-colors border'
                                + (name === selectedAI
                                    ? ' bg-foreground text-background border-foreground font-medium'
                                    : ' bg-background text-muted-foreground border-border hover:bg-muted')
                            }>
                            {name}
                        </button>
                    ))}
                </div>

                    <div className="flex-1 overflow-auto mt-3">
                        <div className="grid grid-cols-[1fr_70px_1fr] sm:grid-cols-[1fr_90px_1fr] gap-1 sm:gap-2 px-1 sm:px-2 py-1.5 text-[10px] font-medium text-muted-foreground sticky top-0 bg-background z-10 border-b">
                            <span>赛前</span>
                            <span className="text-center">VS</span>
                            <span className="text-right">最新</span>
                        </div>
                        {predictedMatches.map((m) => {
                            const init = m.initialPredictions?.find((p) => p.aiName === selectedAI);
                            const initW = init?.winner || null;
                            const latestW = getLatestPrediction(m.match.id);
                            const changed = hasDailyUpdate(m.match.id) && initW && latestW && initW !== latestW;
                            const result = realResults[m.match.id];
                            const initOk = isCorrect(m.match.id, initW);
                            const latestOk = isCorrect(m.match.id, latestW);

                            // 该比赛是否属于下一个比赛日
                            const isNextMatchday = nextMatchday && m.match.date === nextMatchday;

                            return (
                                <div key={m.match.id}
                                    id={`traj-${m.match.date}`}
                                    className={'grid grid-cols-[1fr_70px_1fr] sm:grid-cols-[1fr_90px_1fr] gap-1 sm:gap-2 px-1 sm:px-2 py-2 border-b border-border/50 text-xs'
                                        + (changed ? ' bg-amber-50/50' : '')
                                        + (isNextMatchday ? ' bg-blue-50/50' : '')}>
                                    {/* 赛前预测 */}
                                    <div className="flex items-center gap-1.5">
                                        <StatusIcon ok={initOk} />
                                        <span className={initOk === true ? 'font-medium text-predict-correct'
                                            : initOk === false ? 'text-muted-foreground/50'
                                            : initW ? 'font-medium' : 'text-muted-foreground'}>
                                            {translate(initW)}
                                        </span>
                                    </div>
                                    {/* 对阵信息 */}
                                    <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                        <span className="text-[10px] text-foreground font-bold truncate w-full">
                                            {shortDate(m.match.date)}
                                        </span>
                                        <span className="text-[10px] leading-tight text-muted-foreground/70 truncate w-full">
                                            {m.match.home} vs {m.match.away}
                                        </span>
                                        {changed && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">已变更</span>}
                                        {result && <span className="text-[9px] text-muted-foreground">{result.homeScore}:{result.awayScore}</span>}
                                    </div>
                                    {/* 最新预测 */}
                                    <div className="flex items-center gap-1.5 justify-end text-right">
                                        <span className={changed ? 'font-bold text-foreground'
                                            : latestOk === true ? 'font-medium text-predict-correct'
                                            : latestOk === false ? 'text-muted-foreground/50'
                                            : latestW ? 'font-medium' : 'text-muted-foreground'}>
                                            {translate(latestW)}
                                        </span>
                                        {changed && <span className="text-[9px] text-amber-600 font-medium">*改</span>}
                                        {!hasDailyUpdate(m.match.id) && latestW && (
                                            <span className="text-[9px] text-muted-foreground/50">未更新</span>
                                        )}
                                        <StatusIcon ok={latestOk} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

            </DialogContent>
        </Dialog>
    );
}
