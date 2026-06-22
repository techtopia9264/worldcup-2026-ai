/**
 * 快速添加比赛结果到 manualResults.json
 *
 * 用法:
 *   node scripts/add-result.mjs E-1 1 0 科特迪瓦
 *   node scripts/add-result.mjs F-0 2 2 draw
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANUAL_PATH = resolve(ROOT, 'src/data/manualResults.json');

const matchId = process.argv[2];
const homeScore = parseInt(process.argv[3], 10);
const awayScore = parseInt(process.argv[4], 10);
const winner = process.argv[5];

if (!matchId || isNaN(homeScore) || isNaN(awayScore) || !winner) {
    console.log('用法: node scripts/add-result.mjs <matchId> <homeScore> <awayScore> <winner> [homeTeam] [awayTeam]');
    console.log('示例: node scripts/add-result.mjs E-1 1 0 科特迪瓦');
    console.log('      node scripts/add-result.mjs F-0 2 2 draw');
    console.log('      node scripts/add-result.mjs H-2 4 0 西班牙 西班牙 沙特  ← 可选加队名校验');
    process.exit(1);
}

/* ====== 校验 matchId 对应的队伍 ====== */
const schedule = JSON.parse(readFileSync(resolve(ROOT, 'world_cup_2026.json'), 'utf-8'));

function findTeams(matchId) {
    const m = matchId.match(/^([A-Z])(?:-(\d+))?$/);
    if (!m) return null;
    const group = m[1], idx = parseInt(m[2], 10);
    const matches = schedule.groupCompetition?.[group];
    if (!matches || idx >= matches.length) return null;
    return { home: matches[idx].home, away: matches[idx].away };
}

const teams = findTeams(matchId);
const homeTeam = process.argv[6];
const awayTeam = process.argv[7];

if (teams) {
    console.log(`📋 ${matchId}: ${teams.home} vs ${teams.away}`);
    if (homeTeam && awayTeam) {
        if (teams.home !== homeTeam || teams.away !== awayTeam) {
            console.error(`❌ 队名不匹配！期望: ${teams.home} vs ${teams.away}，实际输入: ${homeTeam} vs ${awayTeam}`);
            process.exit(1);
        }
        console.log(`✅ 队名校验通过`);
    } else if (!homeTeam && !awayTeam) {
        console.log(`⚠️  未提供队名校验，请确认后继续`);
    }
} else {
    console.log(`⚠️  未在小组赛中找到 ${matchId}（可能是淘汰赛），跳过校验`);
}

const results = JSON.parse(readFileSync(MANUAL_PATH, 'utf-8'));
results[matchId] = { homeScore, awayScore, winner };
writeFileSync(MANUAL_PATH, JSON.stringify(results, null, 4) + '\n', 'utf-8');
console.log(`✅ ${matchId}: ${homeScore}-${awayScore} (${winner === 'draw' ? '平局' : winner + '胜'})`);
console.log(`   manualResults.json 已更新，共 ${Object.keys(results).length} 条手动结果`);
