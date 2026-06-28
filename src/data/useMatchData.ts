import schedule from '../../world_cup_2026.json';

/* ====== 动态加载每日预测（import.meta.glob 在构建时扫描） ====== */

// 赛前初始预测
import deepseekInitial from '../../predictions/initial/deepseek.json';
import doubaoInitial from '../../predictions/initial/doubao.json';
import chatgptInitial from '../../predictions/initial/chatgpt.json';
import geminiInitial from '../../predictions/initial/gemini.json';
import minimaxInitial from '../../predictions/initial/minimax.json';
import qwenInitial from '../../predictions/initial/qwen.json';

// 每日更新的预测（glob 匹配所有 predictions/日期/ai.json）
const dailyModules = import.meta.glob(
    '../../predictions/*/*.json',
    { eager: true },
) as Record<string, { default: any }>;

/* ====== 类型定义 ====== */

interface RawMatch {
    date: string;
    home: string;
    away: string;
    competitionCity: string;
    winner: string;
    status: string;
}

export interface Match {
    /** 唯一标识，如 "A-0" "R32-3" */
    id: string;
    date: string;
    time: string;
    stage: 'group' | 'round_of_32' | 'round_of_16' | 'quarterfinals' | 'semifinals' | 'final' | 'third_place';
    /** 组别标签，如 "A" "R32" "QF" */
    group: string;
    home: string;
    away: string;
    venue: string;
    /** 是否为淘汰赛占位符 */
    isPlaceholder: boolean;
}

export interface AIPrediction {
    aiName: string;
    winner: string | null;
    score?: string;
    reason?: string;
}

export interface MatchWithPredictions {
    match: Match;
    /** 最新预测（每日覆盖初始） */
    predictions: AIPrediction[];
    /** 赛前初始预测（不变） */
    initialPredictions: AIPrediction[];
}

export interface DayGroup {
    date: string;
    /** "6月12日" */
    dateLabel: string;
    /** "周四" */
    weekdayLabel: string;
    /** 阶段标签，如 "小组赛 G1" "小组赛 G3" "32强赛" */
    stageLabel: string;
    matches: MatchWithPredictions[];
}

/** 每日预测文件格式 */
/** 单场预测 */
export interface SinglePrediction {
    winner: string;
    score?: string;
    reason?: string;
    extraTime?: boolean;   // 是否加时赛
    penalties?: boolean;   // 是否点球大战
}

export interface DailyPrediction {
    ai: string;
    date: string;
    nextMatchday?: string;
    commentary: string;
    methodology: string;
    changed_predictions?: { match: string; old_winner: string; new_winner: string; reason: string }[];
    predictions: Record<string, SinglePrediction>;
    /** 淘汰赛：整个对阵图预测（首次淘汰赛预测时填写） */
    bracketPredictions?: Record<string, SinglePrediction>;
    /** 淘汰赛：看好的冠军 */
    champion?: string;
    championReason?: string;
}

/** 某 AI 某天的预测快照 */
export interface PredictionSnapshot {
    date: string;
    aiName: string;
    commentary: string;
    methodology: string;
    nextMatchday?: string;
    changedPredictions: { match: string; oldWinner: string; newWinner: string; reason: string }[];
    predictions: Record<string, AIPrediction>;
    /** 淘汰赛冠军预测 */
    champion?: string;
    championReason?: string;
    bracketPredictions?: Record<string, SinglePrediction>;
}

/* ====== 常量 ====== */

const AI_NAMES: Record<string, string> = {
    deepseek: 'DeepSeek',
    doubao: 'DouBao',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    minimax: 'MiniMax',
    qwen: 'Qwen',
};

const AI_KEYS = ['deepseek', 'doubao', 'chatgpt', 'gemini', 'minimax', 'qwen'];

const INITIAL_PREDICTIONS: Record<string, any> = {
    deepseek: deepseekInitial,
    doubao: doubaoInitial,
    chatgpt: chatgptInitial,
    gemini: geminiInitial,
    minimax: minimaxInitial,
    qwen: qwenInitial,
};

const STAGES = [
    { key: 'groupCompetition' as const, stage: 'group' as const, label: '' },
    { key: 'round_of_32' as const, stage: 'round_of_32' as const, label: 'R32' },
    { key: 'round_of_16' as const, stage: 'round_of_16' as const, label: 'R16' },
    { key: 'quarterfinals' as const, stage: 'quarterfinals' as const, label: 'QF' },
    { key: 'semifinals' as const, stage: 'semifinals' as const, label: 'SF' },
    { key: 'final' as const, stage: 'final' as const, label: 'FINAL' },
    { key: 'third_place' as const, stage: 'third_place' as const, label: '3RD' },
];

/* ====== 工具函数 ====== */

function parseDate(raw: string): { date: string; time: string } | null {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(.*)$/);
    if (!match) return null;
    const date = match[1];
    const timeRaw = match[2];
    if (timeRaw === 'TBD') return { date, time: 'TBD' };
    const timeMatch = timeRaw.match(/^(\d{2}):(\d{2})\s*(AM|PM)?$/i);
    if (!timeMatch) return { date, time: timeRaw };
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2];
    const ampm = timeMatch[3];
    if (ampm) {
        if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
        if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    return { date, time: `${String(h).padStart(2, '0')}:${m}` };
}

function isPlaceholder(name: string): boolean {
    return /[胜负亚军组]/.test(name);
}

function formatDateLabel(dateStr: string): { dateLabel: string; weekdayLabel: string } {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
        dateLabel: `${d.getMonth() + 1}月${d.getDate()}日`,
        weekdayLabel: weekdays[d.getDay()],
    };
}

/* ====== 解析初始预测 ====== */

/** 从初始预测 JSON 中提取比赛预测 */
function extractInitialPredictions(data: any, matchId: string): AIPrediction | null {
    // 小组赛
    if (data.groupCompetition) {
        for (const [group, matches] of Object.entries(data.groupCompetition)) {
            const arr = matches as RawMatch[];
            for (let i = 0; i < arr.length; i++) {
                if (`${group}-${i}` === matchId) {
                    return { aiName: '', winner: arr[i].winner || null };
                }
            }
        }
    }
    // 淘汰赛
    for (const stageDef of STAGES) {
        if (stageDef.stage === 'group') continue;
        const arr = data[stageDef.key] as RawMatch[] | undefined;
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
            if (`${stageDef.label}-${i}` === matchId) {
                return { aiName: '', winner: arr[i].winner || null };
            }
        }
    }
    return null;
}

/* ====== 解析每日预测 ====== */

/** 加载所有每日预测，返回 { aiKey: [snapshots...] } */
function loadDailyPredictions(): Record<string, PredictionSnapshot[]> {
    const snapshots: Record<string, PredictionSnapshot[]> = {};
    for (const key of AI_KEYS) {
        snapshots[key] = [];
    }

    // 遍历 glob 结果
    for (const [path, mod] of Object.entries(dailyModules)) {
        const data = mod.default;
        if (!data || !data.ai || !data.date) continue;

        // 跳过没有实质内容的模板文件（全是空 winner 或空 commentary）
        const hasContent = data.commentary
            || Object.values(data.predictions || {}).some((p: any) => p.winner && p.winner !== '');
        if (!hasContent) continue;

        // 从路径推断 AI key: predictions/YYYY-MM-DD/deepseek.json
        const fileName = path.split('/').pop()?.replace('.json', '') || '';
        const aiKey = Object.keys(AI_NAMES).find((k) => fileName === k);
        if (!aiKey || !snapshots[aiKey]) continue;

        snapshots[aiKey].push({
            date: data.date,
            aiName: AI_NAMES[aiKey] || data.ai,
            commentary: data.commentary || '',
            methodology: data.methodology || '',
            nextMatchday: data.nextMatchday || '',
            champion: data.champion || undefined,
            championReason: data.championReason || undefined,
            bracketPredictions: data.bracketPredictions || undefined,
            changedPredictions: (data.changed_predictions || []).map((c: any) => ({
                match: c.match,
                oldWinner: c.old_winner,
                newWinner: c.new_winner,
                reason: c.reason,
            })),
            predictions: Object.fromEntries(
                Object.entries(data.predictions || {}).map(([id, p]: [string, any]) => [
                    id,
                    { aiName: AI_NAMES[aiKey] || data.ai, winner: p.winner || null, score: p.score, reason: p.reason },
                ]),
            ),
        });
    }

    // 按日期排序
    for (const key of AI_KEYS) {
        snapshots[key].sort((a, b) => a.date.localeCompare(b.date));
    }

    return snapshots;
}

/** 返回每日预测快照 + 最新预测 */
function getDailyPredictionData() {
    const snapshots = loadDailyPredictions();

    // 从所有快照中聚合每个 AI 对每个 match 的最新预测
    // 遍历从新到旧，每个 matchId 只取第一次出现（最新的非空 winner）
    const latest: Record<string, Record<string, AIPrediction>> = {};
    for (const key of AI_KEYS) {
        latest[key] = {};
        const aiSnapshots = snapshots[key];
        for (let i = aiSnapshots.length - 1; i >= 0; i--) {
            for (const [matchId, pred] of Object.entries(aiSnapshots[i].predictions)) {
                if (pred.winner && !latest[key][matchId]) {
                    latest[key][matchId] = pred;
                }
            }
        }
    }

    return { snapshots, latest };
}

/* ====== 主数据获取 ====== */

export function useMatchData(): {
    dayGroups: DayGroup[];
    predictionSnapshots: Record<string, PredictionSnapshot[]>;
} {
    const { snapshots, latest } = getDailyPredictionData();

    // 构建比赛列表
    const allMatches: MatchWithPredictions[] = [];
    const scheduleData = schedule as any;

    for (const stageDef of STAGES) {
        const stageData = scheduleData[stageDef.key];
        if (!stageData) continue;

        if (stageDef.stage === 'group') {
            const groups = stageData as Record<string, RawMatch[]>;
            for (const [groupName, matches] of Object.entries(groups)) {
                matches.forEach((m, i) => {
                    const parsed = parseDate(m.date);
                    if (!parsed) return;
                    const matchId = `${groupName}-${i}`;

                    // 收集所有 AI 的最新预测 + 初始预测
                    const predictions: AIPrediction[] = [];
                    const initialPredictions: AIPrediction[] = [];
                    for (const aiKey of AI_KEYS) {
                        const name = AI_NAMES[aiKey];
                        // 初始预测
                        const initialPred = extractInitialPredictions(INITIAL_PREDICTIONS[aiKey], matchId);
                        initialPredictions.push(initialPred ? { ...initialPred, aiName: name } : { aiName: name, winner: null });
                        // 最新预测
                        const dailyPred = latest[aiKey]?.[matchId];
                        if (dailyPred) {
                            predictions.push({ ...dailyPred, aiName: name });
                        } else {
                            predictions.push(initialPred ? { ...initialPred, aiName: name } : { aiName: name, winner: null });
                        }
                    }

                    allMatches.push({
                        match: {
                            id: matchId,
                            date: parsed.date,
                            time: parsed.time,
                            stage: 'group',
                            group: groupName,
                            home: m.home,
                            away: m.away,
                            venue: m.competitionCity || '',
                            isPlaceholder: false,
                        },
                        predictions,
                        initialPredictions,
                    });
                });
            }
        } else {
            const matches = stageData as RawMatch[];
            matches.forEach((m, i) => {
                const parsed = parseDate(m.date);
                if (!parsed) return;
                const matchId = `${stageDef.label}-${i}`;

                const predictions: AIPrediction[] = [];
                const initialPredictions: AIPrediction[] = [];
                for (const aiKey of AI_KEYS) {
                    const name = AI_NAMES[aiKey];
                    const initialPred = extractInitialPredictions(INITIAL_PREDICTIONS[aiKey], matchId);
                    initialPredictions.push(initialPred ? { ...initialPred, aiName: name } : { aiName: name, winner: null });
                    const dailyPred = latest[aiKey]?.[matchId];
                    if (dailyPred) {
                        predictions.push({ ...dailyPred, aiName: name });
                    } else {
                        predictions.push(initialPred ? { ...initialPred, aiName: name } : { aiName: name, winner: null });
                    }
                }

                allMatches.push({
                    match: {
                        id: matchId,
                        date: parsed.date,
                        time: parsed.time,
                        stage: stageDef.stage,
                        group: stageDef.label,
                        home: m.home,
                        away: m.away,
                        venue: m.competitionCity || '',
                        isPlaceholder: isPlaceholder(m.home) || isPlaceholder(m.away),
                    },
                    predictions,
                    initialPredictions,
                });
            });
        }
    }

    // 按日期 + 时间排序
    allMatches.sort((a, b) => {
        const dateCmp = a.match.date.localeCompare(b.match.date);
        if (dateCmp !== 0) return dateCmp;
        if (a.match.time === 'TBD') return 1;
        if (b.match.time === 'TBD') return -1;
        return a.match.time.localeCompare(b.match.time);
    });

    // 按日期分组
    const dayMap: Record<string, MatchWithPredictions[]> = {};
    for (const m of allMatches) {
        if (!dayMap[m.match.date]) dayMap[m.match.date] = [];
        dayMap[m.match.date].push(m);
    }

    // 构建日期→阶段标签映射（从当天比赛推断）
    const stageMap: Record<string, string> = {};
    for (const [dateStr, matches] of Object.entries(dayMap)) {
        const sample = matches[0];
        if (!sample) continue;
        const { stage } = sample.match;
        if (stage === 'group') {
            // 从 matchId 推断轮次：索引 0-1 = G1, 2-3 = G2, 4-5 = G3
            const idx = parseInt(sample.match.id.split('-')[1], 10);
            const round = idx < 2 ? 'G1' : idx < 4 ? 'G2' : 'G3';
            stageMap[dateStr] = `小组赛 ${round}`;
        } else if (stage === 'round_of_32') {
            stageMap[dateStr] = '32强赛';
        } else if (stage === 'round_of_16') {
            stageMap[dateStr] = '16强赛';
        } else if (stage === 'quarterfinals') {
            stageMap[dateStr] = '¼决赛';
        } else if (stage === 'semifinals') {
            stageMap[dateStr] = '半决赛';
        } else if (stage === 'third_place') {
            stageMap[dateStr] = '三四名';
        } else if (stage === 'final') {
            stageMap[dateStr] = '决赛';
        }
    }

    const dayGroups: DayGroup[] = [];
    const sortedDates = Object.keys(dayMap).sort();
    for (const dateStr of sortedDates) {
        const { dateLabel, weekdayLabel } = formatDateLabel(dateStr);
        dayGroups.push({
            date: dateStr,
            dateLabel,
            weekdayLabel,
            stageLabel: stageMap[dateStr] || '',
            matches: dayMap[dateStr],
        });
    }

    return { dayGroups, predictionSnapshots: snapshots };
}

/** 聚合每个 AI 最新的冠军+晋级路线预测 */
export function getLatestBracketPredictions(snapshots: Record<string, PredictionSnapshot[]>) {
    const result: Record<string, {
        champion?: string;
        championReason?: string;
        bracketPredictions?: Record<string, SinglePrediction>;
        date: string;
    }> = {};

    for (const [aiKey, aiSnapshots] of Object.entries(snapshots)) {
        // 从新到旧找第一个有 bracketPredictions 的快照
        for (let i = aiSnapshots.length - 1; i >= 0; i--) {
            const snap = aiSnapshots[i];
            if (snap.bracketPredictions || snap.champion) {
                result[aiKey] = {
                    champion: snap.champion,
                    championReason: snap.championReason,
                    bracketPredictions: snap.bracketPredictions,
                    date: snap.date,
                };
                break;
            }
        }
    }

    return result;
}
