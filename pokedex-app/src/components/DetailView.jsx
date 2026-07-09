import { useState } from 'react';
import { TYPE_COLORS, STAT_CONFIG, GEN_NAMES } from '../constants';
import { getImageUrl, getDreamImageUrl, getPokemon } from '../api';
import StatsRadar from './StatsRadar';

const TABS = [
  { id: 'info', label: '基本信息' },
  { id: 'stats', label: '种族值' },
  { id: 'types', label: '属性相克' },
  { id: 'moves', label: '可学招式' },
  { id: 'evo', label: '进化链' },
  { id: 'entries', label: '图鉴介绍' },
];

export default function DetailView({ pokemon, loading, currentId, selectedEntry, mergedDex, simplePokedex, formIndex, onFormIndexChange, onSelect, onBack, isMobile, onMoveClick }) {
  const [activeTab, setActiveTab] = useState('info');

  if (!currentId || !selectedEntry) {
    return (
      <div className="main">
        <div className="dempty">
          {isMobile ? (
            <>
              <div style={{ fontSize: 64, opacity: .3 }}>👆</div>
              <div>从列表选择宝可梦</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, opacity: .3 }}>👆</div>
              <div>从左侧列表选择宝可梦查看详情</div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading || !pokemon) {
    return (
      <div className="main">
        <div className="detail">
          <div className="loading">加载中</div>
        </div>
      </div>
    );
  }

  // Select the correct form based on formIndex
  const form = pokemon.forms?.[formIndex] || pokemon.forms?.[0] || {};
  // Pick the correct type for the selected form
  const pokeTypes = form.types || [];
  // Pick the correct stats entry matching the selected form
  const statsEntry = formIndex === 0
    ? pokemon.stats?.[0]
    : (pokemon.stats || []).find(s => {
        // 1. Exact name match (e.g. 超级喷火龙Ｘ → stats.超级喷火龙Ｘ)
        if (s.form === form.name) return true;
        // 2. "超级进化" pattern: 超级妙蛙花 → stats.超级进化
        if (form.name.startsWith('超级') && s.form.includes('超级进化')) return true;
        // 3. Regional "XX的样子" pattern: 阿罗拉小拉达 → stats.阿罗拉的样子
        for (const region of ['阿罗拉', '伽勒尔', '帕底亚', '洗翠']) {
          if (form.name.includes(region) && s.form.includes(`${region}的样子`)) return true;
        }
        return false;
      });
  const stats = statsEntry?.data || pokemon.stats?.[0]?.data || {};
  const totalStat = STAT_CONFIG.reduce((s, c) => s + parseInt(stats[c.key] || 0), 0);
  const imgUrl = form.image ? getImageUrl(form.image) : null;

  return (
    <div className="main">
      <div className="detail">
        {/* Header */}
        <div className="dhead">
          {isMobile && (
            <button className="dback" onClick={onBack} title="返回列表" aria-label="返回">
              ←
            </button>
          )}
          <div className="sprite">
            {imgUrl
              ? <img src={imgUrl} alt={selectedEntry.name} onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style=\"font-size:48px;opacity:.3\">❓</span>'; }} />
              : <span style={{ fontSize: 48, opacity: .3 }}>❓</span>
            }
          </div>
          <div className="info">
            <div className="dex-num">#{pokemon.pokedex_id}</div>
            <h2>{selectedEntry.name}</h2>
            <div className="name-en">{pokemon.name_en || ''}{pokemon.name_ja ? ' / ' + pokemon.name_ja : ''}</div>
            <div className="tr">{pokeTypes.map(t => (
              <span key={t} className="tbadge" style={{ background: TYPE_COLORS[t] || '#999' }}>{t}</span>
            ))}</div>
            <div className="meas">
              {form.height && <span>📏 {form.height}</span>}
              {form.weight && <span>⚖️ {form.weight}</span>}
              <span>🏆 种族值: {totalStat}</span>
            </div>
            {/* Form switcher */}
            {pokemon.forms?.length > 1 && (
              <div className="form-switcher">
                {pokemon.forms.map((f, i) => (
                  <button
                    key={i}
                    className={`fbtn ${i === formIndex ? 'active' : ''}`}
                    onClick={() => onFormIndexChange(i)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(tab => (
            <button key={tab.id} className={`tbtn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="tab-panel" style={{ display: activeTab === 'info' ? '' : 'none' }}><InfoTab pokemon={pokemon} form={form} /></div>
        <div className="tab-panel" style={{ display: activeTab === 'stats' ? '' : 'none' }}><StatsTab stats={stats} total={totalStat} /></div>
        <div className="tab-panel" style={{ display: activeTab === 'types' ? '' : 'none' }}><TypesTab pokemon={pokemon} formIndex={formIndex} /></div>
        <div className="tab-panel" style={{ display: activeTab === 'moves' ? '' : 'none' }}><MovesTab key={currentId} pokemon={pokemon} onMoveClick={onMoveClick} /></div>
        <div className="tab-panel" style={{ display: activeTab === 'evo' ? '' : 'none' }}><EvoTab pokemon={pokemon} mergedDex={mergedDex} onSelect={onSelect} formIndex={formIndex} /></div>
        <div className="tab-panel" style={{ display: activeTab === 'entries' ? '' : 'none' }}><EntriesTab pokemon={pokemon} /></div>
      </div>
    </div>
  );
}

/* ─── Tab panels ─── */
function InfoTab({ pokemon, form }) {
  const formAbilities = form.abilities || [];
  const eggCyclesStr = form.egg_cycles || '';
  const basePoints = form.base_points || [];
  // "20 孵化周期（5140步）" → extract the step count from parentheses
  const stepMatch = eggCyclesStr.match(/[（(]\s*(\d+)\s*步/);
  const cycleNum = parseInt(eggCyclesStr, 10);
  const hatchSteps = stepMatch ? stepMatch[1] + ' 步' : (cycleNum ? cycleNum * 257 + ' 步' : '');
  const genderRatio = form.gender_ratio || {};
  const genderText = genderRatio.male !== undefined
    ? `♂ ${genderRatio.male}% / ♀ ${genderRatio.female}%`
    : genderRatio.label || '';

  const rows = [
    { label: '分类', value: form.category },
    { label: '身高', value: form.height },
    { label: '体重', value: form.weight },
    { label: '颜色', value: form.color },
    { label: '捕获率', value: form.catch_rate },
    { label: '基础经验', value: form.base_exp },
    { label: '性别比例', value: genderText },
    { label: '蛋群', value: form.egg_groups?.join('、') },
    { label: '孵化步数', value: hatchSteps },
  ].filter(r => r.value);

  return (
    <div className="tab-panel">
      {/* 基本介绍 */}
      {pokemon.description && (
        <div className="info-card">
          <div className="info-card-hd"><span className="info-icon">📖</span>基本介绍</div>
          <p className="info-card-body">{pokemon.description}</p>
        </div>
      )}

      {/* 外貌特征 */}
      {pokemon.profile && (
        <div className="info-card">
          <div className="info-card-hd"><span className="info-icon">👀</span>外貌特征</div>
          <p className="info-card-body">{pokemon.profile}</p>
        </div>
      )}

      {/* 形态信息 */}
      {rows.length > 0 && (
        <div className="info-card">
          <div className="info-card-hd"><span className="info-icon">📋</span>基础信息</div>
          <table className="info-tbl">
            <tbody>
              {rows.map(r => (
                <tr key={r.label}><td>{r.label}</td><td>{r.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 特性 */}
      {formAbilities.length > 0 && (
        <div className="info-card">
          <div className="info-card-hd"><span className="info-icon">✨</span>特性</div>
          <div className="info-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {formAbilities.map(a => (
              <span key={a.name} className={`ab-badge ${a.is_hidden ? 'ab-hidden' : ''}`}>
                {a.name}{a.is_hidden ? ' (梦特)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 努力值 */}
      {basePoints.length > 0 && (
        <div className="info-card">
          <div className="info-card-hd"><span className="info-icon">💪</span>努力值</div>
          <div className="info-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {basePoints.filter(bp => bp.value > 0).map(bp => (
              <span key={bp.stat} className="ev-badge">{STAT_CONFIG.find(s => s.key === bp.stat)?.label || bp.stat} +{bp.value}</span>
            ))}
          </div>
        </div>
      )}

      {/* 杂项/细节 */}
      {pokemon.detail && (
        <div className="info-card">
          <div className="info-card-hd"><span className="info-icon">💡</span>细节</div>
          <p className="info-card-body" style={{ whiteSpace: 'pre-line' }}>{pokemon.detail}</p>
        </div>
      )}
    </div>
  );
}

function StatsTab({ stats, total }) {
  const maxStat = 255;
  return (
    <div className="tab-panel">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <StatsRadar stats={stats} />
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{
            background: 'var(--bg2)', borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,.08)'
          }}>
            <div style={{
              fontSize: 13, color: 'var(--sec)', fontWeight: 600,
              marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase'
            }}>基础种族值</div>
            {STAT_CONFIG.map(sc => {
              const val = parseInt(stats[sc.key] || 0);
              const pct = Math.min(val / maxStat * 100, 100);
              const barColor = val >= 120 ? '#51cf66' : val >= 80 ? '#fcc419' : val >= 50 ? '#ff922b' : '#ff6b6b';
              return (
                <div key={sc.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sec)' }}>
                      <span style={{
                        display: 'inline-block', width: 10, height: 10, borderRadius: 3,
                        background: sc.color, marginRight: 6, verticalAlign: 'middle'
                      }}/>
                      {sc.label}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {val}
                    </span>
                  </div>
                  <div style={{
                    height: 8, background: 'var(--bg3)', borderRadius: 4,
                    overflow: 'hidden', position: 'relative'
                  }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 4,
                      background: `linear-gradient(90deg, ${sc.color}88, ${sc.color})`,
                      transition: 'width .3s ease'
                    }}/>
                  </div>
                </div>
              );
            })}
            <div style={{
              marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--sec)' }}>种族值总和</span>
              <span style={{
                fontSize: 22, fontWeight: 800,
                color: total >= 600 ? '#51cf66' : total >= 500 ? '#fcc419' : total >= 350 ? '#ff922b' : '#ff6b6b'
              }}>{total}</span>
            </div>
          </div>
          <div style={{
            marginTop: 10, fontSize: 12, color: 'var(--sec)', textAlign: 'center',
            lineHeight: 1.6
          }}>
            <span>⚡ ≥120 · 💪 80-119 · 🟡 50-79 · 🔴 &lt;50</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypesTab({ pokemon, formIndex }) {
  const effectiveness = pokemon.type_effectiveness || [];
  // Get current form's types to find the matching type_effectiveness entry
  const curForm = pokemon.forms?.[formIndex] || pokemon.forms?.[0] || {};
  const currentTypes = curForm.types || [];
  const filtered = effectiveness.filter(g => {
    const gt = g.types || [];
    return gt.length === currentTypes.length && currentTypes.every(t => gt.includes(t));
  });
  return (
    <div className="tab-panel">
      {filtered.length === 0 && <div>无属性相克数据</div>}
      {filtered.map((group, i) => {
        const data = group.data || [];
        const immune = data.filter(d => d.damage === '0');
        const quarter = data.filter(d => d.damage === '0.25');
        const half = data.filter(d => d.damage === '0.5');
        const normal = data.filter(d => d.damage === '1');
        const weak2 = data.filter(d => d.damage === '2');
        const weak4 = data.filter(d => d.damage === '4');

        return (
          <div key={i} style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 4 }}>{group.form ? `${group.form} ${group.label || '形态'}` : (group.label || '属性相克')}</h4>
            {group.details?.length > 0 && group.details.map((d, j) => <p key={j} style={{ margin: '2px 0', fontSize: 13 }}>{d}</p>)}
            <div className="tr" style={{ marginBottom: 16 }}>
              {(group.types || []).map(t => (
                <span key={t} className="tbadge" style={{ background: TYPE_COLORS[t] || '#999' }}>{t}</span>
              ))}
            </div>

            {/* ── PC: 按克制/抵抗分组展示 ── */}
            <div className="types-pc">
              {/* 弱点行：4倍 + 2倍 并排 */}
              {(weak4.length > 0 || weak2.length > 0) && (
                <div className="tc-row">
                  {weak4.length > 0 && (
                    <div className="tc-section tc-flex tc-weak">
                      <div className="tc-hd"><span className="tc-icon">⚡</span>受到克制 — 4 倍</div>
                      <div className="tc-bd">
                        {weak4.map(d => (
                          <span key={d.type} className="tbadge tc-badge tc-badge-4" style={{ background: TYPE_COLORS[d.type] || '#999' }}>{d.type}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {weak2.length > 0 && (
                    <div className="tc-section tc-flex tc-weak">
                      <div className="tc-hd"><span className="tc-icon">⚡</span>受到克制 — 2 倍</div>
                      <div className="tc-bd">
                        {weak2.map(d => (
                          <span key={d.type} className="tbadge tc-badge tc-badge-2" style={{ background: TYPE_COLORS[d.type] || '#999' }}>{d.type}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 抗性行：¼ + ½ 并排 */}
              {(quarter.length > 0 || half.length > 0) && (
                <div className="tc-row">
                  {quarter.length > 0 && (
                    <div className="tc-section tc-flex tc-resist">
                      <div className="tc-hd"><span className="tc-icon">🛡️</span>属性抵抗 — ¼ 倍</div>
                      <div className="tc-bd">
                        {quarter.map(d => (
                          <span key={d.type} className="tbadge tc-badge tc-badge-q" style={{ background: TYPE_COLORS[d.type] || '#999' }}>{d.type}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {half.length > 0 && (
                    <div className="tc-section tc-flex tc-resist">
                      <div className="tc-hd"><span className="tc-icon">🛡️</span>属性抵抗 — ½ 倍</div>
                      <div className="tc-bd">
                        {half.map(d => (
                          <span key={d.type} className="tbadge tc-badge tc-badge-h" style={{ background: TYPE_COLORS[d.type] || '#999' }}>{d.type}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 免疫 */}
              {immune.length > 0 && (
                <div className="tc-section tc-immune">
                  <div className="tc-hd"><span className="tc-icon">🚫</span>完全免疫</div>
                  <div className="tc-bd">
                    {immune.map(d => (
                      <span key={d.type} className="tbadge tc-badge tc-badge-0" style={{ background: TYPE_COLORS[d.type] || '#999' }}>{d.type}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 通常 */}
              {normal.length > 0 && (
                <div className="tc-section tc-normal">
                  <div className="tc-hd"><span className="tc-icon">➖</span>通常伤害 <span className="tc-ms">（1×）</span></div>
                  <div className="tc-bd">
                    {normal.map(d => (
                      <span key={d.type} className="tbadge tc-badge tc-badge-1" style={{ background: TYPE_COLORS[d.type] || '#999' }}>{d.type}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Mobile fallback: 紧凑表格 ── */}
            <table className="types-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid var(--border)', color: 'var(--sec)', fontSize: 13 }}>属性</th>
                  <th style={{ textAlign: 'center', padding: '6px 10px', borderBottom: '2px solid var(--border)', color: 'var(--sec)', fontSize: 13 }}>伤害倍率</th>
                </tr>
              </thead>
              <tbody>
                {data.sort((a, b) => {
                  const order = ['0','0.25','0.5','1','2','4'];
                  return order.indexOf(a.damage) - order.indexOf(b.damage);
                }).map(d => {
                  const dm = parseFloat(d.damage);
                  const dmgColor = dm === 0 ? '#868e96' : dm <= 0.25 ? '#4dabf7' : dm < 1 ? '#4dabf7' : dm > 1 ? '#ff6b6b' : 'var(--text)';
                  return (
                    <tr key={d.type} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 10px' }}>
                        <span className="tbadge" style={{ background: TYPE_COLORS[d.type] || '#999', fontSize: 12, padding: '2px 10px' }}>{d.type}</span>
                      </td>
                      <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: dm > 0 && dm < 1 ? 700 : 600, color: dmgColor, fontSize: 15 }}>
                        {dm === 0 ? '✕ 0' : `✕ ${d.damage}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/* ─── MovesTab helpers — flatten, sort, render ─── */

function flattenGroups(groups) {
  const rows = [];
  for (const g of (groups || [])) {
    for (const m of (g.data || [])) {
      rows.push({ ...m, generation: g.generation });
    }
  }
  return rows;
}

function sortNumeric(a, b, dir) {
  const va = a == null ? -1 : Number(a);
  const vb = b == null ? -1 : Number(b);
  return dir === 'asc' ? va - vb : vb - va;
}

function sortRows(rows, sortKey, sortDir) {
  if (!sortKey) return rows;
  return [...rows].sort((a, b) => {
    let va = a[sortKey];
    let vb = b[sortKey];
    if (sortKey === 'generation') {
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    if (sortKey === 'level') {
      const an = parseInt(String(va).replace(/[^0-9]/g, ''));
      const bn = parseInt(String(vb).replace(/[^0-9]/g, ''));
      return sortNumeric(isNaN(an) ? null : an, isNaN(bn) ? null : bn, sortDir);
    }
    if (['power', 'accuracy', 'pp'].includes(sortKey)) {
      const nva = Number(va), nvb = Number(vb);
      return sortNumeric(
        va == null || isNaN(nva) ? null : nva,
        vb == null || isNaN(nvb) ? null : nvb,
        sortDir
      );
    }
    if (sortKey === 'machine') {
      const an = parseInt(String(va).replace(/\D/g, '')) || 0;
      const bn = parseInt(String(vb).replace(/\D/g, '')) || 0;
      return sortDir === 'asc' ? an - bn : bn - an;
    }
    va = String(va || '');
    vb = String(vb || '');
    // use Intl.Collator for consistent Chinese pinyin sorting across browsers
    const collator = new Intl.Collator('zh', { sensitivity: 'base' });
    return sortDir === 'asc' ? collator.compare(va, vb) : collator.compare(vb, va);
  });
}

const TABLE_COLS = {
  learnable: [
    { key: 'generation', label: '世代', width: 64 },
    { key: 'level',     label: '等级', width: 72 },
    { key: 'name',      label: '招式名' },
    { key: 'type',      label: '类型', width: 72 },
    { key: 'category',  label: '分类', width: 56 },
    { key: 'power',     label: '威力', width: 56 },
    { key: 'accuracy',  label: '命中', width: 56 },
    { key: 'pp',        label: 'PP',   width: 48 },
  ],
  machine: [
    { key: 'generation', label: '世代', width: 64 },
    { key: 'machine',    label: '学习器', width: 80 },
    { key: 'name',       label: '招式名' },
    { key: 'type',       label: '类型', width: 72 },
    { key: 'category',   label: '分类', width: 56 },
    { key: 'power',      label: '威力', width: 56 },
    { key: 'accuracy',   label: '命中', width: 56 },
    { key: 'pp',         label: 'PP',   width: 48 },
  ],
  egg: [
    { key: 'generation', label: '世代', width: 64 },
    { key: 'name',       label: '招式名' },
    { key: 'type',       label: '类型', width: 72 },
    { key: 'category',   label: '分类', width: 56 },
    { key: 'power',      label: '威力', width: 56 },
    { key: 'accuracy',   label: '命中', width: 56 },
    { key: 'pp',         label: 'PP',   width: 48 },
  ],
  tutor: [
    { key: 'generation', label: '世代', width: 64 },
    { key: 'name',       label: '招式名' },
    { key: 'type',       label: '类型', width: 72 },
    { key: 'category',   label: '分类', width: 56 },
    { key: 'power',      label: '威力', width: 56 },
    { key: 'accuracy',   label: '命中', width: 56 },
    { key: 'pp',         label: 'PP',   width: 48 },
  ],
};

/* ─── Sub-component: a single sortable table ─── */
function MoveTable({ columns, rows, sortKey, sortDir, onSort, onMoveClick }) {
  if (rows.length === 0) return null;
  const arrow = (key) => {
    if (key !== sortKey) return <span className="msa"> ↕</span>;
    return sortDir === 'asc' ? <span className="msa act"> ▲</span> : <span className="msa act"> ▼</span>;
  };
  return (
    <div className="mtw">
      <table className="mt">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className="msh" onClick={() => onSort(col.key)}
                  style={{ cursor: 'pointer', ...(col.width ? { width: col.width } : {}) }}>
                {col.label}{arrow(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key}>
                  {renderCell(col.key, m, onMoveClick)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(key, m, onMoveClick) {
  switch (key) {
    case 'generation':
      return <span className="mg">{GEN_NAMES[m.generation] || m.generation}</span>;
    case 'level':
      return <span className="ml">{m.level || '—'}</span>;
    case 'type':
      return m.type
        ? <span className="tbadge" style={{ background: TYPE_COLORS[m.type] || '#999' }}>{m.type}</span>
        : <span className="mn">—</span>;
    case 'category':
      return m.category
        ? <span className={`mc ${m.category}`}>{m.category}</span>
        : <span className="mn">—</span>;
    case 'power':
      return <span className="mn">{m.power ?? (m.power === 0 ? 0 : '—')}</span>;
    case 'accuracy':
      return <span className="mn">{m.accuracy ?? (m.accuracy === 0 ? 0 : '—')}</span>;
    case 'pp':
      return <span className="mn">{m.pp ?? '—'}</span>;
    case 'machine':
      return <span className="mm">{m.machine || '—'}</span>;
    case 'name':
      if (onMoveClick) {
        return (
          <span
            className="mn move-link"
            onClick={(e) => { e.stopPropagation(); onMoveClick(m.name); }}
            title="查看招式详情"
          >
            {m.name}
          </span>
        );
      }
      return <span className="mn">{m.name}</span>;
    default:
      return <span>{m[key] ?? '—'}</span>;
  }
}

/* ─── MovesTab — 可学招式 ─── */
function MovesTab({ pokemon, onMoveClick }) {
  const [sortConfig, setSortConfig] = useState({});

  // Flatten grouped { generation, data: [...] } into flat rows with generation annotated
  const allRows = {
    learnable: flattenGroups(pokemon.learnable_moves),
    machine:   flattenGroups(pokemon.machine_moves),
    egg:       flattenGroups(pokemon.egg_moves),
    tutor:     flattenGroups(pokemon.tutor_moves),
  };

  // Available generations
  const allGens = [...new Set([
    ...allRows.learnable.map(m => m.generation),
    ...allRows.machine.map(m => m.generation),
    ...allRows.egg.map(m => m.generation),
    ...allRows.tutor.map(m => m.generation),
  ])].filter(Boolean).sort();

  // Default to the highest available generation
  const defaultGen = allGens.length > 0 ? String(allGens[allGens.length - 1]) : null;
  const [selectedGen, setSelectedGen] = useState(defaultGen);

  // Filter + sort per category
  const filterRows = (rows) => {
    if (selectedGen === 'all') return rows;
    return rows.filter(m => m.generation === parseInt(selectedGen));
  };

  const getRows = (cat) => {
    const filtered = filterRows(allRows[cat]);
    const cfg = sortConfig[cat] || {};
    return sortRows(filtered, cfg.key, cfg.dir);
  };

  const handleSort = (cat, key) => {
    setSortConfig(prev => {
      const cur = prev[cat];
      if (cur?.key === key) return { ...prev, [cat]: { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } };
      return { ...prev, [cat]: { key, dir: 'asc' } };
    });
  };

  const sections = [
    { id: 'learnable', label: '等级提升', rows: getRows('learnable'), cat: 'learnable' },
    { id: 'machine',   label: '招式学习器', rows: getRows('machine'), cat: 'machine' },
    { id: 'egg',       label: '蛋招式',     rows: getRows('egg'),     cat: 'egg' },
    { id: 'tutor',     label: '教授招式',   rows: getRows('tutor'),   cat: 'tutor' },
  ];

  const totalMoves = sections.reduce((s, sec) => s + sec.rows.length, 0);

  if (totalMoves === 0) {
    return <div className="tab-panel"><div className="moves-empty">无招式数据</div></div>;
  }

  return (
    <div className="tab-panel">
      {/* Generation filter bar */}
      <div className="mfilter">
        <span className="mfilter-label">世代过滤：</span>
        <div className="mfilter-btns">

          {allGens.map(g => (
            <button key={g} className={`fbtn ${selectedGen === String(g) ? 'active' : ''}`} onClick={() => setSelectedGen(String(g))}>
              第{GEN_NAMES[g] || g}世代
            </button>
          ))}
        </div>
      </div>

      {/* One merged table per category */}
      {sections.map(sec => (
        sec.rows.length > 0 && (
          <section key={sec.id} className="msection">
            <h3 className="msh3">
              {sec.label}
              <span className="mscount">{sec.rows.length} 个招式</span>
            </h3>
            <MoveTable
              columns={TABLE_COLS[sec.id]}
              rows={sec.rows}
              sortKey={(sortConfig[sec.cat] || {}).key}
              sortDir={(sortConfig[sec.cat] || {}).dir}
              onSort={(key) => handleSort(sec.cat, key)}
              onMoveClick={onMoveClick}
            />
          </section>
        )
      ))}
    </div>
  );
}

function EvoTab({ pokemon, mergedDex, onSelect, formIndex }) {
  const curEvoForm = pokemon.forms?.[formIndex] || pokemon.forms?.[0] || {};
  const curEvoFormName = curEvoForm.name || '';
  let evoChains = pokemon.evolution_chains || [];

  // Filter evolution chains by current form
  if (formIndex > 0 && curEvoFormName) {
    // For regional forms, match by region name in form_name
    // e.g. "阿罗拉小拉达" → chain form_name="阿罗拉的样子"
    evoChains = evoChains.filter(chain => {
      const fn = chain[0]?.form_name || '';
      if (!fn) return false;
      // Extract region from chain's form_name like "阿罗拉的样子" → "阿罗拉"
      const region = fn.replace('的样子', '').trim();
      return region && curEvoFormName.includes(region);
    });
  } else {
    // Base form: only show chains with no form_name (default)
    evoChains = evoChains.filter(chain => !chain[0]?.form_name);
  }
  if (evoChains.length === 0) {
    return <div className="tab-panel"><div>无进化数据</div></div>;
  }

  // Build a tree from possibly-branching chains
  // Find the longest common prefix across all chains
  const maxLen = Math.max(...evoChains.map(c => c.length));
  let prefixLen = 0;
  for (let i = 0; i < maxLen; i++) {
    const nameAtI = evoChains[0][i]?.name;
    if (nameAtI && evoChains.every(c => c[i]?.name === nameAtI)) {
      prefixLen = i + 1;
    } else {
      break;
    }
  }

  const commonNodes = evoChains[0].slice(0, prefixLen);
  const branches = evoChains.map(c => c.slice(prefixLen)).filter(b => b.length > 0);

  // Navigate to a Pokémon by name — find in merged dex with form index
  const handleNodeClick = (nodeName, nodeFormName) => {
    if (!onSelect || !mergedDex) return;
    const entry = mergedDex.find(e => e._formNames?.includes(nodeName));
    if (entry) {
      // Determine effective form_name:
      // 1. If node has explicit form_name, use it
      // 2. Otherwise, inherit from the filtered chain (we're viewing a regional evolution)
      //    The chain was already filtered to show only one region's evolution
      let effectiveFormName = nodeFormName;
      if (!effectiveFormName && evoChains.length > 0) {
        effectiveFormName = evoChains[0]?.[0]?.form_name;
      }
      if (effectiveFormName) {
        const region = effectiveFormName.replace('的样子', '').trim();
        if (region) {
          // IMPORTANT: _formNames from national.json may have different indices
          // than pokemon.forms[] (e.g. mega forms missing from national.json).
          // Fetch the target pokemon data to find the correct form index.
          getPokemon(entry.id).then(p => {
            if (p && p.forms) {
              const idx = p.forms.findIndex(f => f.name.includes(region));
              onSelect(entry, idx >= 0 ? idx : 0);
            } else {
              onSelect(entry, 0);
            }
          }).catch(() => {
            onSelect(entry, 0);
          });
          return;
        }
      }
      // Base form: use exact match in _formNames (which matches forms index for base forms)
      const fi = entry._formNames.indexOf(nodeName);
      onSelect(entry, fi >= 0 ? fi : 0);
    }
  };

  // Render a single node
  const renderNode = (node, key) => {
    const img = node.image ? getDreamImageUrl(node.image) : null;
    return (
      <div key={key} className="en" onClick={() => handleNodeClick(node.name, node.form_name)} style={{ cursor: 'pointer' }}>
        <div className="evo-sprite" style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', borderRadius: 16, border: '2px solid var(--border)', margin: '0 auto' }}>
          {img
            ? <img src={img} alt={node.name} style={{ width: 80, height: 80, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style=\"font-size:32px\">❓</span>'; }} />
            : <span style={{ fontSize: 32 }}>❓</span>
          }
        </div>
        <div className="enm" style={{ fontSize: 13, fontWeight: 600, marginTop: 6, textAlign: 'center' }}>{node.name}</div>
        {node.text && <div className="ec" style={{ fontSize: 11, color: 'var(--sec)', textAlign: 'center', marginTop: 2, maxWidth: 100, lineHeight: 1.3 }}>{node.text}</div>}
      </div>
    );
  };

  return (
    <div className="tab-panel">
      {/* Common prefix path */}
      <div className="evo">
        {commonNodes.map((node, i) => (
          <div key={i} className="evo-node" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {i > 0 && <span className="evm" style={{ fontSize: 26, color: 'var(--sec)', flexShrink: 0 }}>→</span>}
            {renderNode(node, 'c' + i)}
          </div>
        ))}
      </div>

      {/* Branching evolutions */}
      {branches.length > 0 && (
        <div style={{ position: 'relative', marginTop: commonNodes.length > 0 ? 12 : 0 }}>
          {/* Connector lines */}
          {branches.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 32 }}>
              <div style={{ width: 2, height: 32, background: 'var(--border)' }} />
            </div>
          )}
          {branches.length > 1 && (
            <div style={{
              position: 'relative', display: 'flex', justifyContent: 'center',
              marginBottom: 8
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: 2, background: 'var(--border)'
              }} />
              <div className="evo-branches" style={{
                display: 'flex', gap: 20, flexWrap: 'nowrap',
                justifyContent: 'center', alignItems: 'flex-start',
                position: 'relative', zIndex: 1
              }}>
                {branches.map((branch, bi) => (
                  <div key={bi} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    position: 'relative', minWidth: 80
                  }}>
                    {/* Vertical connector */}
                    {branches.length > 1 && (
                      <div style={{ width: 2, height: 16, background: 'var(--border)', marginBottom: 4 }} />
                    )}
                    {renderNode(branch[0], 'b' + bi)}
                    {/* Subsequent evolutions in this branch */}
                    {branch.slice(1).map((subNode, si) => (
                      <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 18, color: 'var(--sec)' }}>→</span>
                        {renderNode(subNode, 'b' + bi + 's' + si)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Single branch — just show inline */}
          {branches.length === 1 && branches[0].length > 0 && (
            <div className="evo" style={{ marginTop: 8 }}>
              {branches[0].map((node, i) => (
                <div key={i} className="evo-node" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {i > 0 && <span style={{ fontSize: 22, color: 'var(--sec)', flexShrink: 0 }}>→</span>}
                  {renderNode(node, 's' + i)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntriesTab({ pokemon }) {
  const raw = pokemon.pokedex_entries || [];
  if (raw.length === 0) {
    return <div className="tab-panel"><div>无图鉴介绍</div></div>;
  }
  // Flatten: {name: "第X世代", versions: [{name,group,text}]} → flat list
  const entries = [];
  raw.forEach(gen => {
    (gen.versions || []).forEach(v => {
      entries.push({ generation: gen.name, version: v.name, group: v.group, text: v.text });
    });
  });
  return (
    <div className="tab-panel">
      {entries.map((e, i) => (
        <div key={i} className="entry-card" style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--sec)' }}>{e.generation}</span>
            <span style={{ fontSize: 12, color: 'var(--sec)', opacity: .7 }}>·</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{e.version}</span>
            {e.group && <span style={{ fontSize: 11, color: 'var(--sec)', opacity: .6 }}>({e.group})</span>}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{e.text}</p>
        </div>
      ))}
    </div>
  );
}
