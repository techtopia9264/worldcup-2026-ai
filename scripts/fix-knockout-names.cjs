const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, 'world_cup_2026.json'), 'utf8'));
const r = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/realResults.json'), 'utf8'));
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/manualResults.json'), 'utf8'));
const results = Object.assign({}, r, m);

// Build standings
const teams = {};
function ensure(n) { if (!teams[n]) teams[n] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, group: '' }; return teams[n]; }
for (const [g, ms] of Object.entries(schedule.groupCompetition || {})) {
    ms.forEach((m, i) => {
        const res = results[g + '-' + i]; if (!res) return;
        const h = ensure(m.home), a = ensure(m.away); h.group = g; a.group = g;
        h.p++; a.p++; h.gf += res.homeScore; a.gf += res.awayScore; h.ga += res.awayScore; a.ga += res.homeScore;
        h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
        if (res.winner === m.home) { h.w++; h.pts += 3; a.l++; }
        else if (res.winner === m.away) { a.w++; a.pts += 3; h.l++; }
        else { h.d++; h.pts++; a.d++; a.pts++; }
    });
}
const st = {};
for (const g of Object.keys(schedule.groupCompetition || {}))
    st[g] = Object.values(teams).filter(t => t.group === g).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

const getW = (g) => st[g] && st[g][0] ? st[g][0].team : null;
const getR = (g) => st[g] && st[g][1] ? st[g][1].team : null;
const allThirds = Object.keys(st).map(g => { const t = st[g] && st[g][2]; return t ? { team: t.team, pts: t.pts, gd: t.gd } : null; }).filter(Boolean).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

function resolveTeam(ph) {
    const m1 = ph.match(/^([A-Z])组冠军$/); // X组冠军
    if (m1) return getW(m1[1]);
    const m2 = ph.match(/^([A-Z])组亚军$/); // X组亚军
    if (m2) return getR(m2[1]);
    return null;
}

let count = 0;
for (const m of schedule.round_of_32) {
    const h = resolveTeam(m.home); if (h) { m.home = h; count++; }
    const a = resolveTeam(m.away); if (a) { m.away = a; count++; }
}

fs.writeFileSync(path.join(ROOT, 'world_cup_2026.json'), JSON.stringify(schedule, null, 4));
console.log('Resolved ' + count + ' teams!');
for (let i = 0; i < 16; i++) {
    const m = schedule.round_of_32[i];
    console.log('R32-' + i + ': ' + m.home + ' vs ' + m.away);
}
