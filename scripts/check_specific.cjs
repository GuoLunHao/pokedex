const fs = require('fs');
const POKE_DIR = './data/pokemon';

// Check specific files that I know were problematic
const files = [
  '0128-肯泰罗.json', '0746-弱丁鱼.json', '0778-谜拟丘.json',
  '0412-结草儿.json', '0413-结草贵妇.json'
];

files.forEach(file => {
  const d = JSON.parse(fs.readFileSync(POKE_DIR + '/' + file, 'utf-8'));
  const chains = d.evolution_chains || [];
  console.log(file + ':');
  chains.forEach((c, i) => {
    c.forEach((n, j) => {
      console.log('  [' + i + '][' + j + '] ' + n.name + ' -> "' + (n.image || '') + '"');
    });
  });
});
