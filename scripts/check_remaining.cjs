const fs = require('fs');
const files = [
  '0413-结草贵妇.json', '0128-肯泰罗.json',
  '0744-岩狗狗.json', '0745-鬃岩狼人.json',
  '0746-弱丁鱼.json', '0774-小陨星.json',
  '0778-谜拟丘.json', '1024-太乐巴戈斯.json'
];
files.forEach(file => {
  try {
    const d = JSON.parse(fs.readFileSync('./data/pokemon/' + file, 'utf-8'));
    const chains = d.evolution_chains || [];
    console.log(file + ':');
    chains.forEach((c, i) => {
      c.forEach((n, j) => {
        console.log('  [' + i + '][' + j + '] ' + n.name + ' -> ' + (n.image || '(empty)'));
      });
    });
  } catch(e) {
    console.log(file + ': ERROR ' + e.message);
  }
});
