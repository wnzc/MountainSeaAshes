import { ElementId, Vec2 } from '../config/GameConfig';
import { EnemyUnit } from './EnemyUnit';

export class Projectile {
  pos: Vec2;
  target: EnemyUnit | null;
  speed: number;
  damage: number;
  element: ElementId;
  status: string;
  statusDuration: number;
  splash: number;
  alive = true;
  /** 朝固定方向飞（用于未锁定时） */
  dir: Vec2 = { x: 0, y: 0 };

  constructor(opts: {
    pos: Vec2;
    target: EnemyUnit | null;
    speed: number;
    damage: number;
    element: ElementId;
    status: string;
    statusDuration: number;
    splash: number;
  }) {
    this.pos = { x: opts.pos.x, y: opts.pos.y };
    this.target = opts.target;
    this.speed = opts.speed;
    this.damage = opts.damage;
    this.element = opts.element;
    this.status = opts.status;
    this.statusDuration = opts.statusDuration;
    this.splash = opts.splash;
  }

  update(dt: number, path: Vec2[]): { hitEnemy: EnemyUnit | null; hitPos: Vec2 | null } {
    if (!this.alive) return { hitEnemy: null, hitPos: null };
    const tgt = this.target;
    if (tgt && tgt.alive) {
      const dx = tgt.pos.x - this.pos.x;
      const dy = tgt.pos.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (d <= step + tgt.config.radius) {
        this.alive = false;
        return { hitEnemy: tgt, hitPos: { x: tgt.pos.x, y: tgt.pos.y } };
      }
      this.pos.x += (dx / d) * step;
      this.pos.y += (dy / d) * step;
    } else {
      this.alive = false;
      return { hitEnemy: null, hitPos: null };
    }
    // 出界回收
    if (this.pos.x < -50 || this.pos.x > 1200 || this.pos.y < -50 || this.pos.y > 2800) {
      this.alive = false;
    }
    return { hitEnemy: null, hitPos: null };
  }
}

export interface EnvironmentZone {
  id: number;
  type: 'NATURAL_WATER' | 'ICE' | 'FIRE_FIELD' | 'STEAM' | 'STORM';
  x: number;
  y: number;
  w: number;
  h: number;
  element: ElementId;
  duration: number;
  age: number;
  tickDamage: number;
  tickTimer: number;
  persistent: boolean;
  alive: boolean;
}

let zid = 1;

export function createZone(opts: {
  type: EnvironmentZone['type'];
  x: number;
  y: number;
  w: number;
  h: number;
  element: ElementId;
  duration: number;
  tickDamage?: number;
  persistent?: boolean;
}): EnvironmentZone {
  return {
    id: zid++,
    type: opts.type,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    element: opts.element,
    duration: opts.duration,
    age: 0,
    tickDamage: opts.tickDamage ?? 0,
    tickTimer: 0,
    persistent: !!opts.persistent,
    alive: true,
  };
}

export function pointInZone(p: Vec2, z: EnvironmentZone): boolean {
  return p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
}
