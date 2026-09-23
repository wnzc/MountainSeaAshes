import {
  resources,
  Sprite,
  SpriteFrame,
  Texture2D,
  Node,
  UITransform,
  Color,
  Layers,
  Rect,
} from 'cc';

/**
 * 贴图缓存。
 * 路径为 resources 相对路径，如 textures/characters/spirit_red_feather
 * 兼容 texture 型（无 spriteFrame 子资源）与 sprite-frame 型导入。
 */
export class SpriteCache {
  private frames = new Map<string, SpriteFrame>();
  private pending = new Map<string, Array<(sf: SpriteFrame | null) => void>>();

  load(path: string, done: (sf: SpriteFrame | null) => void): void {
    if (this.frames.has(path)) {
      done(this.frames.get(path)!);
      return;
    }
    if (!this.pending.has(path)) {
      this.pending.set(path, []);
      // 优先 /texture（当前资源均为 texture 导入），失败再试 /spriteFrame
      resources.load(path + '/texture', Texture2D, (err, tex) => {
        if (!err && tex) {
          const sf = new SpriteFrame();
          sf.texture = tex;
          sf.rect = new Rect(0, 0, tex.width, tex.height);
          this.finish(path, sf);
          return;
        }
        resources.load(path + '/spriteFrame', SpriteFrame, (err2, sf2) => {
          if (err2 || !sf2) {
            console.warn('[SpriteCache] load failed', path, err2);
          }
          this.finish(path, !err2 && sf2 ? sf2 : null);
        });
      });
    }
    this.pending.get(path)!.push(done);
  }

  private finish(path: string, result: SpriteFrame | null): void {
    const cbs = this.pending.get(path) || [];
    this.pending.delete(path);
    if (result) this.frames.set(path, result);
    for (const cb of cbs) cb(result);
  }

  get(path: string): SpriteFrame | null {
    return this.frames.get(path) || null;
  }

  preload(paths: string[]): void {
    for (const p of paths) this.load(p, () => {});
  }
}

export const spriteCache = new SpriteCache();

export function makeSpriteNode(
  name: string,
  size: number,
  path: string,
  parent: Node,
  tint: Color = Color.WHITE
): { node: Node; sprite: Sprite } {
  const node = new Node(name);
  const ut = node.addComponent(UITransform);
  // 先按正方占位，加载后按贴图比例收缩，避免拉伸
  ut.setContentSize(size, size);
  node.layer = Layers.Enum.UI_2D;
  parent.addChild(node);
  (ut as unknown as { isHit: () => boolean }).isHit = function isHit() {
    return false;
  };
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  sprite.color = tint;
  spriteCache.load(path, (sf) => {
    if (!node.isValid) return;
    if (sf) {
      sprite.spriteFrame = sf;
      sprite.color = Color.WHITE;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      const tw = sf.rect.width || 1;
      const th = sf.rect.height || 1;
      const scale = size / Math.max(tw, th);
      const w = Math.round(tw * scale);
      const h = Math.round(th * scale);
      node.getComponent(UITransform)!.setContentSize(w, h);
    } else {
      sprite.color = new Color(220, 80, 80, 255);
    }
  });
  return { node, sprite };
}
