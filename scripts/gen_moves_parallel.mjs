/**
 * gen_moves_parallel.mjs
 *
 * Parallel version of generation_moves.js — scrapes 52poke generation-specific
 * move pages for ALL Pokémon with controlled concurrency.
 *
 * Usage:
 *   node scripts/gen_moves_parallel.mjs            # all Pokémon
 *   node scripts/gen_moves_parallel.mjs range 1 100
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POKEMON_DIR = path.join(__dirname, '..', 'data', 'pokemon');
const POKEDEX_FILE = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');

const GEN_NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

// ─── Helpers ──────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function getGenUrl(name, gen) {
    return `https://wiki.52poke.com/wiki/${encodeURIComponent(name)}/第${GEN_NUMERALS[gen]}世代招式表`;
}

// ─── Table parsers (same logic as generation_moves.js) ──

function parseLearnableMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = row.find('td');
        if (tds.length < 8) return;
        const name = tds.eq(2).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({
            level: tds.eq(0).text().trim(),
            name,
            type: tds.eq(3).text().trim(),
            category: tds.eq(4).text().trim(),
            power: tds.eq(5).text().trim(),
            accuracy: tds.eq(6).text().trim(),
            pp: tds.eq(7).text().trim(),
        });
    });
    return moves;
}

function parseMachineMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = row.find('td');
        if (tds.length < 8) return;
        const name = tds.eq(2).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({
            machine: tds.eq(1).text().trim(),
            name,
            type: tds.eq(3).text().trim(),
            category: tds.eq(4).text().trim(),
            power: tds.eq(5).text().trim(),
            accuracy: tds.eq(6).text().trim(),
            pp: tds.eq(7).text().trim(),
        });
    });
    return moves;
}

function parseEggMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = row.find('td');
        if (tds.length < 7) return;
        const name = tds.eq(1).text().trim().replace('[详]', '').trim();
        if (!name) return;
        const parents = [];
        tds.eq(0).find('[data-msp]').each((_, el) => {
            const msp = el.attr('data-msp');
            if (!msp) return;
            msp.split(',').forEach(entry => {
                const parts = entry.split('\\');
                parents.push({ id: parts[0] || null, name: parts[1] || entry });
            });
        });
        tds.eq(0).find('a').each((_, link) => {
            const title = link.attr('title');
            if (title && !parents.some(p => p.name === title)) {
                parents.push({ id: null, name: title });
            }
        });
        moves.push({
            parents,
            name,
            type: tds.eq(2).text().trim(),
            category: tds.eq(3).text().trim(),
            power: tds.eq(4).text().trim(),
            accuracy: tds.eq(5).text().trim(),
            pp: tds.eq(6).text().trim(),
        });
    });
    return moves;
}

function parseTutorMoves($, table) {
    const moves = [];
    table.find('tr').each((_, row) => {
        const tds = row.find('td');
        if (tds.length < 6) return;
        const name = tds.eq(0).text().trim().replace('[详]', '').trim();
        if (!name) return;
        moves.push({
            name,
            type: tds.eq(1).text().trim(),
            category: tds.eq(2).text().trim(),
            power: tds.eq(3).text().trim(),
            accuracy: tds.eq(4).text().trim(),
            pp: tds.eq(5).text().trim(),
        });
    });
    return moves;
}

// ─── Find table under a heading ───────────────────────

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
    if (table.length > 0) return table;
    const toggleContent = scope.find('div.toggle-content').first();
    if (toggleContent.length > 0) {
        table = toggleContent.find('table.roundy').first();
        if (table.length > 0) return table;
    }
    table = scope.find('table.roundy').first();
    return table.length > 0 ? table : null;
}

// ─── Scrape one generation page ────────────────────────

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

// ─── Process a single Pokémon ──────────────────────────

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
            if (genData.learnable.length > 0) allLearnable.push(...genData.learnable);
            if (genData.machine.length > 0) allMachine.push(...genData.machine);
            if (genData.egg.length > 0) allEgg.push(...genData.egg);
            if (genData.tutor.length > 0) allTutor.push(...genData.tutor);
            await sleep(200); // throttle
        } catch (e) {
            if (e.response && e.response.status === 404) break;
            // retry once after 1s
            try {
                await sleep(1000);
                const genData = await scrapeGeneration(name, gen);
                if (genData.learnable.length > 0) allLearnable.push(...genData.learnable);
                if (genData.machine.length > 0) allMachine.push(...genData.machine);
                if (genData.egg.length > 0) allEgg.push(...genData.egg);
                if (genData.tutor.length > 0) allTutor.push(...genData.tutor);
            } catch (e2) {
                console.error(`  Gen ${gen} FAILED after retry: ${e2.message}`);
            }
            await sleep(200);
        }
    }

    data.learnable_moves = allLearnable;
    data.machine_moves = allMachine;
    data.egg_moves = allEgg;
    if (allTutor.length > 0) data.tutor_moves = allTutor;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    return {
        pid,
        name,
        learnable: allLearnable.length,
        machine: allMachine.length,
        egg: allEgg.length,
        tutor: allTutor.length,
    };
}

// ─── Main ──────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    let files = fs.readdirSync(POKEMON_DIR).filter(f => f.endsWith('.json')).sort();

    if (args[0] === 'range' && args[1] && args[2]) {
        const start = parseInt(args[1]);
        const end = parseInt(args[2]);
        files = files.filter(f => {
            const match = f.match(/^(\d+)-/);
            return match && parseInt(match[1]) >= start && parseInt(match[1]) <= end;
        });
    }

    const nationalDex = JSON.parse(fs.readFileSync(POKEDEX_FILE, 'utf8'));
    const nationalDexMap = new Map();
    for (const e of nationalDex) nationalDexMap.set(e.id, e);

    console.log(`Processing ${files.length} Pokémon...\n`);

    const concurrency = 5;
    let completed = 0;
    let errors = [];

    // Process in batches
    for (let i = 0; i < files.length; i += concurrency) {
        const batch = files.slice(i, i + concurrency);
        const results = await Promise.allSettled(
            batch.map(file => processPokemon(path.join(POKEMON_DIR, file), nationalDexMap))
        );

        for (const r of results) {
            if (r.status === 'fulfilled') {
                const s = r.value;
                completed++;
                const progress = `[${completed}/${files.length}] ${s.pid} ${s.name}`;
                console.log(`✅ ${progress} — learnable:${s.learnable} machine:${s.machine} egg:${s.egg} tutor:${s.tutor}`);
            } else {
                errors.push(r.reason?.message || 'Unknown error');
                console.log(`❌ [${completed + 1}/${files.length}] Error: ${r.reason?.message?.slice(0, 80)}`);
                completed++;
            }
        }
    }

    console.log(`\nDone! ${completed} Pokémon processed, ${errors.length} errors.`);
    if (errors.length > 0) {
        console.log('First 5 errors:');
        errors.slice(0, 5).forEach(e => console.log(`  ${e}`));
    }
}

main().catch(console.error);
