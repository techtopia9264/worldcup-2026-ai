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

const AI_NAMES = { deepseek: 'DeepSeek', doubao: 'DouBao', chatgpt: 'ChatGPT', gemini: 'Gemini', minimax: 'MiniMax', qwen: 'Qwen' };
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
    const schedule = loadSchedule();

    let prompt = '';

    // 致歉声明（数据错误修复后首次生成）
    const apologyPath = resolve(ROOT, 'reviews', 'apology.md');
    if (existsSync(apologyPath)) {
        const apology = readFileSync(apologyPath, 'utf8').trim();
        if (apology) {
            prompt += `> ${apology.replace(/\n/g, '\n> ')}\n`;
            prompt += '\n---\n\n';
        }
    }

    // 任务说明（淘汰赛模式）
    prompt += `# 世界杯 AI 锐评任务 · ${today}\n\n`;
    prompt += `你是 **${aiName}**，一个懂球的老哥，被拉来参加 AI 看球实验。\n`;
    prompt += `6 个 AI 每天各自分析数据、预测比赛、点评赛况。最后看谁眼光最毒。\n\n`;
    prompt += `**这不是赌博，只是 AI 能力对比实验。**\n\n`;
    prompt += `## 🔥 淘汰赛模式\n\n`;
    prompt += `小组赛已全部结束，进入淘汰赛阶段。**没有平局了**——加时赛、点球大战随时可能上演。\n\n`;
    prompt += `## 你的任务\n\n`;
    prompt += `**⚠️ 在预测之前，你必须先搜索今日赛果！** 用搜索工具找 ESPN、FotMob、SkySports 等来源。\n\n`;
    prompt += `1. **搜赛果**：今天哪些比赛结束了？比分多少？谁进了球？有没有加时/点球？\n`;
    prompt += `2. **搜动态**：下个比赛日球队的状态、伤病、更衣室八卦\n`;
    prompt += `3. **吐槽**：结合真实赛果点评，有事实有态度，像贴吧老哥聊球\n`;
    prompt += `4. **预测**：预测**下个比赛日**的比赛。淘汰赛没有平局！\n\n`;

    // R32 对阵
    prompt += `---\n\n## 32强淘汰赛对阵\n\n`;
    const r32Data = resolveR32Teams(schedule, results);
    prompt += `| matchId | 对阵 | 时间 |\n`;
    prompt += `|---------|------|------|\n`;
    for (const m of r32Data) {
        const ds = fmtDateShort(m.date);
        prompt += `| \`${m.id}\` | ${m.home || '待定'} vs ${m.away || '待定'} | ${ds} |\n`;
    }

    // 完整路径
    prompt += `\n## 淘汰赛完整路径\n\n`;
    prompt += `**R16对阵**（取决于R32结果）：\n`;
    for (let i = 0; i < 8; i++) {
        prompt += `- \`R16-${i}\`：${r32FeedsToR16(i, 0)} 胜者 vs ${r32FeedsToR16(i, 1)} 胜者\n`;
    }
    prompt += `\n**¼决赛** QF-0~QF-3 → **半决赛** SF-0~SF-1 → **决赛** FINAL-0 / **三四名** 3RD-0\n`;

    // 专家赛评（如果有）
    const reviewPath = resolve(ROOT, 'reviews', `${today}.md`);
    if (existsSync(reviewPath)) {
        const review = readFileSync(reviewPath, 'utf8').trim();
        if (review) {
            prompt += `\n---\n\n## 📝 前方记者赛评\n\n`;
            prompt += `> ${review.replace(/\n/g, '\n> ')}\n`;
        }
    }

    // 下个比赛日
    prompt += `\n---\n\n## 下一个比赛日：${nextMatchday || '未知'}\n\n`;
    prompt += `**你需要预测以下 ${nextMatches.length} 场比赛：**\n\n`;
    for (const m of nextMatches) {
        const tm = resolveMatchTeams(m, schedule, results);
        prompt += `- \`${m.matchId}\`：${tm.home || '?'} vs ${tm.away || '?'}\n`;
    }

    const isKnockout = nextMatches.some((m) => m.matchId.startsWith('R') || m.matchId.startsWith('QF') || m.matchId.startsWith('SF') || m.matchId.startsWith('FINAL') || m.matchId.startsWith('3RD'));
    const isFirstKnockout = isKnockout && (!currentPredictions || !currentPredictions.bracketPredictions);

    // 冠军+全赛程预测
    prompt += `\n---\n\n## 🏆 冠军预测 & 晋级剧本\n\n`;
    const todayDate = new Date();
    const qfLockDate = new Date('2026-07-10');
    const isBeforeQF = todayDate < qfLockDate;

    if (isFirstKnockout) {
        prompt += `小组赛已全部收官！在预测明天的比赛之前，你需要先完成以下特别任务：\n\n`;
        prompt += `### 1. 小组赛总结\n`;
        prompt += `简要总结小组赛的看点和结果：哪些强队表现符合预期？哪些黑马让人意外？哪些传统豪强翻车了？\n\n`;
        prompt += `### 2. 冠军预测\n`;
        prompt += `选出你**最看好夺冠的球队**，并写出它的完整晋级"剧本"。\n`;
        prompt += `例如：\`R32 轻取加拿大 → R16 点球淘汰巴西 → QF 加时绝杀德国 → SF 完胜法国 → 决赛击败阿根廷夺冠\`\n`;
        prompt += `剧本要有画面感，像说书一样，让老哥们看了直呼内行！\n\n`;
        prompt += `### 3. 全赛程预测\n`;
        prompt += `在 \`bracketPredictions\` 中预测全部 32 场淘汰赛的胜者（R32→R16→QF→SF→FINAL→3RD）。\n`;
        prompt += `冠军的晋级路线要和剧本一致哦！\n\n`;
    }

    // 修改规则
    prompt += `## 🔒 冠军预测修改规则\n\n`;
    if (isBeforeQF) {
        prompt += `当前处于淘汰赛早期阶段。你可以：\n`;
        prompt += `- ✅ **每天修改一次**冠军预测和晋级路线（在 \`predictions\` 之后更新 \`champion\` 和 \`bracketPredictions\`）\n`;
        prompt += `- ✅ 也可以选择**不改**，沿用上一次的预测\n`;
        prompt += `- ⚠️ **四分之一决赛（7月10日）开打后将封版**，不可再修改！请谨慎选择\n`;
    } else {
        prompt += `⚠️ **四分之一决赛已开始，冠军预测已封版！**\n`;
        prompt += `- ❌ 不可再修改 \`champion\` 和 \`bracketPredictions\`\n`;
        prompt += `- 如果 JSON 中包含这些字段，请保持与上次一致\n`;
    }
    prompt += `\n`;

    if (currentPredictions?.champion) {
        prompt += `你当前的冠军选择：**${currentPredictions.champion}**。`;
        if (isBeforeQF) {
            prompt += `今天可以修改，也可以保持不变。\n`;
        } else {
            prompt += `已锁定，不可修改。\n`;
        }
    } else if (!isFirstKnockout) {
        prompt += `你还没有选择冠军。`;
        if (isBeforeQF) prompt += `请在今天的预测中补上！\n`;
    }
    prompt += `\n`;

    // 上次预测
    prompt += `\n---\n\n## 你上次的预测\n\n`;
    if (currentPredictions) {
        prompt += `上次更新：${currentPredictions.date || '赛前'}\n`;
        const preds = currentPredictions.predictions || {};
        const nextIds = new Set(nextMatches.map((m) => m.matchId));
        const relevant = Object.keys(preds).filter((k) => nextIds.has(k));
        if (relevant.length > 0) {
            prompt += `\n上次对下个比赛日的预测：\n`;
            for (const k of relevant) prompt += `- \`${k}\`：${preds[k].winner || '—'}\n`;
        } else {
            prompt += `（首次预测，无历史记录）\n`;
        }
    } else {
        prompt += `（首次参与，无历史预测）\n`;
    }

    // 已结束的淘汰赛
    const koDone = Object.entries(results).filter(([id]) =>
        id.startsWith('R') || id.startsWith('QF') || id.startsWith('SF') || id.startsWith('FINAL') || id.startsWith('3RD')
    );
    if (koDone.length > 0) {
        prompt += `\n---\n\n## 已结束的淘汰赛\n\n`;
        for (const [matchId, r] of koDone.sort()) {
            const tm = resolveMatchTeams({ matchId }, schedule, results);
            prompt += `- \`${matchId}\`：${tm.home || '?'} ${r.homeScore}:${r.awayScore} ${tm.away || '?'}`;
            if (r.extraTime) prompt += '（加时）';
            if (r.penalties) prompt += '（点球）';
            prompt += ` → ${r.winner}晋级\n`;
        }
    }

    // 输出格式
    prompt += `\n---\n\n## 输出格式\n\n`;
    prompt += `**直接输出 JSON，不要 markdown 包裹。**\n\n`;
    prompt += `| 字段 | 必填 | 说明 |\n`;
    prompt += `|------|------|------|\n`;
    prompt += `| winner | ✅ | 球队中文名。淘汰赛**没有 draw**！ |\n`;
    prompt += `| score | 可选 | 预测比分，如 "2:1" |\n`;
    prompt += `| extraTime | 可选 | 是否加时赛，true/false |\n`;
    prompt += `| penalties | 可选 | 是否点球大战，true/false |\n`;
    prompt += `| champion | ✅首次 | 看好的冠军球队 |\n`;
    prompt += `| championReason | ✅首次 | 冠军理由，50字内 |\n`;
    prompt += `| bracketPredictions | ✅首次 | 全淘汰赛预测 |\n\n`;

    const matchIds = nextMatches.map((m) => m.matchId);
    prompt += '```json\n';
    prompt += '{\n';
    prompt += `  "ai": "${aiName}",\n`;
    prompt += `  "date": "${today}",\n`;
    prompt += `  "nextMatchday": "${nextMatchday || ''}",\n`;
    prompt += `  "commentary": "在这里写你对赛况的点评。口语化风格，像贴吧老哥聊球。300字以内。",\n`;

    if (isFirstKnockout) {
        prompt += `  "champion": "你预测的冠军球队名",\n`;
        prompt += `  "championReason": "选择这个冠军的理由",\n`;
    }

    prompt += `  "predictions": {\n`;
    for (const id of matchIds) {
        prompt += `    "${id}": { "winner": "", "score": "", "extraTime": false, "penalties": false },\n`;
    }
    prompt += `  }`;
    if (isFirstKnockout) {
        prompt += `,\n  "bracketPredictions": {\n`;
        const allKoIds = getAllKoMatchIds(schedule);
        for (let i = 0; i < allKoIds.length; i++) {
            const id = allKoIds[i];
            const comma = i < allKoIds.length - 1 ? ',' : '';
            prompt += `    "${id}": { "winner": "", "extraTime": false, "penalties": false }${comma}\n`;
        }
        prompt += `  }`;
    }
    prompt += '\n}\n';
    prompt += '```\n\n';
    prompt += '---\n\n';
    prompt += '⚠️ 这不是赌博 | 🏆 淘汰赛没平局 | 🇨🇳 队名用中文 | 加时/点球 true/false';

    return prompt;
}

/* ====== 淘汰赛辅助函数 ====== */

function resolveR32Teams(schedule, results) {
    const teams = {};
    function ensure(n) { if (!teams[n]) teams[n] = { team: n, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, group: '' }; return teams[n]; }
    for (const [g, ms] of Object.entries(schedule.groupCompetition || {})) {
        ms.forEach((m, i) => {
            const r = results[g + '-' + i]; if (!r) return;
            const h = ensure(m.home), a = ensure(m.away);
            h.group = g; a.group = g; h.p++; a.p++; h.gf += r.homeScore; a.gf += r.awayScore;
            h.ga += r.awayScore; a.ga += r.homeScore; h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
            if (r.winner === m.home) { h.w++; h.pts += 3; a.l++; }
            else if (r.winner === m.away) { a.w++; a.pts += 3; h.l++; }
            else { h.d++; h.pts++; a.d++; a.pts++; }
        });
    }
    const st = {};
    for (const g of Object.keys(schedule.groupCompetition || {}))
        st[g] = Object.values(teams).filter(t => t.group === g).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    const ok = (g) => [0, 1, 2, 3, 4, 5].every(i => results[g + '-' + i]);
    const gw = (g) => ok(g) ? (st[g]?.[0]?.team || null) : null;
    const gr = (g) => ok(g) ? (st[g]?.[1]?.team || null) : null;
    const at = Object.keys(st).map(g => {
        if (!ok(g)) return null; const t = st[g]?.[2];
        return t ? { team: t.team, pts: t.pts, gd: t.gd } : null;
    }).filter(Boolean).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    function r(ph) {
        const m = ph.match(/^([12])([A-Z])$/); if (m) return m[1] === '1' ? gw(m[2]) : gr(m[2]);
        const t3 = ph.match(/^3([A-Z])$/); if (t3) return ok(t3[1]) ? (st[t3[1]]?.[2]?.team || null) : null;
        const tm = ph.match(/^T(\d)$/); if (tm) return at[parseInt(tm[1]) - 1]?.team || null; return null;
    }
    const tpl = [
        { id: 'R32-0', h: '2A', a: '2B' }, { id: 'R32-1', h: '1E', a: '3D' }, { id: 'R32-2', h: '1F', a: '2C' },
        { id: 'R32-3', h: '1C', a: '2F' }, { id: 'R32-4', h: '1I', a: '3F' }, { id: 'R32-5', h: '2E', a: '2I' },
        { id: 'R32-6', h: '1A', a: '3E' }, { id: 'R32-7', h: '1L', a: '3K' }, { id: 'R32-8', h: '1D', a: '3B' },
        { id: 'R32-9', h: '1G', a: '3I' }, { id: 'R32-10', h: '2K', a: '2L' }, { id: 'R32-11', h: '1H', a: '2J' },
        { id: 'R32-12', h: '1B', a: '3J' }, { id: 'R32-13', h: '1J', a: '2H' }, { id: 'R32-14', h: '1K', a: '3L' },
        { id: 'R32-15', h: '2D', a: '2G' },
    ];
    return tpl.map(t => {
        const idx = parseInt(t.id.split('-')[1]);
        const schedDate = schedule.round_of_32[idx]?.date || '';
        return { id: t.id, home: r(t.h) || '待定', away: r(t.a) || '待定', date: schedDate };
    });
}
function fmtDateShort(raw) { if (!raw) return ''; const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return raw.slice(0, 10); return parseInt(m[2]) + '/' + parseInt(m[3]); }
function r32FeedsToR16(i, s) { const m = { 0: ['R32-1', 'R32-4'], 1: ['R32-0', 'R32-2'], 2: ['R32-3', 'R32-5'], 3: ['R32-6', 'R32-7'], 4: ['R32-10', 'R32-11'], 5: ['R32-8', 'R32-9'], 6: ['R32-13', 'R32-15'], 7: ['R32-12', 'R32-14'] }; return (m[i] || ['?', '?'])[s] || '?'; }
function resolveMatchTeams(m, schedule, results) {
    const r32 = resolveR32Teams(schedule, results); const f = r32.find(t => t.id === m.matchId);
    if (f) return { home: f.home, away: f.away };
    const st = { round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', final: 'FINAL', third_place: '3RD' };
    for (const [sk, lb] of Object.entries(st)) { const ms = schedule[sk]; if (!ms) continue; for (let i = 0; i < ms.length; i++) if (lb + '-' + i === m.matchId) return { home: ms[i].home || '?', away: ms[i].away || '?' }; }
    return { home: m.home || '?', away: m.away || '?' };
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
            // 从本地 realResults.json 加载已缓存的结果
            const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
            liveData = { matches: [] };
            for (const [matchId, r] of Object.entries(cached)) {
                // 反查队名
                let home = '', away = '';
                for (const [group, matches] of Object.entries(schedule.groupCompetition || {})) {
                    for (let i = 0; i < matches.length; i++) {
                        if (`${group}-${i}` === matchId) { home = matches[i].home; away = matches[i].away; }
                    }
                }
                if (home && away) {
                    liveData.matches.push({
                        team1: Object.keys(EN_TO_ZH).find((k) => EN_TO_ZH[k] === home) || home,
                        team2: Object.keys(EN_TO_ZH).find((k) => EN_TO_ZH[k] === away) || away,
                        score: { ft: [r.homeScore, r.awayScore] },
                        num: null,
                    });
                }
            }
            console.log(`  已加载本地缓存 ${liveData.matches.length} 场`);
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
            const isKnockout = nextMatches.some((m) => m.matchId.startsWith('R') || m.matchId.startsWith('QF') || m.matchId.startsWith('SF') || m.matchId.startsWith('FINAL') || m.matchId.startsWith('3RD'));
            const latestPred = allPredictions[aiKey];
            const isFirstKo = isKnockout && (!latestPred || !latestPred.bracketPredictions);

            const template = {
                ai: AI_NAMES[aiKey],
                date: today,
                nextMatchday: nextMatchday || '',
                commentary: '',
                predictions: Object.fromEntries(
                    nextMatches.map((m) => [m.matchId, { winner: '', score: '', extraTime: false, penalties: false }]),
                ),
            };
            if (isFirstKo) {
                template.champion = '';
                template.championReason = '';
                const allKoIds = getAllKoMatchIds(schedule);
                template.bracketPredictions = Object.fromEntries(
                    allKoIds.map((id) => [id, { winner: '', extraTime: false, penalties: false }]),
                );
            }
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

function getAllKoMatchIds(schedule) {
    const ids = [];
    const stages = { round_of_32: 'R32', round_of_16: 'R16', quarterfinals: 'QF', semifinals: 'SF', third_place: '3RD', final: 'FINAL' };
    for (const [stage, label] of Object.entries(stages)) {
        const ms = schedule[stage];
        if (ms) for (let i = 0; i < ms.length; i++) ids.push(label + '-' + i);
    }
    return ids;
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
