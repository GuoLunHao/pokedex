const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const POKE_DIR = path.join(DATA_DIR, 'pokemon');
const DREAM_DIR = path.join(DATA_DIR, 'images', 'dream');
const SIMPLE_POKEDEX = path.join(DATA_DIR, 'simple_pokedex.json');

// Load simple pokedex
const simple = JSON.parse(fs.readFileSync(SIMPLE_POKEDEX, 'utf-8'));
const cnMap = {};
simple.forEach(p => { cnMap[p.name_zh] = { id: p.index, en: p.name_en }; });

// List all dream files
const dreamFiles = new Set(fs.readdirSync(DREAM_DIR).filter(f => f.endsWith('.png')));

// Build expected dream filename
function expectedDreamName(id, en) {
  const idNum = parseInt(id, 10);
  const prefix = idNum < 1000 ? id.padStart(3, '0').slice(-3) : id.padStart(4, '0').slice(-4);
  let base = prefix + en + '_Dream.png';
  if (dreamFiles.has(base)) return base;
  // Try without _Dream suffix (some files like 1009Walking_Wake.png)
  base = prefix + en + '.png';
  if (dreamFiles.has(base)) return base;
  return null;
}

let totalFiles = 0;
let filesWithEvo = 0;
let filesWithIssues = 0;
let wrongCount = 0;
let correctCount = 0;
let missingNameCount = 0;

// Scan all pokemon files
fs.readdirSync(POKE_DIR).filter(f => f.endsWith('.json')).forEach(file => {
  totalFiles++;
  const fp = path.join(POKE_DIR, file);
  const d = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const chains = d.evolution_chains || [];
  if (chains.length === 0) return;
  filesWithEvo++;

  let fileHasIssues = false;

  chains.forEach((chain, ci) => {
    chain.forEach((node, ni) => {
      const currentImage = node.image;
      if (!currentImage) return; // skip empty

      const nodeName = node.name;
      const entry = cnMap[nodeName];
      if (!entry) {
        // Name not found in simple_pokedex - might be a form variant
        console.log(`  MISSING NAME: ${file} chain[${ci}].node[${ni}] name="${nodeName}" image="${currentImage}"`);
        missingNameCount++;
        fileHasIssues = true;
        return;
      }

      const expected = expectedDreamName(entry.id, entry.en);
      if (!expected) {
        console.log(`  NO DREAM FILE: ${file} node="${nodeName}" (id=${entry.id}, en=${entry.en}) has image="${currentImage}" but expected dream file not found`);
        fileHasIssues = true;
        return;
      }

      if (currentImage !== expected) {
        console.log(`  WRONG: ${file} chain[${ci}].node[${ni}] name="${nodeName}" image="${currentImage}" → expected="${expected}"`);
        wrongCount++;
        fileHasIssues = true;
      } else {
        correctCount++;
      }
    });
  });

  if (fileHasIssues) filesWithIssues++;
});

console.log(`\n=== Summary ===`);
console.log(`Total Pokémon files: ${totalFiles}`);
console.log(`Files with evolution chains: ${filesWithEvo}`);
console.log(`Files with issues: ${filesWithIssues}`);
console.log(`Correct images: ${correctCount}`);
console.log(`Wrong images: ${wrongCount}`);
console.log(`Missing names: ${missingNameCount}`);
