export const TYPE_COLORS = {
  '一般': '#A8A77A', '火': '#EE8130', '水': '#6390F0',
  '电': '#F7D02C', '草': '#7AC74C', '冰': '#96D9D6',
  '格斗': '#C22E28', '毒': '#A33EA1', '地面': '#E2BF65',
  '飞行': '#A98FF3', '超能力': '#F95587', '虫': '#A6B91A',
  '岩石': '#B6A136', '幽灵': '#735797', '龙': '#6F35FC',
  '恶': '#705746', '钢': '#B7B7CE', '妖精': '#D685AD',
};

export const ALL_TYPES = Object.keys(TYPE_COLORS);

export const GEN_NAMES = { 1: 'Ⅰ', 2: 'Ⅱ', 3: 'Ⅲ', 4: 'Ⅳ', 5: 'Ⅴ', 6: 'Ⅵ', 7: 'Ⅶ', 8: 'Ⅷ', 9: 'Ⅸ' };

export const STAT_CONFIG = [
  { key: 'hp', label: 'HP', color: '#FF5959' },
  { key: 'attack', label: '攻击', color: '#F08030' },
  { key: 'defense', label: '防御', color: '#F8D030' },
  { key: 'sp_attack', label: '特攻', color: '#6890F0' },
  { key: 'sp_defense', label: '特防', color: '#78C850' },
  { key: 'speed', label: '速度', color: '#F85888' },
];
