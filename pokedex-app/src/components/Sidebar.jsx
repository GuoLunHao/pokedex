import { useState, useMemo, useRef, useEffect } from 'react';
import { TYPE_COLORS, ALL_TYPES, GEN_NAMES } from '../constants';

export default function Sidebar({ mergedDex, simplePokedex, currentId, selectedEntry, onSelect }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState([]);
  const [genFilter, setGenFilter] = useState('all');

  const listRef = useRef(null);

  const toggleType = (type) => {
    setTypeFilter(prev => {
      if (prev.includes(type)) return prev.filter(t => t !== type);
      if (prev.length >= 2) return prev;
      return [...prev, type];
    });
  };

  const filtered = useMemo(() => {
    let list = mergedDex;
    // Type filter — match if ANY form has all selected types
    if (typeFilter.length > 0) {
      list = list.filter(p =>
        typeFilter.every(t => p._allFormTypes?.some(ft => ft.includes(t)))
      );
    }
    if (genFilter !== 'all') list = list.filter(p => p.gen === Number(genFilter));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p => {
        // Search in all form names
        if (p._formNames?.some(n => n.includes(q))) return true;
        const sp = simplePokedex.find(s => s.index === p.id);
        return sp && (
          (sp.name_en && sp.name_en.toLowerCase().includes(q)) ||
          (sp.name_jp && sp.name_jp.includes(q))
        );
      });
    }
    return list;
  }, [mergedDex, search, typeFilter, genFilter, simplePokedex]);

  // Scroll selected item into view
  useEffect(() => {
    if (!selectedEntry || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-key="${selectedEntry.id}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedEntry]);

  return (
    <aside className="sidebar">
      <div className="header">
        <h1>⚡ 宝可梦图鉴</h1>
        <span style={{ fontSize: 12, color: 'var(--sec)', fontWeight: 600 }}>{mergedDex.length} 只</span>
      </div>
      <div className="controls">
        <div className="sbox">
          <span style={{ fontSize: 16, color: 'var(--sec)' }}>🔍</span>
          <input
            type="text"
            placeholder="搜索名字..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="filters">
          <div className="fg">
            <span className="fl">
              属性
              {typeFilter.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--primary)', marginLeft: 4 }}>
                  ({typeFilter.length}/2 选)
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button className={`fbtn ${typeFilter.length === 0 ? 'active' : ''}`} onClick={() => setTypeFilter([])}>全部</button>
              {ALL_TYPES.map(t => {
                const selected = typeFilter.includes(t);
                const disabled = !selected && typeFilter.length >= 2;
                return (
                  <button
                    key={t}
                    className={`fbtn ${selected ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => toggleType(t)}
                    disabled={disabled}
                  >{t}</button>
                );
              })}
            </div>
          </div>
          <div className="fg">
            <span className="fl">世代</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button className={`fbtn ${genFilter === 'all' ? 'active' : ''}`} onClick={() => setGenFilter('all')}>全世代</button>
              {Object.entries(GEN_NAMES).map(([id, label]) => (
                <button key={id} className={`fbtn ${genFilter === id ? 'active' : ''}`} onClick={() => setGenFilter(id)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="plist" ref={listRef}>
        {filtered.map(p => {
          const isActive = selectedEntry?.id === p.id;
          const hasForms = p._formCount > 1;
          return (
            <div
              key={p.id}
              className={`pitem ${isActive ? 'active' : ''}`}
              data-key={p.id}
              onClick={() => onSelect(p, 0)}
            >
              <span className="num">#{p.id}</span>
              <span className="name">
                {p.name}
                {hasForms && (
                  <span style={{ fontSize: 10, color: 'var(--sec)', marginLeft: 4 }}>
                    +{p._formCount - 1}
                  </span>
                )}
              </span>
              <div className="types">
                {p.types.map(t => (
                  <span key={t} className="tbadge" style={{ background: TYPE_COLORS[t] || '#999' }}>{t}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
