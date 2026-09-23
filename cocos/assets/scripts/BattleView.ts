/**
 * Cocos Creator 3.8 战斗组件 — 用 BattleCore 驱动，绘制 9:21 战场
 */
import {
  _decorator, Component, Node, Sprite, UITransform, Color, Label,
  EventTouch, Layers, resources, SpriteFrame, tween, Vec3,
} from 'cc';
import { BattleCore, pushOffPath, DESIGN, SPIRITS, SPIRIT_ORDER, ELEMENT_META, MAP } from './BattleCore';
import { bus } from './EventBus';

const { ccclass, property } = _decorator;

@ccclass('BattleView')
export class BattleView extends Component {
  private core = new BattleCore();
  private enemyNodes = new Map<any, Node>();
  private spiritNodes = new Map<any, Node>();
  private baseNodes = new Map<string, Node>();

  onLoad() {
    // 设计分辨率 1080×2520（9:21）
    bus.on('gold_changed', () => this.refreshHud());
    bus.on('base_damaged', () => this.refreshHud());
    this.buildMap();
    this.buildSlots();
    this.buildCards();
  }

  update(dt: number) {
    this.core.update(dt);
    this.syncSprites();
    this.refreshHud();
  }

  private buildMap() {
    // 背景图 map_bg_921
    resources.load('maps/map_bg_921/spriteFrame', SpriteFrame, (err, sf) => {
      if (!err && sf) {
        const n = new Node('Bg');
        n.layer = Layers.Enum.UI_2D;
        const sp = n.addComponent(Sprite);
        sp.spriteFrame = sf;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        const ut = n.getComponent(UITransform) || n.addComponent(UITransform);
        ut.setContentSize(DESIGN.width, DESIGN.height);
        n.setParent(this.node);
        n.setSiblingIndex(0);
      }
    });
  }

  private buildSlots() {
    for (const id of Object.keys(this.core.slots)) {
      const slot = this.core.slots[id];
      const n = new Node('Base_' + id);
      n.layer = Layers.Enum.UI_2D;
      n.setPosition(slot.pos.x, slot.pos.y, 0);
      // 底座
      resources.load('ui/tower_base/spriteFrame', SpriteFrame, (err, sf) => {
        if (!err && sf) {
          const sp = n.addComponent(Sprite);
          sp.spriteFrame = sf;
          sp.sizeMode = Sprite.SizeMode.CUSTOM;
          const ut = n.getComponent(UITransform)!;
          ut.setContentSize(92, 80);
        }
      });
      n.on(Node.EventType.TOUCH_END, () => this.onSlotTap(id), this);
      n.setParent(this.node);
      this.baseNodes.set(id, n);
    }
  }

  private buildCards() {
    // 由 UI 层脚本挂接，此处暴露 core
    (this as any).coreRef = this.core;
  }

  onSlotTap(slotId: string) {
    const slot = this.core.slots[slotId];
    if (slot.spirit) {
      this.core.selectedSlot = slotId;
      this.core.selectedCard = '';
    } else if (this.core.selectedCard) {
      if (this.core.placeSpirit(slotId, this.core.selectedCard)) {
        this.core.selectedCard = '';
        this.core.selectedSlot = slotId;
      }
    } else {
      this.core.selectedSlot = slotId;
      const base = this.baseNodes.get(slotId);
      if (base) {
        tween(base).to(0.12, { scale: new Vec3(1.35, 1.35, 1) }).to(0.15, { scale: new Vec3(1.15, 1.15, 1) }).start();
      }
    }
  }

  selectCard(spiritId: string) {
    this.core.selectedCard = this.core.selectedCard === spiritId ? '' : spiritId;
  }

  private syncSprites() {
    // 简化：帧同步节点数量
    for (const e of this.core.enemies) {
      if (!this.enemyNodes.has(e)) {
        // 运行时加载敌人图并挂到节点
        const n = new Node('E');
        n.layer = Layers.Enum.UI_2D;
        n.setPosition(e.pos.x, e.pos.y, 0);
        resources.load(e.config.sprite + '/spriteFrame', SpriteFrame, (err, sf) => {
          if (!err && sf) {
            const sp = n.addComponent(Sprite);
            sp.spriteFrame = sf;
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            const w = e.radius * 2.4;
            (n.getComponent(UITransform) || n.addComponent(UITransform)).setContentSize(w, w);
          }
        });
        n.setParent(this.node);
        this.enemyNodes.set(e, n);
      } else {
        this.enemyNodes.get(e)!.setPosition(e.pos.x, e.pos.y, 0);
      }
    }
    for (const [e, n] of [...this.enemyNodes]) {
      if (!e.alive) { n.destroy(); this.enemyNodes.delete(e); }
    }
  }

  private refreshHud() {
    // UI Canvas 上的 Label 由 HudView 绑定
    bus.emit('hud_sync', this.core);
  }
}
