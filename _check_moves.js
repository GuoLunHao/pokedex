const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const stats = {
  learnable: { total: 0, empty: 0, noGenProp: 0, missingField: 0 },
  machine: { total: 0, empty: 0, noGenProp: 0, missingField: 0 },
  egg: { total: 0, empty: 0, noGenProp: 0, missingField: 0 },
  tutor: { total: 0, empty: 0, noGenProp: 0, missingField: 0 },
};
const genDist = { learnable: {}, machine: {}, egg: {}, tutor: {} };
const problems = [];

files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
  const cats = ['learnable', 'machine', 'egg', 'tutor'];
  cats.forEach(cat => {
    const key = cat + '_moves';
    const arr = d[key];
    if (!arr) {
      stats[cat].missingField++;
      problems.push(f + ' 缺少 ' + key);
      return;
    }
    if (!Array.isArray(arr)) {
      problems.push(f + ' ' + key + ' 不是数组');
      return;
    }
    if (!arr.length) {
      stats[cat].empty++;
    }
    stats[cat].total += arr.length;
    arr.forEach(g => {
      const gen = g.generation;
      if (typeof gen !== 'number') {
        stats[cat].noGenProp++;
        problems.push(f + ' ' + cat + ' 组 generation 不是数字: ' + JSON.stringify(gen));
      }
      genDist[cat][gen] = (genDist[cat][gen] || 0) + 1;
      if (!Array.isArray(g.data)) {
        problems.push(f + ' ' + cat + ' gen' + gen + ' 缺少 data 数组');
      }
    });
  });
});

console.log('=== 宝可梦招式数据完整性检查 ===');
console.log('文件总数:', files.length);
console.log('');
Object.keys(stats).forEach(cat => {
  const s = stats[cat];
  console.log('--- ' + cat + '_moves ---');
  console.log('  总世代组数:', s.total);
  console.log('  缺少该字段:', s.missingField);
  console.log('  空数组:', s.empty);
  console.log('  generation非数字:', s.noGenProp);
  const gens = Object.keys(genDist[cat]).sort((a, b) => Number(a) - Number(b));
  console.log('  各世代出现次数:', gens.map(g => g + '=' + genDist[cat][g]).join(', '));
});
console.log('');
console.log('发现问题总数:', problems.length);
if (problems.length > 0) {
  console.log('前20个问题:');
  problems.slice(0, 20).forEach(p => console.log('  [问题] ' + p));
}
console.log('');
console.log('=== 检查完成 ===');
