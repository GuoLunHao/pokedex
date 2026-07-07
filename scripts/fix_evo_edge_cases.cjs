/**
 * fix_evo_edge_cases.cjs
 * 
 * Handles the remaining edge cases after the main fix:
 * 
 * 1. Name mismatches (10 cases): evolution chain data uses different Chinese
 *    names than simple_pokedex. Map them to correct simple_pokedex entries.
 * 2. Missing dream files (7 cases): Some Pokémon have no dream image.
 *    Leave image as empty/null/current for these.
 * 3. Fix "结草贵妇"/"结草儿" name issues.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const POKE_DIR = path.join(DATA_DIR, 'pokemon');
const DREAM_DIR = path.join(DATA_DIR, 'images', 'dream');

// Load simple_pokedex for ID→dream file mapping
const simple = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'simple_pokedex.json'), 'utf-8'));
const dreamFiles = fs.readdirSync(DREAM_DIR).filter(f => f.endsWith('.png'));

// Build dreamById: ID→dream filename
function extractPrefix(filename) {
  if (filename.length > 3 && /^\d$/.test(filename[3])) return filename.slice(0, 4);
  return filename.slice(0, 3);
}
const dreamById = {};
for (const f of dreamFiles) {
  const prefix = extractPrefix(f);
  const id4 = prefix.padStart(4, '0');
  if (!dreamById[id4]) dreamById[id4] = [];
  dreamById[id4].push(f);
}
function getMainDreamFile(id4) {
  const candidates = dreamById[id4];
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const main = candidates.find(f => {
    const prefix = extractPrefix(f);
    const rest = f.slice(prefix.length);
    return /^[A-Z][a-zA-Z]+_Dream\.png$/.test(rest) || /^[A-Z][a-zA-Z]+\.png$/.test(rest);
  });
  return main || candidates[0];
}

// ---- Name mapping: evo chain name → simple_pokedex name ----
// These are different Chinese translations used by 52poke vs simple_pokedex
const nameVariantMap = {
  '多边兽２型': '多边兽Ⅱ',
  '多边兽乙型': '多边兽Ｚ',
  '迭失棺': '死神棺',
  '迭失板': '死神板',
  '仆刀将军': '仆斩将军',
  '霸道熊猫': '流氓熊猫',
  '谜拟丘': '谜拟Ｑ',
  '狡小狐': '偷儿狐',
  '猾大狐': '狐大盗',
  '电音婴': '毒电婴',
};

// Build ID lookup: simple_pokedex name → {id, en}
const cnMap = {};
simple.forEach(p => { cnMap[p.name_zh] = p; });

let fixed = 0;
let stillMissing = [];

fs.readdirSync(POKE_DIR).filter(f => f.endsWith('.json')).forEach(file => {
  const fp = path.join(POKE_DIR, file);
  const d = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const chains = d.evolution_chains || [];
  if (chains.length === 0) return;

  let changed = false;

  chains.forEach((chain, ci) => {
    chain.forEach((node, ni) => {
      if (!node.name || !node.image) return;

      const evoName = node.name;
      // Step 1: Try direct lookup in simple_pokedex
      let entry = cnMap[evoName];
      
      // Step 2: Try variant name mapping
      if (!entry && nameVariantMap[evoName]) {
        entry = cnMap[nameVariantMap[evoName]];
        if (entry) {
          console.log(`${file}: "${evoName}" → "${nameVariantMap[evoName]}" (id=${entry.index})`);
        }
      }

      if (!entry) {
        if (!stillMissing.includes(evoName)) stillMissing.push(evoName);
        return;
      }

      // Find correct dream file
      const dreamFile = getMainDreamFile(entry.index);
      if (!dreamFile) {
        if (!stillMissing.includes(evoName + '(id=' + entry.index + ')')) 
          stillMissing.push(evoName + '(id=' + entry.index + ',en=' + entry.name_en + ')');
        return;
      }

      if (node.image !== dreamFile) {
        console.log(`${file} chain[${ci}].node[${ni}] "${evoName}": ${node.image} → ${dreamFile}`);
        node.image = dreamFile;
        changed = true;
        fixed++;
      }
    });
  });

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf-8');
  }
});

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed} nodes`);
if (stillMissing.length > 0) {
  console.log(`\nStill missing (${stillMissing.length}):`);
  stillMissing.forEach(n => console.log(`  - ${n}`));
}
