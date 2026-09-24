import {
  MAP,
  WAVES,
  SPIRITS,
  ENEMIES,
  ElementId,
  ReactionConfig,
  Vec2,
} from '../config/GameConfig';
import { smoothPath, pushOffPath } from './PathUtil';
import { bus } from './EventBus';
import { EnemyUnit } from './EnemyUnit';
import { SpiritUnit, SlotRuntime } from './SpiritUnit';
import { Projectile, EnvironmentZone, createZone, pointInZone } from './Projectile';
import { ChainSystem, ReactionSystem } from './ReactionSystem';
import { Resonance } from './Resonance';
import { audio } from './AudioManager';

export type BattleState = 'ready' | 'playing' | 'victory' | 'defeat';

export interface FxEvent {
  type: 'hit' | 'reaction' | 'chain' | 'die' | 'levelup' | 'place' | 'burst';
  x: number;
  y: number;
  color: string;
  text?: string;
  amount?: number;
}

/** 战斗主状态 — 对应 HTML Game / Godot battle.gd */
export class Battle {
  gold = MAP.startingGold;
  baseHp = MAP.baseHp;
  maxBaseHp = MAP.baseHp;
  waveIndex = 0;
  betweenWaves = true;
  waveDelay = 2;
  state: BattleState = 'ready';
  selectedCard: string | null = null;
  selectedSlot: string | null = null;
  totalKills = 0;
  speed = 1;
  paused = false;
  time = 0;

  enemies: EnemyUnit[] = [];
  projectiles: Projectile[] = [];
  zones: EnvironmentZone[] = [];
  spirits: SpiritUnit[] = [];
  slots = new Map<string, SlotRuntime>();

  path: Vec2[] = MAP.path;
  pathLen = 0;
  pathSeg: Array<{ a: Vec2; b: Vec2; len: number; acc: number }> = [];

  spawnQueues: Array<{ enemyId: string; remaining: number; interval: number; timer: number }> = [];

  chain = new ChainSystem();
  reactions = new ReactionSystem();
  resonance = new Resonance();

  fxQueue: FxEvent[] = [];
  banner: { text: string; sub: string; life: number; big: boolean } | null = null;

  constructor() {
    // 先样条加密再建段，怪物轨迹与绘制都用圆润路线
    this.path = smoothPath(MAP.path, 5);
    this.buildPath();
    this.reset();
  }

  private buildPath(): void {
    this.pathSeg = [];
    this.pathLen = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.path[i];
      const b = this.path[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.pathSeg.push({ a, b, len, acc: this.pathLen });
      this.pathLen += len;
    }
  }

  pointOnPath(t: number): Vec2 {
    const dist = Math.max(0, Math.min(this.pathLen, t));
    for (const s of this.pathSeg) {
      if (dist <= s.acc + s.len || s === this.pathSeg[this.pathSeg.length - 1]) {
        const local = s.len <= 0 ? 0 : (dist - s.acc) / s.len;
        return {
          x: s.a.x + (s.b.x - s.a.x) * local,
          y: s.a.y + (s.b.y - s.a.y) * local,
        };
      }
    }
    return { ...this.path[this.path.length - 1] };
  }

  reset(): void {
    this.enemies = [];
    this.projectiles = [];
    this.spirits = [];
    this.fxQueue = [];
    this.gold = MAP.startingGold;
    this.baseHp = MAP.baseHp;
    this.maxBaseHp = MAP.baseHp;
    this.waveIndex = 0;
    this.betweenWaves = true;
    this.waveDelay = 2;
    this.chain.reset();
    this.totalKills = 0;
    this.selectedCard = null;
    this.selectedSlot = null;
    this.banner = null;
    this.spawnQueues = [];
    this.slots.clear();
    for (const s of MAP.slots) {
      const pos = pushOffPath({ x: s.x, y: s.y }, this.path, 72);
      this.slots.set(s.id, {
        id: s.id,
        x: pos.x,
        y: pos.y,
        neighborIds: s.neighborIds.slice(),
        spirit: null,
      });
    }
    this.zones = MAP.waterZones.map((w) =>
      createZone({
        type: 'NATURAL_WATER',
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        element: 'WATER',
        duration: 0,
        persistent: true,
      })
    );
  }

  start(): void {
    this.reset();
    this.state = 'playing';
    this.waveIndex = 0;
    this.betweenWaves = true;
    this.waveDelay = 2;
    audio.unlock();
    bus.emit('gold_changed', this.gold);
    bus.emit('base_hp_changed', this.baseHp, this.maxBaseHp);
    bus.emit('wave_started', 1);
  }

  canAfford(spiritId: string): boolean {
    const cfg = SPIRITS[spiritId];
    return !!cfg && this.gold >= cfg.cost;
  }

  selectCard(spiritId: string | null): void {
    this.selectedCard = this.selectedCard === spiritId ? null : spiritId;
    this.selectedSlot = null;
    bus.emit('card_selected', this.selectedCard);
    bus.emit('slot_selected', null);
  }

  selectSlot(slotId: string | null): void {
    this.selectedSlot = slotId;
    bus.emit('slot_selected', slotId);
  }

  placeSpirit(slotId: string, spiritId: string): boolean {
    const slot = this.slots.get(slotId);
    const cfg = SPIRITS[spiritId];
    if (!slot || !cfg || slot.spirit) return false;
    if (this.gold < cfg.cost) return false;
    this.gold -= cfg.cost;
    const spirit = new SpiritUnit(cfg, slotId, { x: slot.x, y: slot.y });
    slot.spirit = spirit;
    this.spirits.push(spirit);
    this.resonance.rebuild(this.slots);
    this.fxQueue.push({ type: 'place', x: slot.x, y: slot.y, color: '#D4A84B' });
    audio.play('place');
    bus.emit('gold_changed', this.gold);
    bus.emit('spirit_placed', spirit, slotId);
    return true;
  }

  getUpgradeCost(spirit: SpiritUnit): number | null {
    return spirit.getUpgradeCost();
  }

  upgradeSpirit(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    const spirit = slot?.spirit;
    if (!spirit) return false;
    const cost = spirit.getUpgradeCost();
    if (cost == null || this.gold < cost) return false;
    this.gold -= cost;
    spirit.applyUpgrade();
    this.resonance.rebuild(this.slots);
    this.fxQueue.push({ type: 'levelup', x: spirit.pos.x, y: spirit.pos.y, color: '#FFD27A' });
    audio.play('upgrade');
    bus.emit('gold_changed', this.gold);
    bus.emit('spirit_upgraded', spirit);
    return true;
  }

  sellSpirit(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    const spirit = slot?.spirit;
    if (!spirit) return false;
    const refund = Math.floor(spirit.config.cost * 0.5) + (spirit.level - 1) * 20;
    this.gold += refund;
    slot!.spirit = null;
    this.spirits = this.spirits.filter((s) => s !== spirit);
    this.resonance.rebuild(this.slots);
    bus.emit('gold_changed', this.gold);
    bus.emit('spirit_sold', spirit, refund);
    return true;
  }

  handlePointer(x: number, y: number): void {
    let hit: SlotRuntime | null = null;
    for (const slot of this.slots.values()) {
      if (Math.hypot(x - slot.x, y - slot.y) < 64) {
        hit = slot;
        break;
      }
    }
    if (!hit) {
      this.selectSlot(null);
      return;
    }
    if (hit.spirit) {
      this.selectedCard = null;
      this.selectSlot(hit.id);
      return;
    }
    if (this.selectedCard) {
      if (this.placeSpirit(hit.id, this.selectedCard)) {
        this.selectedCard = null;
        this.selectSlot(hit.id);
      }
      return;
    }
    this.selectSlot(hit.id);
  }

  startNextWave(): void {
    if (this.waveIndex >= WAVES.length) return;
    const wave = WAVES[this.waveIndex];
    this.spawnQueues = wave.map((e) => ({
      enemyId: e.enemyId,
      remaining: e.count,
      interval: e.interval,
      timer: e.delay,
    }));
    this.betweenWaves = false;
    bus.emit('wave_started', this.waveIndex + 1);
  }

  spawnEnemy(enemyId: string): void {
    const cfg = ENEMIES[enemyId];
    if (!cfg) return;
    const e = new EnemyUnit(cfg, this.pathLen);
    const p = this.pointOnPath(0);
    e.pos = { x: p.x, y: p.y };
    e.pathT = 0;
    this.enemies.push(e);
    bus.emit('enemy_spawned', e);
  }

  findTarget(spirit: SpiritUnit): EnemyUnit | null {
    let best: EnemyUnit | null = null;
    let bestScore = -Infinity;
    const preferWet = spirit.config.preferWet;
    for (const e of this.enemies) {
      if (!e.alive || e.killed) continue;
      const d = Math.hypot(e.pos.x - spirit.pos.x, e.pos.y - spirit.pos.y);
      if (d > spirit.range) continue;
      let score = e.pathT;
      if (preferWet && e.isWet(this.time)) score += 1000;
      if (e.isBoss()) score += 100;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  applyHit(enemy: EnemyUnit, damage: number, element: ElementId, status: string, statusDuration: number): void {
    if (!enemy.alive || enemy.killed) return;
    const now = this.time;
    const died = enemy.damage(damage);
    this.fxQueue.push({
      type: 'hit',
      x: enemy.pos.x,
      y: enemy.pos.y,
      color: '#FFFFFF',
      amount: Math.round(damage),
    });
    if (died) {
      this.killEnemy(enemy);
      return;
    }
    enemy.applyStatus(status, statusDuration, now);
    if (status === 'WET') enemy.status.wetUntil = now + statusDuration;
    let attachDur = statusDuration;
    if (element === 'ICE' && enemy.isWet(now)) attachDur = statusDuration * 1.6;
    this.reactions.applyElement(enemy, element, attachDur, now, this.chain, (reaction, target, incoming) => {
      this.runReaction(reaction, target, incoming);
    });
  }

  runReaction(reaction: ReactionConfig, target: EnemyUnit, incoming: ElementId): void {
    const now = this.time;
    const result = this.reactions.execute(reaction, target, now, this.chain);
    this.fxQueue.push({
      type: 'reaction',
      x: target.pos.x,
      y: target.pos.y,
      color: '#FFB347',
      text: reaction.name,
    });
    audio.play('reaction');
    if (reaction.cameraShake) bus.emit('shake', reaction.cameraShake);
    if (result.died) {
      this.killEnemy(target);
      return;
    }
    // 状态
    if (reaction.freeze) {
      target.status.frozenUntil = now + (reaction.duration || 2.2);
    }
    if (result.env) {
      this.spawnEnv(result.env.type, result.env.x, result.env.y, result.env.duration, reaction);
    }
    if (result.bounce) {
      this.chainLightning(target, reaction);
    }
    if (result.splash > 0) {
      for (const e of this.enemies) {
        if (e === target || !e.alive) continue;
        if (Math.hypot(e.pos.x - target.pos.x, e.pos.y - target.pos.y) <= result.splash) {
          if (e.damage(reaction.damage * 0.5)) this.killEnemy(e);
        }
      }
    }
    // 4 连「山海异象」
    if (this.chain.level >= 4) {
      this.spawnUltimate(target.pos);
    }
  }

  spawnEnv(type: string, x: number, y: number, duration: number, reaction: ReactionConfig): void {
    const w = type === 'ICE' ? 140 : 120;
    const h = type === 'ICE' ? 80 : 120;
    this.zones.push(
      createZone({
        type: type as EnvironmentZone['type'],
        x: x - w / 2,
        y: y - h / 2,
        w,
        h,
        element: (reaction.inputs[0] as ElementId) || 'WATER',
        duration,
        tickDamage: reaction.tickDamage ?? 0,
      })
    );
  }

  chainLightning(from: EnemyUnit, reaction: ReactionConfig): void {
    const range = reaction.bounceRange ?? 160;
    const count = reaction.bounceCount ?? 2;
    const hitSet = new Set<EnemyUnit>([from]);
    let cur = from;
    for (let i = 0; i < count; i++) {
      let next: EnemyUnit | null = null;
      let bestD = range;
      for (const e of this.enemies) {
        if (!e.alive || hitSet.has(e)) continue;
        const d = Math.hypot(e.pos.x - cur.pos.x, e.pos.y - cur.pos.y);
        if (d < bestD) {
          bestD = d;
          next = e;
        }
      }
      if (!next) break;
      hitSet.add(next);
      this.fxQueue.push({
        type: 'burst',
        x: next.pos.x,
        y: next.pos.y,
        color: '#9B7BFF',
      });
      if (next.damage(reaction.damage * 0.7)) this.killEnemy(next);
      cur = next;
    }
  }

  spawnUltimate(pos: Vec2): void {
    this.banner = { text: '山海异象', sub: '×4 连锁', life: 1.8, big: true };
    this.fxQueue.push({ type: 'chain', x: pos.x, y: pos.y, color: '#FF6B4A', text: '山海异象' });
    bus.emit('shake', 0.45);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - pos.x, e.pos.y - pos.y);
      if (d < 280) {
        if (e.damage(45)) this.killEnemy(e);
      }
    }
  }

  killEnemy(enemy: EnemyUnit): void {
    if (enemy.killed) return;
    enemy.killed = true;
    enemy.alive = false;
    this.totalKills += 1;
    this.gold += enemy.config.reward;
    bus.emit('gold_changed', this.gold);
    bus.emit('enemy_died', enemy, enemy.config.reward);
  }

  update(rawDt: number): void {
    if (this.paused || this.state !== 'playing') return;
    const dt = Math.min(rawDt, 0.05) * this.speed;
    this.time += dt;

    // 波次
    if (this.betweenWaves) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this.startNextWave();
    } else {
      let pending = false;
      for (const q of this.spawnQueues) {
        if (q.remaining <= 0) continue;
        q.timer -= dt;
        while (q.remaining > 0 && q.timer <= 0) {
          this.spawnEnemy(q.enemyId);
          q.remaining -= 1;
          q.timer += q.interval;
        }
        if (q.remaining > 0) pending = true;
      }
      if (!pending && this.enemies.filter((e) => e.alive && !e.killed).length === 0) {
        this.waveIndex += 1;
        bus.emit('wave_completed', this.waveIndex);
        if (this.waveIndex >= WAVES.length) {
          this.finish(true);
          return;
        }
        this.betweenWaves = true;
        this.waveDelay = 2.5;
      }
    }

    this.updateEnemies(dt);
    this.updateSpirits(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);

    // 清理
    this.enemies = this.enemies.filter((e) => e.alive && !e.killed);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.zones = this.zones.filter((z) => z.alive);

    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.baseHp <= 0) this.finish(false);
  }

  private updateEnemies(dt: number): void {
    const now = this.time;
    for (const e of this.enemies) {
      if (!e.alive || e.killed) continue;
      // 燃烧
      if (now < e.status.burnUntil) {
        if (e.damage(6 * dt)) {
          this.killEnemy(e);
          continue;
        }
      }
      // 冰冻/减速
      let speedMul = 1;
      if (now < e.status.frozenUntil) speedMul = 0;
      else if (now < e.status.slowUntil) speedMul = e.status.slowFactor;

      // Boss
      if (e.isBoss()) this.updateBoss(e, dt);

      e.pathT += e.config.speed * speedMul * dt;
      const p = this.pointOnPath(e.pathT);
      e.pos.x = p.x;
      e.pos.y = p.y;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4);

      if (e.pathT >= this.pathLen - 2) {
        e.alive = false;
        e.reachedBase = true;
        this.baseHp -= e.isBoss() ? 5 : 1;
        bus.emit('base_damaged', e.isBoss() ? 5 : 1);
        bus.emit('base_hp_changed', this.baseHp, this.maxBaseHp);
      }
    }
  }

  private updateBoss(boss: EnemyUnit, dt: number): void {
    boss.chargeCd -= dt;
    boss.summonCd -= dt;
    if (boss.config.chargeInterval && boss.chargeCd <= 0) {
      boss.chargeCd = boss.config.chargeInterval;
      boss.pathT += 40;
      this.fxQueue.push({ type: 'burst', x: boss.pos.x, y: boss.pos.y, color: '#C23B2E' });
    }
    if (boss.config.summonInterval && boss.summonCd <= 0) {
      boss.summonCd = boss.config.summonInterval;
      this.spawnEnemy('enemy.ink_blob');
    }
  }

  private updateSpirits(dt: number): void {
    for (const s of this.spirits) {
      s.cooldown -= dt;
      if (s.cooldown > 0) continue;
      const target = this.findTarget(s);
      if (!target) continue;
      s.cooldown = s.config.attackInterval;
      (s as any).lastAtk = this.time;
      const dmg = s.effectiveDamage();
      const statusDur = s.config.statusDuration * this.resonance.statusDurationBonus(s);
      const type = s.config.attackType;
      if (type === 'projectile') {
        this.projectiles.push(
          new Projectile({
            pos: { ...s.pos },
            target,
            speed: s.config.projectileSpeed || 400,
            damage: dmg,
            element: s.element,
            status: s.config.status,
            statusDuration: statusDur,
            splash: s.config.splash ?? 0,
          })
        );
      } else if (type === 'beam') {
        this.applyHit(target, dmg, s.element, s.config.status, statusDur);
        // 湿目标弹射
        const chainCount = s.config.chainCount ?? 0;
        let cur = target;
        const hit = new Set<EnemyUnit>([target]);
        for (let i = 0; i < chainCount; i++) {
          let next: EnemyUnit | null = null;
          let best = s.config.chainRange ?? 140;
          for (const e of this.enemies) {
            if (!e.alive || hit.has(e)) continue;
            const prefer = s.config.preferWet && e.isWet(this.time) ? 0.5 : 1;
            const d = Math.hypot(e.pos.x - cur.pos.x, e.pos.y - cur.pos.y) * prefer;
            if (d < best) {
              best = d;
              next = e;
            }
          }
          if (!next) break;
          hit.add(next);
          this.fxQueue.push({ type: 'burst', x: next.pos.x, y: next.pos.y, color: '#B39CFF' });
          this.applyHit(next, dmg * 0.7, s.element, s.config.status, statusDur * 0.6);
          cur = next;
        }
      } else if (type === 'pulse') {
        const r = s.config.pulseRadius ?? 100;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - s.pos.x, e.pos.y - s.pos.y) <= r) {
            this.applyHit(e, dmg, s.element, s.config.status, statusDur);
          }
        }
        // 风扩散环境
        if (s.config.spreadEnv) {
          for (const z of this.zones) {
            if (z.type === 'FIRE_FIELD' || z.type === 'STEAM' || z.type === 'STORM') {
              z.duration += 0.4;
            }
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      const res = p.update(dt, this.path);
      if (res.hitEnemy && res.hitEnemy.alive) {
        this.applyHit(res.hitEnemy, p.damage, p.element, p.status, p.statusDuration);
        if (p.splash > 0) {
          for (const e of this.enemies) {
            if (e === res.hitEnemy || !e.alive) continue;
            if (Math.hypot(e.pos.x - res.hitPos!.x, e.pos.y - res.hitPos!.y) <= p.splash) {
              this.applyHit(e, p.damage * 0.45, p.element, p.status, p.statusDuration * 0.5);
            }
          }
        }
      }
    }
  }

  private updateZones(dt: number): void {
    const now = this.time;
    for (const z of this.zones) {
      if (!z.alive) continue;
      if (!z.persistent) {
        z.age += dt;
        if (z.age >= z.duration) {
          z.alive = false;
          continue;
        }
      }
      if (z.tickDamage <= 0) continue;
      z.tickTimer += dt;
      if (z.tickTimer < 0.5) continue;
      z.tickTimer = 0;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (pointInZone(e.pos, z)) {
          if (e.damage(z.tickDamage * 0.5)) this.killEnemy(e);
          else if (z.type === 'FIRE_FIELD') this.reactions.applyElement(e, 'FIRE', 1.2, now, this.chain, (r, t, i) => this.runReaction(r, t, i));
          else if (z.type === 'NATURAL_WATER') this.reactions.applyElement(e, 'WATER', 2.5, now, this.chain, (r, t, i) => this.runReaction(r, t, i));
        }
      }
    }
  }

  finish(victory: boolean): void {
    this.state = victory ? 'victory' : 'defeat';
    bus.emit('battle_finished', victory);
  }

  drainFx(): FxEvent[] {
    const q = this.fxQueue;
    this.fxQueue = [];
    return q;
  }
}
