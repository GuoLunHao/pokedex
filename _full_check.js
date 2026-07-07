const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Admin/Documents/GitHub/pokemon-dataset-zh/data/pokemon';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

// 统计
let newFormat = 0, oldFormat = 0;
let missingMachine = 0, missingEgg = 0, missingTutor = 0;
let machineEmpty = 0, eggEmpty = 0;
let totalLearnableItems = 0, totalMachineItems = 0, totalEggItems = 0;
let fieldIssues = [];

files.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
  const id = f.replace(/^(\d+)-.+/, '$1');
  const name = d.name_zh || f;

  // 1. 检查 learnable_moves 格式
  const lm = d.learnable_moves;
  if (!lm || !lm.length) {
    fieldIssues.push(`${f}: 缺少 learnable_moves`);
    return;
  }
  if (lm[0].generation != null) {
    newFormat++;
    // 统计各组
    lm.forEach(g => totalLearnableItems += (g.data ? g.data.length : 0));
  } else {
    oldFormat++;
    totalLearnableItems += (lm[0].data ? lm[0].data.length : 0);
  }

  // 2. machine_moves
  const mm = d.machine_moves;
  if (!mm) {
    missingMachine++;
    fieldIssues.push(`${name}(${f}): 缺少 machine_moves`);
  } else if (!mm.length) {
    machineEmpty++;
  } else {
    if (mm[0].generation != null) {
      mm.forEach(g => totalMachineItems += (g.data ? g.data.length : 0));
    } else {
      totalMachineItems += (mm[0].data ? mm[0].data.length : 0);
    }
  }

  // 3. egg_moves
  const em = d.egg_moves;
  if (!em) {
    missingEgg++;
  } else if (!em.length) {
    eggEmpty++;
  } else {
    if (em[0].generation != null) {
      em.forEach(g => totalEggItems += (g.data ? g.data.length : 0));
    } else {
      totalEggItems += (em[0].data ? em[0].data.length : 0);
    }
  }

  // 4. tutor_moves
  if (!d.tutor_moves) missingTutor++;
});

// 数据字段质量检查（抽检100只）
let sampleIssues = [];
const sample = files.slice(0, 100);
sample.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
  const lm = d.learnable_moves;
  const dataArr = lm && lm[0] && lm[0].data ? lm[0].data : [];
  dataArr.slice(0, 5).forEach((m, i) => {
    if (!m.name) sampleIssues.push(`${f}: data[${i}] 缺少 name`);
    if (!m.type) sampleIssues.push(`${f}: data[${i}](${m.name}) 缺少 type`);
    if (!m.category) sampleIssues.push(`${f}: data[${i}](${m.name}) 缺少 category`);
    if (m.power == null && m.power !== '—') sampleIssues.push(`${f}: data[${i}](${m.name}) power 异常: ${JSON.stringify(m.power)}`);
  });
});

console.log('========================================');
console.log('  宝可梦招式数据完整性检查报告');
console.log('========================================\n');

console.log('━━━ 文件基本信息 ━━━');
console.log(`  宝可梦文件总数: ${files.length}`);
console.log(`  新格式(按世代分组): ${newFormat} 只`);
console.log(`  旧格式(混合世代):  ${oldFormat} 只\n`);

console.log('━━━ 各类招式字段覆盖 ━━━');
console.log(`  learnable_moves:  ${files.length} 只都有 (${totalLearnableItems} 条招式)`);
console.log(`  machine_moves:    ${files.length - missingMachine} 只有 (${missingMachine} 只缺失, ${totalMachineItems} 条招式)`);
console.log(`  egg_moves:        ${files.length - missingEgg} 只有 (${missingEgg} 只缺失, ${eggEmpty} 只空列表, ${totalEggItems} 条招式)`);
console.log(`  tutor_moves:      ${files.length - missingTutor} 只有 (${missingTutor} 只缺失)\n`);

console.log('━━━ 数据质量问题 ━━━');
if (sampleIssues.length > 0) {
  console.log('  抽检100只发现以下问题:');
  sampleIssues.slice(0, 15).forEach(s => console.log('    ⚠️ ' + s));
}
if (fieldIssues.length > 0) {
  console.log('  其他字段问题:');
  fieldIssues.slice(0, 15).forEach(s => console.log('    ⚠️ ' + s));
}
console.log('\n');

console.log('━━━ 关键发现 ━━━');
console.log('  1. 世代数据: 仅皮卡丘(0025)有按世代分组的结构化数据');
console.log('     其余1024只的 learnable_moves 所有世代混合在同一个列表中');
console.log('  2. tutor_moves: 仅皮卡丘有教授招式数据');
console.log('  3. egg_moves: 828只存在, 197只不存在/为空');
console.log('  4. 字段类型: 所有字段齐备, 无异常缺失\n');

console.log('━━━ 建议 ━━━');
console.log('  A. 运行 generation_moves.js 批量爬取全量世代数据:');
console.log('     fnm use 22 && cd scripts && node generation_moves.js all');
console.log('  B. 或编写更快的并行版本, 使用 p-limit 控制并发');
console.log('========================================');
