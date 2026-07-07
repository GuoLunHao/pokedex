const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let newFormat = 0;  // has generation field in learnable_moves
let oldFormat = 0;  // no generation field
let noLearnable = 0;
let hasTutor = 0;
let hasEgg = 0;

files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
  const lm = d.learnable_moves;
  if (!lm || !lm.length) {
    noLearnable++;
    return;
  }
  if (lm[0].generation != null) {
    newFormat++;
  } else {
    oldFormat++;
  }
  if (d.tutor_moves && d.tutor_moves.length > 0) hasTutor++;
  if (d.egg_moves && d.egg_moves.length > 0) hasEgg++;
});

console.log('=== 世代招式数据结构完整性 ===');
console.log('总文件数:', files.length);
console.log('');
console.log('新格式(有generation字段):', newFormat);
console.log('旧格式(无generation字段):', oldFormat);
console.log('无learnable_moves:', noLearnable);
console.log('有tutor_moves:', hasTutor);
console.log('有egg_moves:', hasEgg);
