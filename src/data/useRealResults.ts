import { useState, useEffect } from 'react';
import type { RealResult } from '../components/MatchCard';
import bundledResults from './realResults.json';
import manualOverrides from './manualResults.json';

const CDN_URL = 'https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json';
const CACHE_KEY = 'wc2026_real_results';
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/* ====== 队名映射 ====== */

const EN_TO_ZH: Record<string, string> = {
    'Algeria': '阿尔及利亚', 'Argentina': '阿根廷', 'Australia': '澳大利亚',
    'Austria': '奥地利', 'Belgium': '比利时', 'Bosnia & Herzegovina': '波黑',
    'Brazil': '巴西', 'Canada': '加拿大', 'Cape Verde': '佛得角',
    'Colombia': '哥伦比亚', 'Croatia': '克罗地亚', 'Curaçao': '库拉索',
    'Czech Republic': '捷克', 'DR Congo': '民主刚果', 'Ecuador': '厄瓜多尔',
    'Egypt': '埃及', 'England': '英格兰', 'France': '法国',
    'Germany': '德国', 'Ghana': '加纳', 'Haiti': '海地',
    'Iran': '伊朗', 'Iraq': '伊拉克', 'Ivory Coast': '科特迪瓦',
    'Japan': '日本', 'Jordan': '约旦', 'Mexico': '墨西哥',
    'Morocco': '摩洛哥', 'Netherlands': '荷兰', 'New Zealand': '新西兰',
    'Norway': '挪威', 'Panama': '巴拿马', 'Paraguay': '巴拉圭',
    'Portugal': '葡萄牙', 'Qatar': '卡塔尔', 'Saudi Arabia': '沙特',
    'Scotland': '苏格兰', 'Senegal': '塞内加尔', 'South Africa': '南非',
    'South Korea': '韩国', 'Spain': '西班牙', 'Sweden': '瑞典',
    'Switzerland': '瑞士', 'Tunisia': '突尼斯', 'Turkey': '土耳其',
    'USA': '美国', 'Uruguay': '乌拉圭', 'Uzbekistan': '乌兹别克斯坦',
};

/* ====== 赛程匹配 ====== */

let _scheduleCache: any = null;

/** 加载本地赛程（懒加载） */
async function loadSchedule(): Promise<any> {
    if (_scheduleCache) return _scheduleCache;
    _scheduleCache = await import('../../world_cup_2026.json');
    return _scheduleCache;
}

/** OpenFootball match num → 淘汰赛索引 */
const KNOCKOUT_NUM_MAP: Record<string, { start: number; label: string }> = {
    round_of_32: { start: 73, label: 'R32' },
    round_of_16: { start: 89, label: 'R16' },
    quarterfinals: { start: 97, label: 'QF' },
    semifinals: { start: 101, label: 'SF' },
    third_place: { start: 103, label: '3RD' },
    final: { start: 104, label: 'FINAL' },
};

/** 用队名或 match num 在赛程中查找 matchId */
function findMatchId(schedule: any, match: any, team1Zh: string, team2Zh: string): string | null {
    // 淘汰赛：优先按 num 匹配
    if (match.num) {
        for (const [stage, { start, label }] of Object.entries(KNOCKOUT_NUM_MAP)) {
            if (match.num >= start && match.num < start + (schedule[stage]?.length || 0)) {
                return `${label}-${match.num - start}`;
            }
        }
    }
    // 小组赛：按队名匹配
    for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
        for (let i = 0; i < (matches as any[]).length; i++) {
            const m = (matches as any[])[i];
            if (m.home === team1Zh && m.away === team2Zh) return `${group}-${i}`;
        }
    }
    // 淘汰赛兜底：按队名匹配
    const stages = ['round_of_32', 'round_of_16', 'quarterfinals', 'semifinals', 'final', 'third_place'];
    const labels: Record<string, string> = { round_of_32: 'R32', round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', final: 'FINAL', third_place: '3RD' };
    for (const stage of stages) {
        const matches = schedule[stage];
        if (!matches) continue;
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].home === team1Zh && matches[i].away === team2Zh) return `${labels[stage]}-${i}`;
        }
    }
    return null;
}

/* ====== 缓存工具 ====== */

interface CacheEntry {
    results: Record<string, RealResult>;
    timestamp: number;
}

function getCached(): CacheEntry | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry: CacheEntry = JSON.parse(raw);
        if (Date.now() - entry.timestamp > CACHE_TTL) return null;
        return entry;
    } catch {
        return null;
    }
}

function setCache(results: Record<string, RealResult>): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ results, timestamp: Date.now() }));
    } catch { /* localStorage 满则静默跳过 */ }
}

/* ====== Hook ====== */

/**
 * 加载真实比赛结果
 * 1. 优先从 localStorage 缓存读取（5分钟有效）
 * 2. 缓存过期则从 CDN 拉取
 * 3. CDN 失败则降级到构建时打包的 bundledResults
 */
export function useRealResults(): Record<string, RealResult> {
    const [results, setResults] = useState<Record<string, RealResult>>(() => {
        // 初始化时先用缓存或打包数据
        const cached = getCached();
        const base = cached?.results || bundledResults as Record<string, RealResult>;
        // 手动覆盖优先
        return { ...base, ...manualOverrides as Record<string, RealResult> };
    });

    useEffect(() => {
        const cached = getCached();
        if (cached) return; // 缓存有效，不需拉取

        let cancelled = false;

        (async () => {
            try {
                const schedule = await loadSchedule();
                const res = await fetch(CDN_URL);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const liveData = await res.json();

                const fresh: Record<string, RealResult> = {};
                for (const m of liveData.matches) {
                    if (!m.score?.ft) continue;
                    const homeZh = EN_TO_ZH[m.team1] || m.team1;
                    const awayZh = EN_TO_ZH[m.team2] || m.team2;
                    const matchId = findMatchId(schedule, m, homeZh, awayZh);
                    if (!matchId) continue;
                    fresh[matchId] = {
                        homeScore: m.score.ft[0],
                        awayScore: m.score.ft[1],
                        winner: m.score.ft[0] > m.score.ft[1] ? homeZh
                            : m.score.ft[0] < m.score.ft[1] ? awayZh
                            : 'draw',
                    };
                }

                if (!cancelled) {
                    // 手动覆盖优先于 CDN 数据
                    const merged = { ...fresh, ...manualOverrides as Record<string, RealResult> };
                    setResults(merged);
                    setCache(merged);
                }
            } catch {
                // CDN 拉取失败，保持当前结果（缓存或打包数据）
            }
        })();

        return () => { cancelled = true; };
    }, []);

    return results;
}
