import { useState, useEffect } from 'react';
import { TYPE_COLORS, GEN_NAMES } from '../constants';
import { getMoveByName } from '../api';

export default function MovesDetail({ moveListItem, onSelectPokemon, isMobile, onBack }) {
  const [moveData, setMoveData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!moveListItem) return;
    setLoading(true);
    getMoveByName(moveListItem.name_zh)
      .then(data => { setMoveData(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [moveListItem?.id, moveListItem?.name_zh]);

  if (!moveListItem) {
    return (
      <div className="main">
        <div className="dempty">
          {isMobile ? (
            <>
              <div style={{ fontSize: 64, opacity: .3 }}>👆</div>
              <div>从列表选择招式</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 64, opacity: .3 }}>👆</div>
              <div>从左侧列表选择招式查看详情</div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading || !moveData) {
    return (
      <div className="main">
        <div className="detail">
          <div className="loading">加载中</div>
        </div>
      </div>
    );
  }

  // Use moveListItem for generation (from move_list.json), moveData for the rest
  const { name_zh, name_jp, name_en, type, category, power, accuracy, pp, description, intro, effect, additional_effect, details, learn_by_level_up, learn_by_tm, learn_by_breeding, learn_by_tutor } = moveData;
  const generation = moveListItem.generation;

  return (
    <div className="main">
      <div className="detail">
        <div className="dhead">
          {isMobile && (
            <button className="dback" onClick={onBack} title="返回列表" aria-label="返回">
              ←
            </button>
          )}
          <div className="sprite" style={{ flexDirection: 'column', gap: 8, fontSize: 28, fontWeight: 700 }}>
            <div style={{ fontSize: 40 }}>⚔️</div>
            <div>#{moveListItem.id}</div>
          </div>
          <div className="info">
            <h2>{name_zh}</h2>
            <div className="name-en">{name_en || ''}{name_jp ? ' / ' + name_jp : ''}</div>
            <div className="tr" style={{ marginTop: 8 }}>
              {type && (
                <span className="tbadge" style={{ background: TYPE_COLORS[type] || '#999' }}>{type}</span>
              )}
              {category && (
                <span className={`tbadge cat-badge ${category}`}
                  style={{ background: category === '物理' ? '#E8833A' : category === '特殊' ? '#6390F0' : '#B7B7CE', marginLeft: 6 }}>
                  {category}
                </span>
              )}
            </div>
            <div className="move-stat-cards" style={{ marginTop: 10 }}>
              <div className="move-stat-card" style={{ background: 'linear-gradient(135deg, #ff6b6b22, #ff6b6b08)' }}>
                <span className="move-stat-label">💥 威力</span>
                <span className="move-stat-value" style={{ color: power ? '#e03131' : 'var(--sec)' }}>{power ?? '—'}</span>
              </div>
              <div className="move-stat-card" style={{ background: 'linear-gradient(135deg, #339af022, #339af008)' }}>
                <span className="move-stat-label">🎯 命中</span>
                <span className="move-stat-value" style={{ color: accuracy ? '#1971c2' : 'var(--sec)' }}>{accuracy ?? '—'}</span>
              </div>
              <div className="move-stat-card" style={{ background: 'linear-gradient(135deg, #51cf6622, #51cf6608)' }}>
                <span className="move-stat-label">🔋 PP</span>
                <span className="move-stat-value" style={{ color: pp ? '#2f9e44' : 'var(--sec)' }}>{pp ? pp.split('（')[0].trim() : '—'}</span>
              </div>
              <div className="move-stat-card" style={{ background: 'linear-gradient(135deg, #845ef722, #845ef708)' }}>
                <span className="move-stat-label">📅 世代</span>
                <span className="move-stat-value" style={{ color: 'var(--text)' }}>{GEN_NAMES[generation] || generation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--r)',
            padding: 16,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
            lineHeight: 1.7,
            fontSize: 14,
          }}>
            <strong>描述：</strong>{description}
            {additional_effect && additional_effect !== description && (
              <div style={{ marginTop: 8, color: 'var(--sec)', fontSize: 13 }}>
                <strong>附加效果：</strong>{additional_effect}
              </div>
            )}
          </div>
        )}

        {/* Effect list */}
        {effect && effect.length > 0 && (
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--r)',
            padding: 16,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
          }}>
            <strong style={{ display: 'block', marginBottom: 8 }}>详细效果：</strong>
            <ul style={{ paddingLeft: 20, lineHeight: 2, fontSize: 14 }}>
              {effect.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Intro & Details */}
        {intro && (
          <div style={{
            background: 'var(--card)',
            borderRadius: 'var(--r)',
            padding: 16,
            marginBottom: 16,
            boxShadow: 'var(--shadow)',
            lineHeight: 1.7,
            fontSize: 13,
            color: 'var(--sec)',
          }}>
            <p style={{ marginBottom: 8 }}>{intro}</p>
            {details && <p>{details}</p>}
          </div>
        )}

        {/* Learnsets */}
        <LearnsetSection title="等级提升" data={learn_by_level_up} type="level" onSelectPokemon={onSelectPokemon} />
        <LearnsetSection title="招式学习器" data={learn_by_tm} type="tm" onSelectPokemon={onSelectPokemon} />
        <LearnsetSection title="蛋招式" data={learn_by_breeding} type="egg" onSelectPokemon={onSelectPokemon} />
        <LearnsetSection title="教授招式" data={learn_by_tutor} type="tutor" onSelectPokemon={onSelectPokemon} />
      </div>
    </div>
  );
}

function LearnsetSection({ title, data, type, onSelectPokemon }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: 'var(--r)',
      padding: 16,
      marginBottom: 16,
      boxShadow: 'var(--shadow)',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
        <span style={{ fontSize: 12, color: 'var(--sec)', fontWeight: 400 }}>({data.length} 只宝可梦)</span>
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {data.map((p, i) => (
          <div
            key={i}
            onClick={() => onSelectPokemon && onSelectPokemon(p.id, p.name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--plight)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}
            title={type === 'level' ? `点击跳转` : `点击跳转`}
          >
            <span style={{ color: 'var(--sec)', fontWeight: 600, fontSize: 11 }}>#{p.id}</span>
            <span style={{ fontWeight: 500 }}>{p.name}</span>
            {(p.types || []).map(t => (
              <span key={t} className="tbadge" style={{ background: TYPE_COLORS[t] || '#999', fontSize: 9 }}>
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
