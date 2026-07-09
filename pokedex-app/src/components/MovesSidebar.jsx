import { useState, useMemo, useEffect, useRef } from 'react';
import { TYPE_COLORS, ALL_TYPES, GEN_NAMES } from '../constants';

const CATEGORIES = ['物理', '特殊', '变化'];
const GEN_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function MovesSidebar({ moveList, selectedMove, onSelect }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState([]);
  const [catFilter, setCatFilter] = useState('');
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
    let list = moveList;
    // Type filter
    if (typeFilter.length > 0) {
      list = list.filter(m => typeFilter.includes(m.type));
    }
    // Category filter
    if (catFilter) {
      list = list.filter(m => m.category === catFilter);
    }
    // Generation filter
    if (genFilter !== 'all') {
      list = list.filter(m => m.generation === Number(genFilter));
    }
    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(m =>
        m.name_zh.toLowerCase().includes(q) ||
        (m.name_en && m.name_en.toLowerCase().includes(q)) ||
        (m.name_jp && m.name_jp.includes(q))
      );
    }
    return list;
  }, [moveList, search, typeFilter, catFilter, genFilter]);

  // Scroll selected move into view
  useEffect(() => {
    if (!selectedMove || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-key="${selectedMove.id}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedMove]);

  return (
    <aside className="sidebar">
      <div className="header">
        <h1>⚡ 招式列表</h1>
        <span style={{ fontSize: 12, color: 'var(--sec)', fontWeight: 600 }}>{moveList.length} 个招式</span>
      </div>
      <div className="controls">
        <div className="sbox">
          <span style={{ fontSize: 16, color: 'var(--sec)' }}>🔍</span>
          <input
            type="text"
            placeholder="搜索招式名称..."
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
              <button
                className={`fbtn ${typeFilter.length === 0 ? 'active' : ''}`}
                onClick={() => setTypeFilter([])}
              >
                全部
              </button>
              {ALL_TYPES.map(t => {
                const selected = typeFilter.includes(t);
                const disabled = typeFilter.length >= 2 && !selected;
                return (
                  <button
                    key={t}
                    className={`fbtn ${selected ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && toggleType(t)}
                    disabled={disabled}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fg">
            <span className="fl">分类</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`fbtn ${!catFilter ? 'active' : ''}`}
                onClick={() => setCatFilter('')}
              >
                全部
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`fbtn ${catFilter === c ? 'active' : ''}`}
                  onClick={() => setCatFilter(catFilter === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="fg">
            <span className="fl">世代</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button
                className={`fbtn ${genFilter === 'all' ? 'active' : ''}`}
                onClick={() => setGenFilter('all')}
              >
                全部
              </button>
              {GEN_KEYS.map(g => (
                <button
                  key={g}
                  className={`fbtn ${genFilter === String(g) ? 'active' : ''}`}
                  onClick={() => setGenFilter(genFilter === String(g) ? 'all' : String(g))}
                >
                  第{GEN_NAMES[g]}世代
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="plist" ref={listRef}>
        {filtered.map((m, idx) => (
          <div
            key={m.id !== '—' ? m.id : `gm-${idx}`}
            className={`pitem ${selectedMove?.id === m.id ? 'active' : ''}`}
            data-key={m.id}
            onClick={() => onSelect(m)}
          >
            <span className="num">#{m.id}</span>
            <span className="name">{m.name_zh}</span>
            <span className="types">
              <span className="tbadge" style={{ background: TYPE_COLORS[m.type] || '#999' }}>
                {m.type}
              </span>
              {m.category && (
                <span className={`tbadge cat-badge ${m.category}`}
                  style={{ background: m.category === '物理' ? '#E8833A' : m.category === '特殊' ? '#6390F0' : '#B7B7CE' }}>
                  {m.category}
                </span>
              )}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--sec)' }}>
            没有匹配的招式
          </div>
        )}
      </div>
    </aside>
  );
}
