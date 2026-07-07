/**
 * gen_moves_parallel.cjs
 *
 * Parallel version of generation_moves.js — scrapes 52poke generation-specific
 * move pages for ALL Pokémon with controlled concurrency.
 *
 * Usage:
 *   node scripts/gen_moves_parallel.cjs            # all Pokémon
 *   node scripts/gen_moves_parallel.cjs range 1 100
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const POKEMON_DIR = path.join(__dirname, '..', 'data', 'pokemon');
const POKEDEX_FILE = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');

const GEN_NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function getGenUrl(name, gen) {
    return `https://wiki.52poke.com/wiki/${encodeURIComponent(name)}/第${GEN_NUMERALS[gen]}世代招式表`;
}

// ─── Parsers ─────────────────────────────────────

function parseLearnableMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 8) return;
        const name = $(tds[2]).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({
            level: $(tds[0]).text().trim(),
            name,
            type: $(tds[3]).text().trim(),
            category: $(tds[4]).text().trim(),
            power: $(tds[5]).text().trim(),
            accuracy: $(tds[6]).text().trim(),
            pp: $(tds[7]).text().trim(),
        });
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
        moves.push({
            machine: $(tds[1]).text().trim(),
            name,
            type: $(tds[3]).text().trim(),
            category: $(tds[4]).text().trim(),
            power: $(tds[5]).text().trim(),
            accuracy: $(tds[6]).text().trim(),
            pp: $(tds[7]).text().trim(),
        });
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
        $(tds[0]).find('[data-msp]').each((_, el) => {
            const msp = $(el).attr('data-msp');
            if (!msp) return;
            msp.split(',').forEach(entry => {
                const parts = entry.split('\\');
                parents.push({ id: parts[0] || null, name: parts[1] || entry });
            });
        });
        $(tds[0]).find('a').each((_, link) => {
            const title = $(link).attr('title');
            if (title && !parents.some(p => p.name === title)) {
                parents.push({ id: null, name: title });
            }
        });
        moves.push({
            parents,
            name,
            type: $(tds[2]).text().trim(),
            category: $(tds[3]).text().trim(),
            power: $(tds[4]).text().trim(),
            accuracy: $(tds[5]).text().trim(),
            pp: $(tds[6]).text().trim(),
        });
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
        moves.push({
            name,
            type: $(tds[1]).text().trim(),
            category: $(tds[2]).text().trim(),
            power: $(tds[3]).text().trim(),
            accuracy: $(tds[4]).text().trim(),
            pp: $(tds[5]).text().trim(),
        });
    });
    return moves;
}

// ─── Find table under heading ─────────────────────

function findTableAfterHeading($, headingText) {
    let heading = null;
    $('h3, h4, h5').each((_, el) => {
        if ($(el).text().trim().includes(headingText)) {
            heading = el;
            return false;
        }
    });
    if (!heading) return null;
    const $heading = $(heading);
    const scope = $heading.nextUntil('h2, h3, h4, h5');
    let table = scope.filter('table.roundy').first();
    if (table.length) return table;
    const toggle = scope.find('div.toggle-content').first();
    if (toggle.length) {
        table = toggle.find('table.roundy').first();
        if (table.length) return table;
    }
    table = scope.find('table.roundy').first();
    return table.length ? table : null;
}

// ─── Scrape one generation ────────────────────────

async function scrapeGeneration(name, gen) {
    const url = getGenUrl(name, gen);
    const res = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'zh-Hans' },
        timeout: 15000,
    });
    const $ = cheerio.load(res.data);
    const result = { learnable: [], machine: [], egg: [], tutor: [] };

    const lvTable = findTableAfterHeading($, '可学会的招式');
    if (lvTable) {
        const moves = parseLearnableMoves($, lvTable);
        if (moves.length > 0) result.learnable = [{ form: '一般', generation: gen, data: moves }];
    }
    const tmTable = findTableAfterHeading($, '能使用的招式学习器');
    if (tmTable) {
        const moves = parseMachineMoves($, tmTable);
        if (moves.length > 0) result.machine = [{ form: '一般', generation: gen, data: moves }];
    }
    const eggTable = findTableAfterHeading($, '蛋招式');
    if (eggTable) {
        const moves = parseEggMoves($, eggTable);
        if (moves.length > 0) result.egg = [{ form: '一般', generation: gen, data: moves }];
    }
    const tutorTable = findTableAfterHeading($, '教授招式');
    if (tutorTable) {
        const moves = parseTutorMoves($, tutorTable);
        if (moves.length > 0) result.tutor = [{ form: '一般', generation: gen, data: moves }];
    }
    return result;
}

// ─── Process one Pokémon ──────────────────────────

async function processPokemon(filePath, nationalDexMap) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const name = data.name_zh;
    const pid = data.pokedex_id;
    const entry = nationalDexMap.get(pid);
    const debutGen = entry ? entry.gen : 1;

    const allLearnable = [];
    const allMachine = [];
    const allEgg = [];
    const allTutor = [];

    for (let gen = debutGen; gen <= 9; gen++) {
        try {
            const genData = await scrapeGeneration(name, gen);
            if (genData.learnable.length) allLearnable.push(...genData.learnable);
            if (genData.machine.length) allMachine.push(...genData.machine);
            if (genData.egg.length) allEgg.push(...genData.egg);
            if (genData.tutor.length) allTutor.push(...genData.tutor);
            await sleep(300);
        } catch (e) {
            if (e.response && e.response.status === 404) break;
            await sleep(1000);
            try {
                const genData = await scrapeGeneration(name, gen);
                if (genData.learnable.length) allLearnable.push(...genData.learnable);
                if (genData.machine.length) allMachine.push(...genData.machine);
                if (genData.egg.length) allEgg.push(...genData.egg);
                if (genData.tutor.length) allTutor.push(...genData.tutor);
            } catch (e2) {
                console.error(`  Gen ${gen} FAILED: ${e2.message}`);
            }
        }
    }

    data.learnable_moves = allLearnable;
    data.machine_moves = allMachine;
    data.egg_moves = allEgg;
    if (allTutor.length > 0) data.tutor_moves = allTutor;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return { pid, name, learnable: allLearnable.length, machine: allMachine.length, egg: allEgg.length, tutor: allTutor.length };
}

// ─── Main ─────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    let files = fs.readdirSync(POKEMON_DIR).filter(f => f.endsWith('.json')).sort();

    if (args[0] === 'range' && args[1] && args[2]) {
        const start = parseInt(args[1]);
        const end = parseInt(args[2]);
        files = files.filter(f => {
            const m = f.match(/^(\d+)-/);
            return m && parseInt(m[1]) >= start && parseInt(m[1]) <= end;
        });
    }

    const nationalDex = JSON.parse(fs.readFileSync(POKEDEX_FILE, 'utf8'));
    const nationalDexMap = new Map();
    for (const e of nationalDex) nationalDexMap.set(e.id, e);

    console.log(`Processing ${files.length} Pokémon (concurrency=5)...\n`);

    const CONCURRENCY = 5;
    let completed = 0;
    const errors = [];

    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(f => processPokemon(path.join(POKEMON_DIR, f), nationalDexMap))
        );
        for (const r of results) {
            if (r.status === 'fulfilled') {
                const s = r.value;
                completed++;
                console.log(`✅ [${completed}/${files.length}] ${s.pid} ${s.name} — Lv:${s.learnable} TM:${s.machine} Egg:${s.egg} Tu:${s.tutor}`);
            } else {
                completed++;
                errors.push(r.reason?.message?.slice(0, 100) || '?');
                console.log(`❌ [${completed}/${files.length}] ${r.reason?.message?.slice(0, 80)}`);
            }
        }
    }

    console.log(`\nDone! ${completed} processed, ${errors.length} errors.`);
    if (errors.length) {
        console.log('Errors:', errors.slice(0, 5).join('\n  '));
    }
}

main().catch(console.error);
