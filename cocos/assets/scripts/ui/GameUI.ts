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

  constructor(root: Node, battle: Battle) {
    this.root = root;
    this.battle = battle;
    this.preloadArt();
    this.buildLayers();
    this.drawMapStatic();
    this.buildHud();
    this.buildCards();
    this.buildPanels();
    this.bindEvents();
    this.refreshCards();
  }

  private preloadArt(): void {
    const paths = new Set<string>();
    for (const id of SPIRIT_ORDER) paths.add(SPIRITS[id].sprite);
    for (const key in ENEMIES) paths.add(ENEMIES[key].sprite);
    // 与 Godot 同一套 UI 图
    for (const p of [
      'textures/ui/tower_base',
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
    passHits(this.world);

    this.unitLayer = new Node('Units');
    ensureTransform(this.unitLayer, this.mapW, this.mapH);
    this.unitLayer.layer = Layers.Enum.UI_2D;
    this.world.addChild(this.unitLayer);
    passHits(this.unitLayer);

    this.fxLayer = new Node('Fx');
    ensureTransform(this.fxLayer, this.mapW, this.mapH);
    this.fxLayer.layer = Layers.Enum.UI_2D;
    this.world.addChild(this.fxLayer);
    passHits(this.fxLayer);

    this.uiLayer = new Node('UI');
    ensureTransform(this.uiLayer, this.mapW, this.mapH);
    this.uiLayer.layer = Layers.Enum.UI_2D;
    this.root.addChild(this.uiLayer);
    // UI 层本身不挡，子按钮自己可点
    passHits(this.uiLayer);
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

    // 水域
    const waterNode = new Node('Water');
    ensureTransform(waterNode, this.mapW, this.mapH);
    this.world.addChild(waterNode);
    const wg = waterNode.addComponent(Graphics);
    for (const w of MAP.waterZones) {
      const p = this.toLocal(w.x, w.y);
      drawRect(wg, p.x - w.w / 2, p.y - w.h / 2, w.w, w.h, new Color(90, 160, 180, 70));
    }

    // 塔位
    const slotNode = new Node('Slots');
    ensureTransform(slotNode, this.mapW, this.mapH);
    this.world.addChild(slotNode);
    const sg = slotNode.addComponent(Graphics);
    for (const s of MAP.slots) {
      const p = this.toLocal(s.x, s.y);
      drawCircle(sg, p.x, p.y, 36, new Color(40, 50, 45, 200));
      drawCircle(sg, p.x, p.y, 28, new Color(212, 168, 75, 60));
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
    lab.lineHeight = size + 4;
    lab.color = color;
    lab.horizontalAlign = Label.HorizontalAlign.CENTER;
    lab.verticalAlign = Label.VerticalAlign.CENTER;
    passHits(n);
    return lab;
  }

  /** 用与 Godot 相同的底图板（九宫格拉伸） */
  private makePlate(parent: Node, name: string, w: number, h: number, texPath: string): Node {
    const n = new Node(name);
    ensureTransform(n, w, h);
    parent.addChild(n);
    makeSpriteNode('Plate', w, texPath, n).node.getComponent(UITransform)!.setContentSize(w, h);
    return n;
  }

  private makeButton(
    parent: Node,
    text: string,
    w: number,
    h: number,
    onDown: () => void,
    platePath = 'textures/ui/btn_round',
    fontSize = 28,
  ): Button {
    const n = new Node('Btn_' + text);
    ensureTransform(n, w, h);
    parent.addChild(n);
    // 图版按钮（与 Godot StyleBoxTexture 一致）
    const plate = makeSpriteNode('Plate', w, platePath, n);
    plate.node.getComponent(UITransform)!.setContentSize(w, h);
    plate.node.getComponent(UITransform)!.setContentSize(w, h);
    if (text) this.makeLabel(n, text, fontSize, hexColor('#FAF3E4'), w, h);
    const btn = n.addComponent(Button);
    n.on(Button.EventType.CLICK, onDown);
    bindClick(n, onDown);
    // 点击回弹
    n.on(Node.EventType.TOUCH_START, () => n.setScale(0.94, 0.94, 1));
    n.on(Node.EventType.TOUCH_END, () => n.setScale(1.02, 1.02, 1));
    n.on(Node.EventType.TOUCH_CANCEL, () => n.setScale(1, 1, 1));
    return btn;
  }

  private buildHud(): void {
    const hud = new Node('HUD');
    ensureTransform(hud, this.mapW, 150);
    hud.setPosition(0, this.mapH / 2 - 72);
    this.uiLayer.addChild(hud);

    // 信息用 panel_toast 底图（浅字+深底）
    const wavePlate = this.makePlate(hud, 'WavePlate', 200, 64, 'textures/ui/panel_toast');
    wavePlate.setPosition(-400, 0);
    this.hudWave = this.makeLabel(wavePlate, '1/8', 32, hexColor('#FAF3E4'), 180, 56);
    const hpPlate = this.makePlate(hud, 'HpPlate', 180, 64, 'textures/ui/panel_toast');
    hpPlate.setPosition(-180, 0);
    this.hudHp = this.makeLabel(hpPlate, '❤ 20', 32, hexColor('#FAF3E4'), 160, 56);
    const goldPlate = this.makePlate(hud, 'GoldPlate', 200, 64, 'textures/ui/panel_toast');
    goldPlate.setPosition(20, 0);
    this.hudGold = this.makeLabel(goldPlate, '◉ 320', 32, hexColor('#FAF3E4'), 180, 56);

    // 右上角更大图标钮（与 Godot 一致）
    const soundBtn = this.makeButton(hud, '', 120, 120, () => {}, 'textures/ui/btn_sound', 1);
    soundBtn.node.setPosition(240, 0);
    const speedBtn = this.makeButton(hud, '×1', 120, 120, () => {
      this.battle.speed = this.battle.speed === 1 ? 2 : 1;
      const lab = speedBtn.node.getComponentInChildren(Label);
      if (lab) lab.string = this.battle.speed === 1 ? '×1' : '×2';
    }, 'textures/ui/btn_speed', 26);
    speedBtn.node.setPosition(370, 0);
    const pauseBtn = this.makeButton(hud, '', 120, 120, () => {
      this.battle.paused = true;
      this.pausePanel.active = true;
    }, 'textures/ui/btn_pause', 1);
    pauseBtn.node.setPosition(500, 0);

    // Boss 血条
    this.bossBar = new Node('BossBar');
    ensureTransform(this.bossBar, 700, 28);
    this.bossBar.setPosition(0, this.mapH / 2 - 160);
    this.bossBar.active = false;
    this.uiLayer.addChild(this.bossBar);
    this.makeLabel(this.bossBar, '蚀山君', 22, hexColor('#C8C8C8'), 200, 28).node.setPosition(0, 28);
    const fillNode = new Node('Fill');
    ensureTransform(fillNode, 700, 18);
    this.bossBar.addChild(fillNode);
    this.bossFill = fillNode.addComponent(Graphics);

    this.chainBanner = this.makeLabel(this.uiLayer, '', 40, hexColor('#FFD27A'), 800, 80);
    this.chainBanner.node.setPosition(0, 120);
    this.chainBanner.node.active = false;

    const toastPlate = this.makePlate(this.uiLayer, 'ToastPlate', 640, 72, 'textures/ui/panel_toast');
    toastPlate.setPosition(0, this.mapH / 2 - 230);
    toastPlate.active = false;
    this.toast = this.makeLabel(toastPlate, '', 28, hexColor('#FAF3E4'), 600, 56);
    this.toast.node.name = 'ToastText';
    // 保持引用兼容
    (this as any)._toastPlate = toastPlate;
    this.toast.node.active = true;
    toastPlate.active = false;
  }

  private buildCards(): void {
    const bar = new Node('CardBar');
    ensureTransform(bar, this.mapW, 200);
    bar.setPosition(0, -this.mapH / 2 + 110);
    this.uiLayer.addChild(bar);
    const n = SPIRIT_ORDER.length;
    const cw = 136;
    const ch = 188;
    const gap = 12;
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
      // 与 Godot 相同：底板 + 立绘 + 名称/费用
      this.makePlate(card, 'Frame', cw, ch, 'textures/ui/card_frame_' + (i % 5));
      const port = makeSpriteNode('Portrait', 108, cfg.sprite, card);
      port.node.setPosition(0, 28);
      this.cardPortraits.set(id, port.sprite);
      this.makeLabel(card, cfg.name, 26, hexColor('#FAF3E4'), cw, 36).node.setPosition(0, -48);
      this.makeLabel(card, String(cfg.cost), 24, hexColor('#D4A84B'), cw, 32).node.setPosition(0, -78);
      card.addComponent(Button);
      const pick = () => this.battle.selectCard(id);
      card.on(Button.EventType.CLICK, pick);
      bindClick(card, pick);
      this.cardNodes.push(card);
    }
  }

  private buildPanels(): void {
    // 塔位操作（panel_dialog，与 Godot SlotPanel 一致）
    this.slotPanel = this.makePlate(this.uiLayer, 'SlotPanel', 980, 320, 'textures/ui/panel_dialog');
    this.slotPanel.setPosition(0, -this.mapH / 2 + 420);
    this.slotPanel.active = false;
    this.slotTitle = this.makeLabel(this.slotPanel, '', 36, hexColor('#FAF3E4'), 900, 50);
    this.slotTitle.node.setPosition(0, 100);
    this.slotMeta = this.makeLabel(this.slotPanel, '', 24, hexColor('#D8D0B8'), 900, 90);
    this.slotMeta.node.setPosition(0, 24);
    this.btnUpgrade = this.makeButton(this.slotPanel, '升级', 380, 80, () => {
      if (this.battle.selectedSlot) {
        this.battle.upgradeSpirit(this.battle.selectedSlot);
        this.showSlotPanel(this.battle.selectedSlot);
        this.refreshCards();
      }
    }, 'textures/ui/btn_upgrade', 28);
    this.btnUpgrade.node.setPosition(-210, -100);
    this.btnSell = this.makeButton(this.slotPanel, '撤回', 380, 80, () => {
      if (this.battle.selectedSlot) {
        this.battle.sellSpirit(this.battle.selectedSlot);
        this.slotPanel.active = false;
        this.battle.selectSlot(null);
        this.refreshCards();
      }
    }, 'textures/ui/btn_sell', 28);
    this.btnSell.node.setPosition(210, -100);

    // 开始：标题图 + CTA（与 Godot TitleScreen 一致）
    this.startPanel = this.makeOverlay('山海余烬', 'textures/ui/title_art');
    this.makeLabel(this.startPanel, '淡墨山海 · 绚烂五灵', 24, hexColor('#E0B85C'), 700, 40).node.setPosition(0, 120);
    const startBtn = this.makeButton(this.startPanel, '进入山河', 420, 120, () => {
      this.startPanel.active = false;
      this.battle.start();
      this.hudWave.string = '1/8';
      this.hudHp.string = `❤ ${this.battle.baseHp}`;
      this.hudGold.string = `◉ ${this.battle.gold}`;
      this.refreshCards();
      this.showToast('放置灵兽，守住灵种！');
    }, 'textures/ui/btn_cta', 34);
    startBtn.node.setPosition(0, -60);
    this.makeButton(this.startPanel, '', 120, 120, () => {
      // 设置占位，与 Godot 一致
    }, 'textures/ui/btn_settings', 1).node.setPosition(0, -200);

    // 暂停（panel_tall）
    this.pausePanel = this.makeOverlay('暂停', 'textures/ui/panel_tall');
    this.makeButton(this.pausePanel, '继续', 360, 88, () => {
      this.battle.paused = false;
      this.pausePanel.active = false;
    }, 'textures/ui/btn_cta', 28).node.setPosition(0, -40);
    this.makeButton(this.pausePanel, '重新开始', 360, 88, () => {
      this.battle.paused = false;
      this.pausePanel.active = false;
      this.battle.start();
    }, 'textures/ui/btn_retry', 28).node.setPosition(0, -150);
    this.pausePanel.active = false;

    // 结算（panel_tall）
    this.resultPanel = this.makeOverlay('山河复色', 'textures/ui/panel_tall');
    this.resultTitle = this.resultPanel.getChildByName('Title')!.getComponent(Label)!;
    this.resultStats = this.makeLabel(this.resultPanel, '', 24, hexColor('#D8D0B8'), 700, 50);
    this.resultStats.node.setPosition(0, 40);
    this.makeButton(this.resultPanel, '再来一局', 360, 88, () => {
      this.resultPanel.active = false;
      this.battle.start();
    }, 'textures/ui/btn_retry', 28).node.setPosition(0, -60);
    this.makeButton(this.resultPanel, '回到封面', 360, 88, () => {
      this.resultPanel.active = false;
      this.startPanel.active = true;
    }, 'textures/ui/btn_home', 28).node.setPosition(0, -170);
    this.resultPanel.active = false;
  }

  private makeOverlay(title: string, platePath = 'textures/ui/panel_tall'): Node {
    const panel = new Node('Panel_' + title);
    ensureTransform(panel, 820, 560);
    this.uiLayer.addChild(panel);
    this.makePlate(panel, 'Plate', 820, 560, platePath);
    if (title === '山海余烬') {
      // 首页标题大字
      this.makeLabel(panel, title, 64, hexColor('#F3EFE4'), 700, 80).node.setPosition(0, 200);
    } else {
      const t = this.makeLabel(panel, title, 48, hexColor('#F3EFE4'), 700, 70);
      t.node.name = 'Title';
      t.node.setPosition(0, 180);
    }
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
      this.chainBanner.fontSize = level >= 4 ? 52 : 40;
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
      card.setScale(afford ? 1 : 0.94, afford ? 1 : 0.94, 1);
      const g = card.getComponent(Graphics)!;
      g.clear();
      const cw = 168;
      const sel = this.battle.selectedCard === id;
      drawRect(g, -cw / 2, -100, cw, 200, sel ? new Color(70, 58, 28, 250) : new Color(28, 34, 28, 240));
      drawRect(g, -cw / 2 + 4, -96, cw - 8, 192, new Color(40, 48, 40, afford ? 255 : 140));
    });
  }

  /** 每帧：世界表现 + 输入由 GameRoot 转发 */
  updateView(dt: number): void {
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

    // 灵兽立绘
    for (const s of this.battle.spirits) {
      const key = s.slotId;
      let view = this.spiritSprites.get(key);
      if (!view) {
        view = makeSpriteNode('Spirit_' + key, 120, s.config.sprite, this.unitLayer);
        this.spiritSprites.set(key, view);
      }
      const p = this.toLocal(s.pos.x, s.pos.y);
      view.node.setPosition(p.x, p.y + 30);
      view.node.active = true;
      const col = ELEMENTS[s.element];
      drawCircle(fxg, p.x, p.y, 30, hexColor(col.color, 70));
    }
    // 清理已撤回的灵兽
    for (const [key, view] of this.spiritSprites) {
      const slot = this.battle.slots.get(key);
      if (!slot || !slot.spirit) {
        view.node.destroy();
        this.spiritSprites.delete(key);
      }
    }

    // 邻接共鸣线
    for (const [a, b] of this.battle.resonance.links(this.battle.slots)) {
      const pa = this.toLocal(a.pos.x, a.pos.y);
      const pb = this.toLocal(b.pos.x, b.pos.y);
      fxg.strokeColor = new Color(212, 168, 75, 90);
      fxg.lineWidth = 3;
      fxg.moveTo(pa.x, pa.y);
      fxg.lineTo(pb.x, pb.y);
      fxg.stroke();
    }

    // 敌人立绘
    const aliveIds = new Set<number>();
    for (const e of this.battle.enemies) {
      if (!e.alive) continue;
      aliveIds.add(e.id);
      let view = this.enemySprites.get(e.id);
      if (!view) {
        const sz = Math.max(64, e.config.radius * 2.6);
        view = makeSpriteNode('Enemy_' + e.id, sz, e.config.sprite, this.unitLayer);
        this.enemySprites.set(e.id, view);
      }
      const p = this.toLocal(e.pos.x, e.pos.y);
      view.node.setPosition(p.x, p.y + 12);
      view.node.active = true;
      if (e.element && this.battle.time < e.elementUntil) {
        const el = ELEMENTS[e.element];
        fxg.strokeColor = hexColor(el.color, 180);
        fxg.lineWidth = 4;
        fxg.circle(p.x, p.y, e.config.radius + 8);
        fxg.stroke();
      }
      const ratio = e.hp / e.maxHp;
      drawRect(fxg, p.x - 28, p.y + e.config.radius + 10, 56, 6, new Color(0, 0, 0, 160));
      drawRect(fxg, p.x - 28, p.y + e.config.radius + 10, 56 * ratio, 6, new Color(200, 60, 50, 220));
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
