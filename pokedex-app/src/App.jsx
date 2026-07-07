import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DetailView from './components/DetailView';
import { getPokedex, getSimplePokedex, getPokemon } from './api';

export default function App() {
  const [nationalDex, setNationalDex] = useState([]);
  const [simplePokedex, setSimplePokedex] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [pokemonData, setPokemonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [formIndex, setFormIndex] = useState(0);

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
  }, []);

  useEffect(() => {
    if (mergedDex.length === 0) return;
    const hash = window.location.hash.slice(1);
    if (hash) {
      const entry = mergedDex.find(e => e.id === hash);
      if (entry) {
        setSelectedEntry(entry);
        setFormIndex(0);
      }
    }
    // Respond to manual hash changes (e.g. browser back/forward, manual URL edit)
    const onHashChange = () => {
      // Skip if the hash change was triggered by the app itself
      if (appChangingHash.current) {
        appChangingHash.current = false;
        return;
      }
      const h = window.location.hash.slice(1);
      if (h && h !== currentId) {
        const e = mergedDex.find(x => x.id === h);
        if (e) {
          setSelectedEntry(e);
          setFormIndex(0);
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedDex.length]);

  useEffect(() => {
    if (!currentId) return;
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
  }, [currentId, selectedEntry]);

  const handleSelect = useCallback((entry, formIdx = 0) => {
    setSelectedEntry(entry);
    setFormIndex(formIdx);
    setLoading(true); // Show loading immediately to avoid flash of old data
    if (isMobile) setMobileView('detail');
  }, [isMobile]);

  const handleBack = useCallback(() => {
    setMobileView('list');
  }, []);

  const appClass = [
    'app',
    isMobile ? `mobile mobile-${mobileView}` : '',
  ].filter(Boolean).join(' ');

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
      />
    </div>
  );
}
