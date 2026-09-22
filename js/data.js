/* 山海余烬 · 镜水涧 Demo · 数据驱动配置
 * 对应 Godot Resource：SpiritConfig / EnemyConfig / ReactionConfig / WaveConfig / MapConfig
 * 新增内容只需改本文件，不必改核心系统。
 */

export const ELEMENTS = {
  FIRE: { id: 'FIRE', name: '炎', color: '#E85D3A', glow: '#FFB347', icon: '🔥' },
  WATER: { id: 'WATER', name: '沧', color: '#3BA7C4', glow: '#7FD4E8', icon: '💧' },
  LIGHTNING: { id: 'LIGHTNING', name: '霆', color: '#7B5CFF', glow: '#C4B5FF', icon: '⚡' },
  WIND: { id: 'WIND', name: '岚', color: '#5CB88A', glow: '#A8E6C3', icon: '🌪' },
  ICE: { id: 'ICE', name: '霜', color: '#A8D4E8', glow: '#E0F2FF', icon: '❄️' },
};

export const ELEMENT_LIST = ['FIRE', 'WATER', 'LIGHTNING', 'WIND', 'ICE'];

/** SpiritConfig — 五只首发灵兽 */
export const SPIRITS = {
  'spirit.red_feather': {
    id: 'spirit.red_feather',
    name: '赤羽',
    element: 'FIRE',
    cost: 40,
    range: 220,
    attackInterval: 0.9,
    baseDamage: 16,
    attackType: 'projectile',
    splash: 40,
    status: 'BURN',
    statusDuration: 2.5,
    projectileSpeed: 420,
    upgradeCost: [50, 90],
    upgradeDamage: [8, 12],
    desc: '喷吐火团，命中留下短暂燃烧',
  },
  'spirit.azure_scale': {
    id: 'spirit.azure_scale',
    name: '沧璃',
    element: 'WATER',
    cost: 50,
    range: 230,
    attackInterval: 1.1,
    baseDamage: 9,
    attackType: 'projectile',
    splash: 0,
    status: 'WET',
    statusDuration: 3.5,
    projectileSpeed: 380,
    upgradeCost: [55, 100],
    upgradeDamage: [5, 8],
    desc: '水弹使敌人潮湿并留下水迹',
  },
  'spirit.thunder_horn': {
    id: 'spirit.thunder_horn',
    name: '雷角',
    element: 'LIGHTNING',
    cost: 60,
    range: 240,
    attackInterval: 0.75,
    baseDamage: 18,
    attackType: 'beam',
    chainRange: 140,
    chainCount: 2,
    preferWet: true,
    status: 'CHARGED',
    statusDuration: 1.8,
    projectileSpeed: 0,
    upgradeCost: [70, 120],
    upgradeDamage: [9, 14],
    desc: '闪电攻击，优先向潮湿目标弹射',
  },
  'spirit.wind_fox': {
    id: 'spirit.wind_fox',
    name: '风狸',
    element: 'WIND',
    cost: 55,
    range: 210,
    attackInterval: 0.8,
    baseDamage: 7,
    attackType: 'pulse',
    pulseRadius: 100,
    spreadEnv: true,
    status: 'GUSTED',
    statusDuration: 1.5,
    projectileSpeed: 0,
    upgradeCost: [55, 100],
    upgradeDamage: [4, 6],
    desc: '风刃并推动扩散已有元素区域',
  },
  'spirit.frost_fox': {
    id: 'spirit.frost_fox',
    name: '霜狐',
    element: 'ICE',
    cost: 55,
    range: 225,
    attackInterval: 0.9,
    baseDamage: 10,
    attackType: 'projectile',
    splash: 0,
    status: 'CHILL',
    statusDuration: 2.8,
    freezeWetFaster: true,
    projectileSpeed: 400,
    upgradeCost: [55, 100],
    upgradeDamage: [5, 9],
    desc: '冰刺减速，潮湿目标更易冻结',
  },
};

export const SPIRIT_ORDER = [
  'spirit.red_feather',
  'spirit.azure_scale',
  'spirit.thunder_horn',
  'spirit.wind_fox',
  'spirit.frost_fox',
];

/** EnemyConfig — 墨蚀异兽 */
export const ENEMIES = {
  'enemy.ink_blob': {
    id: 'enemy.ink_blob',
    name: '墨团',
    maxHp: 80,
    speed: 70,
    reward: 8,
    radius: 22,
    tags: ['normal'],
    color: '#1a1a1a',
    accent: '#c23b2e',
    desc: '圆滚小黑兽，教学用',
  },
  'enemy.ink_hound': {
    id: 'enemy.ink_hound',
    name: '蚀犬',
    maxHp: 55,
    speed: 110,
    reward: 9,
    radius: 18,
    tags: ['fast'],
    color: '#141414',
    accent: '#e04040',
    desc: '细长快速，红眼',
  },
  'enemy.ink_shell': {
    id: 'enemy.ink_shell',
    name: '甲蚀',
    maxHp: 220,
    speed: 48,
    reward: 16,
    radius: 28,
    tags: ['tank'],
    color: '#0f0f0f',
    accent: '#8a8a8a',
    desc: '高生命厚墨甲',
  },
  'enemy.ink_worm': {
    id: 'enemy.ink_worm',
    name: '吞灵虫',
    maxHp: 32,
    speed: 82,
    reward: 4,
    radius: 12,
    tags: ['swarm'],
    color: '#1c1c1c',
    accent: '#666',
    desc: '小型圆虫成群',
  },
  'enemy.ink_tiger': {
    id: 'enemy.ink_tiger',
    name: '蚀山君',
    maxHp: 1800,
    speed: 38,
    reward: 150,
    radius: 48,
    tags: ['boss'],
    color: '#0a0a0a',
    accent: '#d0d0d0',
    isBoss: true,
    chargeInterval: 8,
    summonInterval: 12,
    desc: '巨型墨虎，阶段冲锋+召唤墨团',
  },
};

/**
 * ReactionConfig — P0 双元素反应（顺序无关）
 * input 为无序组合键 "A+B"
 */
export const REACTIONS = {
  'reaction.conduct': {
    id: 'reaction.conduct',
    name: '导电',
    inputs: ['WATER', 'LIGHTNING'],
    output: 'CONDUCT',
    damage: 28,
    duration: 0,
    chainable: true,
    bounce: true,
    bounceRange: 160,
    bounceCount: 2,
    cameraShake: 0.18,
    vfxColor: '#9B7BFF',
    envCreate: null,
  },
  'reaction.freeze': {
    id: 'reaction.freeze',
    name: '冻结',
    inputs: ['WATER', 'ICE'],
    output: 'FROZEN',
    damage: 12,
    duration: 2.2,
    chainable: true,
    freeze: true,
    cameraShake: 0.12,
    vfxColor: '#A8D4E8',
    envCreate: { type: 'ICE', duration: 4.0, fromWater: true },
  },
  'reaction.fire_vortex': {
    id: 'reaction.fire_vortex',
    name: '火旋风',
    inputs: ['FIRE', 'WIND'],
    output: 'FIRE_FIELD',
    damage: 10,
    duration: 3.5,
    chainable: true,
    cameraShake: 0.2,
    vfxColor: '#FF8A4A',
    envCreate: { type: 'FIRE_FIELD', duration: 3.5 },
    tickDamage: 8,
  },
  'reaction.steam': {
    id: 'reaction.steam',
    name: '蒸汽',
    inputs: ['FIRE', 'WATER'],
    output: 'STEAM',
    damage: 8,
    duration: 3.0,
    chainable: true,
    cameraShake: 0.1,
    vfxColor: '#D0E8E0',
    envCreate: { type: 'STEAM', duration: 3.0 },
  },
  'reaction.melt_crack': {
    id: 'reaction.melt_crack',
    name: '融裂',
    inputs: ['FIRE', 'ICE'],
    output: 'MELT',
    damage: 22,
    duration: 0,
    chainable: true,
    cameraShake: 0.22,
    vfxColor: '#FFB347',
    envCreate: { type: 'STEAM', duration: 2.5 },
    splash: 70,
  },
  'reaction.storm': {
    id: 'reaction.storm',
    name: '雷暴',
    inputs: ['LIGHTNING', 'WIND'],
    output: 'STORM',
    damage: 16,
    duration: 3.0,
    chainable: true,
    cameraShake: 0.28,
    vfxColor: '#C4B5FF',
    envCreate: { type: 'STORM', duration: 3.0 },
    tickDamage: 14,
  },
};

/** 无序组合键 → 反应 */
export function reactionKey(a, b) {
  return [a, b].sort().join('+');
}

export const REACTION_DB = (() => {
  const db = new Map();
  for (const r of Object.values(REACTIONS)) {
    db.set(reactionKey(r.inputs[0], r.inputs[1]), r);
  }
  return db;
})();

/** MapConfig — 镜水涧 */
export const MAP = {
  id: 'map.mirror_stream',
  name: '镜水涧',
  baseHp: 20,
  startingGold: 320,
  width: 1080,
  height: 1920,
  /** S 形路线：入口偏右上 → 中部过浅水 → 底部灵种 */
  path: [
    { x: 720, y: 220 },
    { x: 720, y: 320 },
    { x: 560, y: 400 },
    { x: 400, y: 480 },
    { x: 340, y: 560 },
    { x: 360, y: 640 },
    { x: 480, y: 720 },
    { x: 640, y: 800 },
    { x: 680, y: 880 },
    { x: 600, y: 980 },
    { x: 450, y: 1080 },
    { x: 380, y: 1160 },
    { x: 420, y: 1260 },
    { x: 540, y: 1380 },
    { x: 540, y: 1440 },
  ],
  base: { x: 540, y: 1480 },
  entry: { x: 720, y: 200 },
  /** 固定塔位 + 邻接（对应技术文档 §6） */
  slots: [
    { id: 'S1', x: 220, y: 360, neighborIds: ['S2', 'S3'] },
    { id: 'S2', x: 820, y: 360, neighborIds: ['S1', 'S4'] },
    { id: 'S3', x: 180, y: 560, neighborIds: ['S1', 'S5'] },
    { id: 'S4', x: 860, y: 560, neighborIds: ['S2', 'S5', 'S6'] },
    { id: 'S5', x: 260, y: 780, neighborIds: ['S3', 'S4', 'S6', 'S7'] },
    { id: 'S6', x: 860, y: 800, neighborIds: ['S4', 'S5', 'S8'] },
    { id: 'S7', x: 180, y: 1020, neighborIds: ['S5', 'S9'] },
    { id: 'S8', x: 860, y: 1040, neighborIds: ['S6', 'S10'] },
    { id: 'S9', x: 260, y: 1240, neighborIds: ['S7', 'S10'] },
    { id: 'S10', x: 820, y: 1260, neighborIds: ['S8', 'S9'] },
  ],
  /** 天然水域（persistent） */
  waterZones: [
    { id: 'w1', type: 'NATURAL_WATER', x: 360, y: 500, w: 320, h: 70, persistent: true },
    { id: 'w2', type: 'NATURAL_WATER', x: 300, y: 1060, w: 260, h: 90, persistent: true },
  ],
};

/** WaveConfig — 8 波 + Boss */
export const WAVES = [
  { id: 1, entries: [{ enemyId: 'enemy.ink_blob', count: 8, spawnInterval: 0.85 }] },
  {
    id: 2,
    entries: [
      { enemyId: 'enemy.ink_blob', count: 10, spawnInterval: 0.7 },
      { enemyId: 'enemy.ink_hound', count: 3, spawnInterval: 1.2, delay: 4.0 },
    ],
  },
  {
    id: 3,
    entries: [
      { enemyId: 'enemy.ink_blob', count: 6, spawnInterval: 0.8 },
      { enemyId: 'enemy.ink_hound', count: 5, spawnInterval: 0.6, delay: 2.0 },
      { enemyId: 'enemy.ink_shell', count: 2, spawnInterval: 2.0, delay: 6.0 },
    ],
  },
  {
    id: 4,
    entries: [
      { enemyId: 'enemy.ink_worm', count: 12, spawnInterval: 0.35 },
      { enemyId: 'enemy.ink_blob', count: 4, spawnInterval: 1.0, delay: 3.0 },
    ],
  },
  {
    id: 5,
    entries: [
      { enemyId: 'enemy.ink_shell', count: 6, spawnInterval: 1.4 },
      { enemyId: 'enemy.ink_blob', count: 8, spawnInterval: 0.55, delay: 1.5 },
    ],
  },
  {
    id: 6,
    entries: [
      { enemyId: 'enemy.ink_blob', count: 8, spawnInterval: 0.5 },
      { enemyId: 'enemy.ink_hound', count: 6, spawnInterval: 0.55, delay: 2.0 },
      { enemyId: 'enemy.ink_shell', count: 3, spawnInterval: 1.8, delay: 5.0 },
      { enemyId: 'enemy.ink_worm', count: 8, spawnInterval: 0.3, delay: 8.0 },
    ],
  },
  {
    id: 7,
    entries: [
      { enemyId: 'enemy.ink_worm', count: 16, spawnInterval: 0.28 },
      { enemyId: 'enemy.ink_hound', count: 8, spawnInterval: 0.5, delay: 2.5 },
      { enemyId: 'enemy.ink_shell', count: 2, spawnInterval: 2.2, delay: 7.0 },
    ],
  },
  {
    id: 8,
    isBossWave: true,
    entries: [
      { enemyId: 'enemy.ink_tiger', count: 1, spawnInterval: 1.0 },
      { enemyId: 'enemy.ink_blob', count: 6, spawnInterval: 1.2, delay: 3.0 },
    ],
  },
];

export const LEVEL = {
  id: 'level.mirror_stream',
  mapId: 'map.mirror_stream',
  availableSpirits: SPIRIT_ORDER.slice(),
  startingGold: MAP.startingGold,
  baseHp: MAP.baseHp,
};

/** 连锁时间窗口（秒） */
export const CHAIN_WINDOW = 2.2;
export const CHAIN_NAMES = {
  1: '反应',
  2: '强化连锁',
  3: '高级连锁',
  4: '山海异象',
};
