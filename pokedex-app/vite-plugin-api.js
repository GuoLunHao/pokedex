import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

function getPokemonList() {
  const dir = path.join(DATA_DIR, 'pokemon');
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ id: f.split('-')[0], filename: f }))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch { return []; }
}

export default function apiPlugin() {
  return {
    name: 'pokedex-api',
    configureServer(server) {
      // Use a connect middleware at root level so we can handle /api/* ourselves
      server.middlewares.use((req, res, next) => {
        // Only handle /api/ paths
        if (!req.url.startsWith('/api/')) return next();

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');

        const sendJSON = (data, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
        };

        try {
          // GET /api/pokedex
          if (pathname === '/api/pokedex') {
            const d = readJSON(path.join(DATA_DIR, 'pokedex', 'national.json'));
            return sendJSON(d || { error: 'Not found' }, d ? 200 : 404);
          }

          // GET /api/simple-pokedex
          if (pathname === '/api/simple-pokedex') {
            const d = readJSON(path.join(DATA_DIR, 'simple_pokedex.json'));
            return sendJSON(d || { error: 'Not found' }, d ? 200 : 404);
          }

          // GET /api/pokemon/list
          if (pathname === '/api/pokemon/list') {
            const list = getPokemonList();
            return sendJSON(list || []);
          }

          // GET /api/pokemon/<id>
          const pokeMatch = pathname.match(/^\/api\/pokemon\/(\d{1,4})$/);
          if (pokeMatch) {
            const pid = pokeMatch[1].padStart(4, '0');
            const list = getPokemonList();
            const found = list.find(f => f.id === pid);
            if (found) {
              const d = readJSON(path.join(DATA_DIR, 'pokemon', found.filename));
              return sendJSON(d || { error: 'Not found' }, d ? 200 : 404);
            }
            return sendJSON({ error: 'Not found' }, 404);
          }

          // GET /api/moves/list
          if (pathname === '/api/moves/list') {
            const d = readJSON(path.join(DATA_DIR, 'move_list.json'));
            return sendJSON(d || { error: 'Not found' }, d ? 200 : 404);
          }

          // GET /api/moves/<name>  (name is Chinese, URL-encoded)
          const moveMatch = pathname.match(/^\/api\/moves\/(.+)$/);
          if (moveMatch) {
            const moveName = decodeURIComponent(moveMatch[1]);
            // Try exact filename match first
            const exactFile = path.join(DATA_DIR, 'moves', `${moveName}.json`);
            if (fs.existsSync(exactFile)) {
              return sendJSON(readJSON(exactFile) || { error: 'Not found' }, 200);
            }
            // Fallback: search move_list.json for this name, then find ANY file with matching id
            const allMoves = readJSON(path.join(DATA_DIR, 'move_list.json')) || [];
            const moveEntry = allMoves.find(m => m.name_zh === moveName);
            if (moveEntry) {
              // Search in moves directory for a file whose name matches the entry id or name
              const movesDir = path.join(DATA_DIR, 'moves');
              if (fs.existsSync(movesDir)) {
                const files = fs.readdirSync(movesDir);
                // Try name_zh from the entry (same as moveName, but just in case)
                for (const f of files) {
                  const basename = path.basename(f, '.json');
                  if (basename === moveEntry.name_zh) {
                    return sendJSON(readJSON(path.join(movesDir, f)) || { error: 'Not found' }, 200);
                  }
                }
                // Fuzzy: if moveEntry.id matches a file that starts with that id
                // (some files might have id prefix like "0001-拍击.json" — but moves dir doesn't)
                // Just return the move_list entry as a fallback
                return sendJSON({ ...moveEntry, _note: 'Only basic info available, no detail file' }, 200);
              }
            }
            return sendJSON({ error: 'Not found' }, 404);
          }

          // GET /api/images/<path>
          const imgMatch = pathname.match(/^\/api\/images\/(.+)$/);
          if (imgMatch) {
            const imgPath = decodeURIComponent(imgMatch[1]);
            const fullPath = path.resolve(DATA_DIR, 'images', imgPath);
            if (fullPath.startsWith(path.resolve(DATA_DIR, 'images')) && fs.existsSync(fullPath)) {
              const ext = path.extname(fullPath).toLowerCase();
              const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'application/octet-stream';
              res.statusCode = 200;
              res.setHeader('Content-Type', mime);
              return res.end(fs.readFileSync(fullPath));
            }
            return sendJSON({ error: 'Not found' }, 404);
          }

          sendJSON({ error: 'API not found' }, 404);
        } catch (e) {
          sendJSON({ error: e.message }, 500);
        }
      });
    },
  };
}
