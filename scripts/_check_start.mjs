import fs from 'fs';

const DIR = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';
const DEX = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokedex/national.json';

const dex = JSON.parse(fs.readFileSync(DEX, 'utf-8'));
const dexMap = {};
dex.forEach(e => { dexMap[e.id] = e.gen; });

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
files.sort();

// ── 从妙蛙种子开始逐个检查 ──
let idx = 1;
for (const file of files) {
  const d = JSON.parse(fs.readFileSync(DIR + '/' + file, 'utf-8'));
  const pid = d.pokedex_id;
  const debut = dexMap[pid] || 1;

  const existingGens = (d.learnable_moves || [])
    .filter(g => g.generation != null)
    .map(g => g.generation)
    .sort((a, b) => a - b);

  const missingGens = [];
  for (let g = debut; g <= 9; g++) {
    if (!existingGens.includes(g)) missingGens.push(g);
  }

  if (missingGens.length === 0) {
    // Complete - show briefly
    if (idx <= 10) {
      console.log(`#${String(pid).padStart(4,'0')} ${d.name_zh.padEnd(8,' ')} Gen${debut} debut → 现有 ${existingGens.length} 组: [${existingGens.join(',')}] ✅`);
    }
  } else {
    // Has issues
    const expected = 9 - debut + 1;
    console.log(`#${String(pid).padStart(4,'0')} ${d.name_zh.padEnd(8,' ')} Gen${debut} debut → 应${expected}组 实${existingGens.length}组 ❌ 现有[${existingGens.join(',')}] 缺[${missingGens.join(',')}]`);
  }
  idx++;
}
