import type { MatchWithPredictions } from './useMatchData';
import type { RealResult } from '../components/MatchCard';

export const AI_NAMES = ['DeepSeek', 'DouBao', 'ChatGPT', 'Gemini', 'MiniMax', 'Qwen'];

export interface AIStats {
    correct: number;
    total: number;
}

/** 计算每个 AI 的预测成绩 */
export function computeAIStats(
    allMatches: MatchWithPredictions[],
    realResults: Record<string, RealResult>,
): Record<string, AIStats> {
    const stats: Record<string, AIStats> = {};
    for (const name of AI_NAMES) {
        stats[name] = { correct: 0, total: 0 };
    }
    for (const m of allMatches) {
        const result = realResults[m.match.id];
        if (!result) continue;
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
}

/** 只取已出结果的比赛 */
export function getScoredMatches(
    allMatches: MatchWithPredictions[],
    realResults: Record<string, RealResult>,
): MatchWithPredictions[] {
    return allMatches.filter((m) => realResults[m.match.id]);
}
