/**
 * 山海余烬 · 数据表 — 与 Godot data_registry.gd 对齐
 * 设计分辨率 1080×2520（9:21 竖屏）
 */

export const DESIGN = { width: 1080, height: 2520, ratio: '9:21' };

export enum Element { FIRE, WATER, LIGHTNING, WIND, ICE }

export const ELEMENT_META: Record<number, { name: string; color: string; glow: string }> = {
  [Element.FIRE]: { name: '炎', color: '#E85D3A', glow: '#FFB347' },
  [Element.WATER]: { name: '沧', color: '#3BA7C4', glow: '#7FD4E8' },
  [Element.LIGHTNING]: { name: '霆', color: '#7B5CFF', glow: '#C4B5FF' },
  [Element.WIND]: { name: '岚', color: '#5CB88A', glow: '#A8E6C3' },
  [Element.ICE]: { name: '霜', color: '#A8D4E8', glow: '#E0F2FF' },
};

export interface SpiritConfig {
  id: string; name: string; element: Element; cost: number;
  range: number; attackInterval: number; damage: number;
  attackType: 'projectile' | 'beam' | 'pulse';
  status?: string; statusDuration?: number;
  skill: string; skillColor: string; sprite: string; desc: string;
  upgradeCost: number[]; upgradeDamage: number[];
  splash?: number; projectileSpeed?: number; preferWet?: boolean;
  pulseRadius?: number; spreadEnv?: boolean; chainRange?: number; chainCount?: number;
}

export const SPIRITS: Record<string, SpiritConfig> = {
  'spirit.red_feather': {
    id: 'spirit.red_feather', name: '赤羽', element: Element.FIRE,
    cost: 40, range: 220, attackInterval: 0.9, damage: 16,
    attackType: 'projectile', splash: 40, status: 'BURN', statusDuration: 2.5,
    projectileSpeed: 420, skill: 'fireball', skillColor: '#FF8A4A',
    sprite: 'characters/spirit_red_feather', desc: '喷吐火团，留下短暂燃烧',
    upgradeCost: [50, 90], upgradeDamage: [8, 12],
  },
  'spirit.azure_scale': {
    id: 'spirit.azure_scale', name: '沧璃', element: Element.WATER,
    cost: 50, range: 230, attackInterval: 1.1, damage: 9,
    attackType: 'projectile', status: 'WET', statusDuration: 3.5,
    projectileSpeed: 380, skill: 'water_orb', skillColor: '#5EC4DE',
    sprite: 'characters/spirit_azure_scale', desc: '水弹使敌人潮湿并留下水迹',
    upgradeCost: [55, 100], upgradeDamage: [5, 8],
  },
  'spirit.thunder_horn': {
    id: 'spirit.thunder_horn', name: '雷角', element: Element.LIGHTNING,
    cost: 60, range: 240, attackInterval: 0.75, damage: 18,
    attackType: 'beam', preferWet: true, chainRange: 140, chainCount: 2,
    status: 'CHARGED', statusDuration: 1.8,
    skill: 'thunder_beam', skillColor: '#B39CFF',
    sprite: 'characters/spirit_thunder_horn', desc: '闪电弹射，优先潮湿目标',
    upgradeCost: [70, 120], upgradeDamage: [9, 14],
  },
  'spirit.wind_fox': {
    id: 'spirit.wind_fox', name: '风狸', element: Element.WIND,
    cost: 55, range: 210, attackInterval: 0.8, damage: 7,
    attackType: 'pulse', pulseRadius: 110, spreadEnv: true,
    status: 'GUSTED', statusDuration: 1.5,
    skill: 'wind_pulse', skillColor: '#8FD9B0',
    sprite: 'characters/spirit_wind_fox', desc: '风刃扩散已有元素区域',
    upgradeCost: [55, 100], upgradeDamage: [4, 6],
  },
  'spirit.frost_fox': {
    id: 'spirit.frost_fox', name: '霜狐', element: Element.ICE,
    cost: 55, range: 225, attackInterval: 0.9, damage: 10,
    attackType: 'projectile', status: 'CHILL', statusDuration: 2.8,
    projectileSpeed: 400, skill: 'ice_shard', skillColor: '#C9ECFF',
    sprite: 'characters/spirit_frost_fox', desc: '冰刺减速，潮湿更易冻结',
    upgradeCost: [55, 100], upgradeDamage: [5, 9],
  },
};

export const SPIRIT_ORDER = [
  'spirit.red_feather', 'spirit.azure_scale', 'spirit.thunder_horn',
  'spirit.wind_fox', 'spirit.frost_fox',
];

export interface EnemyConfig {
  id: string; name: string; maxHp: number; speed: number; reward: number;
  radius: number; tag: string; sprite: string; isBoss?: boolean;
  chargeInterval?: number; summonInterval?: number;
  stealth?: boolean; stealthPeriod?: number; crack?: boolean;
}

export const ENEMIES: Record<string, EnemyConfig> = {
  'enemy.ink_blob': { id: 'enemy.ink_blob', name: '墨团', maxHp: 80, speed: 70, reward: 8, radius: 24, tag: 'normal', sprite: 'enemies/enemy_ink_blob' },
  'enemy.ink_hound': { id: 'enemy.ink_hound', name: '蚀犬', maxHp: 55, speed: 110, reward: 9, radius: 20, tag: 'fast', sprite: 'enemies/enemy_ink_hound' },
  'enemy.ink_shell': { id: 'enemy.ink_shell', name: '甲蚀', maxHp: 220, speed: 48, reward: 16, radius: 30, tag: 'tank', sprite: 'enemies/enemy_ink_shell' },
  'enemy.ink_worm': { id: 'enemy.ink_worm', name: '吞灵虫', maxHp: 32, speed: 82, reward: 4, radius: 14, tag: 'swarm', sprite: 'enemies/enemy_ink_worm' },
  'enemy.mist_shade': { id: 'enemy.mist_shade', name: '雾影', maxHp: 70, speed: 75, reward: 12, radius: 26, tag: 'special', sprite: 'enemies/enemy_mist_shade', stealth: true, stealthPeriod: 3.5 },
  'enemy.crack_shell': { id: 'enemy.crack_shell', name: '裂壳兽', maxHp: 140, speed: 60, reward: 14, radius: 30, tag: 'special', sprite: 'enemies/enemy_crack_shell', crack: true },
  'enemy.spirit_giant': { id: 'enemy.spirit_giant', name: '噬灵魁', maxHp: 480, speed: 42, reward: 40, radius: 42, tag: 'elite', sprite: 'enemies/enemy_spirit_giant' },
  'enemy.ink_tiger': {
    id: 'enemy.ink_tiger', name: '蚀山君', maxHp: 1800, speed: 38, reward: 150,
    radius: 52, tag: 'boss', sprite: 'enemies/enemy_ink_tiger', isBoss: true,
    chargeInterval: 8, summonInterval: 12,
  },
};

export interface ReactionConfig {
  id: string; name: string; inputs: [Element, Element]; damage: number;
  duration?: number; chainable: boolean; freeze?: boolean; bounce?: boolean;
  bounceRange?: number; bounceCount?: number; splash?: number; tickDamage?: number;
  cameraShake: number; vfxColor: string;
  envCreate?: { type: string; duration: number };
}

export const REACTIONS: ReactionConfig[] = [
  { id: 'reaction.conduct', name: '导电', inputs: [Element.WATER, Element.LIGHTNING], damage: 28, chainable: true, bounce: true, bounceRange: 160, bounceCount: 2, cameraShake: 0.18, vfxColor: '#9B7BFF' },
  { id: 'reaction.freeze', name: '冻结', inputs: [Element.WATER, Element.ICE], damage: 12, duration: 2.2, chainable: true, freeze: true, cameraShake: 0.12, vfxColor: '#A8D4E8', envCreate: { type: 'ICE', duration: 4 } },
  { id: 'reaction.fire_vortex', name: '火旋风', inputs: [Element.FIRE, Element.WIND], damage: 10, duration: 3.5, chainable: true, cameraShake: 0.2, vfxColor: '#FF8A4A', envCreate: { type: 'FIRE_FIELD', duration: 3.5 }, tickDamage: 8 },
  { id: 'reaction.steam', name: '蒸汽', inputs: [Element.FIRE, Element.WATER], damage: 8, duration: 3, chainable: true, cameraShake: 0.1, vfxColor: '#D0E8E0', envCreate: { type: 'STEAM', duration: 3 } },
  { id: 'reaction.melt_crack', name: '融裂', inputs: [Element.FIRE, Element.ICE], damage: 22, chainable: true, cameraShake: 0.22, vfxColor: '#FFB347', envCreate: { type: 'STEAM', duration: 2.5 }, splash: 70 },
  { id: 'reaction.storm', name: '雷暴', inputs: [Element.LIGHTNING, Element.WIND], damage: 16, duration: 3, chainable: true, cameraShake: 0.28, vfxColor: '#C4B5FF', envCreate: { type: 'STORM', duration: 3 }, tickDamage: 14 },
];

export function reactionKey(a: Element, b: Element): string {
  const names = [ELEMENT_META[a].name, ELEMENT_META[b].name].sort();
  return names.join('+');
}

export function findReaction(a: Element, b: Element): ReactionConfig | null {
  const ea = ELEMENT_META[a].name;
  const eb = ELEMENT_META[b].name;
  const key = [ea, eb].sort().join('+');
  return REACTIONS.find(r => [ELEMENT_META[r.inputs[0]].name, ELEMENT_META[r.inputs[1]].name].sort().join('+') === key) || null;
}

/** 镜水涧 9:21：路线纵向展开 */
export const MAP = {
  id: 'map.mirror_stream',
  name: '镜水涧',
  baseHp: 20,
  startingGold: 320,
  width: 1080,
  height: 2520,
  path: [
    { x: 720, y: 220 }, { x: 740, y: 320 }, { x: 620, y: 420 }, { x: 480, y: 520 },
    { x: 360, y: 640 }, { x: 340, y: 780 }, { x: 420, y: 920 }, { x: 560, y: 1060 },
    { x: 700, y: 1200 }, { x: 760, y: 1360 }, { x: 720, y: 1520 }, { x: 600, y: 1680 },
    { x: 480, y: 1840 }, { x: 420, y: 2000 }, { x: 480, y: 2160 }, { x: 540, y: 2320 },
    { x: 540, y: 2400 },
  ],
  base: { x: 540, y: 2440 },
  entry: { x: 720, y: 220 },
  slots: [
    { id: 'S1', pos: { x: 480, y: 340 }, neighbors: ['S2', 'S3'] },
    { id: 'S2', pos: { x: 880, y: 360 }, neighbors: ['S1', 'S4'] },
    { id: 'S3', pos: { x: 240, y: 700 }, neighbors: ['S1', 'S5'] },
    { id: 'S4', pos: { x: 700, y: 760 }, neighbors: ['S2', 'S5', 'S6'] },
    { id: 'S5', pos: { x: 280, y: 1160 }, neighbors: ['S3', 'S4', 'S6', 'S7'] },
    { id: 'S6', pos: { x: 860, y: 1240 }, neighbors: ['S4', 'S5', 'S8'] },
    { id: 'S7', pos: { x: 260, y: 1640 }, neighbors: ['S5', 'S9'] },
    { id: 'S8', pos: { x: 860, y: 1700 }, neighbors: ['S6', 'S10'] },
    { id: 'S9', pos: { x: 300, y: 2060 }, neighbors: ['S7', 'S10'] },
    { id: 'S10', pos: { x: 760, y: 2120 }, neighbors: ['S8', 'S9'] },
  ],
  waterZones: [
    { id: 'w1', pos: { x: 400, y: 700 }, size: { x: 280, y: 90 } },
    { id: 'w2', pos: { x: 640, y: 1780 }, size: { x: 240, y: 100 } },
  ],
};

export const WAVES: Array<Array<{ enemyId: string; count: number; interval: number; delay?: number }>> = [
  [{ enemyId: 'enemy.ink_blob', count: 8, interval: 0.85 }],
  [
    { enemyId: 'enemy.ink_blob', count: 10, interval: 0.7 },
    { enemyId: 'enemy.ink_hound', count: 3, interval: 1.2, delay: 4 },
  ],
  [
    { enemyId: 'enemy.ink_blob', count: 6, interval: 0.8 },
    { enemyId: 'enemy.ink_hound', count: 5, interval: 0.6, delay: 2 },
    { enemyId: 'enemy.ink_shell', count: 2, interval: 2, delay: 6 },
  ],
  [
    { enemyId: 'enemy.ink_worm', count: 12, interval: 0.35 },
    { enemyId: 'enemy.ink_blob', count: 4, interval: 1, delay: 3 },
  ],
  [
    { enemyId: 'enemy.ink_shell', count: 6, interval: 1.4 },
    { enemyId: 'enemy.ink_blob', count: 8, interval: 0.55, delay: 1.5 },
    { enemyId: 'enemy.mist_shade', count: 2, interval: 2.5, delay: 4 },
  ],
  [
    { enemyId: 'enemy.ink_blob', count: 8, interval: 0.5 },
    { enemyId: 'enemy.ink_hound', count: 6, interval: 0.55, delay: 2 },
    { enemyId: 'enemy.ink_shell', count: 3, interval: 1.8, delay: 5 },
    { enemyId: 'enemy.crack_shell', count: 2, interval: 3, delay: 7 },
  ],
  [
    { enemyId: 'enemy.ink_worm', count: 16, interval: 0.28 },
    { enemyId: 'enemy.ink_hound', count: 8, interval: 0.5, delay: 2.5 },
    { enemyId: 'enemy.spirit_giant', count: 1, interval: 1, delay: 10 },
    { enemyId: 'enemy.mist_shade', count: 3, interval: 1.8, delay: 3 },
  ],
  [
    { enemyId: 'enemy.ink_tiger', count: 1, interval: 1 },
    { enemyId: 'enemy.ink_blob', count: 6, interval: 1.2, delay: 3 },
  ],
];

export const CHAIN_WINDOW = 2.2;
export const BASE_GAP = 108;
