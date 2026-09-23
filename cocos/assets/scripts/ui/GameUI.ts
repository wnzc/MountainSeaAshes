import {
  Color,
  Graphics,
  Label,
  Node,
  Sprite,
  Button,
  resources,
  SpriteFrame,
  Layers,
  Vec3,
  BlockInputEvents,
  UITransform,
} from 'cc';
import {
  MAP,
  SPIRITS,
  SPIRIT_ORDER,
  ENEMIES,
  ELEMENTS,
  CHAIN_NAMES,
} from '../config/GameConfig';
import { bus } from '../core/EventBus';
import { Battle } from '../core/Battle';
import { hexColor, ensureTransform, mapToWorld, drawCircle, drawRect, drawPath, passHits, bindClick } from './GraphicsUtil';
import { spriteCache, makeSpriteNode } from './SpriteCache';

export class GameUI {
  root: Node;
  battle: Battle;

  private world!: Node;
  private fxLayer!: Node;
  private uiLayer!: Node;
  private hudWave!: Label;
  private hudHp!: Label;
  private hudGold!: Label;
  private bossBar!: Node;
  private bossFill!: Graphics;
  private chainBanner!: Label;
  private toast!: Label;
  private slotPanel!: Node;
  private slotTitle!: Label;
  private slotMeta!: Label;
  private btnUpgrade!: Button;
  private btnSell!: Button;
  private cardNodes: Node[] = [];
  private startPanel!: Node;
  private pausePanel!: Node;
  private resultPanel!: Node;
  private resultTitle!: Label;
  private resultStats!: Label;
  private bgSprite: Sprite | null = null;
  private mapW = MAP.width;
  private mapH = MAP.height;
  private chainBannerLife = 0;
  private toastLife = 0;
  private unitLayer!: Node;
  private spiritSprites = new Map<string, { node: Node; sprite: Sprite }>();
  private enemySprites = new Map<number, { node: Node; sprite: Sprite }>();
  private cardPortraits = new Map<string, Sprite>();
  private hudNode!: Node;
  private cardBar!: Node;

  constructor(root: Node, battle: Battle) {
    this.root = root;
    this.battle = battle;
    this.preloadArt();
    this.buildLayers();
    this.drawMapStatic();
    this.buildHud();
    this.buildCards();
    this.buildPanels();
    this.buildTitle();
    this.bindEvents();
    this.refreshCards();
    this.showTitle();
  }

  private preloadArt(): void {
    const paths = new Set<string>();
    for (const id of SPIRIT_ORDER) paths.add(SPIRITS[id].sprite);
    for (const key in ENEMIES) paths.add(ENEMIES[key].sprite);
    // 与 Godot 同一套 UI 图
    for (const p of [
      'textures/ui/tower_base',
      'textures/ui/cave_gate',
      'textures/ui/seed_shrine',
      'textures/ui/fx_fireball',
      'textures/ui/fx_water',
      'textures/ui/fx_thunder',
      'textures/ui/fx_wind',
      'textures/ui/fx_ice',
      'textures/ui/fx_hit',
      'textures/ui/fx_freeze',
      'textures/ui/fx_slow',
      'textures/ui/fx_wet',
      'textures/ui/title_art',
      'textures/ui/panel_toast',
      'textures/ui/panel_dialog',
      'textures/ui/panel_tall',
      'textures/ui/hud_bar',
      'textures/ui/btn_cta',
      'textures/ui/btn_settings',
      'textures/ui/btn_pause',
      'textures/ui/btn_speed',
      'textures/ui/btn_sound',
      'textures/ui/btn_upgrade',
      'textures/ui/btn_sell',
      'textures/ui/btn_retry',
      'textures/ui/btn_home',
      'textures/ui/btn_round',
      'textures/ui/card_frame_0',
      'textures/ui/card_frame_1',
      'textures/ui/card_frame_2',
      'textures/ui/card_frame_3',
      'textures/ui/card_frame_4',
      'textures/maps/mirror_stream_bg_v2',
    ]) paths.add(p);
    spriteCache.preload([...paths]);
  }

  private buildLayers(): void {
    // 立刻铺底色，避免任何情况下“黑/空屏”
    const wash = new Node('Wash');
    ensureTransform(wash, this.mapW, this.mapH);
    this.root.addChild(wash);
    const wg = wash.addComponent(Graphics);
    drawRect(wg, -this.mapW / 2, -this.mapH / 2, this.mapW, this.mapH, new Color(42, 51, 48, 255));
    passHits(wash);

    this.world = new Node('World');
    ensureTransform(this.world, this.mapW, this.mapH);
    this.world.layer = Layers.Enum.UI_2D;
    this.root.addChild(this.world);
    this.world.active = true;
    passHits(this.world);

    this.unitLayer = new Node('Units');
    ensureTransform(this.unitLayer, this.mapW, this.mapH);
    this.world.addChild(this.unitLayer);
    passHits(this.unitLayer);

    this.fxLayer = new Node('FX');
    ensureTransform(this.fxLayer, this.mapW, this.mapH);
    this.fxLayer.layer = Layers.Enum.UI_2D;
    this.world.addChild(this.fxLayer);
    passHits(this.fxLayer);
    // 单位列放最上，避免被 FX 盖住
    this.unitLayer.setSiblingIndex(this.world.children.length - 1);

    this.uiLayer = new Node('UI');
    ensureTransform(this.uiLayer, this.mapW, this.mapH);
    this.uiLayer.layer = Layers.Enum.UI_2D;
    this.root.addChild(this.uiLayer);
    passHits(this.uiLayer);
  }

  /** 全屏首页：与 Godot TitleScreen 一致 */
  private buildTitle(): void {
    const title = new Node('TitleScreen');
    ensureTransform(title, this.mapW, this.mapH);
    title.setPosition(0, 0);
    this.uiLayer.addChild(title);

    // 背景插画
    const art = new Node('Art');
    ensureTransform(art, this.mapW, this.mapH);
    title.addChild(art);
    const sp = art.addComponent(Sprite);
    sp.type = Sprite.Type.SIMPLE;
    // 保持贴图比例（TRIMMED），避免满屏硬拉变形
    sp.sizeMode = Sprite.SizeMode.TRIMMED;
    spriteCache.load('textures/ui/title_art', (sf) => {
      if (sf) {
        sp.spriteFrame = sf;
        sp.color = Color.WHITE;
        sp.sizeMode = Sprite.SizeMode.TRIMMED;
      }
    });
    // 半透明压暗
    const shade = new Node('Shade');
    ensureTransform(shade, this.mapW, this.mapH);
    title.addChild(shade);
    const sg = shade.addComponent(Graphics);
    drawRect(sg, -this.mapW / 2, -this.mapH / 2, this.mapW, this.mapH, new Color(12, 18, 14, 90));
    passHits(art);
    passHits(shade);

    this.makeLabel(title, '山海余烬', 96, hexColor('#F3EFE4'), 900, 120).node.setPosition(0, 320);
    this.makeLabel(title, 'SHANHAI EMBERS', 26, hexColor('#C8C0B0'), 600, 40).node.setPosition(0, 250);
    this.makeLabel(title, '淡墨山海 · 绚烂五灵', 40, hexColor('#E0B85C'), 800, 56).node.setPosition(0, 160);
    this.makeLabel(title, '镜水涧 Demo · 放置灵兽，构筑元素连锁', 32, hexColor('#D8D0C0'), 960, 50).node.setPosition(0, 100);

    const startBtn = this.makeButton(title, '进入山河', 420, 120, () => {
      this.enterBattle();
    }, null, 40);
    startBtn.node.setPosition(0, -80);

    this.makeButton(title, '', 140, 140, () => {
      this.showToast('设置（Demo 占位）');
    }, 'textures/ui/btn_settings', 1, false).node.setPosition(0, -240);

    this.makeLabel(title, 'SHANHAI EMBERS · Cocos Demo', 22, hexColor('#FFFFFF66'), 700, 36).node.setPosition(0, -this.mapH / 2 + 50);

    this.startPanel = title;
    this.startPanel.active = true;
  }

  enterBattlePublic(): void {
    this.enterBattle();
  }

  private enterBattle(): void {
    if (this.startPanel) this.startPanel.active = false;
    if (this.hudNode) this.hudNode.active = true;
    if (this.cardBar) this.cardBar.active = true;
    this.battle.start();
    this.hudWave.string = '1/8';
    this.hudHp.string = `❤ ${this.battle.baseHp}`;
    this.hudGold.string = `◉ ${this.battle.gold}`;
    this.refreshCards();
    this.showToast('放置灵兽，守住灵种！');
  }

  private onSlotTap(slotId: string): void {
    const slot = this.battle.slots.get(slotId);
    if (!slot) return;
    const card = this.battle.selectedCard;
    if (card && !slot.spirit) {
      const ok = this.battle.placeSpirit(slotId, card);
      if (ok) {
        this.battle.selectedCard = null;
        this.battle.selectSlot(slotId);
        this.refreshCards();
        this.showToast('已放置');
      } else {
        this.showToast('金币不足或无法放置');
      }
      return;
    }
    if (slot.spirit) {
      this.battle.selectSlot(slotId);
      this.showSlotPanel(slotId);
      return;
    }
    this.showToast('先点下方灵兽卡，再点底座');
    this.battle.selectSlot(slotId);
    this.showSlotPanel(slotId);
  }

  private showTitle(): void {
    if (this.startPanel) this.startPanel.active = true;
    if (this.hudNode) this.hudNode.active = false;
    if (this.cardBar) this.cardBar.active = false;
    if (this.slotPanel) this.slotPanel.active = false;
  }

  /** 世界坐标（地图左上原点）→ 节点本地（中心原点） */
  private toLocal(mx: number, my: number): Vec3 {
    return mapToWorld(mx, my, this.mapW, this.mapH);
  }

  private drawMapStatic(): void {
    // 背景
    const bgNode = new Node('Bg');
    ensureTransform(bgNode, this.mapW, this.mapH);
    this.world.addChild(bgNode);
    this.bgSprite = bgNode.addComponent(Sprite);
    this.bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.bgSprite.color = new Color(180, 195, 175, 255);
    spriteCache.load(MAP.background, (sf) => {
      if (sf && this.bgSprite) {
        this.bgSprite.spriteFrame = sf;
        this.bgSprite.color = Color.WHITE;
        this.bgSprite.type = Sprite.Type.SIMPLE;
        // 9:21 图铺满 1080x2520 画布时用 CUSTOM；图为 9:21 则不拉伸
        this.bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
      } else {
        console.warn('[GameUI] background missing', MAP.background);
      }
    });

    // 路径
    const pathNode = new Node('Path');
    ensureTransform(pathNode, this.mapW, this.mapH);
    this.world.addChild(pathNode);
    const pg = pathNode.addComponent(Graphics);
    // 使用战斗里已加密的圆润路线（与怪物轨迹一致）
    const ox = -this.mapW / 2;
    const oy = -this.mapH / 2;
    const pts = this.battle.path.map((p) => ({ x: p.x + ox, y: oy + (this.mapH - p.y) }));
    drawPath(pg, pts, new Color(80, 65, 45, 70), 110);
    drawPath(pg, pts, new Color(70, 55, 35, 140), 92);
    drawPath(pg, pts, new Color(196, 180, 154, 255), 74);
    drawPath(pg, pts, new Color(230, 220, 190, 50), 48);

    // 水域：椭圆水潭（避免方块）
    const waterNode = new Node('Water');
    ensureTransform(waterNode, this.mapW, this.mapH);
    this.world.addChild(waterNode);
    const wg = waterNode.addComponent(Graphics);
    for (const w of MAP.waterZones) {
      const p = this.toLocal(w.x, w.y);
      wg.fillColor = new Color(90, 160, 180, 55);
      wg.ellipse(p.x, p.y, w.w * 0.55, w.h * 0.7);
      wg.fill();
      wg.fillColor = new Color(140, 200, 210, 40);
      wg.ellipse(p.x + 8, p.y + 4, w.w * 0.35, w.h * 0.4);
      wg.fill();
    }

    // 塔位：底座 + 明确点击热区（全局 input 不稳时仍可放置）
    const slotNode = new Node('Slots');
    ensureTransform(slotNode, this.mapW, this.mapH);
    this.world.addChild(slotNode);
    for (const s of this.battle.slots.values()) {
      const p = this.toLocal(s.x, s.y);
      // 矢量底座（不拉伸）+ 图标可选
      const pad = new Node('Pad_' + s.id);
      ensureTransform(pad, 110, 110);
      pad.setPosition(p.x, p.y);
      slotNode.addChild(pad);
      const pg2 = pad.addComponent(Graphics);
      pg2.fillColor = new Color(212, 168, 75, 230);
      pg2.circle(0, 0, 48);
      pg2.fill();
      pg2.fillColor = new Color(255, 245, 220, 40);
      pg2.circle(0, 0, 34);
      pg2.fill();
      pg2.fillColor = new Color(40, 48, 40, 60);
      pg2.circle(0, 0, 16);
      pg2.fill();
      const baseArt = makeSpriteNode('BaseArt_' + s.id, 124, 'textures/ui/tower_base', slotNode);
      baseArt.node.setPosition(p.x, p.y + 8);
      passHits(pad);

      const hit = new Node('SlotHit_' + s.id);
      ensureTransform(hit, 180, 180);
      hit.setPosition(p.x, p.y);
      slotNode.addChild(hit);
      bindClick(hit, () => this.onSlotTap(s.id));
    }

    // 灵种
    const baseNode = new Node('Base');
    ensureTransform(baseNode, this.mapW, this.mapH);
    this.world.addChild(baseNode);
    const bg2 = baseNode.addComponent(Graphics);
    const bp = this.toLocal(MAP.base.x, MAP.base.y);
    drawCircle(bg2, bp.x, bp.y, 42, new Color(90, 200, 120, 220));
    drawCircle(bg2, bp.x, bp.y, 28, new Color(210, 240, 210, 255));
  }

  private makeLabel(parent: Node, text: string, size: number, color: Color, w = 200, h = 48): Label {
    const n = new Node('Label');
    ensureTransform(n, w, h);
    parent.addChild(n);
    const lab = n.addComponent(Label);
    lab.string = text;
    lab.fontSize = size;
    lab.lineHeight = Math.round(size * 1.25);
    lab.color = color;
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
    passHits(n);
    return lab;
  }

  /** Godot 风格底板：Graphics 圆角+金边，不拉伸贴图 */
  private makePlate(parent: Node, name: string, w: number, h: number, _texPath?: string): Node {
    const n = new Node(name);
    ensureTransform(n, w, h);
    parent.addChild(n);
    const g = n.addComponent(Graphics);
    const r = Math.min(28, h * 0.25);
    // 外金边
    g.fillColor = new Color(212, 168, 75, 230);
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
    // 内墨底
    g.fillColor = new Color(26, 32, 28, 245);
    g.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(8, r - 4));
    g.fill();
    passHits(n);
    return n;
  }

  /** showPlate=false 时纯图标（无底板），图标居中放大 */
  private makeButton(
    parent: Node,
    text: string,
    w: number,
    h: number,
    onDown: () => void,
    iconPath: string | null = null,
    fontSize = 36,
    showPlate = true,
  ): Button {
    const n = new Node('Btn_' + (text || 'icon'));
    ensureTransform(n, w, h);
    parent.addChild(n);
    if (showPlate) {
      const g = n.addComponent(Graphics);
      const r = Math.min(20, h * 0.28);
      g.fillColor = new Color(212, 168, 75, 220);
      g.roundRect(-w / 2, -h / 2, w, h, r);
      g.fill();
      g.fillColor = new Color(70, 62, 36, 240);
      g.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.max(8, r - 3));
      g.fill();
    }

    const iconSize = Math.min(w, h) * 0.86;
    if (iconPath && !text) {
      // 纯图标：居中、无底
      const icon = makeSpriteNode('Icon', iconSize, iconPath, n);
      icon.node.setPosition(0, 0);
    } else if (iconPath && text) {
      // 图标在左、文字在右，整体居中
      const icon = makeSpriteNode('Icon', Math.min(h * 0.78, 64), iconPath, n);
      icon.node.setPosition(-w * 0.28, 0);
      const lab = this.makeLabel(n, text, fontSize, hexColor('#FAF3E4'), w * 0.5, h * 0.7);
      lab.node.setPosition(w * 0.14, 0);
    } else if (text) {
      const lab = this.makeLabel(n, text, fontSize, hexColor('#FAF3E4'), w - 20, h * 0.7);
      lab.node.setPosition(0, 0);
    }
    const btn = n.addComponent(Button);
    let last = 0;
    const fire = () => {
      const t = Date.now();
      if (t - last < 250) return;
      last = t;
      onDown();
    };
    bindClick(n, fire);
    n.on(Node.EventType.TOUCH_START, () => n.setScale(0.92, 0.92, 1));
    n.on(Node.EventType.TOUCH_END, () => n.setScale(1.02, 1.02, 1));
    n.on(Node.EventType.TOUCH_CANCEL, () => n.setScale(1, 1, 1));
    return btn;
  }

  private buildHud(): void {
    const hud = new Node('HUD');
    this.hudNode = hud;
    ensureTransform(hud, this.mapW, 150);
    hud.setPosition(0, this.mapH / 2 - 72);
    this.uiLayer.addChild(hud);
    hud.active = false;

    // 信息用 panel_toast 底图（浅字+深底）
    const wavePlate = this.makePlate(hud, 'WavePlate', 200, 68, 'textures/ui/panel_toast');
    wavePlate.setPosition(-400, 0);
    this.hudWave = this.makeLabel(wavePlate, '1/8', 30, hexColor('#FAF3E4'), 200, 56);
    const hpPlate = this.makePlate(hud, 'HpPlate', 180, 68, 'textures/ui/panel_toast');
    hpPlate.setPosition(-180, 0);
    this.hudHp = this.makeLabel(hpPlate, '❤ 20', 30, hexColor('#FAF3E4'), 180, 56);
    const goldPlate = this.makePlate(hud, 'GoldPlate', 200, 68, 'textures/ui/panel_toast');
    goldPlate.setPosition(20, 0);
    this.hudGold = this.makeLabel(goldPlate, '◉ 320', 30, hexColor('#FAF3E4'), 200, 56);

    // 右上角：无底大图标，组内均匀、垂直居中
    const soundBtn = this.makeButton(hud, '', 110, 110, () => {}, 'textures/ui/btn_sound', 1, false);
    soundBtn.node.setPosition(300, 0);
    const speedBtn = this.makeButton(hud, '', 110, 110, () => {
      this.battle.speed = this.battle.speed === 1 ? 2 : 1;
      // 图标上叠倍速字
      const lab = speedBtn.node.getChildByName('Spd');
      if (lab) lab.getComponent(Label)!.string = this.battle.speed === 1 ? '×1' : '×2';
    }, 'textures/ui/btn_speed', 1, false);
    speedBtn.node.setPosition(430, 0);
    const spd = this.makeLabel(speedBtn.node, '×1', 28, hexColor('#FAF3E4'), 80, 40);
    spd.node.name = 'Spd';
    spd.node.setPosition(0, -36);
    const pauseBtn = this.makeButton(hud, '', 110, 110, () => {
      this.battle.paused = true;
      this.pausePanel.active = true;
    }, 'textures/ui/btn_pause', 1, false);
    pauseBtn.node.setPosition(560, 0);

    // Boss 血条
    this.bossBar = new Node('BossBar');
    ensureTransform(this.bossBar, 700, 28);
    this.bossBar.setPosition(0, this.mapH / 2 - 160);
    this.bossBar.active = false;
    this.uiLayer.addChild(this.bossBar);
    this.makeLabel(this.bossBar, '蚀山君', 32, hexColor('#C8C8C8'), 240, 40).node.setPosition(0, 28);
    const fillNode = new Node('Fill');
    ensureTransform(fillNode, 700, 18);
    this.bossBar.addChild(fillNode);
    this.bossFill = fillNode.addComponent(Graphics);

    this.chainBanner = this.makeLabel(this.uiLayer, '', 56, hexColor('#FFD27A'), 960, 100);
    this.chainBanner.node.setPosition(0, 120);
    this.chainBanner.node.active = false;

    const toastPlate = this.makePlate(this.uiLayer, 'ToastPlate', 780, 96, 'textures/ui/panel_toast');
    toastPlate.setPosition(0, this.mapH / 2 - 230);
    toastPlate.active = false;
    this.toast = this.makeLabel(toastPlate, '', 40, hexColor('#FAF3E4'), 760, 80);
    this.toast.node.name = 'ToastText';
    // 保持引用兼容
    (this as any)._toastPlate = toastPlate;
    this.toast.node.active = true;
    toastPlate.active = false;
  }

  private buildCards(): void {
    const bar = new Node('CardBar');
    this.cardBar = bar;
    ensureTransform(bar, this.mapW, 260);
    bar.setPosition(0, -this.mapH / 2 + 140);
    this.uiLayer.addChild(bar);
    bar.active = false;
    const n = SPIRIT_ORDER.length;
    const cw = 186;
    const ch = 268;
    const gap = 14;
    const total = n * cw + (n - 1) * gap;
    let x0 = -total / 2 + cw / 2;
    for (let i = 0; i < n; i++) {
      const id = SPIRIT_ORDER[i];
      const cfg = SPIRITS[id];
      const card = new Node('Card_' + id);
      ensureTransform(card, cw, ch);
      card.setPosition(x0, 0);
      x0 += cw + gap;
      bar.addChild(card);
      // 与 Godot 相同：底板 + 立绘 + 名称/费用（加大）
      this.makePlate(card, 'Frame', cw, ch, 'textures/ui/panel_dialog');
      const port = makeSpriteNode('Portrait', 150, cfg.sprite, card);
      port.node.setPosition(0, 36);
      this.cardPortraits.set(id, port.sprite);
      this.makeLabel(card, cfg.name, 40, hexColor('#FAF3E4'), cw, 52).node.setPosition(0, -58);
      this.makeLabel(card, String(cfg.cost), 36, hexColor('#D4A84B'), cw, 46).node.setPosition(0, -100);
      card.addComponent(Button);
      let lastPick = 0;
      const pick = () => {
        const now = Date.now();
        if (now - lastPick < 250) return;
        lastPick = now;
        this.battle.selectCard(id);
        this.refreshCards();
      };
      // 只绑一种点击，避免 CLICK+TOUCH 双触发把选中又取消
      bindClick(card, pick);
      this.cardNodes.push(card);
    }
  }

  private buildPanels(): void {
    // 塔位操作（panel_dialog，与 Godot SlotPanel 一致）
    this.slotPanel = this.makePlate(this.uiLayer, 'SlotPanel', 980, 320, 'textures/ui/panel_dialog');
    this.slotPanel.setPosition(0, -this.mapH / 2 + 520);
    this.slotPanel.active = false;
    this.slotTitle = this.makeLabel(this.slotPanel, '', 56, hexColor('#FAF3E4'), 940, 72);
    this.slotTitle.node.setPosition(0, 100);
    this.slotMeta = this.makeLabel(this.slotPanel, '', 40, hexColor('#E8E0C8'), 940, 130);
    this.slotMeta.node.setPosition(0, 24);
    this.btnUpgrade = this.makeButton(this.slotPanel, '升级', 400, 100, () => {
      if (this.battle.selectedSlot) {
        this.battle.upgradeSpirit(this.battle.selectedSlot);
        this.showSlotPanel(this.battle.selectedSlot);
        this.refreshCards();
      }
    }, 'textures/ui/btn_upgrade', 44);
    this.btnUpgrade.node.setPosition(-210, -100);
    this.btnSell = this.makeButton(this.slotPanel, '撤回', 400, 100, () => {
      if (this.battle.selectedSlot) {
        this.battle.sellSpirit(this.battle.selectedSlot);
        this.slotPanel.active = false;
        this.battle.selectSlot(null);
        this.refreshCards();
      }
    }, 'textures/ui/btn_sell', 44);
    this.btnSell.node.setPosition(210, -100);

    // 暂停（panel_tall）
    this.pausePanel = this.makeOverlay('暂停', 'textures/ui/panel_tall');
    this.makeButton(this.pausePanel, '继续', 360, 88, () => {
      this.battle.paused = false;
      this.pausePanel.active = false;
    }, null, 36).node.setPosition(0, -40);
    this.makeButton(this.pausePanel, '重新开始', 360, 88, () => {
      this.battle.paused = false;
      this.pausePanel.active = false;
      this.battle.start();
    }, null, 36).node.setPosition(0, -150);
    this.pausePanel.active = false;

    // 结算（panel_tall）
    this.resultPanel = this.makeOverlay('山河复色', 'textures/ui/panel_tall');
    this.resultTitle = this.resultPanel.getChildByName('Title')!.getComponent(Label)!;
    this.resultStats = this.makeLabel(this.resultPanel, '', 40, hexColor('#E8E0C8'), 800, 72);
    this.resultStats.node.setPosition(0, 40);
    this.makeButton(this.resultPanel, '再来一局', 360, 88, () => {
      this.resultPanel.active = false;
      this.enterBattle();
    }, null, 36).node.setPosition(0, -60);
    this.makeButton(this.resultPanel, '回到封面', 360, 88, () => {
      this.resultPanel.active = false;
      this.showTitle();
    }, null, 36).node.setPosition(0, -170);
    this.resultPanel.active = false;
  }

  private makeOverlay(title: string, platePath = 'textures/ui/panel_tall'): Node {
    const panel = new Node('Panel_' + title);
    ensureTransform(panel, 820, 560);
    this.uiLayer.addChild(panel);
    this.makePlate(panel, 'Plate', 820, 560, platePath);
    const t = this.makeLabel(panel, title, 64, hexColor('#F3EFE4'), 800, 90);
    t.node.name = 'Title';
    t.node.setPosition(0, 180);
    return panel;
  }

  private bindEvents(): void {
    bus.on('gold_changed', (g: number) => {
      this.hudGold.string = `◉ ${g}`;
      this.refreshCards();
    });
    bus.on('base_hp_changed', (v: number) => {
      this.hudHp.string = `❤ ${v}`;
    });
    bus.on('wave_started', (idx: number) => {
      const n = Math.max(idx, 1);
      this.hudWave.string = `${Math.min(n, 8)}/8`;
    });
    bus.on('slot_selected', (id: string | null) => this.showSlotPanel(id));
    bus.on('card_selected', () => {
      this.refreshCards();
      this.slotPanel.active = false;
    });
    bus.on('chain_reached', (level: number) => {
      if (level < 2) return;
      const name = CHAIN_NAMES[level] || `×${level} 连锁`;
      this.chainBanner.string = `×${level} ${name}`;
      this.chainBanner.node.active = true;
      this.chainBanner.fontSize = level >= 4 ? 72 : 56;
      this.chainBanner.color = level >= 4 ? hexColor('#FF6B4A') : hexColor('#FFD27A');
      this.chainBannerLife = level >= 4 ? 1.8 : 1.2;
    });
    bus.on('battle_finished', (victory: boolean) => {
      this.resultPanel.active = true;
      this.resultTitle.string = victory ? '山河复色' : '灵种熄灭';
      this.resultTitle.color = victory ? hexColor('#D4A84B') : hexColor('#C23B2E');
      this.resultStats.string = `击杀 ${this.battle.totalKills} · 剩余生命 ${this.battle.baseHp} · 金币 ${this.battle.gold}`;
    });
    bus.on('toast', (msg: string) => this.showToast(msg));
  }

  private showToast(msg: string): void {
    this.toast.string = msg;
    const plate = (this as any)._toastPlate as Node | undefined;
    if (plate) plate.active = true;
    this.toast.node.active = true;
    this.toastLife = 2.2;
  }

  private showSlotPanel(slotId: string | null): void {
    if (!slotId) {
      this.slotPanel.active = false;
      return;
    }
    const slot = this.battle.slots.get(slotId);
    if (!slot) return;
    if (!slot.spirit) {
      this.slotTitle.string = `空塔位 ${slot.id}`;
      this.slotMeta.string = this.battle.selectedCard
        ? '点击放置'
        : '先点下方灵兽卡，再点此塔位放置';
      this.btnUpgrade.node.active = false;
      this.btnSell.node.active = false;
      this.slotPanel.active = true;
      return;
    }
    const s = slot.spirit;
    this.slotTitle.string = `${s.name} Lv.${s.level}`;
    this.slotMeta.string = `${s.config.desc}\n伤害 ${Math.round(s.effectiveDamage())} · 范围 ${Math.round(s.range)} · 共鸣 ×${s.resonanceBonus.toFixed(2)}`;
    this.btnUpgrade.node.active = true;
    this.btnSell.node.active = true;
    const up = s.getUpgradeCost();
    const upLab = this.btnUpgrade.node.getComponentInChildren(Label);
    if (upLab) upLab.string = up == null ? '已满级' : `升级 ${up}`;
    const sellLab = this.btnSell.node.getComponentInChildren(Label);
    if (sellLab) sellLab.string = `撤回 +${Math.floor(s.config.cost * 0.5)}`;
    this.slotPanel.active = true;
  }

  private refreshCards(): void {
    SPIRIT_ORDER.forEach((id, i) => {
      const card = this.cardNodes[i];
      if (!card) return;
      const afford = this.battle.canAfford(id);
      const sel = this.battle.selectedCard === id;
      // 卡面是贴图，不再用 Graphics.clear()
      const sc = sel ? 1.06 : afford ? 1 : 0.92;
      card.setScale(sc, sc, 1);
      const sp = card.getComponentInChildren(Sprite);
      if (sp) {
        sp.color = sel
          ? new Color(255, 235, 180, 255)
          : afford
            ? new Color(255, 255, 255, 255)
            : new Color(140, 140, 140, 200);
      }
    });
  }

  /** 每帧：世界表现 + 输入由 GameRoot 转发 */
  updateView(dt: number): void {
    try {
      this._updateView(dt);
    } catch (err) {
      console.error('[GameUI] updateView', err);
    }
  }

  private _updateView(dt: number): void {
    if (this.chainBannerLife > 0) {
      this.chainBannerLife -= dt;
      if (this.chainBannerLife <= 0) this.chainBanner.node.active = false;
    }
    if (this.toastLife > 0) {
      this.toastLife -= dt;
      if (this.toastLife <= 0) {
        this.toast.node.active = false;
        const plate = (this as any)._toastPlate as Node | undefined;
        if (plate) plate.active = false;
      }
    }
    // 清 fx
    this.fxLayer.removeAllChildren();
    const fxgNode = new Node('FxFrame');
    ensureTransform(fxgNode, this.mapW, this.mapH);
    this.fxLayer.addChild(fxgNode);
    const fxg = fxgNode.addComponent(Graphics);

    // 灵兽：矢量剪影保证可见（贴图仅作增强）
    for (const s of this.battle.spirits) {
      const key = s.slotId;
      const slot = this.battle.slots.get(key);
      const mx = slot ? slot.x : s.pos.x;
      const my = slot ? slot.y : s.pos.y;
      const p = this.toLocal(mx, my);
      const col = ELEMENTS[s.element] || ELEMENTS.FIRE;
      const body = hexColor(col.color, 245);
      // 底座光环
      drawCircle(fxg, p.x, p.y - 6, 36, hexColor(col.color, 55));
      // 身体
      drawCircle(fxg, p.x, p.y - 8, 28, body);
      drawCircle(fxg, p.x, p.y - 44, 20, body);
      // 眼
      drawCircle(fxg, p.x - 7, p.y - 48, 3, new Color(20, 20, 20, 255));
      drawCircle(fxg, p.x + 7, p.y - 48, 3, new Color(20, 20, 20, 255));
      // 贴图叠加（失败也不影响显示）
      let view = this.spiritSprites.get(key);
      if (!view) {
        view = makeSpriteNode('Spirit_' + key, 150, s.config.sprite, this.unitLayer);
        this.spiritSprites.set(key, view);
      }
      view.node.setPosition(p.x, p.y - 10);
      view.node.active = true;
    }
    for (const [key, view] of this.spiritSprites) {
      const slot = this.battle.slots.get(key);
      if (!slot || !slot.spirit) {
        view.node.destroy();
        this.spiritSprites.delete(key);
      }
    }

    // 邻接共鸣线
    try {
      for (const [a, b] of this.battle.resonance.links(this.battle.slots)) {
        const pa = this.toLocal(a.pos.x, a.pos.y);
        const pb = this.toLocal(b.pos.x, b.pos.y);
        fxg.strokeColor = new Color(212, 168, 75, 90);
        fxg.lineWidth = 3;
        fxg.moveTo(pa.x, pa.y);
        fxg.lineTo(pb.x, pb.y);
        fxg.stroke();
      }
    } catch (_) { /* ignore */ }

    // 敌人：先矢量墨团，再贴图
    const aliveIds = new Set<number>();
    for (const e of this.battle.enemies) {
      if (!e.alive) continue;
      aliveIds.add(e.id);
      const p = this.toLocal(e.pos.x, e.pos.y);
      drawCircle(fxg, p.x, p.y, Math.max(16, e.config.radius), new Color(24, 24, 24, 235));
      drawCircle(fxg, p.x - 6, p.y - 2, 3, new Color(194, 59, 46, 255));
      drawCircle(fxg, p.x + 6, p.y - 2, 3, new Color(194, 59, 46, 255));
      let view = this.enemySprites.get(e.id);
      if (!view) {
        const sz = Math.max(64, e.config.radius * 2.6);
        view = makeSpriteNode('Enemy_' + e.id, sz, e.config.sprite, this.unitLayer);
        this.enemySprites.set(e.id, view);
      }
      view.node.setPosition(p.x, p.y);
      view.node.active = true;
      if (e.element && this.battle.time < e.elementUntil) {
        const el = ELEMENTS[e.element];
        if (el) {
          fxg.strokeColor = hexColor(el.color, 180);
          fxg.lineWidth = 4;
          fxg.circle(p.x, p.y, e.config.radius + 8);
          fxg.stroke();
        }
      }
      const ratio = e.hp / e.maxHp;
      drawRect(fxg, p.x - 32, p.y + e.config.radius + 14, 64, 8, new Color(0, 0, 0, 160));
      drawRect(fxg, p.x - 32, p.y + e.config.radius + 14, 64 * ratio, 8, new Color(200, 60, 50, 220));
    }
    for (const [id, view] of this.enemySprites) {
      if (!aliveIds.has(id)) {
        view.node.destroy();
        this.enemySprites.delete(id);
      }
    }

    // 弹道
    for (const pr of this.battle.projectiles) {
      const p = this.toLocal(pr.pos.x, pr.pos.y);
      const el = ELEMENTS[pr.element];
      drawCircle(fxg, p.x, p.y, 8, hexColor(el.glow));
    }

    // 环境区
    for (const z of this.battle.zones) {
      const p = this.toLocal(z.x + z.w / 2, z.y + z.h / 2);
      const colors: Record<string, Color> = {
        NATURAL_WATER: new Color(80, 160, 180, 50),
        ICE: new Color(180, 220, 240, 80),
        FIRE_FIELD: new Color(230, 120, 60, 80),
        STEAM: new Color(200, 220, 210, 55),
        STORM: new Color(140, 110, 255, 70),
      };
      const c = colors[z.type] || new Color(100, 100, 100, 50);
      const lx = -z.w / 2;
      const ly = -z.h / 2;
      drawRect(fxg, p.x + lx, p.y + ly, z.w, z.h, c);
    }

    // 特效
    for (const fx of this.battle.drainFx()) {
      const p = this.toLocal(fx.x, fx.y);
      drawCircle(fxg, p.x, p.y, fx.type === 'reaction' ? 24 : 12, hexColor(fx.color, 160));
      if (fx.text) {
        // 简化：只在 chain/reaction 用 banner
        if (fx.type === 'reaction') this.showToast(fx.text);
      }
    }

    // Boss 血条
    const boss = this.battle.enemies.find((e) => e.isBoss() && e.alive);
    this.bossBar.active = !!boss;
    if (boss && this.bossFill) {
      const ratio = boss.hp / boss.maxHp;
      this.bossFill.clear();
      drawRect(this.bossFill, -350, -9, 700, 18, new Color(0, 0, 0, 140));
      drawRect(this.bossFill, -350, -9, 700 * ratio, 18, new Color(200, 50, 40, 230));
    }

    // 塔位选中高亮
    if (this.battle.selectedSlot) {
      const s = this.battle.slots.get(this.battle.selectedSlot);
      if (s) {
        const p = this.toLocal(s.x, s.y);
        fxg.strokeColor = new Color(212, 168, 75, 200);
        fxg.lineWidth = 4;
        fxg.circle(p.x, p.y, 44);
        fxg.stroke();
      }
    }
  }
}
