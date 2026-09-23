/** 全局配置 — 对应 js/data.js / godot/data_registry.gd */

export const ELEMENTS = {
  FIRE: { id: 'FIRE', name: '炎', color: '#E85D3A', glow: '#FFB347' },
  WATER: { id: 'WATER', name: '沧', color: '#3BA7C4', glow: '#7FD4E8' },
  LIGHTNING: { id: 'LIGHTNING', name: '霆', color: '#7B5CFF', glow: '#C4B5FF' },
  WIND: { id: 'WIND', name: '岚', color: '#5CB88A', glow: '#A8E6C3' },
  ICE: { id: 'ICE', name: '霜', color: '#A8D4E8', glow: '#E0F2FF' },
} as const;

export type ElementId = keyof typeof ELEMENTS;
export const ELEMENT_LIST: ElementId[] = ['FIRE', 'WATER', 'LIGHTNING', 'WIND', 'ICE'];

export interface SpiritConfig {
  id: string;
  name: string;
  element: ElementId;
  cost: number;
  range: number;
  attackInterval: number;
  damage: number;
  attackType: 'projectile' | 'beam' | 'pulse';
  splash?: number;
  status: string;
  statusDuration: number;
  projectileSpeed: number;
  chainRange?: number;
  chainCount?: number;
  preferWet?: boolean;
  pulseRadius?: number;
  spreadEnv?: boolean;
  freezeWetFaster?: boolean;
  upgradeCost: number[];
  upgradeDamage: number[];
  desc: string;
  sprite: string;
}

export const SPIRITS: Record<string, SpiritConfig> = {
  'spirit.red_feather': {
    id: 'spirit.red_feather', name: '赤羽', element: 'FIRE',
    cost: 40, range: 220, attackInterval: 0.9, damage: 16,
    attackType: 'projectile', splash: 40, status: 'BURN', statusDuration: 2.5,
    projectileSpeed: 420, upgradeCost: [50, 90], upgradeDamage: [8, 12],
    desc: '喷吐火团，命中留下短暂燃烧',
    sprite: 'textures/characters/spirit_red_feather',
  },
  'spirit.azure_scale': {
    id: 'spirit.azure_scale', name: '沧璃', element: 'WATER',
    cost: 50, range: 230, attackInterval: 1.1, damage: 9,
    attackType: 'projectile', splash: 0, status: 'WET', statusDuration: 3.5,
    projectileSpeed: 380, upgradeCost: [55, 100], upgradeDamage: [5, 8],
    desc: '水弹使敌人潮湿并留下水迹',
    sprite: 'textures/characters/spirit_azure_scale',
  },
  'spirit.thunder_horn': {
    id: 'spirit.thunder_horn', name: '雷角', element: 'LIGHTNING',
    cost: 60, range: 240, attackInterval: 0.75, damage: 18,
    attackType: 'beam', chainRange: 140, chainCount: 2, preferWet: true,
    status: 'CHARGED', statusDuration: 1.8, projectileSpeed: 0,
    upgradeCost: [70, 120], upgradeDamage: [9, 14],
    desc: '闪电攻击，优先向潮湿目标弹射',
    sprite: 'textures/characters/spirit_thunder_horn',
  },
  'spirit.wind_fox': {
    id: 'spirit.wind_fox', name: '风狸', element: 'WIND',
    cost: 55, range: 210, attackInterval: 0.8, damage: 7,
    attackType: 'pulse', pulseRadius: 100, spreadEnv: true,
    status: 'GUSTED', statusDuration: 1.5, projectileSpeed: 0,
    upgradeCost: [55, 100], upgradeDamage: [4, 6],
    desc: '风刃并推动扩散已有元素区域',
    sprite: 'textures/characters/spirit_wind_fox',
  },
  'spirit.frost_fox': {
    id: 'spirit.frost_fox', name: '霜狐', element: 'ICE',
    cost: 55, range: 225, attackInterval: 0.9, damage: 10,
    attackType: 'projectile', splash: 0, status: 'CHILL', statusDuration: 2.8,
    freezeWetFaster: true, projectileSpeed: 400, upgradeCost: [55, 100], upgradeDamage: [5, 9],
    desc: '冰刺减速，潮湿目标更易冻结',
    sprite: 'textures/characters/spirit_frost_fox',
  },
};

export const SPIRIT_ORDER = [
  'spirit.red_feather',
  'spirit.azure_scale',
  'spirit.thunder_horn',
  'spirit.wind_fox',
  'spirit.frost_fox',
];

export interface EnemyConfig {
  id: string;
  name: string;
  maxHp: number;
  speed: number;
  reward: number;
  radius: number;
  tag: 'normal' | 'fast' | 'tank' | 'swarm' | 'boss' | 'special' | 'elite';
  isBoss?: boolean;
  stealth?: boolean;
  stealthPeriod?: number;
  crack?: boolean;
  chargeInterval?: number;
  summonInterval?: number;
  sprite: string;
}

export const ENEMIES: Record<string, EnemyConfig> = {
  'enemy.ink_blob': {
    id: 'enemy.ink_blob', name: '墨团', maxHp: 80, speed: 70, reward: 8,
    radius: 22, tag: 'normal', sprite: 'textures/enemies/enemy_ink_blob',
  },
  'enemy.ink_hound': {
    id: 'enemy.ink_hound', name: '蚀犬', maxHp: 55, speed: 110, reward: 9,
    radius: 18, tag: 'fast', sprite: 'textures/enemies/enemy_ink_hound',
  },
  'enemy.ink_shell': {
    id: 'enemy.ink_shell', name: '甲蚀', maxHp: 220, speed: 48, reward: 16,
    radius: 28, tag: 'tank', sprite: 'textures/enemies/enemy_ink_shell',
  },
  'enemy.ink_worm': {
    id: 'enemy.ink_worm', name: '吞灵虫', maxHp: 32, speed: 82, reward: 4,
    radius: 14, tag: 'swarm', sprite: 'textures/enemies/enemy_ink_worm',
  },
  'enemy.ink_tiger': {
    id: 'enemy.ink_tiger', name: '蚀山君', maxHp: 1800, speed: 38, reward: 150,
    radius: 48, tag: 'boss', isBoss: true, chargeInterval: 8, summonInterval: 12,
    sprite: 'textures/enemies/enemy_ink_tiger',
  },
  'enemy.mist_shade': {
    id: 'enemy.mist_shade', name: '雾影', maxHp: 70, speed: 75, reward: 12,
    radius: 24, tag: 'special', stealth: true, stealthPeriod: 3.5,
    sprite: 'textures/enemies/enemy_mist_shade',
  },
  'enemy.crack_shell': {
    id: 'enemy.crack_shell', name: '裂壳兽', maxHp: 140, speed: 60, reward: 14,
    radius: 28, tag: 'special', crack: true,
    sprite: 'textures/enemies/enemy_crack_shell',
  },
  'enemy.spirit_giant': {
    id: 'enemy.spirit_giant', name: '噬灵魁', maxHp: 480, speed: 42, reward: 40,
    radius: 40, tag: 'elite', sprite: 'textures/enemies/enemy_spirit_giant',
  },
};

export interface ReactionConfig {
  id: string;
  name: string;
  inputs: [ElementId, ElementId];
  output: string;
  damage: number;
  duration?: number;
  chainable: boolean;
  bounce?: boolean;
  bounceRange?: number;
  bounceCount?: number;
  freeze?: boolean;
  cameraShake?: number;
  envCreate?: { type: string; duration: number } | null;
  tickDamage?: number;
  splash?: number;
}

export function reactionKey(a: ElementId | string, b: ElementId | string): string {
  return [String(a), String(b)].sort().join('+');
}

export const REACTIONS: ReactionConfig[] = [
  {
    id: 'reaction.conduct', name: '导电', inputs: ['WATER', 'LIGHTNING'], output: 'CONDUCT',
    damage: 28, chainable: true, bounce: true, bounceRange: 160, bounceCount: 2,
    cameraShake: 0.18, envCreate: null,
  },
  {
    id: 'reaction.freeze', name: '冻结', inputs: ['WATER', 'ICE'], output: 'FROZEN',
    damage: 12, duration: 2.2, chainable: true, freeze: true, cameraShake: 0.12,
    envCreate: { type: 'ICE', duration: 4.0 },
  },
  {
    id: 'reaction.fire_vortex', name: '火旋风', inputs: ['FIRE', 'WIND'], output: 'FIRE_FIELD',
    damage: 10, duration: 3.5, chainable: true, cameraShake: 0.2,
    envCreate: { type: 'FIRE_FIELD', duration: 3.5 }, tickDamage: 8,
  },
  {
    id: 'reaction.steam', name: '蒸汽', inputs: ['FIRE', 'WATER'], output: 'STEAM',
    damage: 8, duration: 3.0, chainable: true, cameraShake: 0.1,
    envCreate: { type: 'STEAM', duration: 3.0 },
  },
  {
    id: 'reaction.melt_crack', name: '融裂', inputs: ['FIRE', 'ICE'], output: 'MELT',
    damage: 22, chainable: true, cameraShake: 0.22,
    envCreate: { type: 'STEAM', duration: 2.5 }, splash: 70,
  },
  {
    id: 'reaction.storm', name: '雷暴', inputs: ['LIGHTNING', 'WIND'], output: 'STORM',
    damage: 16, duration: 3.0, chainable: true, cameraShake: 0.28,
    envCreate: { type: 'STORM', duration: 3.0 }, tickDamage: 14,
  },
];

export const REACTION_DB = new Map<string, ReactionConfig>();
for (const r of REACTIONS) {
  REACTION_DB.set(reactionKey(r.inputs[0], r.inputs[1]), r);
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface SlotDef {
  id: string;
  x: number;
  y: number;
  neighborIds: string[];
}

export interface WaterZoneDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 镜水涧 1080×2520（9:21，与 Godot 一致） */
export const MAP = {
  id: 'map.mirror_stream',
  name: '镜水涧',
  baseHp: 20,
  startingGold: 320,
  width: 1080,
  height: 2520,
  path: [
    { x: 720, y: 220 }, { x: 740, y: 310 }, { x: 620, y: 400 }, { x: 480, y: 500 },
    { x: 360, y: 620 }, { x: 340, y: 760 }, { x: 420, y: 900 }, { x: 560, y: 1040 },
    { x: 700, y: 1180 }, { x: 760, y: 1300 }, { x: 700, y: 1460 }, { x: 580, y: 1600 },
    { x: 480, y: 1740 }, { x: 500, y: 1860 }, { x: 540, y: 1960 },
  ] as Vec2[],
  base: { x: 540, y: 2020 } as Vec2,
  entry: { x: 720, y: 220 } as Vec2,
  slots: [
    { id: 'S1', x: 500, y: 320, neighborIds: ['S2', 'S3'] },
    { id: 'S2', x: 860, y: 300, neighborIds: ['S1', 'S4'] },
    { id: 'S3', x: 250, y: 620, neighborIds: ['S1', 'S5'] },
    { id: 'S4', x: 560, y: 560, neighborIds: ['S2', 'S5', 'S6'] },
    { id: 'S5', x: 250, y: 980, neighborIds: ['S3', 'S4', 'S6', 'S7'] },
    { id: 'S6', x: 820, y: 1100, neighborIds: ['S4', 'S5', 'S8'] },
    { id: 'S7', x: 320, y: 1500, neighborIds: ['S5', 'S9'] },
    { id: 'S8', x: 760, y: 1550, neighborIds: ['S6', 'S10'] },
    { id: 'S9', x: 320, y: 1820, neighborIds: ['S7', 'S10'] },
    { id: 'S10', x: 720, y: 1860, neighborIds: ['S8', 'S9'] },
  ] as SlotDef[],
  waterZones: [
    { id: 'w1', x: 400, y: 700, w: 280, h: 90 },
    { id: 'w2', x: 640, y: 1780, w: 240, h: 100 },
  ] as WaterZoneDef[],
  background: 'textures/maps/mirror_stream_bg_v2',
};

export interface WaveEntry {
  enemyId: string;
  count: number;
  interval: number;
  delay: number;
}

export const WAVES: WaveEntry[][] = [
  [{ enemyId: 'enemy.ink_blob', count: 8, interval: 0.85, delay: 0 }],
  [
    { enemyId: 'enemy.ink_blob', count: 10, interval: 0.7, delay: 0 },
    { enemyId: 'enemy.ink_hound', count: 3, interval: 1.2, delay: 4 },
  ],
  [
    { enemyId: 'enemy.ink_blob', count: 6, interval: 0.8, delay: 0 },
    { enemyId: 'enemy.ink_hound', count: 5, interval: 0.6, delay: 2 },
    { enemyId: 'enemy.ink_shell', count: 2, interval: 2.0, delay: 6 },
  ],
  [
    { enemyId: 'enemy.ink_worm', count: 12, interval: 0.35, delay: 0 },
    { enemyId: 'enemy.ink_blob', count: 4, interval: 1.0, delay: 3 },
  ],
  [
    { enemyId: 'enemy.ink_shell', count: 6, interval: 1.4, delay: 0 },
    { enemyId: 'enemy.ink_blob', count: 8, interval: 0.55, delay: 1.5 },
    { enemyId: 'enemy.mist_shade', count: 2, interval: 2.5, delay: 4 },
    { enemyId: 'enemy.crack_shell', count: 2, interval: 3.0, delay: 7 },
  ],
  [
    { enemyId: 'enemy.ink_blob', count: 8, interval: 0.5, delay: 0 },
    { enemyId: 'enemy.ink_hound', count: 6, interval: 0.55, delay: 2 },
    { enemyId: 'enemy.ink_shell', count: 3, interval: 1.8, delay: 5 },
    { enemyId: 'enemy.ink_worm', count: 8, interval: 0.3, delay: 8 },
  ],
  [
    { enemyId: 'enemy.ink_worm', count: 16, interval: 0.28, delay: 0 },
    { enemyId: 'enemy.ink_hound', count: 8, interval: 0.5, delay: 2.5 },
    { enemyId: 'enemy.ink_shell', count: 2, interval: 2.2, delay: 7 },
    { enemyId: 'enemy.mist_shade', count: 3, interval: 1.8, delay: 3 },
    { enemyId: 'enemy.spirit_giant', count: 1, interval: 1.0, delay: 10 },
    { enemyId: 'enemy.crack_shell', count: 2, interval: 2.5, delay: 8 },
  ],
  [
    { enemyId: 'enemy.ink_tiger', count: 1, interval: 1.0, delay: 0 },
    { enemyId: 'enemy.ink_blob', count: 6, interval: 1.2, delay: 3 },
  ],
];

export const CHAIN_WINDOW = 2.2;
export const CHAIN_NAMES: Record<number, string> = {
  1: '反应',
  2: '强化连锁',
  3: '高级连锁',
  4: '山海异象',
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
