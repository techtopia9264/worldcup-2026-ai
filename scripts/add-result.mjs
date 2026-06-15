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
    console.log('用法: node scripts/add-result.mjs <matchId> <homeScore> <awayScore> <winner>');
    console.log('示例: node scripts/add-result.mjs E-1 1 0 科特迪瓦');
    console.log('      node scripts/add-result.mjs F-0 2 2 draw');
    process.exit(1);
}

const results = JSON.parse(readFileSync(MANUAL_PATH, 'utf-8'));
results[matchId] = { homeScore, awayScore, winner };
writeFileSync(MANUAL_PATH, JSON.stringify(results, null, 4) + '\n', 'utf-8');
console.log(`✅ ${matchId}: ${homeScore}-${awayScore} (${winner === 'draw' ? '平局' : winner + '胜'})`);
console.log(`   manualResults.json 已更新，共 ${Object.keys(results).length} 条手动结果`);
