/**
 * 同步真实比赛数据
 * 从 OpenFootball CDN 拉取 → 翻译队名 → 匹配到本地赛程 → 产出 realResults.json
 *
 * 用法: node scripts/sync.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ====== 队名映射 ====== */

const EN_TO_ZH = {
    'Algeria': '阿尔及利亚',
    'Argentina': '阿根廷',
    'Australia': '澳大利亚',
    'Austria': '奥地利',
    'Belgium': '比利时',
    'Bosnia & Herzegovina': '波黑',
    'Brazil': '巴西',
    'Canada': '加拿大',
    'Cape Verde': '佛得角',
    'Colombia': '哥伦比亚',
    'Croatia': '克罗地亚',
    'Curaçao': '库拉索',
    'Czech Republic': '捷克',
    'DR Congo': '民主刚果',
    'Ecuador': '厄瓜多尔',
    'Egypt': '埃及',
    'England': '英格兰',
    'France': '法国',
    'Germany': '德国',
    'Ghana': '加纳',
    'Haiti': '海地',
    'Iran': '伊朗',
    'Iraq': '伊拉克',
    'Ivory Coast': '科特迪瓦',
    'Japan': '日本',
    'Jordan': '约旦',
    'Mexico': '墨西哥',
    'Morocco': '摩洛哥',
    'Netherlands': '荷兰',
    'New Zealand': '新西兰',
    'Norway': '挪威',
    'Panama': '巴拿马',
    'Paraguay': '巴拉圭',
    'Portugal': '葡萄牙',
    'Qatar': '卡塔尔',
    'Saudi Arabia': '沙特',
    'Scotland': '苏格兰',
    'Senegal': '塞内加尔',
    'South Africa': '南非',
    'South Korea': '韩国',
    'Spain': '西班牙',
    'Sweden': '瑞典',
    'Switzerland': '瑞士',
    'Tunisia': '突尼斯',
    'Turkey': '土耳其',
    'USA': '美国',
    'Uruguay': '乌拉圭',
    'Uzbekistan': '乌兹别克斯坦',
};

/** OpenFootball match num → 淘汰赛索引映射 */
const KNOCKOUT_NUM_MAP = {
    // Round of 32: num 73-88 → index 0-15
    round_of_32: { start: 73, label: 'R32' },
    // Round of 16: num 89-96 → index 0-7
    round_of_16: { start: 89, label: 'R16' },
    // Quarter-finals: num 97-100 → index 0-3
    quarterfinals: { start: 97, label: 'QF' },
    // Semi-finals: num 101-102 → index 0-1
    semifinals: { start: 101, label: 'SF' },
    // Third place: num 103 → index 0
    third_place: { start: 103, label: '3RD' },
    // Final: num 104 → index 0
    final: { start: 104, label: 'FINAL' },
};

/**
 * 匹配比赛 ID
 * 小组赛按队名匹配，淘汰赛优先按 match num 匹配（因为队名会从占位符更新为真实队名）
 */
function findMatchId(schedule, match, team1Zh, team2Zh) {
    // 淘汰赛：优先按 num 匹配（最可靠，不受队名变化影响）
    if (match.num) {
        for (const [stage, { start, label }] of Object.entries(KNOCKOUT_NUM_MAP)) {
            if (match.num >= start && match.num < start + (schedule[stage]?.length || 0)) {
                const idx = match.num - start;
                return { id: `${label}-${idx}`, stage };
            }
        }
    }

    // 小组赛：按队名匹配
    for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
        for (let i = 0; i < matches.length; i++) {
            const m = matches[i];
            if (m.home === team1Zh && m.away === team2Zh) {
                return { id: `${group}-${i}`, stage: 'group' };
            }
        }
    }

    // 淘汰赛：按队名兜底（占位符阶段也能匹配上）
    const knockoutStages = ['round_of_32', 'round_of_16', 'quarterfinals', 'semifinals', 'final', 'third_place'];
    const stageLabels = { round_of_32: 'R32', round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', final: 'FINAL', third_place: '3RD' };
    for (const stage of knockoutStages) {
        const matches = schedule[stage];
        if (!matches) continue;
        for (let i = 0; i < matches.length; i++) {
            const m = matches[i];
            if (m.home === team1Zh && m.away === team2Zh) {
                return { id: `${stageLabels[stage]}-${i}`, stage };
            }
        }
    }
    return null;
}

/* ====== 主流程 ====== */

async function main() {
    console.log('📡 拉取 OpenFootball 数据...');
    const url = 'https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const liveData = await res.json();

    // 加载本地赛程
    const schedulePath = resolve(ROOT, 'world_cup_2026.json');
    const schedule = JSON.parse(readFileSync(schedulePath, 'utf-8'));

    // 构建结果
    const results = {};
    let matched = 0;
    let missed = 0;

    for (const m of liveData.matches) {
        // 跳过无比分
        if (!m.score || !m.score.ft) continue;

        const team1Zh = EN_TO_ZH[m.team1];
        const team2Zh = EN_TO_ZH[m.team2];

        // 淘汰赛占位符（如 "2A", "W73"）无法翻译 → 直接用原文
        const homeName = team1Zh || m.team1;
        const awayName = team2Zh || m.team2;

        const match = findMatchId(schedule, m, homeName, awayName);

        if (match) {
            results[match.id] = {
                homeScore: m.score.ft[0],
                awayScore: m.score.ft[1],
                winner: m.score.ft[0] > m.score.ft[1] ? homeName
                    : m.score.ft[0] < m.score.ft[1] ? awayName
                    : 'draw',
                updated: new Date().toISOString(),
            };
            matched++;
        } else {
            console.warn(`  ⚠ 未匹配: ${m.date} ${homeName} vs ${awayName}`);
            missed++;
        }
    }

    // 写入
    const outPath = resolve(ROOT, 'src/data/realResults.json');
    writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`✅ 同步完成: ${matched} 场匹配, ${missed} 场未匹配 → ${outPath}`);
}

main().catch((e) => {
    console.error('❌ 同步失败:', e.message);
    process.exit(1);
});
