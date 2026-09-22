import { ElementId, EnemyConfig, Vec2 } from '../config/GameConfig';

export interface EnemyStatus {
  burnUntil: number;
  slowUntil: number;
  slowFactor: number;
  wetUntil: number;
  frozenUntil: number;
}

let uid = 1;

export class EnemyUnit {
  id = uid++;
  config: EnemyConfig;
  hp: number;
  maxHp: number;
  pos: Vec2 = { x: 0, y: 0 };
  pathT = 0;
  pathLen = 0;
  alive = true;
  killed = false;
  reachedBase = false;
  element: ElementId | null = null;
  elementUntil = 0;
  status: EnemyStatus = {
    burnUntil: 0,
    slowUntil: 0,
    slowFactor: 1,
    wetUntil: 0,
    frozenUntil: 0,
  };
  shellBroken = false;
  stealthPhase = 0;
  chargeCd = 0;
  summonCd = 0;
  hitFlash = 0;

  constructor(config: EnemyConfig, pathLen: number) {
    this.config = config;
    this.hp = config.maxHp;
    this.maxHp = config.maxHp;
    this.pathLen = pathLen;
  }

  isBoss(): boolean {
    return !!this.config.isBoss;
  }

  isWet(now: number): boolean {
    return now < this.status.wetUntil;
  }

  isFrozen(now: number): boolean {
    return now < this.status.frozenUntil;
  }

  isStealthed(now: number): boolean {
    if (!this.config.stealth) return false;
    const p = this.config.stealthPeriod || 3.5;
    this.stealthPhase = (this.stealthPhase + 0) % p;
    // 用 pathT 驱动相位，避免每帧外部传 dt 时漏更新
    const phase = (now / p) % 1;
    return phase > 0.55;
  }

  applyStatus(kind: string, duration: number, now: number): void {
    if (kind === 'BURN') this.status.burnUntil = Math.max(this.status.burnUntil, now + duration);
    if (kind === 'CHILL') {
      this.status.slowUntil = Math.max(this.status.slowUntil, now + duration);
      this.status.slowFactor = 0.55;
    }
  }

  applyElementMark(element: ElementId, until: number): void {
    this.element = element;
    this.elementUntil = until;
    if (element === 'WATER') this.status.wetUntil = Math.max(this.status.wetUntil, until);
  }

  damage(amount: number): boolean {
    if (!this.alive || this.killed) return false;
    let dmg = amount;
    if (this.config.tag === 'tank' && !this.shellBroken) dmg *= 0.65;
    if (this.config.crack && this.hp < this.maxHp * 0.5) this.shellBroken = true;
    this.hp -= dmg;
    this.hitFlash = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }
}
