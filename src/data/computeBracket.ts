import type { RealResult } from '../components/MatchCard';
import { computeStandings } from './computeStandings';
import type { MatchWithPredictions } from './useMatchData';

/** 一个对阵节点 */
export interface BracketNode {
    id: string;
    stage: 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL' | '3RD';
    date: string;          // "6/29 3:00"
    home: string | null;
    away: string | null;
    homeScore?: number;
    awayScore?: number;
    winner: string | null;
    /** 点球比分，如 "3-4" */
    penalties?: string;
    /** 该节点胜者应填入的下一个节点 */
    feedsIntoIndex: number | null;
}

/** R32 模板 */
interface R32Template {
    id: string;
    home: string;
    away: string;
    feedsToR16: number;  // R16 索引 0-7
    /** R16 中作为 home(0) 还是 away(1) */
    slot: 0 | 1;
}

const R32_TEMPLATES: R32Template[] = [
    // === 上半区（左）→ SF-0 (M101) ===
    // R16-0 (M89): R32-1 vs R32-4
    { id: 'R32-1', home: '1E', away: '3D', feedsToR16: 0, slot: 0 },
    { id: 'R32-4', home: '1I', away: '3F', feedsToR16: 0, slot: 1 },
    // R16-1 (M90): R32-0 vs R32-2
    { id: 'R32-0', home: '2A', away: '2B', feedsToR16: 1, slot: 0 },
    { id: 'R32-2', home: '1F', away: '2C', feedsToR16: 1, slot: 1 },
    // R16-4 (M93): R32-10 vs R32-11
    { id: 'R32-10', home: '2K', away: '2L', feedsToR16: 4, slot: 0 },
    { id: 'R32-11', home: '1H', away: '2J', feedsToR16: 4, slot: 1 },
    // R16-5 (M94): R32-8 vs R32-9
    { id: 'R32-8', home: '1D', away: '3B', feedsToR16: 5, slot: 0 },
    { id: 'R32-9', home: '1G', away: '3I', feedsToR16: 5, slot: 1 },

    // === 下半区（右）→ SF-1 (M102) ===
    // R16-2 (M91): R32-3 vs R32-5
    { id: 'R32-3', home: '1C', away: '2F', feedsToR16: 2, slot: 0 },
    { id: 'R32-5', home: '2E', away: '2I', feedsToR16: 2, slot: 1 },
    // R16-3 (M92): R32-6 vs R32-7
    { id: 'R32-6', home: '1A', away: '3E', feedsToR16: 3, slot: 0 },
    { id: 'R32-7', home: '1L', away: '3K', feedsToR16: 3, slot: 1 },
    // R16-6 (M95): R32-13 vs R32-15
    { id: 'R32-13', home: '1J', away: '2H', feedsToR16: 6, slot: 0 },
    { id: 'R32-15', home: '2D', away: '2G', feedsToR16: 6, slot: 1 },
    // R16-7 (M96): R32-12 vs R32-14
    { id: 'R32-12', home: '1B', away: '3J', feedsToR16: 7, slot: 0 },
    { id: 'R32-14', home: '1K', away: '3L', feedsToR16: 7, slot: 1 },
];

// R16 → QF 映射：R16 索引 → QF 索引 + slot (M97-M100)
const R16_TO_QF: { feedsToQF: number; slot: 0 | 1 }[] = [
    { feedsToQF: 0, slot: 0 },  // R16-0 (M89) → QF-0 (M97)
    { feedsToQF: 0, slot: 1 },  // R16-1 (M90) → QF-0 (M97)
    { feedsToQF: 2, slot: 0 },  // R16-2 (M91) → QF-2 (M99)
    { feedsToQF: 2, slot: 1 },  // R16-3 (M92) → QF-2 (M99)
    { feedsToQF: 1, slot: 0 },  // R16-4 (M93) → QF-1 (M98)
    { feedsToQF: 1, slot: 1 },  // R16-5 (M94) → QF-1 (M98)
    { feedsToQF: 3, slot: 0 },  // R16-6 (M95) → QF-3 (M100)
    { feedsToQF: 3, slot: 1 },  // R16-7 (M96) → QF-3 (M100)
];

// QF → SF 映射 (M97-M98→M101, M99-M100→M102)
const QF_TO_SF: { sf: number; slot: 0 | 1 }[] = [
    { sf: 0, slot: 0 },  // QF-0 (M97) → SF-0 (M101)
    { sf: 0, slot: 1 },  // QF-1 (M98) → SF-0 (M101)
    { sf: 1, slot: 0 },  // QF-2 (M99) → SF-1 (M102)
    { sf: 1, slot: 1 },  // QF-3 (M100) → SF-1 (M102)
];

// SF → Final/3RD: SF-0 胜者 → Final home, SF-1 胜者 → Final away
// 败者 → 3RD home/away

/** 格式化日期为 "6/29 3:00" */
function fmtDate(raw: string): string {
    if (!raw) return '';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const timeM = raw.match(/(\d{2}):(\d{2})/);
    const time = timeM ? ` ${timeM[1]}:${timeM[2]}` : '';
    return `${parseInt(m[2])}/${parseInt(m[3])}${time}`;
}

/** 淘汰赛日期映射（北京时间，来源：中文搜索结果） */
const STAGE_DATES: Record<string, string[]> = {
    R32: [
        '2026-06-30 04:30', '2026-07-01 05:00', '2026-06-29 03:00', '2026-06-30 09:00',
        '2026-07-03 07:00', '2026-07-03 03:00', '2026-07-02 08:00', '2026-07-02 04:00',
        '2026-06-30 01:00', '2026-07-01 01:00', '2026-07-01 09:00', '2026-07-02 00:00',
        '2026-07-04 06:00', '2026-07-04 02:00', '2026-07-03 11:00', '2026-07-04 09:30',
    ],
    R16: [
        '2026-07-05 05:00', '2026-07-05 01:00', '2026-07-06 04:00', '2026-07-06 08:00',
        '2026-07-07 03:00', '2026-07-07 08:00', '2026-07-08 00:00', '2026-07-08 04:00',
    ],
    QF: [
        '2026-07-10 04:00', '2026-07-11 03:00', '2026-07-12 05:00', '2026-07-12 09:00',
    ],
    SF: ['2026-07-15 03:00', '2026-07-16 03:00'],
    FINAL: ['2026-07-20 03:00'],
    '3RD': ['2026-07-19 05:00'],
};

/** 计算淘汰赛对阵数据，含胜者晋升 */
export function computeBracket(
    allMatches: MatchWithPredictions[],
    realResults: Record<string, RealResult>,
): { r32: BracketNode[]; r16: BracketNode[]; qf: BracketNode[]; sf: BracketNode[]; final: BracketNode; third: BracketNode } {
    const standings = computeStandings(allMatches, realResults);

    const groupMap: Record<string, typeof standings> = {};
    for (const s of standings) {
        if (!groupMap[s.group]) groupMap[s.group] = [];
        groupMap[s.group].push(s);
    }

    /** 组是否已完赛（6 场全部出结果） */
    function isGroupComplete(g: string): boolean {
        return [0, 1, 2, 3, 4, 5].every((i) => realResults[`${g}-${i}`]);
    }

    const getWinner = (g: string) => isGroupComplete(g) ? (groupMap[g]?.[0]?.team || null) : null;
    const getRunnerUp = (g: string) => isGroupComplete(g) ? (groupMap[g]?.[1]?.team || null) : null;
    const getThird = (g: string) => {
        if (!isGroupComplete(g)) return null;
        const t = groupMap[g]?.[2];
        return t ? { team: t.team, pts: t.points, gd: t.goalDiff } : null;
    };

    // 最佳第三名：只从已完赛的组中选取
    const allThirds = Object.keys(groupMap)
        .map((g) => getThird(g))
        .filter((t): t is NonNullable<typeof t> => !!t)
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd);

    const resolve = (ph: string): string | null => {
        const m = ph.match(/^([12])([A-Z])$/);
        if (m) return m[1] === '1' ? getWinner(m[2]) : getRunnerUp(m[2]);
        const t3 = ph.match(/^3([A-Z])$/);
        if (t3) return isGroupComplete(t3[1]) ? (groupMap[t3[1]]?.[2]?.team || null) : null;
        const tm = ph.match(/^T(\d)$/);
        if (tm) return allThirds[parseInt(tm[1], 10) - 1]?.team || null;
        return null;
    };

    /** 获取比赛结果 */
    function getResult(id: string) {
        return realResults[id] || null;
    }

    // 构建 R32
    const r32: BracketNode[] = R32_TEMPLATES.map((t) => {
        const result = getResult(t.id);
        return {
            id: t.id,
            stage: 'R32' as const,
            date: fmtDate(R32_TEMPLATES.indexOf(t) < STAGE_DATES.R32.length ? STAGE_DATES.R32[R32_TEMPLATES.indexOf(t)] : ''),
            home: resolve(t.home),
            away: resolve(t.away),
            homeScore: result?.homeScore,
            awayScore: result?.awayScore,
            winner: result?.winner || null,
            penalties: (result as any)?.penalties,
            feedsIntoIndex: t.feedsToR16,
        };
    });

    // 构建 R16，从 R32 胜者填入
    const r16: BracketNode[] = Array.from({ length: 8 }, (_, i) => {
        const result = getResult(`R16-${i}`);
        // 查找哪些 R32 feeds into this R16
        const feeders = R32_TEMPLATES.filter((t) => t.feedsToR16 === i).sort((a, b) => a.slot - b.slot);
        const homeWinner = feeders[0] ? r32[R32_TEMPLATES.indexOf(feeders[0])].winner : null;
        const awayWinner = feeders[1] ? r32[R32_TEMPLATES.indexOf(feeders[1])].winner : null;
        return {
            id: `R16-${i}`,
            stage: 'R16' as const,
            date: fmtDate((STAGE_DATES.R16[i] || '')),
            home: homeWinner,
            away: awayWinner,
            homeScore: result?.homeScore,
            awayScore: result?.awayScore,
            winner: result?.winner || null,
            feedsIntoIndex: R16_TO_QF[i].feedsToQF,
        };
    });

    // QF
    const qf: BracketNode[] = Array.from({ length: 4 }, (_, i) => {
        const result = getResult(`QF-${i}`);
        const feeders = R16_TO_QF.flatMap((f, fi) => f.feedsToQF === i ? [fi] : []);
        feeders.sort((a, b) => R16_TO_QF[a].slot - R16_TO_QF[b].slot);
        const homeWinner = feeders[0] !== undefined ? r16[feeders[0]].winner : null;
        const awayWinner = feeders[1] !== undefined ? r16[feeders[1]].winner : null;
        return {
            id: `QF-${i}`,
            stage: 'QF' as const,
            date: fmtDate((STAGE_DATES.QF[i] || '')),
            home: homeWinner,
            away: awayWinner,
            homeScore: result?.homeScore,
            awayScore: result?.awayScore,
            winner: result?.winner || null,
            feedsIntoIndex: QF_TO_SF[i].sf,
        };
    });

    // SF
    const sf: BracketNode[] = Array.from({ length: 2 }, (_, i) => {
        const result = getResult(`SF-${i}`);
        const feeders = QF_TO_SF.flatMap((f, fi) => f.sf === i ? [fi] : []);
        feeders.sort((a, b) => QF_TO_SF[a].slot - QF_TO_SF[b].slot);
        const homeWinner = feeders[0] !== undefined ? qf[feeders[0]].winner : null;
        const awayWinner = feeders[1] !== undefined ? qf[feeders[1]].winner : null;
        return {
            id: `SF-${i}`,
            stage: 'SF' as const,
            date: fmtDate((STAGE_DATES.SF[i] || '')),
            home: homeWinner,
            away: awayWinner,
            homeScore: result?.homeScore,
            awayScore: result?.awayScore,
            winner: result?.winner || null,
            feedsIntoIndex: null,
        };
    });

    // Final
    const finalResult = getResult('FINAL-0');
    const finalNode: BracketNode = {
        id: 'FINAL-0',
        stage: 'FINAL',
            date: fmtDate(STAGE_DATES.FINAL[0] || ''),
        home: sf[0]?.winner || null,
        away: sf[1]?.winner || null,
        homeScore: finalResult?.homeScore,
        awayScore: finalResult?.awayScore,
        winner: finalResult?.winner || null,
        feedsIntoIndex: null,
    };

    // 3RD
    const thirdResult = getResult('3RD-0');
    // SF losers
    const sf0 = sf[0];
    const sf1 = sf[1];
    const sf0Loser = sf0?.winner
        ? (sf0.winner === sf0.home ? sf0.away : sf0.home)
        : null;
    const sf1Loser = sf1?.winner
        ? (sf1.winner === sf1.home ? sf1.away : sf1.home)
        : null;
    const thirdNode: BracketNode = {
        id: '3RD-0',
        stage: '3RD',
            date: fmtDate(STAGE_DATES['3RD'][0] || ''),
        home: sf0Loser,
        away: sf1Loser,
        homeScore: thirdResult?.homeScore,
        awayScore: thirdResult?.awayScore,
        winner: thirdResult?.winner || null,
        feedsIntoIndex: null,
    };

    return { r32, r16, qf, sf, final: finalNode, third: thirdNode };
}
