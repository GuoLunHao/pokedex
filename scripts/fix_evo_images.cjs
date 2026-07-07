/**
 * fix_evo_images.cjs
 * 
 * Fix evolution chain images across ALL Pokémon files.
 * 
 * Problem: The original data generator took only the first 3 digits of the
 * 4-digit Pokémon ID, resulting in wrong dream image filenames for most
 * Pokémon (IDs 0010-0099, 0100-1025).
 * 
 * Example: Caterpie (ID 0010) got "001Bulbasaur_Dream.png" instead of
 * "010Caterpie_Dream.png" because "001" is the first 3 digits of "0010".
 * 
 * Solution: Build a mapping from Chinese name → correct dream filename
 * using simple_pokedex.json and the actual dream image directory.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const POKE_DIR = path.join(DATA_DIR, 'pokemon');
const DREAM_DIR = path.join(DATA_DIR, 'images', 'dream');
const SIMPLE_POKEDEX = path.join(DATA_DIR, 'simple_pokedex.json');

// ---- Step 1: Load Chinese name → {id, en} mapping ----
const simple = JSON.parse(fs.readFileSync(SIMPLE_POKEDEX, 'utf-8'));
const cnMap = {};   // Chinese name → {id, en}
simple.forEach(p => { cnMap[p.name_zh] = { id: p.index, en: p.name_en }; });
console.log(`Loaded ${Object.keys(cnMap).length} Chinese name mappings from simple_pokedex`);

// ---- Step 2: Build ID → dream filename mapping from actual files ----
const dreamFiles = fs.readdirSync(DREAM_DIR).filter(f => f.endsWith('.png'));

// Determine numeric prefix length: 3 or 4 digits
function extractPrefix(filename) {
  // If 4th character (index 3) is a digit, then 4-digit prefix; else 3-digit
  if (filename.length > 3 && /^\d$/.test(filename[3])) {
    return filename.slice(0, 4);
  }
  return filename.slice(0, 3);
}

// Build ID (as 4-digit zero-padded) → list of dream filenames
const dreamById = {};
for (const f of dreamFiles) {
  const prefix = extractPrefix(f);
  // Convert prefix to 4-digit zero-padded ID
  const id4 = prefix.padStart(4, '0');
  if (!dreamById[id4]) dreamById[id4] = [];
  dreamById[id4].push(f);
}

// For each ID, prefer the "main" form (no variant suffix like -Mega, -Galar)
function getMainDreamFile(id4) {
  const candidates = dreamById[id4];
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  // Prefer the file without any variant indicators
  const main = candidates.find(f => {
    // Remove the prefix + name part, check if rest is just "_Dream.png"
    const prefix = extractPrefix(f);
    const rest = f.slice(prefix.length);
    // Main form: {Name}_Dream.png (no variant suffix before _Dream)
    return /^[A-Z][a-zA-Z]+_Dream\.png$/.test(rest) || /^[A-Z][a-zA-Z]+\.png$/.test(rest);
  });
  if (main) return main;
  
  // Fallback: prefer file without "-" before _Dream
  const noVariant = candidates.find(f => {
    const prefix = extractPrefix(f);
    const rest = f.slice(prefix.length);
    return !rest.includes('-');
  });
  if (noVariant) return noVariant;
  
  return candidates[0];
}

// Now build Chinese name → dream filename
const cnToDream = {};
for (const p of simple) {
  const dreamFile = getMainDreamFile(p.index);
  if (dreamFile) {
    cnToDream[p.name_zh] = dreamFile;
  }
}

console.log(`Built ${Object.keys(cnToDream).length} Chinese name → dream file mappings`);
console.log(`Dream directory has ${dreamFiles.length} files total`);

// ---- Step 3: Fix all Pokémon files ----
let totalFixed = 0;
let totalChecked = 0;
let missingNames = new Set();
let missingDreamFiles = new Set();

fs.readdirSync(POKE_DIR).filter(f => f.endsWith('.json')).forEach(file => {
  const fp = path.join(POKE_DIR, file);
  const d = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const chains = d.evolution_chains || [];
  if (chains.length === 0) return;

  let changed = false;

  chains.forEach((chain, ci) => {
    chain.forEach((node, ni) => {
      const nodeName = node.name;
      if (!nodeName) return;
      
      totalChecked++;

      const correctFile = cnToDream[nodeName];
      if (!correctFile) {
        if (!cnMap[nodeName]) {
          missingNames.add(nodeName);
        } else {
          missingDreamFiles.add(nodeName + ' (id=' + cnMap[nodeName].id + ', en=' + cnMap[nodeName].en + ')');
        }
        return;
      }

      if (node.image !== correctFile) {
        console.log(`${file} chain[${ci}].node[${ni}] "${nodeName}": ${node.image || '(empty)'} → ${correctFile}`);
        node.image = correctFile;
        changed = true;
        totalFixed++;
      }
    });
  });

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf-8');
  }
});

console.log(`\n=== Summary ===`);
console.log(`Nodes checked: ${totalChecked}`);
console.log(`Nodes fixed: ${totalFixed}`);
if (missingNames.size > 0) {
  console.log(`\nNames not found in simple_pokedex (${missingNames.size}):`);
  missingNames.forEach(n => console.log(`  - "${n}"`));
}
if (missingDreamFiles.size > 0) {
  console.log(`\nNames found but no dream file (${missingDreamFiles.size}):`);
  missingDreamFiles.forEach(n => console.log(`  - "${n}"`));
}
