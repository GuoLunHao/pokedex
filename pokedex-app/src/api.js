/**
 * API module — works in both dev (Vite API plugin) and production (static files).
 *
 * In development:
 *   Data is served from /api/*            (Vite API plugin routes)
 *
 * In production:
 *   Data files are in public/data/ so they end up at
 *   {BASE_URL}data/...   (e.g. /pokedex/data/pokedex/national.json)
 */

import.meta.env; // ensure env is available

const isProd = import.meta.env.PROD;
const BASE = import.meta.env.BASE_URL || '/';      // e.g. '/' or '/pokedex/'

// Cache for pokemon-id → filename mapping (prod only)
let _pokemonIndex = null;

export async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

/** Full data for the sidebar list — returns national.json content */
export function getPokedex() {
  if (isProd) {
    return fetchJSON(`${BASE}data/pokedex/national.json`);
  }
  return fetchJSON('/api/pokedex');
}

/** Lightweight pokedex for search/type filter */
export function getSimplePokedex() {
  if (isProd) {
    return fetchJSON(`${BASE}data/simple_pokedex.json`);
  }
  return fetchJSON('/api/simple-pokedex');
}

/** Fetch a single pokemon by its national-id (e.g. "0001") */
export async function getPokemon(id) {
  const padded = String(id).padStart(4, '0');
  if (isProd) {
    if (!_pokemonIndex) {
      _pokemonIndex = await fetchJSON(`${BASE}data/pokemon-index.json`);
    }
    const filename = _pokemonIndex[padded];
    if (!filename) throw new Error(`Pokemon ${padded} not found in index`);
    return fetchJSON(`${BASE}data/pokemon/${filename}`);
  }
  return fetchJSON(`/api/pokemon/${padded}`);
}

/** Official artwork image URL */
export function getImageUrl(path) {
  if (!path) return null;
  if (isProd) return `${BASE}data/images/official/${path}`;
  return `/api/images/official/${path}`;
}

/** Dream-world image URL */
export function getDreamImageUrl(path) {
  if (!path) return null;
  if (isProd) return `${BASE}data/images/dream/${path}`;
  return `/api/images/dream/${path}`;
}

/** List all pokemon { id, filename } pairs */
export async function getPokemonList() {
  if (isProd) {
    if (!_pokemonIndex) {
      _pokemonIndex = await fetchJSON(`${BASE}data/pokemon-index.json`);
    }
    return Object.entries(_pokemonIndex).map(([id, filename]) => ({ id, filename }));
  }
  return fetchJSON('/api/pokemon/list');
}

/* ─── Moves list API ─── */

/** Fetch the full move list (basic info for all moves) */
export function getMoveList() {
  if (isProd) {
    return fetchJSON(`${BASE}data/move_list.json`);
  }
  return fetchJSON('/api/moves/list');
}

/** Fetch a single move's details (including learnsets) by Chinese name */
export async function getMoveByName(zhName) {
  const encoded = encodeURIComponent(zhName);
  if (isProd) {
    return fetchJSON(`${BASE}data/moves/${encoded}.json`);
  }
  return fetchJSON(`/api/moves/${encoded}`);
}
