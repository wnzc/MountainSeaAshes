type Handler = (...args: any[]) => void;

/** 全局事件总线 — 只广播事实 */
export class EventBus {
  private map = new Map<string, Set<Handler>>();

  on(name: string, fn: Handler): () => void {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name)!.add(fn);
    return () => this.off(name, fn);
  }

  off(name: string, fn: Handler): void {
    this.map.get(name)?.delete(fn);
  }

  emit(name: string, ...args: any[]): void {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      if (typeof fn !== 'function') continue;
      try {
        fn(...args);
      } catch (e) {
        console.error('[EventBus]', name, e);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}

export const bus = new EventBus();
