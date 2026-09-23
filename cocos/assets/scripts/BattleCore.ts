/**
 * 战斗系统（路径平滑 / 塔位离路 / 元素反应 / 连锁）
 * 逻辑与 Godot battle.gd 一致；画面 1080×2520（9:21）
 */
import {
  MAP, SPIRITS, ENEMIES, REACTIONS, SPIRIT_ORDER, WAVES,
  Element, ELEMENT_META, findReaction, CHAIN_WINDOW, BASE_GAP, DESIGN,
  ReactionConfig,
} from './Data';
import { bus } from './EventBus';

export interface Vec2 { x: number; y: number }

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function smoothPath(src: Vec2[], steps = 4): Vec2[] {
  const out: Vec2[] = [];
  const n = src.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = src[Math.max(i - 1, 0)];
    const p1 = src[i];
    const p2 = src[i + 1];
    const p3 = src[Math.min(i + 2, n - 1)];
    for (let s = 0; s < steps; s++) out.push(catmullRom(p0, p1, p2, p3, s / steps));
  }
  out.push(src[n - 1]);
  return out;
}

export function pushOffPath(p: Vec2, path: Vec2[], gap: number): Vec2 {
  let bestD = Infinity;
  let bestProj = p;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / ((abx * abx + aby * aby) || 1)));
    const proj = { x: a.x + abx * t, y: a.y + aby * t };
    const d = dist(p, proj);
    if (d < bestD) { bestD = d; bestProj = proj; }
  }
  if (bestD >= gap) return p;
  if (bestD < 0.5) {
    const seg = { x: path[1].x - path[0].x, y: path[1].y - path[0].y };
    const len = Math.hypot(seg.x, seg.y) || 1;
    return { x: bestProj.x + (-seg.y / len) * gap, y: bestProj.y + (seg.x / len) * gap };
  }
  const side = { x: p.x - bestProj.x, y: p.y - bestProj.y };
  const sl = Math.hypot(side.x, side.y) || 1;
  return { x: bestProj.x + (side.x / sl) * gap, y: bestProj.y + (side.y / sl) * gap };
}

export function pointOnPath(path: Vec2[], t: number): Vec2 {
  let total = 0;
  const segs: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const d = dist(path[i], path[i + 1]);
    segs.push(d); total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const local = segs[i] === 0 ? 0 : Math.min(1, target / segs[i]);
      const a = path[i], b = path[i + 1];
      return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
    }
    target -= segs[i];
  }
  return path[path.length - 1];
}

export interface Slot { id: string; pos: Vec2; neighbors: string[]; spirit: any | null }

export class BattleCore {
  path: Vec2[] = smoothPath(MAP.path, 4);
  pathLen = 0;
  slots: Record<string, Slot> = {};
  gold = MAP.startingGold;
  baseHp = MAP.baseHp;
  waveIndex = 0;
  betweenWaves = true;
  waveDelay = 2;
  state: 'playing' | 'victory' | 'defeat' = 'playing';
  enemies: any[] = [];
  projectiles: any[] = [];
  zones: any[] = [];
  spirits: any[] = [];
  chain: any = null;
  chainId = 0;
  spawnQueues: any[] = [];
  totalKills = 0;
  selectedCard = '';
  selectedSlot = '';

  constructor() {
    for (let i = 0; i < this.path.length - 1; i++) this.pathLen += dist(this.path[i], this.path[i + 1]);
    for (const s of MAP.slots) {
      const pos = pushOffPath(s.pos, MAP.path, BASE_GAP);
      this.slots[s.id] = { id: s.id, pos, neighbors: s.neighbors, spirit: null };
    }
    for (const w of MAP.waterZones) {
      this.zones.push({ type: 'NATURAL_WATER', pos: w.pos, size: w.size, persistent: true, expires: Infinity });
    }
  }

  placeSpirit(slotId: string, spiritId: string): boolean {
    const slot = this.slots[slotId];
    const cfg = SPIRITS[spiritId];
    if (!slot || !cfg || slot.spirit || this.gold < cfg.cost) return false;
    this.gold -= cfg.cost;
    slot.spirit = {
      id: Math.random(), configId: spiritId, config: cfg, element: cfg.element,
      level: 1, pos: slot.pos, slotId, cd: 0, range: cfg.range, damage: cfg.damage,
      resonanceBonus: 1,
    };
    this.spirits.push(slot.spirit);
    this.rebuildResonance(slotId);
    bus.emit('gold_changed', this.gold);
    return true;
  }

  rebuildResonance(slotId: string) {
    const slot = this.slots[slotId];
    if (!slot?.spirit) return;
    let bonus = 1;
    for (const nid of slot.neighbors) {
      const other = this.slots[nid];
      if (other?.spirit && other.spirit.element !== slot.spirit.element) bonus += 0.2;
    }
    slot.spirit.resonanceBonus = Math.min(bonus, 1.8);
  }

  applyHit(enemy: any, damage: number, element: Element, status: string, statusDuration: number) {
    if (!enemy.alive || enemy._killed) return;
    let dmg = damage;
    if (enemy.config.tag === 'tank' && !enemy.shellBroken) dmg *= 0.65;
    enemy.hp -= dmg;
    enemy.hitFlash = 1;
    if (enemy.hp <= 0) {
      enemy.hp = 0; enemy.alive = false; enemy._killed = true;
      this.totalKills++; this.gold += enemy.reward;
      bus.emit('gold_changed', this.gold);
      return;
    }
    if (status === 'BURN') enemy.burnUntil = performance.now() / 1000 + statusDuration;
    if (status === 'CHILL') { enemy.slowUntil = performance.now() / 1000 + statusDuration; enemy.slowFactor = 0.55; }
    this.applyElement(enemy, element, statusDuration);
  }

  applyElement(target: any, incoming: Element, duration: number) {
    const now = performance.now() / 1000;
    const existing = (target.element >= 0 && now < target.elementUntil) ? target.element as Element : -1;
    if (existing >= 0 && existing !== incoming) {
      const reaction = findReaction(existing, incoming);
      if (reaction) {
        this.executeReaction(target, reaction);
        return;
      }
    }
    target.element = incoming;
    target.elementUntil = now + duration;
    bus.emit('element_applied', target, incoming);
  }

  nextContext() {
    const now = performance.now() / 1000;
    if (this.chain && now - this.chain.lastAt < CHAIN_WINDOW) {
      this.chain.lastAt = now;
      this.chain.chainLevel += 1;
      return this.chain;
    }
    this.chainId += 1;
    this.chain = { chainId: this.chainId, chainLevel: 1, startedAt: now, lastAt: now, visited: [], ultimateFired: false };
    return this.chain;
  }

  executeReaction(target: any, reaction: ReactionConfig) {
    const ctx = this.nextContext();
    const pos = { ...target.pos };
    target.element = -1;
    target.elementUntil = 0;
    const dmg = reaction.damage * (1 + (ctx.chainLevel - 1) * 0.25);
    const died = !this.applyHitKillOnly(target, dmg);
    if (reaction.freeze) {
      target.frozenUntil = performance.now() / 1000 + (reaction.duration || 2);
    }
    if (reaction.envCreate) {
      this.zones.push({
        type: reaction.envCreate.type,
        pos, size: { x: 100, y: 56 },
        persistent: false,
        expires: performance.now() / 1000 + reaction.envCreate.duration,
        tickDamage: reaction.tickDamage || 0,
      });
    }
    if (reaction.splash) {
      for (const e of this.enemies) {
        if (e === target || !e.alive) continue;
        if (dist(pos, e.pos) < reaction.splash + e.radius) this.applyHitKillOnly(e, reaction.damage * 0.5);
      }
    }
    bus.emit('reaction_triggered', reaction.id, pos, ctx);
    bus.emit('chain_reached', ctx.chainLevel, ctx);
    if (died) this.killIfDead(target);
  }

  applyHitKillOnly(enemy: any, damage: number): boolean {
    if (!enemy.alive || enemy._killed) return true;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      this.totalKills++;
      this.gold += enemy.reward;
      enemy.alive = false;
      enemy._killed = true;
      bus.emit('gold_changed', this.gold);
      return false;
    }
    return true;
  }

  killIfDead(enemy: any) {
    if (!enemy.alive && !enemy._killed) {
      enemy._killed = true;
      this.totalKills++;
      this.gold += enemy.reward;
    }
  }

  update(dt: number) {
    if (this.state !== 'playing') return;
    this.updateWaves(dt);
    this.updateSpirits(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.zones = this.zones.filter(z => z.persistent || z.expires > performance.now() / 1000);
  }

  updateWaves(dt: number) {
    if (this.betweenWaves) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        this.betweenWaves = false;
        this.spawnQueues = WAVES[this.waveIndex].map(e => ({ ...e, remaining: e.count, timer: e.delay || 0 }));
        bus.emit('wave_started', this.waveIndex + 1);
      }
      return;
    }
    for (const q of this.spawnQueues) {
      q.timer -= dt;
      while (q.remaining > 0 && q.timer <= 0) {
        this.spawnEnemy(q.enemyId);
        q.remaining--;
        q.timer += q.interval;
      }
    }
    if (this.spawnQueues.some(q => q.remaining > 0)) return;
    if (this.enemies.some(e => e.alive && !e.reached)) return;
    this.waveIndex++;
    if (this.waveIndex >= WAVES.length) { this.state = 'victory'; bus.emit('battle_finished', true); return; }
    this.betweenWaves = true;
    this.waveDelay = 3;
    this.gold += 20 + this.waveIndex * 5;
  }

  spawnEnemy(enemyId: string) {
    const cfg = ENEMIES[enemyId];
    const p0 = pointOnPath(this.path, 0);
    this.enemies.push({
      id: Math.random(), config: cfg, hp: cfg.maxHp, maxHp: cfg.maxHp, speed: cfg.speed,
      reward: cfg.reward, radius: cfg.radius, isBoss: !!cfg.isBoss, progress: 0,
      pos: p0, alive: true, reached: false, _killed: false,
      frozenUntil: 0, slowUntil: 0, slowFactor: 1,
      element: -1, elementUntil: 0, burnUntil: 0, burnTick: 0, shellBroken: false, hitFlash: 0,
    });
    bus.emit('enemy_spawned', null);
  }

  updateSpirits(dt: number) {
    for (const s of this.spirits) {
      s.cd -= dt;
      if (s.cd > 0) continue;
      let best: any = null, bestScore = -Infinity;
      for (const e of this.enemies) {
        if (!e.alive || e.reached) continue;
        if (dist(s.pos, e.pos) > s.range + e.radius) continue;
        let score = e.progress * 1000;
        if (s.config.preferWet && e.element === Element.WATER) score += 500;
        if (score > bestScore) { bestScore = score; best = e; }
      }
      if (!best) continue;
      s.cd = s.config.attackInterval;
      this.attack(s, best);
    }
  }

  attack(s: any, target: any) {
    const type = s.config.attackType;
    if (type === 'projectile') {
      this.projectiles.push({
        pos: { x: s.pos.x, y: s.pos.y - 20 }, target, speed: s.config.projectileSpeed || 380,
        damage: s.damage, element: s.element, status: s.config.status || '',
        statusDuration: (s.config.statusDuration || 2) * s.resonanceBonus,
        splash: s.config.splash || 0, skill: s.config.skill, alive: true,
      });
    } else if (type === 'beam') {
      this.applyHit(target, s.damage, s.element, s.config.status || '', (s.config.statusDuration || 1) * s.resonanceBonus);
    } else if (type === 'pulse') {
      const r = s.config.pulseRadius || 110;
      for (const e of this.enemies) {
        if (!e.alive || e.reached) continue;
        if (dist(s.pos, e.pos) <= r + e.radius) {
          this.applyHit(e, s.damage, s.element, s.config.status || '', (s.config.statusDuration || 1) * s.resonanceBonus);
        }
      }
    }
  }

  updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const t = p.target;
      if (!t || !t.alive) { p.alive = false; continue; }
      const dx = t.pos.x - p.pos.x, dy = t.pos.y - p.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = p.speed * dt;
      if (d <= step + t.radius) {
        this.applyHit(t, p.damage, p.element, p.status, p.statusDuration);
        p.alive = false;
      } else {
        p.pos.x += (dx / d) * step;
        p.pos.y += (dy / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive);
  }

  updateEnemies(dt: number) {
    const now = performance.now() / 1000;
    for (const e of this.enemies) {
      if (!e.alive || e.reached) continue;
      if (now < e.burnUntil) {
        e.burnTick -= dt;
        if (e.burnTick <= 0) { e.burnTick = 0.4; this.applyHitKillOnly(e, 4); }
      }
      if (e.element >= 0 && now > e.elementUntil) e.element = -1;
      if (e.config.crack && !e.shellBroken && e.hp < e.maxHp * 0.45) { e.shellBroken = true; e.speed *= 1.45; }
      if (e.progress >= 1) {
        e.alive = false; e.reached = true;
        this.baseHp -= e.isBoss ? 5 : 1;
        bus.emit('base_damaged', 1);
        if (this.baseHp <= 0) { this.baseHp = 0; this.state = 'defeat'; bus.emit('battle_finished', false); }
        continue;
      }
      if (now < e.frozenUntil) continue;
      let speed = e.speed;
      if (now < e.slowUntil) speed *= e.slowFactor;
      e.progress = Math.min(1, e.progress + (speed * dt) / this.pathLen);
      e.pos = pointOnPath(this.path, e.progress);
    }
    this.enemies = this.enemies.filter(e => e.alive);
  }
}

export { DESIGN, Element, ELEMENT_META, SPIRITS, SPIRIT_ORDER, ENEMIES, MAP, WAVES };
