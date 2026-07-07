/**
 * prepare-data.js
 * Copy data files from the project root `data/` directory into
 * `public/data/` so Vite can serve them as static assets in production.
 *
 * Usage: node scripts/prepare-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');          // project root (pokemon-dataset-zh)
const DATA_DIR = path.resolve(ROOT, 'data');
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const OUT_DATA = path.join(PUBLIC_DIR, 'data');

function copyDir(src, dest, filter = () => true) {
  if (!fs.existsSync(src)) {
    console.warn(`  [WARN] source not found: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src);
  let count = 0;
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath, filter);
    } else if (filter(entry, srcPath)) {
      // Only copy if destination doesn't exist or source is newer
      let needsCopy = true;
      if (fs.existsSync(destPath)) {
        const srcMtime = stat.mtimeMs;
        const destMtime = fs.statSync(destPath).mtimeMs;
        needsCopy = srcMtime > destMtime + 1000; // 1s tolerance
      }
      if (needsCopy) {
        fs.copyFileSync(srcPath, destPath);
        count++;
      }
    }
  }
  if (count > 0) console.log(`  copied ${count} files to ${path.relative(PUBLIC_DIR, dest)}`);
}

console.log('Preparing static data for production build...\n');

// 1. Clean previous data
if (fs.existsSync(OUT_DATA)) {
  fs.rmSync(OUT_DATA, { recursive: true, force: true });
  console.log('  cleaned old public/data/');
}

// 2. Copy pokedex index files
console.log('Copying pokedex...');
copyDir(path.join(DATA_DIR, 'pokedex'), path.join(OUT_DATA, 'pokedex'));

// 3. Copy simple_pokedex
console.log('Copying simple_pokedex...');
fs.mkdirSync(OUT_DATA, { recursive: true });
fs.copyFileSync(
  path.join(DATA_DIR, 'simple_pokedex.json'),
  path.join(OUT_DATA, 'simple_pokedex.json')
);

// 4. Copy pokemon/ JSON files + generate index
console.log('Copying pokemon data...');
const pokemonSrc = path.join(DATA_DIR, 'pokemon');
const pokemonDest = path.join(OUT_DATA, 'pokemon');
fs.mkdirSync(pokemonDest, { recursive: true });

const files = fs.readdirSync(pokemonSrc).filter(f => f.endsWith('.json'));
const index = {};
for (const file of files) {
  const id = file.split('-')[0];
  index[id] = file;
  fs.copyFileSync(path.join(pokemonSrc, file), path.join(pokemonDest, file));
}
console.log(`  copied ${files.length} pokemon files`);

// Write index file
fs.writeFileSync(
  path.join(OUT_DATA, 'pokemon-index.json'),
  JSON.stringify(index),
  'utf-8'
);
console.log('  wrote pokemon-index.json');

// 5. Copy dream images
console.log('Copying dream images...');
copyDir(
  path.join(DATA_DIR, 'images', 'dream'),
  path.join(OUT_DATA, 'images', 'dream')
);

// 6. Copy official images
console.log('Copying official images...');
copyDir(
  path.join(DATA_DIR, 'images', 'official'),
  path.join(OUT_DATA, 'images', 'official')
);

console.log('\n✔ Done! Static data is ready at public/data/');
