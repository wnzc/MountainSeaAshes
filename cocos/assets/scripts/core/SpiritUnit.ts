import { SpiritConfig, ElementId, Vec2 } from '../config/GameConfig';

export interface SlotRuntime {
  id: string;
  x: number;
  y: number;
  neighborIds: string[];
  spirit: SpiritUnit | null;
}

export class SpiritUnit {
  config: SpiritConfig;
  slotId: string;
  pos: Vec2;
  level = 1;
  damage: number;
  range: number;
  cooldown = 0;
  resonanceBonus = 1;
  element: ElementId;

  constructor(config: SpiritConfig, slotId: string, pos: Vec2) {
    this.config = config;
    this.slotId = slotId;
    this.pos = { x: pos.x, y: pos.y };
    this.damage = config.damage;
    this.range = config.range;
    this.element = config.element;
  }

  get name(): string {
    return this.config.name;
  }

  getUpgradeCost(): number | null {
    const costs = this.config.upgradeCost;
    if (this.level - 1 >= costs.length) return null;
    return costs[this.level - 1];
  }

  applyUpgrade(): void {
    const bonus = this.config.upgradeDamage[this.level - 1] ?? 0;
    this.damage += bonus;
    this.level += 1;
  }

  effectiveDamage(): number {
    return this.damage * this.resonanceBonus;
  }
}
