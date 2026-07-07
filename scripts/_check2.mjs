import fs from 'fs';
const DIR = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';

// 妙蛙草
const d2 = JSON.parse(fs.readFileSync(DIR + '/0002-妙蛙草.json', 'utf-8'));
console.log('=== 妙蛙草 ===');
console.log('LV:', d2.learnable_moves.length, '组');
d2.learnable_moves.forEach(g => console.log('  G' + g.generation + ':', g.data?.length || 0, '招'));
console.log('TM:', d2.machine_moves.length, '组');
console.log('egg:', d2.egg_moves?.length || 0, '组');
console.log('tutor:', d2.tutor_moves?.length || 0, '组');

// 妙蛙花
const d3 = JSON.parse(fs.readFileSync(DIR + '/0003-妙蛙花.json', 'utf-8'));
console.log('\n=== 妙蛙花 ===');
console.log('LV:', d3.learnable_moves.length, '组');
d3.learnable_moves.forEach(g => console.log('  G' + g.generation + ':', g.data?.length || 0, '招'));
console.log('TM:', d3.machine_moves.length, '组');
console.log('egg:', d3.egg_moves?.length || 0, '组');
console.log('tutor:', d3.tutor_moves?.length || 0, '组');

// 前30只完整度
console.log('\n=== 前30只完整度 ===');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
for (let i = 1; i <= 30; i++) {
  const id = String(i).padStart(4, '0');
  const f = files.find(x => x.startsWith(id));
  if (!f) continue;
  const d = JSON.parse(fs.readFileSync(DIR + '/' + f, 'utf-8'));
  const g = (d.learnable_moves || []).filter(x => x.generation != null).length;
  console.log(f.slice(0, 8) + ':', g, '代组');
}
