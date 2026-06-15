import type { MatchWithPredictions } from './useMatchData';
import type { RealResult } from '../components/MatchCard';

export interface TeamStanding {
    team: string;
    group: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
}

/** 计算小组积分榜 */
export function computeStandings(
    allMatches: MatchWithPredictions[],
    realResults: Record<string, RealResult>,
): TeamStanding[] {
    const teamMap: Record<string, TeamStanding> = {};

    // 初始化全部 48 队（不论是否有比赛结果）
    for (const m of allMatches) {
        if (m.match.stage !== 'group') continue;
        for (const team of [m.match.home, m.match.away]) {
            if (!teamMap[team]) {
                teamMap[team] = {
                    team,
                    group: m.match.group,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
                };
            }
        }
    }

    // 计算
    for (const m of allMatches) {
        const result = realResults[m.match.id];
        if (!result || m.match.stage !== 'group') continue;

        const home = teamMap[m.match.home];
        const away = teamMap[m.match.away];
        if (!home || !away) continue;

        home.played++;
        away.played++;
        home.goalsFor += result.homeScore;
        home.goalsAgainst += result.awayScore;
        away.goalsFor += result.awayScore;
        away.goalsAgainst += result.homeScore;

        if (result.winner === m.match.home) {
            home.won++; home.points += 3;
            away.lost++;
        } else if (result.winner === m.match.away) {
            away.won++; away.points += 3;
            home.lost++;
        } else {
            home.drawn++; home.points += 1;
            away.drawn++; away.points += 1;
        }
    }

    // 计算净胜球
    for (const t of Object.values(teamMap)) {
        t.goalDiff = t.goalsFor - t.goalsAgainst;
    }

    // 排序：积分 → 净胜球 → 进球
    return Object.values(teamMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
    });
}
