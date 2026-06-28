import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from 'dud';
import { AI_NAMES, computeAIStats } from '../data/computeAIStats';
import { translateWinner as translate } from '../data/translations';
import { Trophy, Medal, Star, Target, Circle, Smile, Frown } from 'lucide-react';
import type { MatchWithPredictions, PredictionSnapshot } from '../data/useMatchData';
import type { RealResult } from './MatchCard';

const AI_NAME_TO_KEY: Record<string, string> = {
    'DeepSeek': 'deepseek', 'DouBao': 'doubao', 'ChatGPT': 'chatgpt',
    'Gemini': 'gemini', 'MiniMax': 'minimax', 'Qwen': 'qwen',
};

interface TrajectoryDialogProps {
    open: boolean;
    onClose: () => void;
    allMatches: MatchWithPredictions[];
    realResults: Record<string, RealResult>;
    snapshots: Record<string, PredictionSnapshot[]>;
}

type Tab = 'init' | 'latest';

export function TrajectoryDialog({ open, onClose, allMatches, realResults, snapshots }: TrajectoryDialogProps) {
    const [selectedAI, setSelectedAI] = useState(AI_NAMES[0]);
    const [tab, setTab] = useState<Tab>('latest');
    const aiStats = useMemo(() => computeAIStats(allMatches, realResults), [allMatches, realResults]);

    const stats = aiStats[selectedAI] || { correct: 0, total: 0 };
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

    const aiKey = AI_NAME_TO_KEY[selectedAI] || '';
    const aiSnapshots = snapshots[aiKey] || [];

    // 聚合最新预测（从新到旧，每个matchId取首次出现的非空winner）
    const aggregatedLatest = useMemo(() => {
        const map: Record<string, { winner: string; score?: string }> = {};
        for (let i = aiSnapshots.length - 1; i >= 0; i--) {
            for (const [matchId, pred] of Object.entries(aiSnapshots[i].predictions)) {
                if (pred.winner && !map[matchId]) {
                    map[matchId] = { winner: pred.winner, score: pred.score };
                }
            }
        }
        return map;
    }, [aiSnapshots]);

    // 按日期分组
    const dateGroups = useMemo(() => {
        const map: Record<string, MatchWithPredictions[]> = {};
        for (const m of allMatches) {
            if (!map[m.match.date]) map[m.match.date] = [];
            map[m.match.date].push(m);
        }
        return map;
    }, [allMatches]);

    /** 从 matchId 推断阶段标签 */
    function getStageLabel(matchId: string, stage: string): string {
        if (stage === 'group') {
            const idx = parseInt(matchId.split('-')[1] || '0', 10);
            const round = idx < 2 ? 'G1' : idx < 4 ? 'G2' : 'G3';
            return `小组赛 ${round}`;
        }
        const labels: Record<string, string> = {
            round_of_32: '32强赛', round_of_16: '16强赛', quarterfinals: '¼决赛',
            semifinals: '半决赛', third_place: '三四名', final: '决赛',
        };
        return labels[stage] || '';
    }

    /** 根据比赛阶段返回对应图标 */
    function getStageIcon(stage: string) {
        const cls = 'shrink-0 text-muted-foreground';
        switch (stage) {
            case 'final': return <Trophy size={13} className={cls + ' text-amber-500'} />;
            case 'third_place': return <Medal size={13} className={cls} />;
            case 'semifinals': return <Star size={12} className={cls} />;
            case 'quarterfinals': return <Target size={12} className={cls} />;
            case 'round_of_16': return <Circle size={8} className={cls} strokeWidth={3} />;
            case 'round_of_32': return <Circle size={6} className={cls} strokeWidth={3} />;
            default: return <Circle size={6} className={cls + ' opacity-0'} />;
        }
    }

    const sortedDates = Object.keys(dateGroups).sort();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    // 切换 Tab 或打开弹窗时，自动滚动到今天
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            const el = document.getElementById(`traj-date-${today}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
        return () => clearTimeout(timer);
    }, [open, tab, selectedAI]);

    function isCorrect(matchId: string, predictedWinner: string | null): boolean | null {
        const result = realResults[matchId];
        if (!result || !predictedWinner) return null;
        return predictedWinner === result.winner;
    }

    function getInitPrediction(m: MatchWithPredictions) {
        return m.initialPredictions?.find((p) => p.aiName === selectedAI);
    }

    function getLatestPrediction(m: MatchWithPredictions) {
        const id = m.match.id;
        if (aggregatedLatest[id]) return aggregatedLatest[id];
        // 回退到初始预测
        const init = getInitPrediction(m);
        if (init?.winner) return init;
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>AI 视角 · {selectedAI}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                            {pct}%（{stats.correct}/{stats.total}）
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {/* AI 文本按钮 */}
                <div className="flex gap-0.5 mt-2 flex-wrap">
                    {AI_NAMES.map((name) => (
                        <button key={name} onClick={() => setSelectedAI(name)}
                            className={
                                'text-[11px] px-2 py-1 rounded transition-colors'
                                + (name === selectedAI
                                    ? ' text-foreground font-semibold underline underline-offset-4'
                                    : ' text-muted-foreground hover:text-foreground')
                            }>
                            {name}
                        </button>
                    ))}
                </div>

                {/* Tab 切换 */}
                <div className="flex gap-0 border-b mt-2">
                    <button onClick={() => setTab('init')}
                        className={'px-3 py-1.5 text-xs border-b-2 transition-colors -mb-[1px]'
                            + (tab === 'init' ? ' border-foreground text-foreground font-medium' : ' border-transparent text-muted-foreground hover:text-foreground')}>
                        赛前
                    </button>
                    <button onClick={() => setTab('latest')}
                        className={'px-3 py-1.5 text-xs border-b-2 transition-colors -mb-[1px]'
                            + (tab === 'latest' ? ' border-foreground text-foreground font-medium' : ' border-transparent text-muted-foreground hover:text-foreground')}>
                        最新
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-auto mt-2">
                    {sortedDates.map((date) => {
                        const matches = dateGroups[date];

                        const hasContent = matches.some((m) => {
                            if (tab === 'init') return !!getInitPrediction(m)?.winner;
                            if (tab === 'latest') return m.match.date > tomorrow || !!getLatestPrediction(m);
                            return false;
                        });
                        if (!hasContent) return null;

                        return (
                            <div key={date}>
                                {/* 日期分割线 */}
                                <div id={`traj-date-${date}`} className="flex items-center gap-2 my-2 sticky top-0 bg-background py-1 z-10">
                                    <span className="text-[11px] font-bold text-foreground">
                                        {date === today ? '今天' : date}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                        {getStageLabel(matches[0].match.id, matches[0].match.stage)}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                <div className="space-y-1.5">
                                    {matches.map((m) => {
                                        const pred = tab === 'init' ? getInitPrediction(m) : getLatestPrediction(m);

                                        // 最新 Tab：明天以后的比赛一定是"待预测"
                                        if (tab === 'latest' && m.match.date > tomorrow) {
                                            return (
                                                <div key={m.match.id}
                                                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 gap-2">
                                                    {getStageIcon(m.match.stage)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-foreground truncate">
                                                            {m.match.home} vs {m.match.away}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <Badge variant="secondary" className="text-[10px]">待预测</Badge>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        if (!pred?.winner) return null;

                                        const result = realResults[m.match.id];
                                        const ok = isCorrect(m.match.id, pred.winner);

                                        return (
                                            <div key={m.match.id}
                                                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 gap-2">
                                                {getStageIcon(m.match.stage)}
                                                {/* 左侧：比赛数据 */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs text-foreground truncate">
                                                        {m.match.home} vs {m.match.away}
                                                    </div>
                                                    {result && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {result.homeScore}:{result.awayScore}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 右侧：预测 */}
                                                <div className="text-right shrink-0">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className={
                                                            'text-xs'
                                                            + (ok === true ? ' text-predict-correct font-medium'
                                                                : ok === false ? ' text-muted-foreground/40'
                                                                : ' text-foreground')
                                                        }>
                                                            {translate(pred.winner)}
                                                        </span>
                                                        {ok === true && <Smile size={12} className="text-predict-correct" />}
                                                        {ok === false && <Frown size={12} className="text-muted-foreground/30" />}
                                                    </div>
                                                    {pred.score && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {pred.score}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
