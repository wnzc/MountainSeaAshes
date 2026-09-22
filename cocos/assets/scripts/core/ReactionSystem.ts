import {
  CHAIN_WINDOW,
  CHAIN_NAMES,
  reactionKey,
  REACTION_DB,
  ReactionConfig,
  ElementId,
  Vec2,
} from '../config/GameConfig';
import { EnemyUnit } from './EnemyUnit';
import { bus } from './EventBus';

export interface ChainContext {
  id: number;
  level: number;
  lastAt: number;
  source: string;
}

export class ChainSystem {
  chain: ChainContext | null = null;
  chainId = 0;

  /** 在连锁窗口内则升级，否则重开连锁 */
  nextContext(source: string, now: number): ChainContext {
    if (this.chain && now - this.chain.lastAt < CHAIN_WINDOW) {
      this.chain.lastAt = now;
      this.chain.level += 1;
    } else {
      this.chainId += 1;
      this.chain = { id: this.chainId, level: 1, lastAt: now, source };
    }
    if (this.chain.level >= 2) {
      bus.emit('chain_reached', this.chain.level, CHAIN_NAMES[this.chain.level] || `×${this.chain.level}`);
    }
    return this.chain;
  }

  reset(): void {
    this.chain = null;
    this.chainId = 0;
  }

  get level(): number {
    return this.chain?.level ?? 0;
  }
}

export class ReactionSystem {
  /**
   * 双元素附着：顺序无关 A+B = B+A。
   * 已有不同元素则触发反应；否则刷新附着。
   */
  applyElement(
    target: EnemyUnit,
    incoming: ElementId,
    duration: number,
    now: number,
    chain: ChainSystem,
    onReaction: (reaction: ReactionConfig, target: EnemyUnit, incoming: ElementId) => void
  ): void {
    let existing: ElementId | null = null;
    if (target.element && now < target.elementUntil && target.element !== incoming) {
      existing = target.element;
    }
    if (existing) {
      const reaction = REACTION_DB.get(reactionKey(existing, incoming));
      if (reaction) {
        target.element = null;
        target.elementUntil = 0;
        const ctx = chain.nextContext(reaction.id, now);
        bus.emit('reaction_triggered', reaction.id, { x: target.pos.x, y: target.pos.y }, ctx);
        onReaction(reaction, target, incoming);
        return;
      }
    }
    target.applyElementMark(incoming, now + duration);
    bus.emit('element_applied', target, incoming);
    if (incoming === 'WATER') target.status.wetUntil = Math.max(target.status.wetUntil, now + duration);
  }

  /** 反应伤害与附加状态 */
  execute(
    reaction: ReactionConfig,
    target: EnemyUnit,
    now: number,
    chain: ChainSystem
  ): {
    died: boolean;
    env: { type: string; duration: number; x: number; y: number } | null;
    bounce: boolean;
    splash: number;
  } {
    let dmg = reaction.damage;
    // 潮湿导电略增伤
    if (reaction.id === 'reaction.conduct' && target.isWet(now)) dmg *= 1.25;
    if (reaction.freeze) {
      target.status.frozenUntil = now + (reaction.duration || 2);
    }
    if (reaction.duration && reaction.output === 'FIRE_FIELD') {
      // 火场由 env 处理
    }
    const died = target.damage(dmg);
    let env: { type: string; duration: number; x: number; y: number } | null = null;
    if (reaction.envCreate) {
      env = {
        type: reaction.envCreate.type,
        duration: reaction.envCreate.duration,
        x: target.pos.x,
        y: target.pos.y,
      };
    }
    // 4 连大招加成
    if (chain.level >= 4) {
      // 由 Battle 额外处理视觉/范围
    }
    return {
      died,
      env,
      bounce: !!reaction.bounce,
      splash: reaction.splash ?? 0,
    };
  }
}
