import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DetailView from './components/DetailView';
import MovesSidebar from './components/MovesSidebar';
import MovesDetail from './components/MovesDetail';
import { getPokedex, getSimplePokedex, getPokemon, getMoveList } from './api';

export default function App() {
  const [nationalDex, setNationalDex] = useState([]);
  const [simplePokedex, setSimplePokedex] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [pokemonData, setPokemonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [formIndex, setFormIndex] = useState(0);

  // ── Move list state ──
  const [mode, setMode] = useState('pokemon'); // 'pokemon' | 'moves'
  const [moveList, setMoveList] = useState([]);
  const [selectedMove, setSelectedMove] = useState(null);

  const currentId = selectedEntry?.id || null;
  const appChangingHash = useRef(false); // prevent hashchange listener from overwriting formIndex

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 640;
      setIsMobile(mobile);
      if (!mobile) setMobileView('list');
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Merge same-ID entries (regional forms) into one
  const mergedDex = useMemo(() => {
    const groups = {};
    nationalDex.forEach(e => {
      if (!groups[e.id]) {
        groups[e.id] = {
          ...e,
          _formNames: [e.name],
          _formCount: 1,
          _allFormTypes: [e.types],
        };
      } else {
        groups[e.id]._formNames.push(e.name);
        groups[e.id]._formCount++;
        groups[e.id]._allFormTypes.push(e.types);
      }
    });
    return Object.values(groups).sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  }, [nationalDex]);

  useEffect(() => {
    Promise.all([getPokedex(), getSimplePokedex()]).then(([dex, simple]) => {
      setNationalDex(dex);
      setSimplePokedex(simple);
    });
    // Load move list
    getMoveList().then(list => setMoveList(list || []));
  }, []);

  // ── Initial hash routing (on mount + when data loads) ──
  useEffect(() => {
    if (moveList.length === 0 && mergedDex.length === 0) return;
    const hash = window.location.hash.slice(1);

    // Check for moves hash: #m-<id> or #moves
    if (hash.startsWith('m-')) {
      const moveId = hash.slice(2);
      const found = moveList.find(m => m.id === moveId);
      if (found) {
        setSelectedMove(found);
        setMode('moves');
        return;
      }
    }
    if (hash === 'moves') {
      setMode('moves');
      return;
    }

    // Otherwise treat as pokemon hash — normalize numeric IDs (e.g. "1" → "0001")
    if (mergedDex.length > 0 && hash) {
      const normalized = /^\d+$/.test(hash) ? hash.padStart(4, '0') : hash;
      const entry = mergedDex.find(e => e.id === normalized);
      if (entry) {
        setSelectedEntry(entry);
        setFormIndex(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveList.length, mergedDex.length]);

  // ── Hash routing for pokemon mode (hashchange events) ──
  useEffect(() => {
    if (mergedDex.length === 0) return;
    const onHashChange = () => {
      if (appChangingHash.current) {
        appChangingHash.current = false;
        return;
      }
      const h = window.location.hash.slice(1);
      if (h.startsWith('m-') || h === 'moves') {
        // User navigated to a moves hash — switch to moves mode
        setMode('moves');
        setMobileView('list');
        if (h.startsWith('m-')) {
          const moveId = h.slice(2);
          const found = moveList.find(m => m.id === moveId);
          if (found) setSelectedMove(found);
        }
        return;
      }
      // Pokemon hash — normalize numeric IDs (e.g. "1" → "0001")
      if (h && (h !== currentId || mode !== 'pokemon')) {
        const normalized = /^\d+$/.test(h) ? h.padStart(4, '0') : h;
        const e = mergedDex.find(x => x.id === normalized);
        if (e) {
          setMode('pokemon');
          setSelectedEntry(e);
          setFormIndex(0);
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedDex, moveList]);

  // ── Fetch pokemon detail ──
  useEffect(() => {
    if (mode !== 'pokemon' || !currentId) return;
    setLoading(true);
    appChangingHash.current = true;
    window.location.hash = currentId;
    let ignore = false;
    getPokemon(currentId).then(data => {
      if (!ignore) { setPokemonData(data); setLoading(false); }
    }).catch(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [currentId, selectedEntry, mode]);

  const handleSelect = useCallback((entry, formIdx = 0) => {
    setMode('pokemon');
    setSelectedEntry(entry);
    setFormIndex(formIdx);
    setLoading(true);
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setMobileView('list');
  }, []);

  // ── Mode switching ──
  const switchToPokemon = useCallback(() => {
    setMode('pokemon');
    if (selectedEntry && selectedEntry.id) {
      appChangingHash.current = true;
      window.location.hash = selectedEntry.id;
    }
  }, [selectedEntry]);

  const switchToMoves = useCallback(() => {
    setMode('moves');
    setMobileView('list');
    appChangingHash.current = true;
    window.location.hash = 'moves';
  }, []);

  const handleSelectMove = useCallback((move) => {
    setSelectedMove(move);
    appChangingHash.current = true;
    window.location.hash = `m-${move.id}`;
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  const handleMoveBack = useCallback(() => {
    setMobileView('list');
  }, []);

  // ── Navigate from moves detail to a pokemon detail ──
  const handleSelectPokemonFromMove = useCallback((id) => {
    const entry = mergedDex.find(e => e.id === id);
    if (entry) {
      setMode('pokemon');
      setSelectedEntry(entry);
      setFormIndex(0);
      setLoading(true);
      if (isMobile) setMobileView('detail');
    }
  }, [mergedDex, isMobile]);

  // ── Click move name in pokemon detail → go to moves detail ──
  const handleMoveClick = useCallback((moveName) => {
    const found = moveList.find(m => m.name_zh === moveName);
    if (found) {
      setSelectedMove(found);
      setMode('moves');
      appChangingHash.current = true;
      window.location.hash = `m-${found.id}`;
      if (isMobile) setMobileView('detail');
    }
  }, [moveList, isMobile]);

  const appClass = [
    'app',
    isMobile ? `mobile mobile-${mobileView}` : '',
  ].filter(Boolean).join(' ');

  if (mode === 'moves') {
    return (
      <div className={appClass}>
        <MovesSidebar
          moveList={moveList}
          selectedMove={selectedMove}
          onSelect={handleSelectMove}
        />
        <MovesDetail
          moveListItem={selectedMove}
          onSelectPokemon={handleSelectPokemonFromMove}
          isMobile={isMobile}
          onBack={handleMoveBack}
        />
        {/* Mode switch button (fixed position) */}
        <div className="mode-switch">
          <button onClick={switchToPokemon} title="切换到宝可梦图鉴">
            🐾 图鉴
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={appClass}>
      <Sidebar
        mergedDex={mergedDex}
        simplePokedex={simplePokedex}
        currentId={currentId}
        selectedEntry={selectedEntry}
        onSelect={handleSelect}
      />
      <DetailView
        pokemon={pokemonData}
        loading={loading}
        currentId={currentId}
        selectedEntry={selectedEntry}
        mergedDex={mergedDex}
        simplePokedex={simplePokedex}
        formIndex={formIndex}
        onFormIndexChange={setFormIndex}
        onSelect={handleSelect}
        onBack={handleBack}
        isMobile={isMobile}
        onMoveClick={handleMoveClick}
      />
      {/* Mode switch button (fixed position) */}
      <div className="mode-switch">
        <button onClick={switchToMoves} title="切换到招式列表">
          ⚔️ 招式
        </button>
      </div>
    </div>
  );
}
