import { SpiritUnit, SlotRuntime } from './SpiritUnit';
import { bus } from './EventBus';

/**
 * 邻接共鸣：相邻不同元素灵兽延长元素状态并小幅增伤。
 */
export class Resonance {
  rebuild(slots: Map<string, SlotRuntime>): void {
    for (const slot of slots.values()) {
      if (!slot.spirit) continue;
      const spirit = slot.spirit;
      let count = 0;
      for (const nid of slot.neighborIds) {
        const n = slots.get(nid);
        if (n?.spirit && n.spirit.element !== spirit.element) count += 1;
      }
      // 0.06/相邻，上限 1.24
      spirit.resonanceBonus = 1 + Math.min(count, 4) * 0.06;
    }
    bus.emit('resonance_changed');
  }

  /** 返回需要延长的元素附着时长倍率（由共鸣决定） */
  statusDurationBonus(spirit: SpiritUnit): number {
    return spirit.resonanceBonus;
  }

  links(slots: Map<string, SlotRuntime>): Array<[SpiritUnit, SpiritUnit]> {
    const out: Array<[SpiritUnit, SpiritUnit]> = [];
    const seen = new Set<string>();
    for (const slot of slots.values()) {
      if (!slot.spirit) continue;
      for (const nid of slot.neighborIds) {
        const n = slots.get(nid);
        if (!n?.spirit) continue;
        const key = [slot.id, nid].sort().join('|');
        if (seen.has(key)) continue;
        if (slot.spirit.element === n.spirit.element) continue;
        seen.add(key);
        out.push([slot.spirit, n.spirit]);
      }
    }
    return out;
  }
}
