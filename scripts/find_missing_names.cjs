const fs = require('fs');
const path = require('path');
const POKE_DIR = path.resolve(__dirname, '..', 'data', 'pokemon');
const s = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'simple_pokedex.json'), 'utf-8'));

// Build cn->id map from simple_pokedex
const cnMap = {};
s.forEach(p => { cnMap[p.name_zh] = p; });

const missingNames = new Set();
const dreamMissing = new Set();

fs.readdirSync(POKE_DIR).filter(f => f.endsWith('.json')).forEach(file => {
  const d = JSON.parse(fs.readFileSync(path.join(POKE_DIR, file), 'utf-8'));
  (d.evolution_chains || []).forEach((chain, ci) => {
    chain.forEach((node, ni) => {
      if (!node.name) return;
      if (!cnMap[node.name]) {
        missingNames.add(node.name + ' (in ' + file + ' chain[' + ci + '].node[' + ni + '])');
      }
    });
  });
});

console.log('=== Names NOT in simple_pokedex ===');
missingNames.forEach(n => console.log(n));
