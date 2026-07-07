import fs from 'fs';
const dir = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// 1. 皮卡丘
const pika = JSON.parse(fs.readFileSync(dir + '/0025-皮卡丘.json', 'utf-8'));
console.log('=== 皮卡丘 (Gen 1 debut) ===');
console.log('learnable_moves:', pika.learnable_moves.length, 'groups');
pika.learnable_moves.forEach(g => console.log('  G' + g.generation + ':', g.data?.length || 0, 'moves'));
console.log('tutor_moves:', pika.tutor_moves?.length || 0, 'groups');
if (pika.tutor_moves) pika.tutor_moves.forEach(g => console.log('  G' + g.generation + ':', g.data?.length || 0, 'moves'));

// 2. 敲音猴 (Gen 8 debut)
const groo = JSON.parse(fs.readFileSync(dir + '/0810-敲音猴.json', 'utf-8'));
console.log('\n=== 敲音猴 (Gen 8 debut) ===');
console.log('learnable_moves:', groo.learnable_moves.length, 'groups');
groo.learnable_moves.forEach(g => console.log('  G' + g.generation + ':', g.data?.length || 0, 'moves'));

// 3. 新叶喵 (Gen 9 debut)
const spr = JSON.parse(fs.readFileSync(dir + '/0906-新叶喵.json', 'utf-8'));
console.log('\n=== 新叶喵 (Gen 9 debut) ===');
console.log('learnable_moves:', spr.learnable_moves.length, 'groups');
spr.learnable_moves.forEach(g => console.log('  G' + g.generation + ':', g.data?.length || 0, 'moves'));
console.log('tutor_moves:', spr.tutor_moves?.length || 0, 'groups');

// 4. 统计
let dist = {};
files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf-8'));
  const g = (d.learnable_moves || []).filter(x => x.generation != null).length;
  dist[g] = (dist[g] || 0) + 1;
});
console.log('\n=== 完整度分布 ===');
Object.keys(dist).sort((a, b) => a - b).forEach(k => console.log(k + '代组: ' + dist[k] + '只'));

let oldFmt = files.filter(f => {
  const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf-8'));
  return d.learnable_moves?.length > 0 && !d.learnable_moves[0].generation;
}).length;
console.log('\n旧格式(无generation):', oldFmt, '/ 1025');

// 5. Sum all entries
let total = { lv: 0, tm: 0, egg: 0, tu: 0 };
files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf-8'));
  if (d.learnable_moves) d.learnable_moves.forEach(g => total.lv += g.data?.length || 0);
  if (d.machine_moves) d.machine_moves.forEach(g => total.tm += g.data?.length || 0);
  if (d.egg_moves) d.egg_moves.forEach(g => total.egg += g.data?.length || 0);
  if (d.tutor_moves) d.tutor_moves.forEach(g => total.tu += g.data?.length || 0);
});
console.log('\n=== 总招式条目 ===');
console.log('  等级提升:', total.lv);
console.log('  招式学习器:', total.tm);
console.log('  蛋招式:', total.egg);
console.log('  教授招式:', total.tu);
console.log('  合计:', total.lv + total.tm + total.egg + total.tu);
