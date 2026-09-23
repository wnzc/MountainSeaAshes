import { Color, Graphics, Node, UITransform, Vec3 } from 'cc';

export function hexColor(hex: string, alpha = 255): Color {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return new Color(r, g, b, alpha);
}

export function ensureTransform(node: Node, w: number, h: number): UITransform {
  let ut = node.getComponent(UITransform);
  if (!ut) ut = node.addComponent(UITransform);
  ut.setContentSize(w, h);
  return ut;
}

/** 装饰节点不挡点击（背景/立绘/文字等） */
export function passHits(node: Node): void {
  const ut = node.getComponent(UITransform);
  if (ut) {
    (ut as unknown as { isHit: () => boolean }).isHit = function isHit() {
      return false;
    };
  }
  for (const c of node.children) passHits(c);
}

/** 可点击节点：子节点穿透 + 监听 TOUCH_END */
export function bindClick(node: Node, onClick: () => void): void {
  passHits(node);
  // 自己恢复可点
  const ut = node.getComponent(UITransform);
  if (ut) {
    // 标准 isHit：矩形命中
    delete (ut as unknown as { isHit?: unknown }).isHit;
  }
  node.off(Node.EventType.TOUCH_END);
  node.off(Node.EventType.MOUSE_UP);
  const handler = () => onClick();
  node.on(Node.EventType.TOUCH_END, handler);
  node.on(Node.EventType.MOUSE_UP, handler);
  // 子节点（Label 等）保持穿透
  for (const c of node.children) passHits(c);
}

export function drawCircle(g: Graphics, x: number, y: number, r: number, color: Color, fill = true): void {
  g.fillColor = color;
  g.strokeColor = color;
  g.lineWidth = 3;
  g.circle(x, y, r);
  if (fill) g.fill();
  g.stroke();
}

export function drawRect(g: Graphics, x: number, y: number, w: number, h: number, color: Color, fill = true): void {
  g.fillColor = color;
  g.strokeColor = color;
  g.lineWidth = 2;
  g.rect(x, y, w, h);
  if (fill) g.fill();
  g.stroke();
}

export function drawPath(g: Graphics, pts: { x: number; y: number }[], color: Color, width: number): void {
  if (pts.length < 2) return;
  g.strokeColor = color;
  g.lineWidth = width;
  // 仅用 lineTo：输入应是已 Catmull-Rom 加密的点
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.stroke();
}

/** 将 MAP 坐标（原点左上）转到 Cocos UI（原点中心，Y 向上） */
export function mapToWorld(mx: number, my: number, mapW: number, mapH: number): Vec3 {
  return new Vec3(mx - mapW / 2, mapH / 2 - my, 0);
}
