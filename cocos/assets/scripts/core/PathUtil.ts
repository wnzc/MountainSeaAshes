import { Vec2 } from '../config/GameConfig';

/** Catmull-Rom 样条加密，路径圆润（与 Godot _smooth_path 对齐） */
export function smoothPath(src: { x: number; y: number }[], steps = 5): { x: number; y: number }[] {
  if (src.length < 2) return src.map((p) => ({ x: p.x, y: p.y }));
  const out: { x: number; y: number }[] = [];
  const n = src.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = src[Math.max(i - 1, 0)];
    const p1 = src[i];
    const p2 = src[i + 1];
    const p3 = src[Math.min(i + 2, n - 1)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push({ x: src[n - 1].x, y: src[n - 1].y });
  return out;
}

export function pathLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return len;
}
