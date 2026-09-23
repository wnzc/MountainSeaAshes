/**
 * 轻量事件总线 — 对齐 Godot EventBus
 */
type Handler = (...args: any[]) => void;

export class EventBus {
  private map = new Map<string, Set<Handler>>();

  on(name: string, fn: Handler): () => void {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name)!.add(fn);
    return () => this.off(name, fn);
  }

  off(name: string, fn: Handler) {
    this.map.get(name)?.delete(fn);
  }

  emit(name: string, ...args: any[]) {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of [...set]) fn(...args);
  }

  clear() {
    this.map.clear();
  }
}

export const bus = new EventBus();
