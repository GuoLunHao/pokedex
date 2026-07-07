import fs from 'fs';
const DIR = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';
const DEX = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokedex/national.json';

const dex = JSON.parse(fs.readFileSync(DEX, 'utf-8'));
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

// Build dex map
const dexMap = {};
dex.forEach(e => { dexMap[e.id] = e.gen; });

let total = 0, complete = 0, partial = 0;
const issues = [];

for (const file of files) {
  const d = JSON.parse(fs.readFileSync(DIR + '/' + file, 'utf-8'));
  const pid = d.pokedex_id;
  const debutGen = dexMap[pid] || 1;
  const expectedGens = 9 - debutGen + 1;

  // Collect existing generations from learnable_moves
  const existingGens = (d.learnable_moves || [])
    .filter(g => g.generation != null)
    .map(g => g.generation)
    .sort((a, b) => a - b);

  const missingGens = [];
  for (let g = debutGen; g <= 9; g++) {
    if (!existingGens.includes(g)) missingGens.push(g);
  }

  const hasAll = missingGens.length === 0;

  if (!hasAll) {
    issues.push({
      id: pid,
      name: d.name_zh,
      debut: debutGen,
      existing: existingGens.length,
      expected: expectedGens,
      existingGens,
      missingGens,
      file: file
    });
    partial++;
  } else {
    complete++;
  }
  total++;
}

// Report
console.log(`=== 招式数据完整性检查 ===`);
console.log(`总数: ${total}`);
console.log(`完整: ${complete}`);
console.log(`有遗漏: ${partial}`);
console.log(`\n--- 遗漏分布 ---`);
const byDebut = {};
issues.forEach(i => {
  const key = `Gen${i.debut} (应${i.expected}组)`;
  if (!byDebut[key]) byDebut[key] = [];
  byDebut[key].push(i);
});
Object.keys(byDebut).sort().forEach(k => {
  console.log(`\n${k}: ${byDebut[k].length} 只有遗漏`);
  // Show top 10
  byDebut[k].slice(0, 10).forEach(i => {
    console.log(`  #${i.id} ${i.name}: 现有${i.existingGens.join(',')} (缺${i.missingGens.join(',')})`);
  });
  if (byDebut[k].length > 10) {
    console.log(`  ... 还有 ${byDebut[k].length - 10} 只`);
  }
});

// Summary by missing count
console.log(`\n--- 按缺失代数统计 ---`);
const missingCount = {};
issues.forEach(i => {
  const n = i.missingGens.length;
  missingCount[n] = (missingCount[n] || 0) + 1;
});
Object.keys(missingCount).sort((a, b) => a - b).forEach(k => {
  console.log(`缺${k}代: ${missingCount[k]} 只`);
});

// Save full list
fs.writeFileSync('C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/scripts/_missing_report.json', JSON.stringify(issues, null, 2), 'utf-8');
console.log(`\n完整遗漏列表已保存至 scripts/_missing_report.json`);
