const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const POKE_DIR = path.join(DATA_DIR, 'pokemon');
const IMG_DIR = path.join(DATA_DIR, 'images', 'official');

// Build name→filename map
const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
const nameMap = {};
for (const f of files) {
  const parts = f.split('-');
  parts.shift();
  const name = parts.join('-').replace(/\.png$/, '');
  nameMap[name] = f;
}
console.log('Map entries:', Object.keys(nameMap).filter(k => k.includes('伊布')).join(', '));

// Check 0133-伊布.json
const fp = path.join(POKE_DIR, '0133-伊布.json');
const d = JSON.parse(fs.readFileSync(fp, 'utf-8'));
const chains = d.evolution_chains || [];
let changed = false;

for (const chain of chains) {
  for (const node of chain) {
    if (!node.image || node.image === '') continue;
    const imgPath = path.join(IMG_DIR, node.image);
    if (!fs.existsSync(imgPath)) {
      const correct = nameMap[node.name];
      if (correct) {
        console.log(`${node.name}: ${node.image} → ${correct}`);
        node.image = correct;
        changed = true;
      } else {
        console.log(`${node.name}: ${node.image} → NOT FOUND`);
      }
    } else {
      console.log(`${node.name}: ${node.image} OK`);
    }
  }
}

if (changed) {
  fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf-8');
  console.log('Saved!');
} else {
  console.log('No changes needed.');
}
