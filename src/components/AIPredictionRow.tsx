import { Check, X } from 'lucide-react';
import type { AIPrediction } from '../data/useMatchData';
import { translateWinner } from '../data/translations';

interface AIPredictionRowProps {
    prediction: AIPrediction;
    /** 真实结果的胜者，null 表示尚未揭晓 */
    realWinner: string | null;
}

/**
 * 单行 AI 预测
 * 正确 → 绿色 ✓
 * 错误 → muted + 删除线
 * 未揭晓 → 正常显示
 */
export function AIPredictionRow({ prediction, realWinner }: AIPredictionRowProps) {
    const isRevealed = realWinner !== null;
    const isCorrect = isRevealed && prediction.winner === realWinner;
    const isWrong = isRevealed && !isCorrect;

    return (
        <div className={
            'flex items-center justify-between py-1 px-1.5 -mx-1.5 rounded text-sm'
            + (isCorrect ? ' bg-green-50' : '')
        }>
            <span className="text-muted-foreground w-20 shrink-0">{prediction.aiName}</span>
            <span
                className={
                    'flex items-center gap-1.5'
                    + (isWrong ? ' line-through text-muted-foreground/60' : ' text-foreground')
                }
            >
                <span>{translateWinner(prediction.winner)}</span>
                {prediction.score && (
                    <span className="text-[10px] text-muted-foreground font-mono">{prediction.score}</span>
                )}
            </span>
            <span className="w-6 text-right shrink-0">
                {isCorrect && <Check size={14} className="text-predict-correct inline" />}
                {isWrong && <X size={14} className="text-muted-foreground/40 inline" />}
            </span>
        </div>
    );
}
