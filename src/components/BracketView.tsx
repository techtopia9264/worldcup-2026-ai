import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'dud';
import { Trophy, Star } from 'lucide-react';
import { computeBracket, type BracketNode } from '../data/computeBracket';
import { getFlagUrl } from '../data/countryCodes';
import { getLatestBracketPredictions } from '../data/useMatchData';
import { AI_NAMES } from '../data/computeAIStats';
import { translateWinner as translate } from '../data/translations';
import type { MatchWithPredictions, PredictionSnapshot } from '../data/useMatchData';
import type { RealResult } from './MatchCard';

const AI_NAME_TO_KEY: Record<string, string> = {
    'DeepSeek': 'deepseek', 'DouBao': 'doubao', 'ChatGPT': 'chatgpt',
    'Gemini': 'gemini', 'MiniMax': 'minimax', 'Qwen': 'qwen',
};

interface BracketViewProps {
    open: boolean; onClose: () => void;
    allMatches: MatchWithPredictions[];
    realResults: Record<string, RealResult>;
    snapshots: Record<string, PredictionSnapshot[]>;
}

/* ====== 国旗+队名 ====== */
function TeamRow({ team, score, isHighlight, isLoser }: {
    team: string | null; score?: number | string; isHighlight?: boolean; isLoser?: boolean;
}) {
    if (!team) return <div className="flex items-center gap-1 py-0.5 px-1"><span className="text-[10px] text-muted-foreground/40 italic">待定</span></div>;
    const flagUrl = getFlagUrl(team) || '';
    const nameClass = isHighlight ? 'text-[11px] text-predict-correct font-bold' : isLoser ? 'text-[11px] text-muted-foreground/30 line-through' : 'text-[11px] text-foreground';
    return (
        <div className={`flex items-center justify-between gap-1 py-0.5 px-1 ${isHighlight ? 'bg-predict-correct/8 rounded' : ''}`}>
            <div className="flex items-center gap-1 min-w-0">
                <div className="w-4 h-4 rounded-full overflow-hidden border bg-white shrink-0"><img src={flagUrl} alt={team} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                <span className={nameClass}>{team}</span>
            </div>
            {score !== undefined && <span className={`text-[10px] font-mono shrink-0 ${isHighlight ? 'font-bold text-foreground' : 'text-muted-foreground/40'}`}>{score}</span>}
        </div>
    );
}

/* ====== 对阵卡片 ====== */
function MatchCard({ node, aiPred, isRealTab }: { node: BracketNode; aiPred?: { winner: string | null; isChampionPath: boolean }; isRealTab?: boolean }) {
    const hasResult = node.winner !== null;
    const predictedW = aiPred?.winner || null;
    const isChampionPath = aiPred?.isChampionPath || false;
    const homeW = hasResult && node.winner === node.home;
    const awayW = hasResult && node.winner === node.away;
    const homePredW = predictedW && node.home === predictedW;
    const awayPredW = predictedW && node.away === predictedW;

    // 点球比分格式化
    const [penHome, penAway] = node.penalties ? node.penalties.split('-') : [];
    const homeScoreStr = penHome ? `${node.homeScore}(${penHome})` : node.homeScore;
    const awayScoreStr = penAway ? `${node.awayScore}(${penAway})` : node.awayScore;

    const bgStyle = (isRealTab && hasResult) ? { backgroundColor: '#EFEFEF' } : {};

    return (
        <div style={bgStyle} className={'border rounded p-1 shrink-0 w-[110px] shadow-sm'
            + (node.stage === 'FINAL' ? ' border-2 border-amber-500/50' : '')
            + (isChampionPath ? ' border-predict-correct ring-2 ring-predict-correct/40' : predictedW ? ' border-predict-correct/30' : ' border-border')}
            data-match-id={node.id}>
            {node.date && <div className="text-[9px] text-muted-foreground text-center mb-0.5 font-mono">{node.date}</div>}
            <TeamRow team={node.home} score={homeScoreStr} isHighlight={homePredW || homeW} isLoser={hasResult && !homeW} />
            <TeamRow team={node.away} score={awayScoreStr} isHighlight={awayPredW || awayW} isLoser={hasResult && !awayW} />
            {predictedW && !hasResult && (
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <Star size={8} className="text-predict-correct/60" />
                    <span className="text-[9px] text-predict-correct font-medium">{predictedW}</span>
                </div>
            )}
        </div>
    );
}

/**
 * 淘汰赛对阵图内容（页面内嵌入+弹窗共用）
 */
function BracketContentInner({ allMatches, realResults, snapshots }: Omit<BracketViewProps, 'open' | 'onClose'>) {
    const [selectedAI, setSelectedAI] = useState<string>('real');

    const { r32, r16, qf, sf, final: finalNode, third: thirdNode } = useMemo(
        () => computeBracket(allMatches, realResults), [allMatches, realResults],
    );

    const aiBracketPreds = useMemo(() => getLatestBracketPredictions(snapshots), [snapshots]);

    // 选中 AI 的预测数据
    const selectedPreds = useMemo(() => {
        if (selectedAI === 'real') return null;
        return aiBracketPreds[AI_NAME_TO_KEY[selectedAI]]?.bracketPredictions || null;
    }, [selectedAI, aiBracketPreds]);

    // 冠军路径
    const championPath = useMemo(() => {
        if (!selectedPreds) return new Set<string>();
        const path = new Set<string>();
        const fp = selectedPreds['FINAL-0'];
        if (!fp?.winner) return path;
        path.add('FINAL-0');
        const champ = fp.winner;
        const sfId = selectedPreds['SF-0']?.winner === champ ? 'SF-0' : selectedPreds['SF-1']?.winner === champ ? 'SF-1' : null;
        if (sfId) path.add(sfId);

        // QF
        const qfRange = sfId === 'SF-0' ? ['QF-0','QF-1'] : sfId === 'SF-1' ? ['QF-2','QF-3'] : [];
        qfRange.forEach((qid) => { if (selectedPreds[qid]?.winner === (selectedPreds[sfId!]?.winner)) path.add(qid); });
        // R16
        const r16ForQf: Record<string,string[]> = {'QF-0':['R16-0','R16-1'],'QF-1':['R16-0','R16-1'],'QF-2':['R16-2','R16-3'],'QF-3':['R16-2','R16-3']};
        qfRange.forEach((qid) => { if(path.has(qid)) (r16ForQf[qid]||[]).forEach((rid)=>{ if(selectedPreds[rid]?.winner===selectedPreds[qid]?.winner) path.add(rid); }); });
        // R32
        const r32ForR16: Record<string,string[]> = {'R16-0':['R32-1','R32-2'],'R16-1':['R32-0','R32-3'],'R16-2':['R32-5','R32-4'],'R16-3':['R32-6','R32-8'],'R16-4':['R32-9','R32-10'],'R16-5':['R32-7','R32-11'],'R16-6':['R32-12','R32-14'],'R16-7':['R32-13','R32-15']};
        for(const [rid, r32ids] of Object.entries(r32ForR16)) { if(path.has(rid)) r32ids.forEach((r32id)=>{ if(selectedPreds[r32id]?.winner===selectedPreds[rid]?.winner) path.add(r32id); }); }
        return path;
    }, [selectedPreds]);

    // AI 预测覆盖
    function getPred(node: BracketNode) {
        if (!selectedPreds) return undefined;
        const p = selectedPreds[node.id];
        return p ? { winner: p.winner, isChampionPath: championPath.has(node.id) } : undefined;
    }

    // 使用 AI 预测传播晋级，构建预测视角的 bracket
    const aiNodes = useMemo(() => {
        if (!selectedPreds) return { r32, r16, qf, sf, final: finalNode, third: thirdNode };

        // R32→R16→QF→SF→Final 晋级映射
        const r32ToR16: Record<string, string[]> = {
            'R16-0': ['R32-1', 'R32-2'], 'R16-1': ['R32-0', 'R32-3'],
            'R16-2': ['R32-5', 'R32-4'], 'R16-3': ['R32-6', 'R32-8'],
            'R16-4': ['R32-9', 'R32-10'], 'R16-5': ['R32-7', 'R32-11'],
            'R16-6': ['R32-12', 'R32-14'], 'R16-7': ['R32-13', 'R32-15'],
        };
        const r16ToQf: Record<string, string[]> = {
            'QF-0': ['R16-0', 'R16-1'], 'QF-1': ['R16-2', 'R16-3'],
            'QF-2': ['R16-4', 'R16-5'], 'QF-3': ['R16-6', 'R16-7'],
        };

        function findWinner(matchId: string | undefined): string | null {
            if (!matchId) return null;
            return selectedPreds[matchId]?.winner || null;
        }

        // 构建 R32（从真实数据取 team，预测数据取 winner）
        const aiR32 = r32.map((n) => ({
            ...n,
            home: n.home || findWinner(n.id),  // 保底：如果真实数据没有就填预测
            away: n.away,
            winner: findWinner(n.id),
        }));

        // 根据 AI 预测传播晋级
        const aiR16 = r16.map((n, i) => {
            const feeders = r32ToR16[n.id] || [];
            return {
                ...n,
                home: n.home || findWinner(feeders[0]),
                away: n.away || findWinner(feeders[1]),
                winner: findWinner(n.id),
            };
        });

        const aiQf = qf.map((n, i) => {
            const feeders = r16ToQf[n.id] || [];
            return {
                ...n,
                home: n.home || findWinner(feeders[0]),
                away: n.away || findWinner(feeders[1]),
                winner: findWinner(n.id),
            };
        });

        const aiSf = sf.map((n, i) => {
            const sfFeeders: Record<string, string[]> = { 'SF-0': ['QF-0', 'QF-1'], 'SF-1': ['QF-2', 'QF-3'] };
            const feeders = sfFeeders[n.id] || [];
            return { ...n, home: n.home || findWinner(feeders[0]), away: n.away || findWinner(feeders[1]), winner: findWinner(n.id) };
        });

        const finalFeeders = ['SF-0', 'SF-1'];
        const aiFinal = { ...finalNode, home: finalNode.home || findWinner(finalFeeders[0]), away: finalNode.away || findWinner(finalFeeders[1]), winner: findWinner('FINAL-0') };
        const aiThird = { ...thirdNode, home: thirdNode.home, away: thirdNode.away, winner: findWinner('3RD-0') };

        return { r32: aiR32, r16: aiR16, qf: aiQf, sf: aiSf, final: aiFinal, third: aiThird };
    }, [selectedPreds, r32, r16, qf, sf, finalNode, thirdNode]);

    const displayNodes = selectedPreds ? aiNodes : { r32, r16, qf, sf, final: finalNode, third: thirdNode };
    // FIFA 官方上下半区分组：上半区(左) R16-[0,1,4,5] / 下半区(右) R16-[2,3,6,7]
    const TOP_R16 = [0, 1, 4, 5], BOTTOM_R16 = [2, 3, 6, 7];
    const topR32 = displayNodes.r32.slice(0, 8), bottomR32 = displayNodes.r32.slice(8, 16);
    const topR16 = TOP_R16.map(i => displayNodes.r16[i]), bottomR16 = BOTTOM_R16.map(i => displayNodes.r16[i]);
    const topQf = displayNodes.qf.slice(0, 2), bottomQf = displayNodes.qf.slice(2, 4);
    const selectedPred = selectedAI !== 'real' ? aiBracketPreds[AI_NAME_TO_KEY[selectedAI]] : null;
    const isRealTab = selectedAI === 'real';

    return (
        <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-1">
                    {selectedPred?.champion && <span className="text-xs text-muted-foreground">{selectedAI} 看好 <span className="text-predict-correct font-semibold">{selectedPred.champion}</span> 夺冠</span>}
                </div>
                <div className="flex gap-0.5 mt-2 flex-wrap">
                    <button onClick={() => setSelectedAI('real')} className={'text-[11px] px-2 py-1 rounded transition-colors' + (selectedAI === 'real' ? ' text-foreground font-semibold underline underline-offset-4' : ' text-muted-foreground hover:text-foreground')}>实际结果</button>
                    {AI_NAMES.map((name) => {
                        const aiKey = AI_NAME_TO_KEY[name]; const hasPred = !!aiBracketPreds[aiKey];
                        return <button key={name} onClick={() => setSelectedAI(name)} className={'text-[11px] px-2 py-1 rounded transition-colors' + (name === selectedAI ? ' text-foreground font-semibold underline underline-offset-4' : hasPred ? ' text-muted-foreground hover:text-foreground' : ' text-muted-foreground/40')}>{name}{!hasPred ? ' ·' : aiBracketPreds[aiKey].champion ? ` 🏆${aiBracketPreds[aiKey].champion}` : ''}</button>;
                    })}
                </div>
                <div className="flex-1 overflow-auto mt-3 overscroll-x-contain">
                    <div className="relative min-w-[900px] sm:min-w-[1100px] pb-8" style={{ minHeight: '700px' }}>
                        {/* 阶段标签 */}
                        <div className="absolute top-0 left-0 right-0 flex justify-between px-0" style={{ zIndex: 2 }}>
                            <div className="flex"><div className="text-center text-[10px] text-muted-foreground font-medium w-[110px]">32强赛</div><div className="w-6" /><div className="text-center text-[10px] text-muted-foreground font-medium w-[110px]">16强赛</div><div className="w-6" /><div className="text-center text-[10px] text-muted-foreground font-medium w-[110px]">¼决赛</div><div className="w-6" /><div className="text-center text-[10px] text-muted-foreground font-medium w-[100px]">半决赛</div></div>
                            <div className="w-[100px] text-center text-[10px] text-muted-foreground font-medium">决赛</div>
                            <div className="flex"><div className="text-center text-[10px] text-muted-foreground font-medium w-[100px]">半决赛</div><div className="w-6" /><div className="text-center text-[10px] text-muted-foreground font-medium w-[110px]">¼决赛</div><div className="w-6" /><div className="text-center text-[10px] text-muted-foreground font-medium w-[110px]">16强赛</div><div className="w-6" /><div className="text-center text-[10px] text-muted-foreground font-medium w-[110px]">32强赛</div></div>
                        </div>
                        {/* 主体：每列 flex-col space-around，统一高度自动对齐 */}
                        <div className="absolute top-6 bottom-0 left-0 right-0 flex justify-between px-0" style={{ zIndex: 1 }}>
                            {/* 左半区 */}
                            <div className="flex">
                                <div className="flex flex-col justify-around w-[110px]" style={{ gap: '2px' }}>
                                    {[0, 2, 4, 6].map(i => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <MatchCard node={topR32[i]} isRealTab={isRealTab} aiPred={getPred(topR32[i])} />
                                            <MatchCard node={topR32[i+1]} isRealTab={isRealTab} aiPred={getPred(topR32[i+1])} />
                                        </div>
                                    ))}
                                </div>
                                <div className="w-6 shrink-0" />
                                <div className="flex flex-col justify-around w-[110px]">
                                    {topR16.map((n) => (<MatchCard key={n.id} node={n} isRealTab={isRealTab} aiPred={getPred(n)} />))}
                                </div>
                                <div className="w-6 shrink-0" />
                                <div className="flex flex-col justify-around w-[110px]">
                                    {topQf.map((n) => (<MatchCard key={n.id} node={n} isRealTab={isRealTab} aiPred={getPred(n)} />))}
                                </div>
                                <div className="w-6 shrink-0" />
                                <div className="flex flex-col justify-center w-[100px]">
                                    <MatchCard node={displayNodes.sf[0]} isRealTab={isRealTab} aiPred={getPred(displayNodes.sf[0])} />
                                </div>
                            </div>
                            {/* 中心：决赛 + 三四名 */}
                            <div className="flex flex-col justify-center items-center w-[100px]" style={{ gap: '200px' }}>
                                <div className="text-center"><div className="flex items-center justify-center gap-1 mb-1"><Trophy size={14} className="text-amber-500" /><span className="text-[11px] font-bold">决赛</span></div><MatchCard node={displayNodes.final} isRealTab={isRealTab} aiPred={getPred(displayNodes.final)} /></div>
                                <div className="text-center"><div className="text-[10px] text-muted-foreground mb-1">三四名决赛</div><MatchCard node={displayNodes.third} isRealTab={isRealTab} aiPred={getPred(displayNodes.third)} /></div>
                            </div>
                            {/* 右半区（镜像） */}
                            <div className="flex">
                                <div className="flex flex-col justify-center w-[100px]">
                                    <MatchCard node={displayNodes.sf[1]} isRealTab={isRealTab} aiPred={getPred(displayNodes.sf[1])} />
                                </div>
                                <div className="w-6 shrink-0" />
                                <div className="flex flex-col justify-around w-[110px]">
                                    {bottomQf.map((n) => (<MatchCard key={n.id} node={n} isRealTab={isRealTab} aiPred={getPred(n)} />))}
                                </div>
                                <div className="w-6 shrink-0" />
                                <div className="flex flex-col justify-around w-[110px]">
                                    {bottomR16.map((n) => (<MatchCard key={n.id} node={n} isRealTab={isRealTab} aiPred={getPred(n)} />))}
                                </div>
                                <div className="w-6 shrink-0" />
                                <div className="flex flex-col justify-around w-[110px]" style={{ gap: '2px' }}>
                                    {[0, 2, 4, 6].map(i => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <MatchCard node={bottomR32[i]} isRealTab={isRealTab} aiPred={getPred(bottomR32[i])} />
                                            <MatchCard node={bottomR32[i+1]} isRealTab={isRealTab} aiPred={getPred(bottomR32[i+1])} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        </div>
    );
}

/** 弹窗版本 */
export function BracketView({ open, onClose, ...props }: BracketViewProps) {
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[98vw] sm:max-w-7xl max-h-[92vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy size={18} />淘汰赛对阵图
                    </DialogTitle>
                </DialogHeader>
                <BracketContentInner {...props} />
            </DialogContent>
        </Dialog>
    );
}

/** 页面内嵌版本 */
export function BracketInline(props: Omit<BracketViewProps, 'open' | 'onClose'>) {
    return (
        <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Trophy size={18} />淘汰赛对阵图
            </h2>
            <BracketContentInner {...props} />
        </div>
    );
}
