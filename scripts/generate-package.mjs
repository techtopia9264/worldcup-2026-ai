/**
 * 生成发给 AI 的完整 Prompt（一站复制即发）
 * node scripts/generate-package.mjs [ai_key]
 * node scripts/generate-package.mjs          → 生成全部 6 个
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/* ====== 映射表 ====== */

const EN_TO_ZH = {
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

const AI_NAMES = { deepseek: 'DeepSeek', doubao: '豆包', chatgpt: 'ChatGPT', gemini: 'Gemini', minimax: 'MiniMax', qwen: 'Qwen' };
const AI_KEYS = Object.keys(AI_NAMES);

const MATCH_NUM_MAP = {
    round_of_32: { start: 73, label: 'R32' },
    round_of_16: { start: 89, label: 'R16' },
    quarterfinals: { start: 97, label: 'QF' },
    semifinals: { start: 101, label: 'SF' },
    third_place: { start: 103, label: '3RD' },
    final: { start: 104, label: 'FINAL' },
};

/* ====== 数据加载 ====== */

async function fetchLiveData() {
    const url = 'https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json';
    const res = await fetch(url);
    return res.json();
}

function loadSchedule() {
    return JSON.parse(readFileSync(resolve(ROOT, 'world_cup_2026.json'), 'utf-8'));
}

function loadManualResults() {
    const path = resolve(ROOT, 'src/data/manualResults.json');
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
    return {};
}

/** 从所有快照聚合某 AI 的最新预测（遍历新→旧，每个matchId取第一次出现） */
function loadLatestPrediction(aiKey) {
    const predDir = resolve(ROOT, 'predictions');
    if (!existsSync(predDir)) return null;
    const dirs = readdirSync(predDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
        .map((d) => d.name).sort().reverse();
    // 聚合所有快照
    const aggregated = { predictions: {}, commentary: '', date: '', nextMatchday: '' };
    let hasAny = false;
    for (const dir of dirs) {
        const path = join(predDir, dir, `${aiKey}.json`);
        if (!existsSync(path)) continue;
        const data = JSON.parse(readFileSync(path, 'utf-8'));
        const hasContent = data.commentary
            || Object.values(data.predictions || {}).some((p) => p.winner && p.winner !== '');
        if (!hasContent) continue;
        if (!hasAny) {
            // 第一次（最新）的快照作为元信息来源
            aggregated.commentary = data.commentary || '';
            aggregated.date = data.date || '';
            aggregated.nextMatchday = data.nextMatchday || '';
            hasAny = true;
        }
        // 聚合 predictions：只填尚未出现的 matchId
        for (const [matchId, pred] of Object.entries(data.predictions || {})) {
            if (pred.winner && !aggregated.predictions[matchId]) {
                aggregated.predictions[matchId] = pred;
            }
        }
    }
    return hasAny ? aggregated : null;
}

function loadInitialPrediction(aiKey) {
    const path = resolve(ROOT, `predictions/initial/${aiKey}.json`);
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
    return null;
}

/* ====== 匹配 ====== */

function findMatchId(schedule, match, team1Zh, team2Zh) {
    if (match.num) {
        for (const [stage, { start, label }] of Object.entries(MATCH_NUM_MAP)) {
            if (match.num >= start && match.num < start + (schedule[stage]?.length || 0)) {
                return `${label}-${match.num - start}`;
            }
        }
    }
    for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].home === team1Zh && matches[i].away === team2Zh) return `${group}-${i}`;
        }
    }
    const stages = ['round_of_32', 'round_of_16', 'quarterfinals', 'semifinals', 'final', 'third_place'];
    const labels = { round_of_32: 'R32', round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', final: 'FINAL', third_place: '3RD' };
    for (const stage of stages) {
        const ms = schedule[stage];
        if (!ms) continue;
        for (let i = 0; i < ms.length; i++) {
            if (ms[i].home === team1Zh && ms[i].away === team2Zh) return `${labels[stage]}-${i}`;
        }
    }
    return null;
}

function computeStandings(schedule, results) {
    const teams = {};
    for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
        for (const m of matches) {
            for (const team of [m.home, m.away]) {
                if (!teams[team]) teams[team] = { team, group, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
            }
        }
    }
    for (const [matchId, r] of Object.entries(results)) {
        let found = null;
        for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
            for (let i = 0; i < matches.length; i++) {
                if (`${group}-${i}` === matchId) found = matches[i];
            }
        }
        if (!found) continue;
        const home = teams[found.home], away = teams[found.away];
        if (!home || !away) continue;
        home.p++; away.p++; home.gf += r.homeScore; home.ga += r.awayScore;
        away.gf += r.awayScore; away.ga += r.homeScore;
        if (r.winner === found.home) { home.w++; home.pts += 3; away.l++; }
        else if (r.winner === found.away) { away.w++; away.pts += 3; home.l++; }
        else { home.d++; home.pts++; away.d++; away.pts++; }
    }
    for (const t of Object.values(teams)) t.gd = t.gf - t.ga;
    return Object.values(teams).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

/* ====== Prompt 生成 ====== */

function buildPrompt(aiKey, standings, results, nextMatchday, nextMatches, currentPredictions, otherAIPredictions) {
    const aiName = AI_NAMES[aiKey];
    const today = new Date().toISOString().slice(0, 10);

    let prompt = '';

    // 任务说明
    prompt += `# 世界杯 AI 锐评任务 · ${today}\n\n`;
    prompt += `你是 **${aiName}**，一个懂球的老哥，被拉来参加 AI 看球实验。\n`;
    prompt += `6 个 AI 每天各自分析数据、预测第二天比赛、点评赛况。最后看谁眼光最毒。\n\n`;
    prompt += `**这不是赌博，只是 AI 能力对比实验。你的预测只用于赛后统计正确率。**\n\n`;
    prompt += `## 你的任务\n\n`;
    prompt += `**⚠️ 在预测之前，你必须先搜索今日赛果！** 用搜索工具找 ESPN、FotMob、SkySports 等来源，查今天比赛的结果和数据。不搜就猜等于瞎蒙，其他 AI 会笑话你的。\n\n`;
    prompt += `1. **搜赛果**：今天哪些比赛结束了？比分多少？谁进的球？\n`;
    prompt += `2. **搜动态**：下个比赛日的球队最近状态、伤病、更衣室八卦\n`;
    prompt += `3. **吐槽**：结合真实赛果点评，有事实有态度，像贴吧老哥聊球\n`;
    prompt += `4. **预测**：基于真实信息，只预测**下个比赛日**的比赛\n\n`;

    // 第三轮特殊提示
    const isThirdRound = nextMatches.some((m) => {
        const mIdx = parseInt((m.matchId.match(/-(\d+)$/) || [])[1]);
        return mIdx >= 4; // 第三轮 matchId 从 4 开始
    });
    if (isThirdRound) {
        prompt += `## 🔥 特殊节点：小组赛第三轮\n\n`;
        prompt += `今天是小组赛第二轮结束、第三轮开启的关键节点。在预测前，请特别关注：\n\n`;
        prompt += `- **第二轮总结**：整体评价第二轮的比赛——哪些强队翻身了、哪些黑马露馅了\n`;
        prompt += `- **积分榜分析**：结合上面的积分榜和净胜球，分析各组出线形势——谁必须赢、谁打平就能出线、谁已淘汰\n`;
        prompt += `- **第三轮策略**：第三轮同组两场同时开打，已出线的队可能轮换，背水一战的队会拼命。别只看纸面实力！\n\n`;
        prompt += `> 💡 第三轮是"算分期"，要综合积分、净胜球和出线形势来预测，不只是猜谁强谁弱。\n\n`;
    }

    // 积分榜
    prompt += `---\n\n## 当前积分榜\n\n`;
    prompt += `| # | 国家 | 组 | 场 | 胜 | 平 | 负 | 进球 | 失球 | 净胜 | 积分 |\n`;
    prompt += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
    let rank = 0;
    for (const t of standings) {
        rank++;
        prompt += `| ${rank} | ${t.team} | ${t.group} | ${t.p} | ${t.w} | ${t.d} | ${t.l} | ${t.gf || 0} | ${t.ga || 0} | ${t.gd >= 0 ? '+' : ''}${t.gd} | ${t.pts} |\n`;
    }

    // 已结束比赛
    prompt += `\n---\n\n## 已结束比赛\n\n`;
    const schedule = loadSchedule();
    for (const [matchId, r] of Object.entries(results).sort()) {
        let home = '', away = '';
        for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
            for (let i = 0; i < matches.length; i++) {
                if (`${group}-${i}` === matchId) { home = matches[i].home; away = matches[i].away; }
            }
        }
        if (!home) {
            const stages = ['round_of_32', 'round_of_16', 'quarterfinals', 'semifinals', 'final', 'third_place'];
            const labels = { round_of_32: 'R32', round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', final: 'FINAL', third_place: '3RD' };
            for (const stage of stages) {
                const ms = schedule[stage];
                if (!ms) continue;
                for (let i = 0; i < ms.length; i++) {
                    if (`${labels[stage]}-${i}` === matchId) { home = ms[i].home; away = ms[i].away; }
                }
            }
        }
        const isDraw = r.winner === 'draw';
        prompt += `- ${matchId}：${home} ${r.homeScore}:${r.awayScore} ${away}${isDraw ? '（平局）' : `（${r.winner}胜）`}\n`;
    }

    // 下个比赛日
    prompt += `\n---\n\n## 下一个比赛日：${nextMatchday || '未知'}\n\n`;
    prompt += `**你需要预测以下 ${nextMatches.length} 场比赛：**\n\n`;
    for (const m of nextMatches) {
        prompt += `- \`${m.matchId}\`：${m.home} vs ${m.away}（${m.competitionCity || m.ground || ''}）\n`;
    }

    // 该 AI 的当前预测
    prompt += `\n---\n\n## 你上次的预测\n\n`;
    if (currentPredictions) {
        prompt += `上次更新：${currentPredictions.date || '赛前'}\n`;
        const preds = currentPredictions.predictions || {};
        const predKeys = Object.keys(preds);
        if (predKeys.length > 0) {
            const nextIds = new Set(nextMatches.map((m) => m.matchId));
            const relevant = predKeys.filter((k) => nextIds.has(k));
            prompt += `\n上次对下个比赛日的预测：\n`;
            if (relevant.length > 0) {
                for (const k of relevant) prompt += `- \`${k}\`：${preds[k].winner || '—'}\n`;
            } else {
                prompt += `（首次预测，无历史记录）\n`;
            }
        }
    } else {
        prompt += `（首次参与，无历史预测）\n`;
    }

    // 其他 AI 的预测和评论
    prompt += `\n---\n\n## 其他 AI 的最新预测\n\n`;
    const others = Object.entries(otherAIPredictions).filter(([k]) => k !== aiKey);
    if (others.length > 0) {
        prompt += `以下是其他 AI 上次对比赛的分析和预测，供你参考：\n\n`;
        for (const [otherKey, pred] of others) {
            if (!pred) continue;
            const otherName = AI_NAMES[otherKey];
            prompt += `### ${otherName}\n`;
            prompt += `> ${(pred.commentary || '（无评论）').slice(0, 200)}${(pred.commentary || '').length > 200 ? '...' : ''}\n\n`;
            const preds = pred.predictions || {};
            const predKeys = Object.keys(preds);
            if (predKeys.length > 0) {
                prompt += `预测：\n`;
                for (const k of predKeys) {
                    prompt += `- \`${k}\`：${preds[k].winner || '—'}\n`;
                }
            } else {
                prompt += `（无预测数据）\n`;
            }
            prompt += '\n';
        }
    } else {
        prompt += `暂无其他 AI 的数据。\n\n`;
    }

    // matchId 参考
    prompt += `---\n\n## matchId 参考\n\n`;
    prompt += `小组赛：{组别}-{索引}，如 A-0（第1场）、A-1（第2场）……每个小组6场。\n`;
    prompt += `淘汰赛：R32-0~R32-15 / R16-0~R16-7 / QF-0~QF-3 / SF-0~SF-1 / FINAL-0 / 3RD-0\n`;

    // 输出格式
    prompt += `\n---\n\n## 输出格式\n\n`;
    prompt += `**直接输出 JSON，不要 markdown 包裹。**\n\n`;
    prompt += '```json\n';
    prompt += '{\n';
    prompt += `  "ai": "${aiName}",\n`;
    prompt += `  "date": "${today}",\n`;
    prompt += `  "nextMatchday": "${nextMatchday || ''}",\n`;
    prompt += `  "commentary": "在这里写你对前几天的比赛的点评、吐槽、分析。口语化风格，像贴吧老哥聊球。300字以内。",\n`;
    prompt += `  "predictions": {\n`;
    const matchIds = nextMatches.map((m) => m.matchId);
    for (let i = 0; i < matchIds.length; i++) {
        const comma = i < matchIds.length - 1 ? ',' : '';
        prompt += `    "${matchIds[i]}": { "winner": "", "score": "" }${comma}\n`;
    }
    prompt += '  }\n';
    prompt += '}\n';
    prompt += '```\n\n';

    // 提醒
    prompt += `---\n\n`;
    prompt += `⚠️ 这不是赌博 | 🏆 只预测下个比赛日 | 🇨🇳 队名用中文 | "draw"=平局\n`;

    return prompt;
}

/* ====== 主流程 ====== */

async function main() {
    const targetAI = process.argv[2] || null;
    const schedule = loadSchedule();

    // 拉取 CDN 数据（失败用本地缓存兜底）
    let liveData = null;
    try {
        liveData = await fetchLiveData();
    } catch {
        console.log('⚠ CDN 拉取失败，使用本地数据兜底');
        const cachePath = resolve(ROOT, 'src/data/realResults.json');
        if (existsSync(cachePath)) {
            // 从本地 realResults.json 重建简易 match 列表
            liveData = { matches: [] };
            console.log('  已加载本地缓存');
        }
    }
    const manualResults = loadManualResults();

    // 合并结果
    const results = {};
    if (liveData?.matches) {
        for (const m of liveData.matches) {
            if (!m.score?.ft) continue;
            const homeZh = EN_TO_ZH[m.team1] || m.team1;
            const awayZh = EN_TO_ZH[m.team2] || m.team2;
            const matchId = findMatchId(schedule, m, homeZh, awayZh);
            if (!matchId) continue;
            results[matchId] = {
                homeScore: m.score.ft[0],
                awayScore: m.score.ft[1],
                winner: m.score.ft[0] > m.score.ft[1] ? homeZh : m.score.ft[0] < m.score.ft[1] ? awayZh : 'draw',
            };
        }
    }
    Object.assign(results, manualResults);
    const standings = computeStandings(schedule, results);

    // 剩余赛程
    const remainingSchedule = [];
    for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
        for (let i = 0; i < matches.length; i++) {
            if (!results[`${group}-${i}`]) remainingSchedule.push({ matchId: `${group}-${i}`, ...matches[i], group });
        }
    }
    const koLabels = { round_of_32: 'R32', round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', final: 'FINAL', third_place: '3RD' };
    for (const [stage, label] of Object.entries(koLabels)) {
        const matches = schedule[stage];
        if (!matches) continue;
        for (let i = 0; i < matches.length; i++) {
            if (!results[`${label}-${i}`]) remainingSchedule.push({ matchId: `${label}-${i}`, ...matches[i], stage });
        }
    }

    // 下一个比赛日
    const today = new Date().toISOString().slice(0, 10);
    let nextMatchday = null, nextMatches = [];
    for (const m of remainingSchedule) {
        const mDate = m.date?.slice(0, 10);
        if (mDate > today) {
            if (!nextMatchday || mDate < nextMatchday) { nextMatchday = mDate; nextMatches = [m]; }
            else if (mDate === nextMatchday) nextMatches.push(m);
        }
    }

    // 加载所有 AI 的最新预测（供情报共享）
    const allPredictions = {};
    for (const key of AI_KEYS) {
        allPredictions[key] = loadLatestPrediction(key);
    }

    // 生成
    const aiKeys = targetAI ? [targetAI] : AI_KEYS;

    // 创建下一个比赛日的目录 + JSON 模板文件
    const predDir = resolve(ROOT, 'predictions', nextMatchday || today);
    if (!existsSync(predDir)) mkdirSync(predDir, { recursive: true });

    for (const aiKey of aiKeys) {
        if (!AI_NAMES[aiKey]) { console.log(`⚠ 未知 AI: ${aiKey}`); continue; }
        const latest = allPredictions[aiKey];

        // 生成 Prompt（含其他 AI 情报）
        const prompt = buildPrompt(aiKey, standings, results, nextMatchday, nextMatches, latest, allPredictions);
        const promptFile = `${aiKey}-prompt.md`;
        writeFileSync(resolve(ROOT, promptFile), prompt, 'utf-8');

        // 生成 JSON 模板（仅在文件不存在时创建，避免覆盖已填数据）
        const jsonFile = join(predDir, `${aiKey}.json`);
        if (!existsSync(jsonFile)) {
            const template = {
                ai: AI_NAMES[aiKey],
                date: today,
                nextMatchday: nextMatchday || '',
                commentary: '',
                predictions: Object.fromEntries(
                    nextMatches.map((m) => [m.matchId, { winner: '', score: '' }]),
                ),
            };
            writeFileSync(jsonFile, JSON.stringify(template, null, 2), 'utf-8');
            const folderName = nextMatchday || today;
            console.log(`✅ ${promptFile}  +  predictions/${folderName}/${aiKey}.json (新建)`);
        } else {
            console.log(`✅ ${promptFile}  (JSON 已存在，跳过)`);
        }
    }
    console.log(`\n📊 已结束 ${Object.keys(results).length} 场 · 下一个比赛日 ${nextMatchday}（${nextMatches.length} 场）`);
    const folderName = nextMatchday || today;
    console.log(`📁 JSON 模板已生成到 predictions/${folderName}/，收到 AI 回复后替换内容即可`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
