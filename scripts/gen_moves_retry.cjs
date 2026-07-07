/**
 * gen_moves_retry.cjs
 *
 * Retry Pokémon whose generation data is incomplete (fewer than 9 generation groups).
 * Uses lower concurrency and more aggressive retry to avoid 429 rate limits.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const POKEMON_DIR = path.join(__dirname, '..', 'data', 'pokemon');
const POKEDEX_FILE = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');
const GEN_NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getGenUrl(name, gen) { return `https://wiki.52poke.com/wiki/${encodeURIComponent(name)}/第${GEN_NUMERALS[gen]}世代招式表`; }

function parseLearnableMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 8) return;
        const name = $(tds[2]).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({ level: $(tds[0]).text().trim(), name, type: $(tds[3]).text().trim(), category: $(tds[4]).text().trim(), power: $(tds[5]).text().trim(), accuracy: $(tds[6]).text().trim(), pp: $(tds[7]).text().trim() });
    });
    return moves;
}
function parseMachineMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 8) return;
        const name = $(tds[2]).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({ machine: $(tds[1]).text().trim(), name, type: $(tds[3]).text().trim(), category: $(tds[4]).text().trim(), power: $(tds[5]).text().trim(), accuracy: $(tds[6]).text().trim(), pp: $(tds[7]).text().trim() });
    });
    return moves;
}
function parseEggMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 7) return;
        const name = $(tds[1]).text().trim().replace('[详]', '').trim();
        if (!name) return;
        const parents = [];
        $(tds[0]).find('[data-msp]').each((_, el) => { const m = $(el).attr('data-msp'); if (!m) return; m.split(',').forEach(e => { const p = e.split('\\'); parents.push({ id: p[0] || null, name: p[1] || e }); }); });
        $(tds[0]).find('a').each((_, l) => { const t = $(l).attr('title'); if (t && !parents.some(p => p.name === t)) parents.push({ id: null, name: t }); });
        moves.push({ parents, name, type: $(tds[2]).text().trim(), category: $(tds[3]).text().trim(), power: $(tds[4]).text().trim(), accuracy: $(tds[5]).text().trim(), pp: $(tds[6]).text().trim() });
    });
    return moves;
}
function parseTutorMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 6) return;
        const name = $(tds[0]).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({ name, type: $(tds[1]).text().trim(), category: $(tds[2]).text().trim(), power: $(tds[3]).text().trim(), accuracy: $(tds[4]).text().trim(), pp: $(tds[5]).text().trim() });
    });
    return moves;
}
function findTableAfterHeading($, headingText) {
    let heading = null;
    $('h3, h4, h5').each((_, el) => { if ($(el).text().trim().includes(headingText)) { heading = el; return false; } });
    if (!heading) return null;
    const scope = $(heading).nextUntil('h2, h3, h4, h5');
    let table = scope.filter('table.roundy').first();
    if (table.length) return table;
    const toggle = scope.find('div.toggle-content').first();
    if (toggle.length) { table = toggle.find('table.roundy').first(); if (table.length) return table; }
    table = scope.find('table.roundy').first();
    return table.length ? table : null;
}

async function scrapeGeneration(name, gen, retries = 5) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const url = getGenUrl(name, gen);
            const res = await axios.get(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'zh-Hans' }, timeout: 20000 });
            const $ = cheerio.load(res.data);
            const result = { learnable: [], machine: [], egg: [], tutor: [] };
            const lvTable = findTableAfterHeading($, '可学会的招式');
            if (lvTable) { const m = parseLearnableMoves($, lvTable); if (m.length) result.learnable = [{ form: '一般', generation: gen, data: m }]; }
            const tmTable = findTableAfterHeading($, '能使用的招式学习器');
            if (tmTable) { const m = parseMachineMoves($, tmTable); if (m.length) result.machine = [{ form: '一般', generation: gen, data: m }]; }
            const eggTable = findTableAfterHeading($, '蛋招式');
            if (eggTable) { const m = parseEggMoves($, eggTable); if (m.length) result.egg = [{ form: '一般', generation: gen, data: m }]; }
            const tutorTable = findTableAfterHeading($, '教授招式');
            if (tutorTable) { const m = parseTutorMoves($, tutorTable); if (m.length) result.tutor = [{ form: '一般', generation: gen, data: m }]; }
            return result;
        } catch (e) {
            if (e.response && e.response.status === 404) return { learnable: [], machine: [], egg: [], tutor: [], _404: true };
            if (e.response && e.response.status === 429) {
                const wait = attempt * 3000 + Math.random() * 2000;
                console.error(`    429 on Gen ${gen}, attempt ${attempt}, waiting ${Math.round(wait)}ms...`);
                await sleep(wait);
                continue;
            }
            if (attempt < retries) { await sleep(2000 * attempt); continue; }
            throw e;
        }
    }
    return { learnable: [], machine: [], egg: [], tutor: [] };
}

async function processPokemon(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const name = data.name_zh;
    const pid = data.pokedex_id;
    const nationalDex = JSON.parse(fs.readFileSync(POKEDEX_FILE, 'utf8'));
    const entry = nationalDex.find(e => e.id === pid);
    const debutGen = entry ? entry.gen : 1;

    // Determine which generations are missing
    const existingGens = new Set((data.learnable_moves || []).filter(g => g.generation != null).map(g => g.generation));
    const missingGens = [];
    for (let g = debutGen; g <= 9; g++) if (!existingGens.has(g)) missingGens.push(g);

    if (missingGens.length === 0) return { pid, name, status: 'already complete' };

    console.log(`[${pid}] ${name}: missing ${missingGens.length} gens (${missingGens.join(',')})`);

    for (const gen of missingGens) {
        try {
            const genData = await scrapeGeneration(name, gen);
            if (genData._404) break;
            if (genData.learnable.length) data.learnable_moves.push(...genData.learnable);
            if (genData.machine.length) data.machine_moves.push(...genData.machine);
            if (genData.egg.length) data.egg_moves.push(...genData.egg);
            if (genData.tutor.length) data.tutor_moves ? data.tutor_moves.push(...genData.tutor) : data.tutor_moves = [...genData.tutor];
            console.log(`  Gen ${gen}: ✓ (Lv:${genData.learnable[0]?.data?.length||0} TM:${genData.machine[0]?.data?.length||0} Egg:${genData.egg[0]?.data?.length||0} Tu:${genData.tutor[0]?.data?.length||0})`);
            await sleep(1500); // longer delay to avoid rate limiting
        } catch (e) {
            console.error(`  Gen ${gen}: FAILED - ${e.message.slice(0, 80)}`);
        }
    }

    // Sort by generation
    data.learnable_moves.sort((a, b) => a.generation - b.generation);
    data.machine_moves.sort((a, b) => a.generation - b.generation);
    data.egg_moves.sort((a, b) => a.generation - b.generation);
    if (data.tutor_moves) data.tutor_moves.sort((a, b) => a.generation - b.generation);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { pid, name, status: `filled ${missingGens.length} gens` };
}

async function main() {
    const files = fs.readdirSync(POKEMON_DIR).filter(f => f.endsWith('.json'));
    // Find only incomplete Pokémon
    const incomplete = files.filter(f => {
        const d = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, f), 'utf-8'));
        const lm = d.learnable_moves || [];
        const existingGens = lm.filter(g => g.generation != null).length;
        return existingGens < 3; // fewer than 3 generation groups = incomplete
    });

    console.log(`Found ${incomplete.length} incomplete Pokémon to retry.\n`);

    // Process one at a time (no concurrency) to avoid 429
    for (let i = 0; i < incomplete.length; i++) {
        const file = incomplete[i];
        const filePath = path.join(POKEMON_DIR, file);
        try {
            const r = await processPokemon(filePath);
            console.log(`[${i+1}/${incomplete.length}] ${r.pid} ${r.name}: ${r.status}`);
        } catch (e) {
            console.log(`[${i+1}/${incomplete.length}] ${file}: ERROR ${e.message.slice(0, 80)}`);
        }
        await sleep(500);
    }

    // Final summary
    let complete = 0, total = 0;
    files.forEach(f => {
        const d = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, f), 'utf-8'));
        const lm = d.learnable_moves || [];
        const existingGens = lm.filter(g => g.generation != null).length;
        total++;
        if (existingGens >= 3) complete++;
    });
    console.log(`\nFinal: ${complete}/${total} Pokémon have ≥3 generation groups`);
}

main().catch(console.error);
