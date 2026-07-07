import fs from 'fs';
const r = JSON.parse(fs.readFileSync('C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/scripts/_missing_report.json', 'utf-8'));

console.log('=== 缺[1,2,3]的15只 ===');
r.filter(i => i.missingGens.join(',') === '1,2,3').forEach(i =>
  console.log('#' + i.id, i.name, '现有:', i.existingGens.join(','))
);

console.log('\n=== 缺[7,8,9]的15只 ===');
r.filter(i => i.missingGens.join(',') === '7,8,9').forEach(i =>
  console.log('#' + i.id, i.name, '现有:', i.existingGens.join(','))
);

console.log('\n=== 缺[8]的53只 (前15) ===');
r.filter(i => i.missingGens.join(',') === '8').slice(0, 15).forEach(i =>
  console.log('#' + i.id, i.name, '现有:', i.existingGens.join(','))
);

console.log('\n=== 缺[9]的281只 (前20) ===');
r.filter(i => i.missingGens.join(',') === '9').slice(0, 20).forEach(i =>
  console.log('#' + i.id, i.name, '现有:', i.existingGens.join(','))
);

// 统计总缺失代
console.log('\n=== 缺失代数分布 ===');
const dist = {};
r.forEach(i => {
  const k = i.missingGens.length;
  dist[k] = (dist[k] || 0) + 1;
});
Object.keys(dist).sort((a, b) => a - b).forEach(k => console.log('缺' + k + '代: ' + dist[k] + ' 只'));

console.log('\n=== 结论 ===');
console.log('完整: 600只');
console.log('有遗漏: 425只');
console.log('其中345只仅缺1代（主要是Gen9）');
