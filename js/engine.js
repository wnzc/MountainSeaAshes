/* 山海余烬 · 镜水涧 Demo · 核心引擎
 * 数据驱动 + 事件解耦 + 组件式实体，结构对齐 Godot 技术文档。
 */
import {
  ELEMENTS,
  SPIRITS,
  ENEMIES,
  REACTIONS,
  REACTION_DB,
  reactionKey,
  MAP,
  WAVES,
  LEVEL,
  CHAIN_WINDOW,
  CHAIN_NAMES,
  SPIRIT_ORDER,
} from './data.js';
import { bus } from './eventBus.js';

// ─── 工具 ───────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const now = () => performance.now() / 1000;

function pointOnPath(path, t) {
  // t in [0,1] along polyline
  const segs = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = dist(path[i], path[i + 1]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const local = segs[i] === 0 ? 0 : target / segs[i];
      const a = path[i];
      const b = path[i + 1];
      return {
        x: lerp(a.x, b.x, clamp(local, 0, 1)),
        y: lerp(a.y, b.y, clamp(local, 0, 1)),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    target -= segs[i];
  }
  const last = path[path.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

function pathLength(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += dist(path[i], path[i + 1]);
  return total;
}

// ─── 音效（Web Audio 简易合成） ─────────────────────────
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.enabled = false;
      }
    }
    this.ctx?.resume?.();
  }

  tone(freq, dur = 0.08, type = 'sine', vol = 0.08, slide = 0) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.15, vol = 0.05) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.ctx.destination);
    src.start(t);
  }

  play(id) {
    switch (id) {
      case 'place':
        this.tone(440, 0.1, 'triangle', 0.07, 120);
        break;
      case 'upgrade':
        this.tone(520, 0.08, 'square', 0.05, 200);
        this.tone(780, 0.1, 'square', 0.04, 100);
        break;
      case 'hit':
        this.tone(180, 0.05, 'square', 0.03, -40);
        break;
      case 'coin':
        this.tone(880, 0.06, 'sine', 0.05, 200);
        break;
      case 'die':
        this.noise(0.18, 0.05);
        this.tone(120, 0.15, 'sawtooth', 0.03, -60);
        break;
      case 'base_hit':
        this.tone(90, 0.2, 'sawtooth', 0.06, -30);
        break;
      case 'chain2':
        this.tone(520, 0.1, 'triangle', 0.06, 150);
        this.tone(660, 0.12, 'triangle', 0.05, 100);
        break;
      case 'chain3':
        this.tone(440, 0.12, 'sawtooth', 0.06, 300);
        this.tone(660, 0.15, 'sawtooth', 0.05, 200);
        this.tone(880, 0.18, 'sawtooth', 0.05, 100);
        break;
      case 'chain4':
        this.tone(220, 0.15, 'sawtooth', 0.07, 660);
        setTimeout(() => this.tone(440, 0.25, 'sawtooth', 0.08, 440), 80);
        setTimeout(() => {
          this.noise(0.3, 0.08);
          this.tone(880, 0.35, 'triangle', 0.08, -200);
        }, 160);
        break;
      case 'reaction':
        this.tone(600, 0.08, 'triangle', 0.045, 120);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.06), i * 120));
        break;
      case 'lose':
        [400, 350, 300, 220].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.05), i * 150));
        break;
      case 'wave':
        this.tone(330, 0.15, 'square', 0.04, 80);
        break;
      default:
        break;
    }
  }
}

export const audio = new AudioManager();

// ─── 实体 ───────────────────────────────────────────────
let uid = 1;
const nextId = () => uid++;

class Enemy {
  constructor(config, pathLen) {
    this.id = nextId();
    this.config = config;
    this.name = config.name;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.speed = config.speed;
    this.reward = config.reward;
    this.radius = config.radius;
    this.isBoss = !!config.isBoss;
    this.progress = 0; // 0..1 along path
    this.pathLen = pathLen;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.alive = true;
    this.reached = false;
    this.frozenUntil = 0;
    this.slowUntil = 0;
    this.slowFactor = 1;
    this.element = null; // main reactive element
    this.elementUntil = 0;
    this.burnUntil = 0;
    this.burnTick = 0;
    this.shellBroken = false;
    this.stealthUntil = 0;
    this.flash = 0;
    this.wobble = Math.random() * TAU;
  }

  get frozen() {
    return now() < this.frozenUntil;
  }

  get slowed() {
    return now() < this.slowUntil;
  }

  applyStatus(kind, duration) {
    const t = now();
    if (kind === 'FREEZE' || kind === 'FROZEN') {
      this.frozenUntil = Math.max(this.frozenUntil, t + duration);
    } else if (kind === 'CHILL' || kind === 'SLOW') {
      this.slowUntil = t + duration;
      this.slowFactor = 0.55;
    } else if (kind === 'BURN') {
      this.burnUntil = t + duration;
      this.burnTick = 0;
    }
  }

  applyElement(element, duration) {
    this.element = element;
    this.elementUntil = now() + duration;
  }

  damage(amount) {
    if (!this.alive || this._killed) return false;
    let dmg = amount;
    if (this.config.tags?.includes('tank') && !this.shellBroken) dmg *= 0.65;
    this.hp -= dmg;
    this.flash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }
}

class Projectile {
  constructor(opts) {
    Object.assign(this, opts);
    this.id = nextId();
    this.alive = true;
  }
}

class EnvironmentZone {
  constructor(opts) {
    Object.assign(this, opts);
    this.id = nextId();
    this.createdAt = now();
    this.expiresAt = opts.persistent ? Infinity : now() + (opts.duration || 3);
    this.tickTimer = 0;
  }

  get alive() {
    return now() < this.expiresAt;
  }
}

class FloatingText {
  constructor(x, y, text, color = '#fff', size = 22) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.9;
    this.vy = -40;
    this.alive = true;
  }
}

class Particle {
  constructor(x, y, vx, vy, color, life = 0.5, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.alive = true;
  }
}

class Vfx {
  constructor(opts) {
    Object.assign(this, opts);
    this.id = nextId();
    this.t = 0;
    this.life = opts.life || 0.5;
    this.alive = true;
  }
}

// ─── 主游戏 ─────────────────────────────────────────────
export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = MAP.width;
    this.H = MAP.height;
    canvas.width = this.W;
    canvas.height = this.H;

    this.pathLen = pathLength(MAP.path);
    this.slots = new Map();
    this.reset();

    this.speed = 1;
    this.paused = false;
    this.state = 'ready'; // ready | playing | victory | defeat
    this.selectedCard = null; // spirit id being placed
    this.selectedSlot = null; // inspected slot id
    this.time = 0;
    this.shakeTrauma = 0;
    this.shakeT = 0;
    this.camOffset = { x: 0, y: 0 };
    this.slowmoUntil = 0;
    this.banner = null; // { text, sub, color, life, big }
    this.spiritsAvailable = LEVEL.availableSpirits.slice();
    this.uiCallbacks = {};

    // 背景图（覆盖裁切适配 21:9+）
    this.bgImage = null;
    if (MAP.background) {
      const img = new Image();
      img.src = MAP.background;
      img.onload = () => {
        this.bgImage = img;
      };
    }

    // bound loop
    this._last = 0;
    this._raf = 0;
  }

  reset() {
    this.enemies = [];
    this.projectiles = [];
    this.zones = [];
    this.particles = [];
    this.texts = [];
    this.vfxs = [];
    this.spirits = []; // placed spirits
    this.gold = LEVEL.startingGold;
    this.baseHp = LEVEL.baseHp;
    this.maxBaseHp = LEVEL.baseHp;
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.spawnQueues = [];
    this.betweenWaves = true;
    this.waveDelay = 2.5;
    this.chain = null;
    this.chainId = 0;
    this.totalKills = 0;
    this.boss = null;
    this.bossChargeCd = 0;
    this.bossSummonCd = 0;

    this.slots.clear();
    for (const s of MAP.slots) {
      this.slots.set(s.id, {
        id: s.id,
        x: s.x,
        y: s.y,
        neighborIds: s.neighborIds.slice(),
        spirit: null,
      });
    }

    // natural water
    this.zones = MAP.waterZones.map(
      (w) =>
        new EnvironmentZone({
          type: 'NATURAL_WATER',
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          persistent: true,
          duration: 0,
          element: 'WATER',
        })
    );
  }

  start() {
    this.reset();
    this.state = 'playing';
    this.waveIndex = 0;
    this.betweenWaves = true;
    this.waveDelay = 2.0;
    audio.unlock();
    bus.emit('gold_changed', this.gold);
    bus.emit('base_damaged', 0);
    bus.emit('wave_started', 0);
  }

  // ── 放置 / 升级 ──────────────────────────────────────
  canAfford(spiritId) {
    const cfg = SPIRITS[spiritId];
    return this.gold >= cfg.cost;
  }

  placeSpirit(slotId, spiritId) {
    const slot = this.slots.get(slotId);
    const cfg = SPIRITS[spiritId];
    if (!slot || !cfg || slot.spirit) return false;
    if (this.gold < cfg.cost) return false;

    this.gold -= cfg.cost;
    const spirit = {
      id: nextId(),
      configId: spiritId,
      config: cfg,
      name: cfg.name,
      element: cfg.element,
      level: 1,
      x: slot.x,
      y: slot.y,
      slotId,
      cd: 0,
      range: cfg.range,
      damage: cfg.baseDamage,
      alive: true,
      flash: 0,
      resonanceBonus: 1,
    };
    slot.spirit = spirit;
    this.spirits.push(spirit);
    this.rebuildResonance(slotId);
    audio.play('place');
    this.spawnVfx(slot.x, slot.y, 'place', ELEMENTS[cfg.element].color);
    bus.emit('gold_changed', this.gold);
    bus.emit('spirit_placed', spirit, slotId);
    return true;
  }

  getUpgradeCost(spirit) {
    const costs = spirit.config.upgradeCost;
    if (spirit.level >= 3) return null;
    return costs[spirit.level - 1];
  }

  upgradeSpirit(slotId) {
    const slot = this.slots.get(slotId);
    if (!slot?.spirit) return false;
    const spirit = slot.spirit;
    const cost = this.getUpgradeCost(spirit);
    if (cost == null || this.gold < cost) return false;
    this.gold -= cost;
    spirit.level += 1;
    spirit.damage += spirit.config.upgradeDamage[spirit.level - 2] || 0;
    spirit.range += 15;
    spirit.flash = 0.3;
    audio.play('upgrade');
    this.spawnVfx(spirit.x, spirit.y, 'upgrade', ELEMENTS[spirit.element].color);
    bus.emit('gold_changed', this.gold);
    bus.emit('spirit_upgraded', spirit);
    return true;
  }

  sellSpirit(slotId) {
    const slot = this.slots.get(slotId);
    if (!slot?.spirit) return false;
    const spirit = slot.spirit;
    const refund = Math.floor(spirit.config.cost * 0.5) + (spirit.level - 1) * 20;
    this.gold += refund;
    slot.spirit = null;
    this.spirits = this.spirits.filter((s) => s.id !== spirit.id);
    this.rebuildResonance(slotId);
    for (const nid of slot.neighborIds) this.rebuildResonance(nid);
    audio.play('coin');
    bus.emit('gold_changed', this.gold);
    return true;
  }

  /** 相邻不同元素 → 状态持续时间加成（共鸣） */
  rebuildResonance(slotId) {
    const slot = this.slots.get(slotId);
    if (!slot?.spirit) return;
    let bonus = 1;
    for (const nid of slot.neighborIds) {
      const other = this.slots.get(nid);
      if (other?.spirit && other.spirit.element !== slot.spirit.element) {
        bonus += 0.2;
      }
    }
    slot.spirit.resonanceBonus = Math.min(bonus, 1.8);
    for (const nid of slot.neighborIds) {
      const other = this.slots.get(nid);
      if (other?.spirit) {
        let b = 1;
        for (const nid2 of other.neighborIds) {
          const o2 = this.slots.get(nid2);
          if (o2?.spirit && o2.spirit.element !== other.spirit.element) b += 0.2;
        }
        other.spirit.resonanceBonus = Math.min(b, 1.8);
      }
    }
  }

  getResonanceLinks() {
    const links = [];
    for (const slot of this.slots.values()) {
      if (!slot.spirit) continue;
      for (const nid of slot.neighborIds) {
        const other = this.slots.get(nid);
        if (other?.spirit && slot.id < other.id) {
          if (other.spirit.element !== slot.spirit.element) {
            links.push({ a: slot, b: other });
          }
        }
      }
    }
    return links;
  }

  // ── 波次 ─────────────────────────────────────────────
  startNextWave() {
    if (this.waveIndex >= WAVES.length) return;
    const wave = WAVES[this.waveIndex];
    this.betweenWaves = false;
    this.spawnQueues = wave.entries.map((e) => ({
      enemyId: e.enemyId,
      remaining: e.count,
      interval: e.spawnInterval,
      timer: e.delay || 0,
    }));
    bus.emit('wave_started', this.waveIndex + 1);
    audio.play('wave');
  }

  updateWaves(dt) {
    if (this.betweenWaves) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this.startNextWave();
      return;
    }

    for (const q of this.spawnQueues) {
      q.timer -= dt;
      while (q.remaining > 0 && q.timer <= 0) {
        this.spawnEnemy(q.enemyId);
        q.remaining -= 1;
        q.timer += q.interval;
      }
    }

    const pending = this.spawnQueues.some((q) => q.remaining > 0);
    if (!pending && this.enemies.every((e) => !e.alive || e.reached)) {
      // wave complete
      this.waveIndex += 1;
      bus.emit('wave_completed', this.waveIndex);
      if (this.waveIndex >= WAVES.length) {
        this.finish(true);
      } else {
        this.betweenWaves = true;
        this.waveDelay = 3.0;
        // wave clear bonus
        this.gold += 20 + this.waveIndex * 5;
        bus.emit('gold_changed', this.gold);
      }
    }
  }

  spawnEnemy(enemyId) {
    const cfg = ENEMIES[enemyId];
    if (!cfg) return;
    const e = new Enemy(cfg, this.pathLen);
    const p = pointOnPath(MAP.path, 0);
    e.x = p.x;
    e.y = p.y;
    e.angle = p.angle;
    this.enemies.push(e);
    if (cfg.isBoss) this.boss = e;
    bus.emit('enemy_spawned', e);
  }

  // ── 攻击 / 元素 / 反应 ───────────────────────────────
  findTarget(spirit) {
    const preferWet = spirit.config.preferWet;
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.enemies) {
      if (!e.alive || e.reached) continue;
      const d = dist(spirit, e);
      if (d > spirit.range + e.radius) continue;
      // prefer further along path + wet bonus
      let score = e.progress * 1000;
      if (preferWet && e.element === 'WATER') score += 500;
      if (e.element) score += 50;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  updateSpirits(dt) {
    for (const spirit of this.spirits) {
      spirit.cd -= dt;
      spirit.flash = Math.max(0, spirit.flash - dt);
      if (spirit.cd > 0) continue;
      const target = this.findTarget(spirit);
      if (!target) continue;
      spirit.cd = spirit.config.attackInterval;
      this.spiritAttack(spirit, target);
    }
  }

  spiritAttack(spirit, target) {
    const el = ELEMENTS[spirit.element];
    const cfg = spirit.config;
    spirit.flash = 0.15;

    if (cfg.attackType === 'projectile') {
      this.projectiles.push(
        new Projectile({
          x: spirit.x,
          y: spirit.y,
          target,
          speed: cfg.projectileSpeed,
          damage: spirit.damage,
          element: spirit.element,
          status: cfg.status,
          statusDuration: (cfg.statusDuration || 2) * spirit.resonanceBonus,
          splash: cfg.splash || 0,
          sourceId: spirit.id,
          color: el.color,
          radius: 7,
          chainContext: null,
        })
      );
    } else if (cfg.attackType === 'beam') {
      this.beamAttack(spirit, target);
    } else if (cfg.attackType === 'pulse') {
      this.pulseAttack(spirit, target);
    }
    audio.play('hit');
  }

  beamAttack(spirit, target) {
    const hits = [target];
    let current = target;
    const maxBounce = spirit.config.chainCount || 2;
    for (let i = 0; i < maxBounce; i++) {
      let next = null;
      let bestD = spirit.config.chainRange || 140;
      for (const e of this.enemies) {
        if (!e.alive || e.reached || hits.includes(e)) continue;
        const d = dist(current, e);
        if (d < bestD) {
          // prefer wet
          const bonus = e.element === 'WATER' ? -40 : 0;
          if (d + bonus < bestD) {
            bestD = d;
            next = e;
          }
        }
      }
      if (!next) break;
      hits.push(next);
      current = next;
    }

    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const dmg = spirit.damage * (i === 0 ? 1 : 0.65);
      this.applyHit(e, dmg, spirit.element, spirit.config.status, spirit.config.statusDuration * spirit.resonanceBonus, spirit);
      this.vfxs.push(
        new Vfx({
          type: 'beam',
          x: i === 0 ? spirit.x : hits[i - 1].x,
          y: i === 0 ? spirit.y : hits[i - 1].y,
          x2: e.x,
          y2: e.y,
          color: ELEMENTS[spirit.element].color,
          life: 0.18,
        })
      );
    }
  }

  pulseAttack(spirit) {
    const r = spirit.config.pulseRadius || 100;
    this.vfxs.push(
      new Vfx({
        type: 'pulse',
        x: spirit.x,
        y: spirit.y,
        r,
        color: ELEMENTS[spirit.element].color,
        life: 0.35,
      })
    );
    for (const e of this.enemies) {
      if (!e.alive || e.reached) continue;
      if (dist(spirit, e) <= r + e.radius) {
        this.applyHit(e, spirit.damage, spirit.element, spirit.config.status, spirit.config.statusDuration * spirit.resonanceBonus, spirit);
      }
    }
    // 风：扩散环境 — 延长附近非天然区域
    if (spirit.config.spreadEnv) {
      for (const z of this.zones) {
        if (z.persistent) continue;
        if (dist(spirit, z) < r + 80) {
          z.expiresAt = Math.max(z.expiresAt, now() + 1.2);
        }
      }
    }
  }

  applyHit(enemy, damage, element, status, statusDuration, source) {
    if (!enemy.alive || enemy._killed) return;
    const died = enemy.damage(damage);
    this.texts.push(new FloatingText(enemy.x + (Math.random() * 20 - 10), enemy.y - 20, `${Math.round(damage)}`, ELEMENTS[element]?.color || '#fff', 18));
    this.burst(enemy.x, enemy.y, ELEMENTS[element]?.color || '#fff', 5);

    if (died) {
      this.killEnemy(enemy);
      return;
    }

    if (status === 'BURN') enemy.applyStatus('BURN', statusDuration);
    if (status === 'CHILL') enemy.applyStatus('CHILL', statusDuration);

    // 元素附着 → 询问 ReactionSystem
    this.applyElement(enemy, element, statusDuration, source);
  }

  /** ReactionSystem.apply_element */
  applyElement(target, incomingElement, duration, source) {
    const existing = target.element && now() < target.elementUntil ? target.element : null;
    if (existing && existing !== incomingElement) {
      const reaction = REACTION_DB.get(reactionKey(existing, incomingElement));
      if (reaction) {
        this.executeReaction(target, reaction, incomingElement, source);
        return;
      }
    }
    // 无反应：覆盖/刷新
    target.applyElement(incomingElement, duration);
    bus.emit('element_applied', target, incomingElement);
  }

  executeReaction(target, reaction, incomingElement, source) {
    const pos = { x: target.x, y: target.y };
    const ctx = this.nextReactionContext(source);
    target.element = null;
    target.elementUntil = 0;

    // 基础伤害
    const dmg = reaction.damage * (1 + (ctx.chainLevel - 1) * 0.25);
    const died = target.damage(dmg);
    this.texts.push(new FloatingText(pos.x, pos.y - 30, reaction.name, reaction.vfxColor, 24));
    this.burst(pos.x, pos.y, reaction.vfxColor, 14);

    // 反应特效
    this.vfxs.push(
      new Vfx({
        type: 'reaction',
        x: pos.x,
        y: pos.y,
        color: reaction.vfxColor,
        name: reaction.name,
        life: 0.55,
        radius: reaction.splash || 50,
      })
    );

    // 特殊
    if (reaction.freeze) {
      target.applyStatus('FREEZE', reaction.duration);
    }
    if (reaction.bounce) {
      this.chainLightning(target, reaction, ctx);
    }
    if (reaction.splash) {
      for (const e of this.enemies) {
        if (e === target || !e.alive) continue;
        if (dist(pos, e) < reaction.splash + e.radius) {
          e.damage(reaction.damage * 0.5);
          this.burst(e.x, e.y, reaction.vfxColor, 6);
        }
      }
    }

    // 环境产物
    if (reaction.envCreate) {
      this.spawnEnvironment(pos, reaction.envCreate, ctx);
    }

    // 冻结：水域 → 冰面
    if (reaction.freeze) {
      for (const z of this.zones) {
        if (z.type === 'NATURAL_WATER' || z.type === 'PUDDLE') {
          if (this.pointInZone(pos, z)) {
            if (!z.persistent) {
              z.type = 'ICE';
              z.element = 'ICE';
              z.expiresAt = now() + 5;
            } else {
              // 天然水域上叠冰面标记
              z.icedUntil = now() + 4;
            }
          }
        }
      }
    }

    if (died) this.killEnemy(target);

    audio.play('reaction');
    this.addTrauma(reaction.cameraShake || 0.15);
    bus.emit('reaction_triggered', reaction.id, pos, ctx);

    // 连锁推进
    this.advanceChain(ctx, reaction);
  }

  chainLightning(fromEnemy, reaction, ctx) {
    const range = reaction.bounceRange || 160;
    const max = reaction.bounceCount || 2;
    let current = fromEnemy;
    const hit = new Set([fromEnemy.id]);
    for (let i = 0; i < max; i++) {
      let next = null;
      let best = range;
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e.id)) continue;
        const d = dist(current, e);
        const prefer = e.element === 'WATER' || e === fromEnemy ? d - 50 : d;
        if (prefer < best) {
          best = prefer;
          next = e;
        }
      }
      if (!next) break;
      hit.add(next.id);
      const dmg = reaction.damage * 0.7;
      const died = next.damage(dmg);
      this.vfxs.push(
        new Vfx({
          type: 'beam',
          x: current.x,
          y: current.y,
          x2: next.x,
          y2: next.y,
          color: '#9B7BFF',
          life: 0.2,
        })
      );
      this.burst(next.x, next.y, '#C4B5FF', 8);
      this.texts.push(new FloatingText(next.x, next.y - 20, '导电', '#C4B5FF', 16));
      if (died) this.killEnemy(next);
      current = next;
    }
  }

  spawnEnvironment(pos, spec, ctx) {
    const size = spec.type === 'FIRE_FIELD' || spec.type === 'STORM' ? 90 : 70;
    // 合并重叠同类型
    for (const z of this.zones) {
      if (z.persistent) continue;
      if (z.type === spec.type && dist(pos, z) < size) {
        z.expiresAt = now() + spec.duration * (1 + (ctx.chainLevel - 1) * 0.15);
        return;
      }
    }
    this.zones.push(
      new EnvironmentZone({
        type: spec.type,
        x: pos.x,
        y: pos.y,
        w: size,
        h: size * 0.55,
        duration: spec.duration * (1 + (ctx.chainLevel - 1) * 0.15),
        element: spec.type === 'FIRE_FIELD' ? 'FIRE' : spec.type === 'STEAM' ? 'WATER' : spec.type === 'ICE' ? 'ICE' : 'LIGHTNING',
        tickDamage: spec.tickDamage || reactionTick(spec.type),
        chainContext: ctx,
      })
    );
    // 软上限
    const dyn = this.zones.filter((z) => !z.persistent);
    if (dyn.length > 12) {
      const oldest = dyn.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
      this.zones = this.zones.filter((z) => z !== oldest);
    }
  }

  pointInZone(p, z) {
    return p.x >= z.x - z.w / 2 && p.x <= z.x + z.w / 2 && p.y >= z.y - z.h / 2 && p.y <= z.y + z.h / 2;
  }

  // ── 连锁 ─────────────────────────────────────────────
  nextReactionContext(source) {
    const t = now();
    if (this.chain && t - this.chain.lastReactionAt < CHAIN_WINDOW) {
      // 续链
      this.chain.lastReactionAt = t;
      this.chain.chainLevel += 1;
      return this.chain;
    }
    // 新链
    this.chainId += 1;
    this.chain = {
      chain_id: this.chainId,
      chainLevel: 1,
      started_at: t,
      lastReactionAt: t,
      visited_reactions: [],
      source_spirit_ids: source ? [source.id] : [],
    };
    return this.chain;
  }

  advanceChain(ctx, reaction) {
    ctx.visited_reactions.push(reaction.id);
    const level = ctx.chainLevel;
    bus.emit('chain_reached', level, ctx);

    if (level === 2) {
      audio.play('chain2');
      this.banner = { text: '×2  强化连锁', sub: reaction.name, color: '#FFD27A', life: 1.1, big: false };
      this.addTrauma(0.12);
    } else if (level === 3) {
      audio.play('chain3');
      this.banner = { text: '×3  高级连锁', sub: reaction.name, color: '#FF9B6A', life: 1.4, big: true };
      this.addTrauma(0.28);
      this.slowmoUntil = now() + 0.4;
    } else if (level >= 4) {
      // 同一 chain_id 只触发一次终极反馈
      if (!ctx._ultimateFired) {
        ctx._ultimateFired = true;
        audio.play('chain4');
        this.banner = { text: '×4  山海异象', sub: reaction.name, color: '#FF6B4A', life: 2.0, big: true };
        this.addTrauma(0.55);
        this.slowmoUntil = now() + 0.5;
        this.spawnUltimate();
      }
    }
  }

  spawnUltimate() {
    // 灵兽虚影 + 大型特效
    this.vfxs.push(
      new Vfx({
        type: 'ultimate',
        x: this.W / 2,
        y: this.H * 0.42,
        life: 1.6,
        color: '#FFE08A',
      })
    );
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.damage(45);
      this.burst(e.x, e.y, '#FFE08A', 10);
      if (!e.alive) this.killEnemy(e);
    }
  }

  // ── 环境 Tick ─────────────────────────────────────────
  updateZones(dt) {
    for (const z of this.zones) {
      if (!z.persistent && !z.alive) continue;
      z.tickTimer += dt;
      if (z.tickTimer < 0.15) continue;
      z.tickTimer = 0;

      if (z.type === 'FIRE_FIELD' || z.type === 'STORM') {
        const dps = z.tickDamage || 8;
        const real = dps * 0.15;
        for (const e of this.enemies) {
          if (!e.alive || e.reached || e._killed) continue;
          if (this.pointInZone(e, z) || dist(e, z) < z.w / 2) {
            const died = e.damage(real);
            this.burst(e.x, e.y, z.type === 'FIRE_FIELD' ? '#FF8A4A' : '#C4B5FF', 2);
            if (died) this.killEnemy(e);
          }
        }
      }
      if (z.type === 'STEAM') {
        // 蒸汽可被岚扩散，本身轻减速
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (dist(e, z) < z.w / 2) {
            e.applyStatus('CHILL', 0.3);
            e.slowFactor = 0.85;
          }
        }
      }
      if (z.type === 'ICE' || z.icedUntil > now()) {
        // 冰面使敌人易滑
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (dist(e, z) < z.w / 2) {
            e.slowUntil = now() + 0.2;
            e.slowFactor = 0.7;
          }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.persistent || z.alive);
  }

  // ── 投射物 ───────────────────────────────────────────
  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const t = p.target;
      if (!t || !t.alive || t.reached) {
        // 寻找新目标或消散
        p.alive = false;
        continue;
      }
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = p.speed * dt;
      if (d <= step + t.radius) {
        // hit
        this.applyHit(t, p.damage, p.element, p.status, p.statusDuration, null);
        if (p.splash) {
          for (const e of this.enemies) {
            if (e === t || !e.alive) continue;
            if (dist(t, e) < p.splash + e.radius) {
              this.applyHit(e, p.damage * 0.45, p.element, p.status, p.statusDuration * 0.6, null);
            }
          }
        }
        // 命中可留下水迹 / 小火场
        if (p.element === 'WATER') {
          this.zones.push(
            new EnvironmentZone({
              type: 'PUDDLE',
              x: t.x,
              y: t.y,
              w: 50,
              h: 28,
              duration: 3.2,
              element: 'WATER',
            })
          );
        } else if (p.element === 'FIRE') {
          this.zones.push(
            new EnvironmentZone({
              type: 'FIRE_FIELD',
              x: t.x,
              y: t.y,
              w: 40,
              h: 24,
              duration: 1.6,
              element: 'FIRE',
              tickDamage: 5,
            })
          );
        }
        p.alive = false;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  // ── 敌人 ─────────────────────────────────────────────
  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (!e.alive || e.reached) continue;

      // burn
      if (now() < e.burnUntil) {
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.4;
          const died = e.damage(4);
          this.burst(e.x, e.y - 8, '#FF8A4A', 2);
          if (died) this.killEnemy(e);
        }
      }

      // element expire
      if (e.element && now() > e.elementUntil) e.element = null;

      // 已在终点（含冻结中）仍要结算突破
      if (e.progress >= 1) {
        e.reached = true;
        e.alive = false;
        this.baseHp -= e.isBoss ? 5 : 1;
        audio.play('base_hit');
        this.addTrauma(0.2);
        bus.emit('base_damaged', 1);
        this.burst(MAP.base.x, MAP.base.y, '#E85D3A', 12);
        if (this.baseHp <= 0) {
          this.baseHp = 0;
          this.finish(false);
        }
        continue;
      }

      if (e.frozen) continue;

      let speed = e.speed;
      if (e.slowed) speed *= e.slowFactor;
      if (e.config.tags?.includes('tank') && e.shellBroken) speed *= 1.25;

      const step = (speed * dt) / this.pathLen;
      e.progress = clamp(e.progress + step, 0, 1);
      const p = pointOnPath(MAP.path, e.progress);
      e.x = p.x;
      e.y = p.y;
      e.angle = p.angle;
      e.wobble += dt * 6;

      // boss mechanics
      if (e.isBoss && e.alive) {
        this.updateBoss(e, dt);
      }
    }

    // 裂壳兽等：甲蚀首次受强反应后破甲 — 在 executeReaction 里已有伤害；这里简化为血量阈值
    for (const e of this.enemies) {
      if (e.config.tags?.includes('tank') && !e.shellBroken && e.hp < e.maxHp * 0.5) {
        e.shellBroken = true;
        this.vfxs.push(new Vfx({ type: 'reaction', x: e.x, y: e.y, color: '#8a8a8a', name: '破甲', life: 0.4, radius: 30 }));
      }
    }

    this.enemies = this.enemies.filter((e) => e.alive || e.reached === false);
    // remove dead that finished death anim — keep briefly for particles; filter fully dead
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  updateBoss(boss, dt) {
    this.bossChargeCd -= dt;
    this.bossSummonCd -= dt;
    if (this.bossChargeCd <= 0 && boss.progress > 0.15 && boss.progress < 0.85) {
      this.bossChargeCd = boss.config.chargeInterval || 8;
      // 阶段冲锋：短暂加速 + 震屏提示
      boss.speed = (boss.config.speed || 38) * 2.4;
      this.addTrauma(0.25);
      this.banner = { text: '蚀山君 冲锋', sub: '', color: '#c23b2e', life: 1.0, big: false };
      setTimeout(() => {
        if (boss.alive) boss.speed = boss.config.speed || 38;
      }, 1600);
    }
    if (this.bossSummonCd <= 0) {
      this.bossSummonCd = boss.config.summonInterval || 12;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (this.state !== 'playing') return;
          const cfg = ENEMIES['enemy.ink_blob'];
          const e = new Enemy(cfg, this.pathLen);
          e.progress = Math.max(0, boss.progress - 0.03);
          const p = pointOnPath(MAP.path, e.progress);
          e.x = p.x + (Math.random() * 40 - 20);
          e.y = p.y + (Math.random() * 40 - 20);
          this.enemies.push(e);
        }, i * 250);
      }
    }
  }

  killEnemy(enemy) {
    if (enemy._killed) return;
    enemy._killed = true;
    enemy.alive = false;
    this.totalKills += 1;
    this.gold += enemy.reward;
    audio.play('coin');
    audio.play('die');
    this.burst(enemy.x, enemy.y, '#2a2a2a', 16);
    this.texts.push(new FloatingText(enemy.x, enemy.y - 10, `+${enemy.reward}`, '#FFD27A', 16));
    bus.emit('enemy_died', enemy, enemy.reward);
    bus.emit('gold_changed', this.gold);
  }

  // ── 反馈 ─────────────────────────────────────────────
  addTrauma(amount) {
    this.shakeTrauma = clamp(this.shakeTrauma + amount, 0, 1);
  }

  burst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = 40 + Math.random() * 120;
      this.particles.push(
        new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, color, 0.35 + Math.random() * 0.3, 2 + Math.random() * 3)
      );
    }
  }

  spawnVfx(x, y, type, color) {
    this.vfxs.push(new Vfx({ type, x, y, color, life: 0.5 }));
  }

  finish(victory) {
    if (this.state !== 'playing') return;
    this.state = victory ? 'victory' : 'defeat';
    audio.play(victory ? 'win' : 'lose');
    bus.emit('battle_finished', victory);
  }

  // ── 主循环 ───────────────────────────────────────────
  startLoop() {
    this._last = performance.now();
    const frame = (ts) => {
      const rawDt = Math.min(0.05, (ts - this._last) / 1000);
      this._last = ts;
      if (!this.paused && this.state === 'playing') {
        const slow = now() < this.slowmoUntil ? 0.35 : 1;
        const dt = rawDt * this.speed * slow;
        this.time += dt;
        this.update(dt);
      } else {
        // still decay visual
        this.updateVisuals(rawDt);
      }
      this.render();
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  }

  update(dt) {
    this.updateWaves(dt);
    this.updateSpirits(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateEnemies(dt);
    this.updateVisuals(dt);
  }

  updateVisuals(dt) {
    // particles
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      p.vx *= 0.98;
      if (p.life <= 0) p.alive = false;
    }
    this.particles = this.particles.filter((p) => p.alive);

    for (const t of this.texts) {
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) t.alive = false;
    }
    this.texts = this.texts.filter((t) => t.alive);

    for (const v of this.vfxs) {
      v.t += dt;
      if (v.t >= v.life) v.alive = false;
    }
    this.vfxs = this.vfxs.filter((v) => v.alive);

    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    // shake
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - 1.2 * dt);
      this.shakeT += dt * 30;
      const s = this.shakeTrauma * this.shakeTrauma;
      this.camOffset.x = 12 * s * Math.sin(this.shakeT * 1.7);
      this.camOffset.y = 8 * s * Math.sin(this.shakeT * 2.3);
    } else {
      this.camOffset.x = 0;
      this.camOffset.y = 0;
    }
  }

  // ── 渲染 ─────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.translate(this.camOffset.x, this.camOffset.y);

    this.drawBackground(ctx);
    this.drawZones(ctx);
    this.drawPath(ctx);
    this.drawBase(ctx);
    this.drawSlots(ctx);
    this.drawResonance(ctx);
    this.drawEnemies(ctx);
    this.drawSpirits(ctx);
    this.drawProjectiles(ctx);
    this.drawVfx(ctx);
    this.drawParticles(ctx);
    this.drawTexts(ctx);

    if (this.banner) this.drawBanner(ctx);

    ctx.restore();
  }

  drawBackground(ctx) {
    if (this.bgImage) {
      const img = this.bgImage;
      const s = Math.max(this.W / img.width, this.H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (this.W - dw) / 2, (this.H - dh) / 2, dw, dh);
      return;
    }
    // 淡墨山海（背景图未加载时的兜底）
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#c5d0c4');
    g.addColorStop(0.35, '#b8c4b4');
    g.addColorStop(0.7, '#a8b5a4');
    g.addColorStop(1, '#8a9a86');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, this.W + 40, this.H + 40);

    ctx.fillStyle = 'rgba(90, 110, 95, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 600);
    for (let x = 0; x <= this.W; x += 40) {
      ctx.lineTo(x, 540 + Math.sin(x * 0.008) * 40 + Math.sin(x * 0.02) * 15);
    }
    ctx.lineTo(this.W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(70, 90, 75, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 1300);
    for (let x = 0; x <= this.W; x += 30) {
      ctx.lineTo(x, 1240 + Math.sin(x * 0.01 + 2) * 50);
    }
    ctx.lineTo(this.W, 700);
    ctx.lineTo(0, 700);
    ctx.closePath();
    ctx.fill();
  }

  drawPath(ctx) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 路基
    ctx.strokeStyle = '#8a7a62';
    ctx.lineWidth = 72;
    ctx.beginPath();
    MAP.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();

    // 路面
    ctx.strokeStyle = '#c4b49a';
    ctx.lineWidth = 58;
    ctx.stroke();

    // 中线纹理
    ctx.strokeStyle = 'rgba(140, 120, 90, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 入口标记
    const e = MAP.entry;
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c23b2e';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 8, 0, TAU);
    ctx.fill();
    ctx.font = '600 22px "PingFang SC", sans-serif';
    ctx.fillStyle = '#2a2a2a';
    ctx.textAlign = 'center';
    ctx.fillText('入口', e.x, e.y - 28);
  }

  drawZones(ctx) {
    for (const z of this.zones) {
      const iced = z.icedUntil > now();
      let fill = 'rgba(59, 167, 196, 0.25)';
      let stroke = 'rgba(59, 167, 196, 0.5)';
      if (z.type === 'ICE' || iced) {
        fill = 'rgba(168, 212, 232, 0.45)';
        stroke = 'rgba(168, 212, 232, 0.8)';
      } else if (z.type === 'FIRE_FIELD') {
        fill = 'rgba(232, 93, 58, 0.28)';
        stroke = 'rgba(255, 150, 80, 0.6)';
      } else if (z.type === 'STEAM') {
        fill = 'rgba(210, 230, 225, 0.35)';
        stroke = 'rgba(210, 230, 225, 0.55)';
      } else if (z.type === 'STORM') {
        fill = 'rgba(123, 92, 255, 0.25)';
        stroke = 'rgba(196, 181, 255, 0.55)';
      } else if (z.type === 'PUDDLE') {
        fill = 'rgba(59, 167, 196, 0.3)';
        stroke = 'rgba(127, 212, 232, 0.5)';
      }

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      const rx = z.x - z.w / 2;
      const ry = z.y - z.h / 2;
      roundRect(ctx, rx, ry, z.w, z.h, 16);
      ctx.fill();
      ctx.stroke();

      // 波纹
      if (z.type === 'NATURAL_WATER' || z.type === 'PUDDLE' || iced) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const yy = ry + z.h * (0.3 + i * 0.2);
          ctx.beginPath();
          ctx.moveTo(rx + 8, yy);
          ctx.quadraticCurveTo(z.x, yy + 6, rx + z.w - 8, yy);
          ctx.stroke();
        }
      }
    }
  }

  drawBase(ctx) {
    const b = MAP.base;
    // 灵种
    const pulse = 1 + Math.sin(this.time * 3) * 0.06;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(pulse, pulse);

    // 光晕
    const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 50);
    g.addColorStop(0, 'rgba(255, 210, 140, 0.7)');
    g.addColorStop(1, 'rgba(255, 210, 140, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, TAU);
    ctx.fill();

    // 种子
    ctx.fillStyle = '#F0C060';
    ctx.strokeStyle = '#C08030';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 28, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFF2C0';
    ctx.beginPath();
    ctx.ellipse(-6, -8, 6, 10, -0.4, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.font = '600 20px "PingFang SC", sans-serif';
    ctx.fillStyle = '#2a2a2a';
    ctx.textAlign = 'center';
    ctx.fillText('灵种', b.x, b.y + 48);
  }

  drawSlots(ctx) {
    for (const slot of this.slots.values()) {
      const occupied = !!slot.spirit;
      const selected = this.selectedSlot === slot.id;
      const placeable = this.selectedCard && !occupied && this.canAfford(this.selectedCard);

      ctx.beginPath();
      ctx.arc(slot.x, slot.y, selected ? 36 : 30, 0, TAU);
      if (occupied) {
        ctx.fillStyle = 'rgba(40, 40, 40, 0.15)';
        ctx.fill();
      } else if (placeable) {
        ctx.fillStyle = 'rgba(255, 220, 120, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#FFD27A';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(60, 60, 60, 0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (selected) {
        ctx.strokeStyle = '#FFD27A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, 40, 0, TAU);
        ctx.stroke();
      }

      // 攻击范围预览
      if (selected && slot.spirit) {
        ctx.strokeStyle = ELEMENTS[slot.spirit.element].color + '88';
        ctx.fillStyle = ELEMENTS[slot.spirit.element].color + '18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, slot.spirit.range, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }

      if (!occupied) {
        ctx.font = '500 16px "PingFang SC", sans-serif';
        ctx.fillStyle = 'rgba(40,40,40,0.4)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(slot.id, slot.x, slot.y);
        ctx.textBaseline = 'alphabetic';
      }
    }
  }

  drawResonance(ctx) {
    for (const link of this.getResonanceLinks()) {
      const { a, b } = link;
      const ca = ELEMENTS[a.spirit.element].color;
      const cb = ELEMENTS[b.spirit.element].color;
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.sin(this.time * 4) * 0.1;
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, ca);
      g.addColorStop(1, cb);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  drawSpirits(ctx) {
    for (const s of this.spirits) {
      const el = ELEMENTS[s.element];
      // 底座
      ctx.fillStyle = 'rgba(30,30,30,0.15)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 18, 26, 10, 0, 0, TAU);
      ctx.fill();

      ctx.save();
      ctx.translate(s.x, s.y);
      const bob = Math.sin(this.time * 3 + s.id) * 3;
      ctx.translate(0, bob);
      if (s.flash > 0) {
        ctx.scale(1 + s.flash * 0.5, 1 + s.flash * 0.5);
      }

      this.drawSpiritBody(ctx, s, el);

      // 等级星
      for (let i = 0; i < s.level; i++) {
        ctx.fillStyle = '#FFD27A';
        ctx.beginPath();
        ctx.arc(-10 + i * 10, -28, 3, 0, TAU);
        ctx.fill();
      }

      // 待机粒子
      if (Math.random() < 0.05) {
        this.particles.push(
          new Particle(s.x + (Math.random() * 20 - 10), s.y - 10, (Math.random() - 0.5) * 20, -30, el.glow, 0.6, 2)
        );
      }
      ctx.restore();
    }
  }

  drawSpiritBody(ctx, s, el) {
    const id = s.configId;
    ctx.scale(1.45, 1.45);
    // 统一可爱小兽剪影 + 元素色
    ctx.fillStyle = el.color;
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;

    // body
    ctx.beginPath();
    ctx.ellipse(0, 4, 18, 16, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(0, -12, 12, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // ears / horns by type
    if (id === 'spirit.red_feather') {
      // 火羽耳 + 尾
      ctx.fillStyle = el.glow;
      ctx.beginPath();
      ctx.moveTo(-10, -18); ctx.lineTo(-14, -32); ctx.lineTo(-4, -20); ctx.closePath();
      ctx.moveTo(10, -18); ctx.lineTo(14, -32); ctx.lineTo(4, -20); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = el.color;
      // tail flame
      ctx.beginPath();
      ctx.moveTo(14, 8);
      ctx.quadraticCurveTo(30, 0, 28, -16);
      ctx.quadraticCurveTo(20, -6, 14, 2);
      ctx.fill();
    } else if (id === 'spirit.azure_scale') {
      // 水龙角 + 鳍
      ctx.fillStyle = el.glow;
      ctx.beginPath();
      ctx.moveTo(-4, -22); ctx.lineTo(0, -34); ctx.lineTo(4, -22); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(14, -4, 8, 5, 0.4, 0, TAU);
      ctx.fill();
    } else if (id === 'spirit.thunder_horn') {
      // 雷角
      ctx.fillStyle = '#E8E0FF';
      ctx.beginPath();
      ctx.moveTo(0, -22); ctx.lineTo(2, -38); ctx.lineTo(6, -24); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7B5CFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, 8); ctx.lineTo(-12, 16); ctx.moveTo(8, 8); ctx.lineTo(12, 16);
      ctx.stroke();
    } else if (id === 'spirit.wind_fox') {
      // 双飘带尾
      ctx.strokeStyle = el.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.quadraticCurveTo(32, 0 + Math.sin(this.time * 5) * 6, 36, -10);
      ctx.moveTo(14, 10);
      ctx.quadraticCurveTo(30, 8 + Math.cos(this.time * 5) * 6, 38, 2);
      ctx.stroke();
    } else if (id === 'spirit.frost_fox') {
      // 冰晶耳尾
      ctx.fillStyle = el.glow;
      ctx.beginPath();
      ctx.moveTo(-8, -18); ctx.lineTo(-16, -30); ctx.lineTo(-2, -20); ctx.closePath();
      ctx.moveTo(8, -18); ctx.lineTo(16, -30); ctx.lineTo(2, -20); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, 6); ctx.lineTo(28, -4); ctx.lineTo(18, 10); ctx.closePath();
      ctx.fill();
    }

    // eyes
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-4, -12, 2, 0, TAU);
    ctx.arc(4, -12, 2, 0, TAU);
    ctx.fill();
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const bob = Math.sin(e.wobble) * 2;
      ctx.save();
      ctx.translate(e.x, e.y + bob);

      if (e.flash > 0) {
        ctx.globalAlpha = 1;
        ctx.filter = 'brightness(1.6)';
      }
      if (e.frozen) {
        ctx.filter = 'brightness(1.2) saturate(0.5)';
      }

      this.drawEnemyBody(ctx, e);

      // 元素状态染色（对应 GDD §30.2）
      if (e.element) this.drawElementTint(ctx, e);

      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      // 血条
      if (e.hp < e.maxHp) {
        const w = e.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(-w / 2, -e.radius - 14, w, 5);
        ctx.fillStyle = e.isBoss ? '#E85D3A' : '#7CB87C';
        ctx.fillRect(-w / 2, -e.radius - 14, w * (e.hp / e.maxHp), 5);
      }

      // Boss 名
      if (e.isBoss) {
        ctx.font = '600 16px "PingFang SC", sans-serif';
        ctx.fillStyle = '#eee';
        ctx.textAlign = 'center';
        ctx.fillText(e.name, 0, -e.radius - 22);
      }

      ctx.restore();
    }
  }

  drawEnemyBody(ctx, e) {
    const r = e.radius;
    ctx.scale(1.15, 1.15);
    ctx.fillStyle = e.config.color || '#1a1a1a';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;

    const tag = e.config.tags?.[0];
    if (tag === 'fast') {
      // 细长蚀犬
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // 骨面
      ctx.fillStyle = '#c8c8c8';
      ctx.beginPath();
      ctx.ellipse(r * 0.6, -2, r * 0.35, r * 0.4, 0, 0, TAU);
      ctx.fill();
    } else if (tag === 'tank') {
      // 甲蚀
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = e.shellBroken ? '#333' : '#2a2a2a';
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -4, r * 0.7, Math.PI, 0);
      ctx.stroke();
    } else if (tag === 'swarm') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
    } else if (tag === 'boss') {
      // 蚀山君
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.85, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // 骨面
      ctx.fillStyle = '#d0d0d0';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.15, r * 0.55, r * 0.45, 0, 0, TAU);
      ctx.fill();
      // 烟尾
      ctx.fillStyle = 'rgba(20,20,20,0.55)';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.3 + r * 0.2, 10, 18, a, 0, TAU);
        ctx.fill();
      }
    } else {
      // 墨团
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.9, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // 小角
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(-6, -r * 0.8);
      ctx.lineTo(-4, -r * 1.2);
      ctx.lineTo(0, -r * 0.8);
      ctx.moveTo(6, -r * 0.8);
      ctx.lineTo(4, -r * 1.2);
      ctx.lineTo(0, -r * 0.8);
      ctx.fill();
    }

    // 暗红眼点
    ctx.fillStyle = e.config.accent || '#c23b2e';
    const eyeY = tag === 'boss' ? -2 : -2;
    ctx.beginPath();
    ctx.arc(-5, eyeY, 2.5, 0, TAU);
    ctx.arc(5, eyeY, 2.5, 0, TAU);
    ctx.fill();
  }

  drawElementTint(ctx, e) {
    const el = ELEMENTS[e.element];
    if (!el) return;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = el.color;
    ctx.lineWidth = 3;
    if (e.element === 'WATER') {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 3, 0, TAU);
      ctx.stroke();
    } else if (e.element === 'FIRE') {
      ctx.strokeStyle = '#FF8A4A';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 4, 0, TAU);
      ctx.stroke();
    } else if (e.element === 'LIGHTNING') {
      ctx.strokeStyle = '#C4B5FF';
      ctx.beginPath();
      ctx.moveTo(-8, -e.radius);
      ctx.lineTo(0, 0);
      ctx.lineTo(8, e.radius);
      ctx.stroke();
    } else if (e.element === 'ICE') {
      ctx.strokeStyle = '#E0F2FF';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 3, 0, TAU);
      ctx.stroke();
    } else if (e.element === 'WIND') {
      ctx.strokeStyle = '#A8E6C3';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 2, 0, TAU);
      ctx.stroke();
    }
    if (e.frozen) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#A8D4E8';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff8';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, p.radius * 0.4, 0, TAU);
      ctx.fill();
    }
  }

  drawVfx(ctx) {
    for (const v of this.vfxs) {
      const k = v.t / v.life;
      const alpha = 1 - k;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (v.type === 'beam') {
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x2, v.y2);
        ctx.stroke();
        // 闪点
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (v.type === 'pulse' || v.type === 'place' || v.type === 'upgrade') {
        const r = (v.r || 40) * (0.5 + k);
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, TAU);
        ctx.stroke();
      } else if (v.type === 'reaction') {
        const r = (v.radius || 50) * (0.4 + k * 0.8);
        ctx.fillStyle = v.color + '44';
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, TAU);
        ctx.stroke();
        if (v.name) {
          ctx.font = '600 22px "PingFang SC", sans-serif';
          ctx.fillStyle = v.color;
          ctx.textAlign = 'center';
          ctx.fillText(v.name, v.x, v.y - r - 8);
        }
      } else if (v.type === 'ultimate') {
        // 山海异象：巨大灵影环
        const r = 80 + k * 280;
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, r * 0.7, 0, TAU);
        ctx.stroke();
        ctx.font = '700 42px "PingFang SC", sans-serif';
        ctx.fillStyle = v.color;
        ctx.textAlign = 'center';
        ctx.fillText('山海异象', v.x, v.y);
      }
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    for (const t of this.texts) {
      ctx.globalAlpha = clamp(t.life / 0.9, 0, 1);
      ctx.font = `600 ${t.size}px "PingFang SC", sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx) {
    const b = this.banner;
    const alpha = clamp(b.life * 2, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    const y = this.H * 0.62;
    const size = b.big ? 48 : 34;
    ctx.font = `700 ${size}px "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(b.text, this.W / 2 + 2, y + 2);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, this.W / 2, y);
    if (b.sub) {
      ctx.font = '600 24px "PingFang SC", sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(b.sub, this.W / 2, y + 36);
    }
    ctx.restore();
  }

  // ── 输入 ─────────────────────────────────────────────
  handlePointer(x, y) {
    audio.unlock();
    // 塔位命中（热区放大）
    let hitSlot = null;
    for (const slot of this.slots.values()) {
      if (Math.hypot(x - slot.x, y - slot.y) < 64) {
        hitSlot = slot;
        break;
      }
    }

    if (hitSlot) {
      if (hitSlot.spirit) {
        this.selectedSlot = hitSlot.id;
        this.selectedCard = null;
        bus.emit('card_selected', null);
        bus.emit('slot_selected', hitSlot.id);
      } else if (this.selectedCard) {
        if (this.placeSpirit(hitSlot.id, this.selectedCard)) {
          this.selectedCard = null;
          this.selectedSlot = hitSlot.id;
          bus.emit('card_selected', null);
          bus.emit('slot_selected', hitSlot.id);
        }
      } else {
        this.selectedSlot = hitSlot.id;
        bus.emit('slot_selected', hitSlot.id);
      }
      return;
    }

    this.selectedSlot = null;
    bus.emit('slot_selected', null);
  }

  selectCard(spiritId) {
    if (this.selectedCard === spiritId) {
      this.selectedCard = null;
    } else {
      this.selectedCard = spiritId;
      this.selectedSlot = null;
    }
    bus.emit('card_selected', this.selectedCard);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function reactionTick(type) {
  if (type === 'FIRE_FIELD') return 8;
  if (type === 'STORM') return 14;
  return 0;
}
