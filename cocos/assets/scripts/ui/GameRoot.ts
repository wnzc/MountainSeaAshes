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
} from 'cc';
import { Battle } from '../core/Battle';
import { GameUI } from './GameUI';
import { MAP } from '../config/GameConfig';

const { ccclass } = _decorator;

/**
 * 场景入口：程序化搭建战斗场景与 UI。
 * 挂到 Canvas 下（或空场景根节点，自动补 Canvas/Camera）。
 */
@ccclass('GameRoot')
export class GameRoot extends Component {
  private battle!: Battle;
  private ui!: GameUI;
  private mapW = MAP.width;
  private mapH = MAP.height;
  private lastPointer = 0;

  onLoad(): void {
    try {
      this.ensureCanvas();
      if (!this.node.getComponent(UITransform)) {
        this.node.addComponent(UITransform).setContentSize(this.mapW, this.mapH);
      }
      view.setDesignResolutionSize(this.mapW, this.mapH, ResolutionPolicy.SHOW_ALL);
      this.battle = new Battle();
      this.ui = new GameUI(this.node, this.battle);
      this.battle.state = 'ready';
      input.on(Input.EventType.TOUCH_START, this.onTouch, this);
      input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
      // 节点事件兜底（部分 Web 预览下全局 input 不稳）
      const self = this.node;
      self.on(Node.EventType.TOUCH_START, this.onNodeTouch, this);
      self.on(Node.EventType.MOUSE_DOWN, this.onNodeTouch, this);
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

  private onNodeTouch(e: { getUILocation(): { x: number; y: number } }): void {
    if (!this.battle) return;
    const now = Date.now();
    if (now - this.lastPointer < 180) return;
    this.lastPointer = now;
    const p = e.getUILocation();
    const m = this.screenToMap(p.x, p.y);
    this.battle.handlePointer(m.x, m.y);
  }

  private ensureCanvas(): void {
    let canvas = this.node.getComponent(Canvas);
    if (!canvas) {
      // 若挂在普通节点下，向上找
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
      // 节点中心原点、Y 向上 → 地图左上原点、Y 向下
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

  private onTouch(e: EventTouch): void {
    if (!this.battle) return;
    const now = Date.now();
    if (now - this.lastPointer < 180) return;
    this.lastPointer = now;
    const p = e.getUILocation();
    const m = this.screenToMap(p.x, p.y);
    this.battle.handlePointer(m.x, m.y);
  }

  private onMouseDown(e: EventMouse): void {
    if (!this.battle) return;
    const now = Date.now();
    if (now - this.lastPointer < 180) return;
    this.lastPointer = now;
    const p = (e as unknown as { getUILocation(): { x: number; y: number } }).getUILocation();
    if (!p) return;
    const m = this.screenToMap(p.x, p.y);
    this.battle.handlePointer(m.x, m.y);
  }

  update(dt: number): void {
    if (!this.battle || !this.ui) return;
    try {
      this.battle.update(dt);
      this.ui.updateView(dt);
    } catch (e) {
      console.error('[GameRoot] update failed', e);
    }
  }
}
