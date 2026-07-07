const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const POKE_DIR = path.join(DATA_DIR, 'pokemon');
const DREAM_DIR = path.join(DATA_DIR, 'images', 'dream');

// Build dream filename mapping: 3-digit-id → full filename
const dreamFiles = fs.readdirSync(DREAM_DIR).filter(f => f.endsWith('.png'));
const dreamById = {};
for (const f of dreamFiles) {
  const id3 = f.slice(0, 3);
  if (!dreamById[id3]) dreamById[id3] = [];
  dreamById[id3].push(f);
}

let reverted = 0;

fs.readdirSync(POKE_DIR).filter(f => f.endsWith('.json')).forEach(file => {
  const fp = path.join(POKE_DIR, file);
  const d = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  let changed = false;

  (d.evolution_chains || []).forEach(chain => {
    chain.forEach(node => {
      if (!node.image || node.image === '') return;
      // Check if image is in official format (XXXX-中文名.png)
      const isOfficial = /^\d{4}-/.test(node.image);
      if (!isOfficial) return; // already dream format, skip

      // Extract 4-digit ID, convert to 3-digit
      const id4 = node.image.slice(0, 4);
      const id3 = id4.slice(0, 3); // first 3 digits (e.g. "0001" → "000")
      
      // Try exact 3-digit match
      const candidates = dreamById[id3] || [];
      
      // Also try without leading zeros
      const idNum = parseInt(id4, 10);
      const altId3 = String(idNum).padStart(3, '0');
      const altCandidates = dreamById[altId3] || [];
      
      const allCandidates = [...candidates, ...altCandidates.filter(f => !candidates.includes(f))];
      
      if (allCandidates.length === 1) {
        node.image = allCandidates[0];
        changed = true;
        console.log(`  ${file.split('.')[0]} → ${node.name}: ${node.image}`);
      } else if (allCandidates.length > 1) {
        // Multiple candidates - try to match by name
        // Dream files have format: 001Bulbasaur_Dream.png
        // We'll just pick the first one that doesn't contain "-" (not a variant)
        const main = allCandidates.find(f => !f.includes('-') && !f.includes('_Mega') && !f.includes('_Gigantamax'));
        if (main) {
          node.image = main;
          changed = true;
          console.log(`  ${file.split('.')[0]} → ${node.name}: ${node.image} (main)`);
        } else {
          node.image = allCandidates[0];
          changed = true;
          console.log(`  ${file.split('.')[0]} → ${node.name}: ${node.image} (first)`);
        }
      }
      // If no candidates, keep as-is
    });
  });

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf-8');
    reverted++;
  }
});

console.log(`\nReverted ${reverted} files back to Dream.png format`);
