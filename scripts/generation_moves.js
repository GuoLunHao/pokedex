/**
 * generation_moves.js
 * 
 * Post-processing script that adds generation-specific move data to existing
 * Pokémon JSON files by scraping 52poke generation-specific move pages:
 *   https://wiki.52poke.com/wiki/{name}/第{gen}世代招式表
 * 
 * Usage:
 *   node scripts/generation_moves.js <name>     # single Pokémon (Chinese name)
 *   node scripts/generation_moves.js all         # all Pokémon
 *   node scripts/generation_moves.js range 1 100  # by ID range
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const POKEMON_DIR = path.join(__dirname, '..', 'data', 'pokemon');
const POKEDEX_FILE = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

const GEN_NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// ─── Helpers ──────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function getGenUrl(name, gen) {
    return `https://wiki.52poke.com/wiki/${encodeURIComponent(name)}/第${GEN_NUMERALS[gen]}世代招式表`;
}

// ─── Table parsers ────────────────────────────────────
//
// Column layout of generation-specific pages on 52poke:
//   Learnable:  level | (spacer) | name | type | (spacer/category) | power | acc | pp
//   Machine:    (spacer) | machine | name | type | (spacer/category) | power | acc | pp
//   Egg:        parents | name | type | (spacer/category) | power | acc | pp
//   Tutor:      name | type | category | power | acc | pp
//
// Key difference from main Pokémon page: generation pages may lack the
// "category" column in early generations (Gen 1-5).  Later generations
// (Gen 6+) include category at the same structural position.

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
            // generation page may not have category column → will be empty for early gens
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

        // Parents
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
        // Tutor table: name | type | category | power | acc | pp
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

// ─── Find table under a heading ───────────────────────

function findTableAfterHeading($, headingText) {
    let heading = null;
    $('h3, h4, h5').each((_, el) => {
        if ($(el).text().trim().includes(headingText)) {
            heading = $(el);
            return false;
        }
    });
    if (!heading) return null;

    const $heading = $(heading);
    // Collect elements until the next heading of same or higher level
    const scope = $heading.nextUntil('h2, h3, h4, h5');

    // Strategy 1: Direct table.roundy
    let table = scope.filter('table.roundy').first();
    if (table.length > 0) return table;

    // Strategy 2: table.roundy inside toggle-content divs
    const toggleContent = scope.find('div.toggle-content').first();
    if (toggleContent.length > 0) {
        table = toggleContent.find('table.roundy').first();
        if (table.length > 0) return table;
    }

    // Strategy 3: table.roundy anywhere in the scope (nested)
    table = scope.find('table.roundy').first();
    if (table.length > 0) return table;

    return null;
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

    // Level-up moves
    const lvTable = findTableAfterHeading($, '可学会的招式');
    if (lvTable) {
        const moves = parseLearnableMoves($, lvTable);
        if (moves.length > 0) {
            result.learnable = [{ form: '一般', generation: gen, data: moves }];
        }
    }

    // TM moves
    const tmTable = findTableAfterHeading($, '能使用的招式学习器');
    if (tmTable) {
        const moves = parseMachineMoves($, tmTable);
        if (moves.length > 0) {
            result.machine = [{ form: '一般', generation: gen, data: moves }];
        }
    }

    // Egg moves
    const eggTable = findTableAfterHeading($, '蛋招式');
    if (eggTable) {
        const moves = parseEggMoves($, eggTable);
        if (moves.length > 0) {
            result.egg = [{ form: '一般', generation: gen, data: moves }];
        }
    }

    // Tutor moves (教授招式)
    const tutorTable = findTableAfterHeading($, '教授招式');
    if (tutorTable) {
        const moves = parseTutorMoves($, tutorTable);
        if (moves.length > 0) {
            result.tutor = [{ form: '一般', generation: gen, data: moves }];
        }
    }

    return result;
}

// ─── Process a single Pokémon ──────────────────────────

async function processPokemon(filePath, nationalDexMap) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const name = data.name_zh;
    const pid = data.pokedex_id;

    // Determine debut generation from national dex
    const entry = nationalDexMap.get(pid);
    const debutGen = entry ? entry.gen : 1;

    console.log(`\n[${pid}] ${name} (debut Gen ${debutGen})`);

    const allLearnable = [];
    const allMachine = [];
    const allEgg = [];
    const allTutor = [];

    // Scrape ALL generations 1-9
    for (let gen = debutGen; gen <= 9; gen++) {
        try {
            const genData = await scrapeGeneration(name, gen);
            console.log(`  Gen ${gen}: learnable=${genData.learnable[0]?.data?.length || 0}, machine=${genData.machine[0]?.data?.length || 0}, egg=${genData.egg[0]?.data?.length || 0}, tutor=${genData.tutor[0]?.data?.length || 0}`);

            if (genData.learnable.length > 0) allLearnable.push(...genData.learnable);
            if (genData.machine.length > 0) allMachine.push(...genData.machine);
            if (genData.egg.length > 0) allEgg.push(...genData.egg);
            if (genData.tutor.length > 0) allTutor.push(...genData.tutor);

            // Be nice to the server
            await sleep(500);
        } catch (e) {
            if (e.response && e.response.status === 404) {
                console.log(`  Gen ${gen}: page not found, stopping.`);
                break;
            }
            console.error(`  Gen ${gen}: ERROR ${e.message}`);
            continue;
        }
    }

    // Update the data
    data.learnable_moves = allLearnable;
    data.machine_moves = allMachine;
    data.egg_moves = allEgg;
    if (allTutor.length > 0) {
        data.tutor_moves = allTutor;
    }

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✅ Updated ${name} (${pid}) — learnable:${allLearnable.length} groups, machine:${allMachine.length}, egg:${allEgg.length}, tutor:${allTutor.length}`);
}

// ─── Main ──────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node scripts/generation_moves.js <chinese_name>');
        console.log('  node scripts/generation_moves.js all');
        console.log('  node scripts/generation_moves.js range <start_id> <end_id>');
        return;
    }

    // Load national dex for generation info
    const nationalDex = JSON.parse(fs.readFileSync(POKEDEX_FILE, 'utf8'));
    const nationalDexMap = new Map();
    for (const e of nationalDex) {
        if (!nationalDexMap.has(e.id)) {
            nationalDexMap.set(e.id, e);
        }
    }

    let files = [];

    if (args[0] === 'all') {
        files = fs.readdirSync(POKEMON_DIR).filter(f => f.endsWith('.json')).sort();
        console.log(`Found ${files.length} Pokémon files to process.`);
    } else if (args[0] === 'range' && args[1] && args[2]) {
        const start = parseInt(args[1]);
        const end = parseInt(args[2]);
        files = fs.readdirSync(POKEMON_DIR).filter(f => {
            const match = f.match(/^(\d+)-/);
            if (!match) return false;
            const id = parseInt(match[1]);
            return id >= start && id <= end;
        }).sort();
        console.log(`Range ${start}-${end}: ${files.length} Pokémon.`);
    } else {
        // Single Pokémon by Chinese name
        const name = args[0];
        files = fs.readdirSync(POKEMON_DIR).filter(f => f.includes(name)).sort();
        if (files.length === 0) {
            console.error(`No Pokémon file found matching "${name}".`);
            return;
        }
        console.log(`Found ${files.length} file(s) matching "${name}".`);
    }

    for (const file of files) {
        const filePath = path.join(POKEMON_DIR, file);
        await processPokemon(filePath, nationalDexMap);
    }

    console.log('\nDone!');
}

main().catch(console.error);
