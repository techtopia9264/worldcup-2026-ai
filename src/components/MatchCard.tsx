import { Card, CardContent, Separator, Badge } from 'dud';
import { FlagAvatar } from './FlagAvatar';
import { StageLabel } from './StageLabel';
import { AIPredictionRow } from './AIPredictionRow';
import type { MatchWithPredictions } from '../data/useMatchData';

export interface RealResult {
    homeScore: number;
    awayScore: number;
    winner: string;
}

interface MatchCardProps {
    data: MatchWithPredictions;
    /** 真实结果，null 表示尚未揭晓 */
    realResult: RealResult | null;
}

/** 阶段名中文 */
const STAGE_NAMES: Record<string, string> = {
    group: '',
    round_of_32: '32强赛',
    round_of_16: '16强赛',
    quarterfinals: '四分之一决赛',
    semifinals: '半决赛',
    final: '决赛',
    third_place: '三四名决赛',
};

/** 组别/阶段标签的完整文字 */
function groupLabel(match: MatchWithPredictions['match']): string {
    if (match.stage === 'group') return `${match.group} 组`;
    return STAGE_NAMES[match.stage] || match.group;
}

/**
 * 比赛卡片
 * [组别] · [时间] · [场地]
 * [国旗] VS [国旗]
 * ── AI 预测 ──
 * ── 真实结果 ──
 */
export function MatchCard({ data, realResult }: MatchCardProps) {
    const { match, predictions } = data;
    const placeholder = match.isPlaceholder;
    const label = groupLabel(match);
    const realWinner = realResult?.winner ?? null;

    return (
        <Card className="mb-4 relative">
            {/* 状态标签 — 右上角 */}
            <div className="absolute top-3 right-3">
                {realResult ? (
                    <Badge variant="secondary" className="text-[10px]">已结束</Badge>
                ) : (
                    <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200">待开始</Badge>
                )}
            </div>

            <CardContent className="pt-5 pb-4">
                {/* 顶部信息行 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
                    <span className="font-medium text-foreground">{label}</span>
                    <span>·</span>
                    <span>{match.time}</span>
                    {match.venue && (
                        <>
                            <span>·</span>
                            <span className="truncate max-w-[200px]">{match.venue}</span>
                        </>
                    )}
                    {match.stage !== 'group' && <StageLabel stage={match.stage} />}
                </div>

                {/* 对决区 */}
                <div className="flex items-center justify-center gap-6 mb-5">
                    <FlagAvatar country={match.home} size="md" />
                    <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground font-medium">VS</span>
                        {placeholder && (
                            <span className="text-[10px] text-muted-foreground/60">待定</span>
                        )}
                    </div>
                    <FlagAvatar country={match.away} size="md" />
                </div>

                <Separator className="mb-4" />

                {/* AI 预测区 */}
                <div className="mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        AI 预测
                    </h4>
                    <div className="space-y-0.5">
                        {predictions.map((p) => (
                            <AIPredictionRow
                                key={p.aiName}
                                prediction={p}
                                realWinner={realWinner}
                            />
                        ))}
                    </div>
                </div>

                <Separator className="mb-4" />

                {/* 真实结果 */}
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        真实结果
                    </h4>
                    {realResult ? (
                        <div className="text-sm text-center">
                            <span className={realWinner === match.home ? 'font-bold text-foreground' : (realWinner === 'draw' ? 'text-foreground' : 'text-muted-foreground')}>
                                {match.home}
                            </span>
                            <span className="mx-2 font-bold text-foreground">
                                {realResult.homeScore} : {realResult.awayScore}
                            </span>
                            <span className={realWinner === match.away ? 'font-bold text-foreground' : (realWinner === 'draw' ? 'text-foreground' : 'text-muted-foreground')}>
                                {match.away}
                            </span>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">—</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
