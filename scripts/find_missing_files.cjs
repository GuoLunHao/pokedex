const fs = require('fs');
const POKE_DIR = './data/pokemon';
const DREAM_DIR = './data/images/dream';

const dreamFiles = new Set(fs.readdirSync(DREAM_DIR).filter(f => f.endsWith('.png')));

let stillWrong = 0;
let missingDream = 0;

fs.readdirSync(POKE_DIR).filter(f => f.endsWith('.json')).forEach(file => {
  const d = JSON.parse(fs.readFileSync(POKE_DIR + '/' + file, 'utf-8'));
  (d.evolution_chains || []).forEach((chain, ci) => {
    chain.forEach((node, ni) => {
      if (!node.image) return;
      // Check if the image file exists in dream directory
      if (!dreamFiles.has(node.image)) {
        console.log(file + ' [' + ci + '][' + ni + '] ' + node.name + ' -> ' + node.image + ' (FILE NOT FOUND)');
        missingDream++;
      }
    });
  });
});

console.log('\nTotal missing dream files: ' + missingDream);
