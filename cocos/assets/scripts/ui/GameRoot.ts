import {
  _decorator,
  Component,
  Node,
  Canvas,
  Camera,
  UITransform,
  view,
  input,
  Input,
  EventTouch,
  EventMouse,
  Vec3,
  ResolutionPolicy,
  Layers,
  Label,
  Color,
  Graphics,
  Sprite,
} from 'cc';
import { Battle } from '../core/Battle';
import { GameUI } from './GameUI';
import { MAP, ELEMENTS, SPIRITS, SPIRIT_ORDER, ENEMIES } from '../config/GameConfig';
import { spriteCache, makeSpriteNode } from './SpriteCache';

const { ccclass } = _decorator;

/**
 * 场景入口。除 UI 外，每帧用 Graphics 直接绘制灵兽/怪物，
 * 保证「底座上有灵兽、路上有怪物」不依赖贴图加载。
 */
@ccclass('GameRoot')
export class GameRoot extends Component {
  private battle!: Battle;
  private ui!: GameUI;
  private mapW = MAP.width;
  private mapH = MAP.height;
  private lastPointer = 0;
  private gizmo!: Graphics;
  private unitSpriteLayer!: Node;
  private spiritSprites = new Map<string, { node: Node; sprite: Sprite }>();
  private enemySprites = new Map<number, { node: Node; sprite: Sprite }>();
  private debugTimer = 0;

  onLoad(): void {
    try {
      this.ensureCanvas();
      if (!this.node.getComponent(UITransform)) {
        this.node.addComponent(UITransform).setContentSize(this.mapW, this.mapH);
      }
      view.setDesignResolutionSize(this.mapW, this.mapH, ResolutionPolicy.SHOW_ALL);
      this.battle = new Battle();
      this.battle.state = 'ready';

      // 先建 UI/地图，再建单位绘制层，保证在最上
      try {
        this.ui = new GameUI(this.node, this.battle);
      } catch (uiErr) {
        console.error('[GameRoot] GameUI failed, units still paint', uiErr);
      }

      const paint = new Node('UnitPaint');
      paint.layer = Layers.Enum.UI_2D;
      const ut = paint.addComponent(UITransform);
      ut.setContentSize(this.mapW, this.mapH);
      this.node.addChild(paint);
      paint.setSiblingIndex(this.node.children.length - 1);
      this.gizmo = paint.addComponent(Graphics);

      // 立绘层（在矢量底之上）
      this.unitSpriteLayer = new Node('UnitSprites');
      this.unitSpriteLayer.layer = Layers.Enum.UI_2D;
      const st = this.unitSpriteLayer.addComponent(UITransform);
      st.setContentSize(this.mapW, this.mapH);
      this.node.addChild(this.unitSpriteLayer);
      this.unitSpriteLayer.setSiblingIndex(this.node.children.length - 1);
      this.preloadUnitArt();

      input.on(Input.EventType.TOUCH_START, this.onTouch, this);
      input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
      this.node.on(Node.EventType.TOUCH_START, this.onNodeTouch, this);
      this.node.on(Node.EventType.MOUSE_DOWN, this.onNodeTouch, this);
    } catch (e) {
      console.error('[GameRoot] init failed', e && (e as Error).stack || e);
      this.showFatal(e);
    }
  }

  private showFatal(e: unknown): void {
    const n = new Node('Fatal');
    n.layer = Layers.Enum.UI_2D;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(900, 400);
    this.node.addChild(n);
    const lab = n.addComponent(Label);
    lab.string = `GameRoot 初始化失败\n${String(e)}`;
    lab.fontSize = 28;
    lab.lineHeight = 36;
    lab.color = new Color(255, 80, 80, 255);
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
  }

  onDestroy(): void {
    input.off(Input.EventType.TOUCH_START, this.onTouch, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
  }

  private toLocal(mx: number, my: number): { x: number; y: number } {
    return { x: mx - this.mapW / 2, y: this.mapH / 2 - my };
  }

  private preloadUnitArt(): void {
    for (const id of SPIRIT_ORDER) spriteCache.load(SPIRITS[id].sprite, () => {});
    for (const key of Object.keys(ENEMIES)) spriteCache.load(ENEMIES[key].sprite, () => {});
  }

  /** 灵兽 / 怪物立绘：贴图跟随单位；矢量仍作底影 */
  private syncUnitSprites(): void {
    if (!this.battle || !this.unitSpriteLayer) return;
    const aliveSpiritKeys = new Set<string>();
    for (const slot of this.battle.slots.values()) {
      if (!slot.spirit) continue;
      const key = slot.id;
      aliveSpiritKeys.add(key);
      let view = this.spiritSprites.get(key);
      if (!view) {
        view = makeSpriteNode('SpiritArt_' + key, 150, slot.spirit.config.sprite, this.unitSpriteLayer);
        this.spiritSprites.set(key, view);
      }
      const p = this.toLocal(slot.x, slot.y);
      view.node.setPosition(p.x, p.y - 8);
      view.node.active = true;
    }
    for (const [key, view] of this.spiritSprites) {
      if (!aliveSpiritKeys.has(key)) {
        view.node.destroy();
        this.spiritSprites.delete(key);
      }
    }

    const aliveEnemyIds = new Set<number>();
    for (const e of this.battle.enemies) {
      if (!e.alive) continue;
      aliveEnemyIds.add(e.id);
      let view = this.enemySprites.get(e.id);
      if (!view) {
        const size = Math.max(72, e.config.radius * 2.8);
        view = makeSpriteNode('EnemyArt_' + e.id, size, e.config.sprite, this.unitSpriteLayer);
        this.enemySprites.set(e.id, view);
      }
      const p = this.toLocal(e.pos.x, e.pos.y);
      view.node.setPosition(p.x, p.y);
      view.node.active = true;
    }
    for (const [id, view] of this.enemySprites) {
      if (!aliveEnemyIds.has(id)) {
        view.node.destroy();
        this.enemySprites.delete(id);
      }
    }
  }

  /** 每帧强制绘制单位 — 不依赖 Sprite */
  private paintUnits(): void {
    const g = this.gizmo;
    if (!g) return;
    g.clear();

    // 路径底衬（弱）
    if (this.battle && this.battle.path) {
      const pts = this.battle.path;
      if (pts.length > 1) {
        g.strokeColor = new Color(80, 65, 45, 60);
        g.lineWidth = 78;
        g.moveTo(...this.v(pts[0]));
        for (let i = 1; i < pts.length; i++) g.lineTo(...this.v(pts[i]));
        g.stroke();
      }
    }

    // 塔位底座
    if (this.battle) {
      for (const slot of this.battle.slots.values()) {
        const [x, y] = this.v(slot);
        g.fillColor = new Color(212, 168, 75, 200);
        g.circle(x, y, 42);
        g.fill();
        // 灵兽
        if (slot.spirit) {
          const col = ELEMENTS[slot.spirit.element];
          const c = this.hex(col ? col.color : '#E85D3A');
          g.fillColor = c;
          g.circle(x, y - 8, 22);
          g.fill();
          g.circle(x, y - 42, 16);
          g.fill();
          g.fillColor = new Color(15, 15, 15, 255);
          g.circle(x - 8, y - 56, 4);
          g.fill();
          g.circle(x + 8, y - 56, 4);
          g.fill();
        }
      }
    }

    // 怪物
    if (this.battle) {
      for (const e of this.battle.enemies) {
        if (!e.alive) continue;
        const [x, y] = this.v(e.pos);
        g.fillColor = new Color(20, 20, 20, 245);
        g.circle(x, y, Math.max(14, e.config.radius * 0.75));
        g.fill();
        g.fillColor = new Color(194, 59, 46, 255);
        g.circle(x - 7, y - 3, 4);
        g.fill();
        g.circle(x + 7, y - 3, 4);
        g.fill();
        // 血条
        const ratio = e.hp / e.maxHp;
        g.fillColor = new Color(0, 0, 0, 160);
        g.rect(x - 28, y + e.config.radius + 10, 56, 7);
        g.fill();
        g.fillColor = new Color(200, 60, 50, 230);
        g.rect(x - 28, y + e.config.radius + 10, 56 * ratio, 7);
        g.fill();
      }
    }
  }

  private v(p: { x: number; y: number }): [number, number] {
    const l = this.toLocal(p.x, p.y);
    return [l.x, l.y];
  }

  private hex(color: string): Color {
    const h = color.replace('#', '');
    return new Color(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255);
  }

  private ensureCanvas(): void {
    let canvas = this.node.getComponent(Canvas);
    if (!canvas) {
      canvas = this.node.parent?.getComponent(Canvas) || null;
    }
    if (!canvas) {
      const camNode = new Node('Camera');
      const cam = camNode.addComponent(Camera);
      cam.projection = Camera.ProjectionType.ORTHO;
      cam.orthoHeight = this.mapH / 2;
      cam.near = -1000;
      cam.far = 1000;
      camNode.layer = Layers.Enum.UI_2D;
      this.node.addChild(camNode);
      this.node.addComponent(UITransform).setContentSize(this.mapW, this.mapH);
    }
  }

  private screenToMap(x: number, y: number): { x: number; y: number } {
    const ut = this.node.getComponent(UITransform) || this.node.parent?.getComponent(UITransform);
    if (ut) {
      const local = ut.convertToNodeSpaceAR(new Vec3(x, y, 0));
      return {
        x: local.x + this.mapW / 2,
        y: this.mapH / 2 - local.y,
      };
    }
    const ds = view.getDesignResolutionSize();
    const lx = x - ds.width / 2;
    const ly = y - ds.height / 2;
    return {
      x: lx + this.mapW / 2,
      y: this.mapH / 2 - ly,
    };
  }

  private tap(x: number, y: number): void {
    if (!this.battle) return;
    const now = Date.now();
    if (now - this.lastPointer < 180) return;
    this.lastPointer = now;
    // 若仍在封面且点了地图区域，兜底开局，保证能进战斗
    if (this.battle.state === 'ready') {
      this.battle.start();
      if (this.ui) this.ui.enterBattlePublic?.();
    }
    const m = this.screenToMap(x, y);
    this.battle.handlePointer(m.x, m.y);
  }

  private onNodeTouch(e: { getUILocation(): { x: number; y: number } }): void {
    const p = e.getUILocation();
    this.tap(p.x, p.y);
  }

  private onTouch(e: EventTouch): void {
    const p = e.getUILocation();
    this.tap(p.x, p.y);
  }

  private onMouseDown(e: EventMouse): void {
    const p = (e as unknown as { getUILocation(): { x: number; y: number } }).getUILocation();
    if (!p) return;
    this.tap(p.x, p.y);
  }

  update(dt: number): void {
    if (!this.battle) return;
    try {
      if (this.battle.state === 'playing') {
        this.battle.update(dt);
      }
      if (this.ui) this.ui.updateView(dt);
    } catch (e) {
      console.error('[GameRoot] update failed', e);
    }
    // 单位层永远最后画
    this.paintUnits();
    this.syncUnitSprites();
    this.debugTimer += dt;
    if (this.debugTimer > 2) {
      this.debugTimer = 0;
      console.log(
        '[GameRoot]',
        'state=' + this.battle.state,
        'spirits=' + this.battle.spirits.length,
        'enemies=' + this.battle.enemies.filter((e) => e.alive).length,
        'gold=' + this.battle.gold,
      );
    }
  }
}
