extends Node2D
## 镜水涧战斗主场景逻辑
## Battle 只负责组装与循环；反应/连锁/经济内聚在本脚本的 System 段，便于 Demo 单文件跑通。

const Element = preload("res://autoload/data_registry.gd").Element

# ─── 节点 ────────────────────────────────────────────────
@onready var bg: Sprite2D = $MapRoot/Bg
@onready var path_layer: Node2D = $PathLayer
@onready var env_layer: Node2D = $EnvironmentLayer
@onready var slot_layer: Node2D = $SlotLayer
@onready var spirit_layer: Node2D = $SpiritLayer
@onready var enemy_layer: Node2D = $EnemyLayer
@onready var projectile_layer: Node2D = $ProjectileLayer
@onready var effect_layer: Node2D = $EffectLayer

@onready var hud_wave: Label = $UI/TopHUD/WaveLabel
@onready var hud_hp: Label = $UI/TopHUD/HpLabel
@onready var hud_gold: Label = $UI/TopHUD/GoldLabel
@onready var btn_pause: Button = $UI/TopHUD/BtnPause
@onready var btn_speed: Button = $UI/TopHUD/BtnSpeed
@onready var card_bar: HBoxContainer = $UI/SpiritBar
@onready var slot_panel: PanelContainer = $UI/SlotPanel
@onready var slot_panel_title: Label = $UI/SlotPanel/VBox/Title
@onready var slot_panel_meta: Label = $UI/SlotPanel/VBox/Meta
@onready var btn_upgrade: Button = $UI/SlotPanel/VBox/Actions/BtnUpgrade
@onready var btn_sell: Button = $UI/SlotPanel/VBox/Actions/BtnSell
@onready var chain_banner: Label = $UI/ChainBanner
@onready var toast_label: Label = $UI/Toast
@onready var pause_panel: PanelContainer = $UI/PausePanel
@onready var result_panel: PanelContainer = $UI/ResultPanel
@onready var result_title: Label = $UI/ResultPanel/VBox/Title
@onready var result_stats: Label = $UI/ResultPanel/VBox/Stats
@onready var boss_bar: ProgressBar = $UI/BossBar

# ─── 状态 ────────────────────────────────────────────────
var gold := 320
var base_hp := 20
var max_base_hp := 20
var wave_index := 0
var between_waves := true
var wave_delay := 2.0
var battle_speed := 1.0
var state := "ready"  # ready|playing|victory|defeat
var selected_card := ""
var selected_slot := ""
var total_kills := 0

var enemies: Array = []
var projectiles: Array = []
var zones: Array = []
var spirits: Array = []
var slots := {}  # id -> Dictionary

var chain_id := 0
var chain: Dictionary = {}
var chain_level := 0

var spawn_queues: Array = []
var shake_trauma := 0.0
var shake_t := 0.0
var slowmo_until := 0.0

var path_points: PackedVector2Array = PackedVector2Array()
var path_len := 0.0

# ─── 生命周期 ────────────────────────────────────────────
func _ready() -> void:
	var errors := DataRegistry.validate()
	for e in errors:
		push_error(e)
	_setup_map()
	_setup_ui()
	_connect_events()
	start_battle()
	_show_toast("放置灵兽，守住灵种！")

func _setup_map() -> void:
	var tex: Texture2D = load("res://assets/maps/mirror_stream_bg.png")
	if tex:
		bg.texture = tex
		bg.centered = false
		bg.scale = Vector2(1080.0 / tex.get_width(), 1920.0 / tex.get_height())

	path_points = DataRegistry.MAP["path"]
	path_len = 0.0
	for i in path_points.size() - 1:
		path_len += path_points[i].distance_to(path_points[i + 1])
	_draw_path()
	_setup_slots()
	_setup_water()
	_draw_base()

func _draw_path() -> void:
	# 路基描边（更清晰）
	var outline := Line2D.new()
	outline.points = path_points
	outline.width = 96.0
	outline.default_color = Color(0.22, 0.18, 0.12, 0.55)
	outline.joint_mode = Line2D.LINE_JOINT_ROUND
	outline.begin_cap_mode = Line2D.LINE_CAP_ROUND
	outline.end_cap_mode = Line2D.LINE_CAP_ROUND
	path_layer.add_child(outline)

	# 路面 + 可选纹理
	var road := Line2D.new()
	road.points = path_points
	road.width = 72.0
	road.default_color = Color("c4b49a")
	road.joint_mode = Line2D.LINE_JOINT_ROUND
	road.begin_cap_mode = Line2D.LINE_CAP_ROUND
	road.end_cap_mode = Line2D.LINE_CAP_ROUND
	var ptex: Texture2D = load("res://assets/maps/path_texture.png")
	if ptex:
		road.texture = ptex
		road.texture_mode = Line2D.LINE_TEXTURE_TILE
		road.width = 78.0
	path_layer.add_child(road)

	# 内侧亮边
	var inner := Line2D.new()
	inner.points = path_points
	inner.width = 52.0
	inner.default_color = Color(0.86, 0.80, 0.68, 0.35)
	inner.joint_mode = Line2D.LINE_JOINT_ROUND
	inner.begin_cap_mode = Line2D.LINE_CAP_ROUND
	inner.end_cap_mode = Line2D.LINE_CAP_ROUND
	path_layer.add_child(inner)

	# 入口标记
	var entry: Vector2 = DataRegistry.MAP["entry"]
	var mark := _blob(Color("2a2a2a"), 22.0, 22.0)
	mark.position = entry
	path_layer.add_child(mark)
	var mark2 := _blob(Color("c23b2e"), 10.0, 10.0)
	mark2.position = entry
	path_layer.add_child(mark2)
	var elabel := Label.new()
	elabel.text = "入口"
	elabel.position = entry + Vector2(-24, -52)
	elabel.add_theme_font_size_override("font_size", 22)
	path_layer.add_child(elabel)

func _draw_base() -> void:
	var base: Vector2 = DataRegistry.MAP["base"]
	var glow := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(Vector2(cos(a), sin(a)) * 48.0)
	glow.polygon = pts
	glow.color = Color(1.0, 0.82, 0.55, 0.35)
	glow.position = base
	effect_layer.add_child(glow)

	var seed := Polygon2D.new()
	var sp := PackedVector2Array()
	for i in 12:
		var a := TAU * i / 12.0
		sp.append(Vector2(cos(a) * 22.0, sin(a) * 28.0))
	seed.polygon = sp
	seed.color = Color("f0c060")
	seed.position = base
	effect_layer.add_child(seed)

func _setup_slots() -> void:
	for s in DataRegistry.MAP["slots"]:
		var slot := {
			"id": s["id"], "pos": s["pos"], "neighbors": s["neighbors"],
			"spirit": null,
		}
		slots[s["id"]] = slot
		var body := Area2D.new()
		body.position = s["pos"]
		body.set_meta("slot_id", s["id"])
		body.input_pickable = true
		var shape := CollisionShape2D.new()
		var circle := CircleShape2D.new()
		circle.radius = 52.0
		shape.shape = circle
		body.add_child(shape)
		body.input_event.connect(_on_slot_input.bind(s["id"]))
		slot_layer.add_child(body)

		var ring := _make_ring(Color(1, 1, 1, 0.15), 44.0, 2.0)
		ring.position = s["pos"] + Vector2(0, 10)
		ring.set_meta("slot_visual", s["id"])
		slot_layer.add_child(ring)

		# 灵兽底座（放置位）
		var base_spr := Sprite2D.new()
		var btex: Texture2D = load("res://assets/ui/tower_base.png")
		if btex:
			base_spr.texture = btex
			var bs := 96.0 / maxf(btex.get_width(), 1.0)
			base_spr.scale = Vector2(bs, bs)
			base_spr.offset = Vector2(0, -btex.get_height() * bs * 0.15)
		base_spr.position = s["pos"] + Vector2(0, 8)
		base_spr.modulate = Color(1, 1, 1, 0.92)
		base_spr.set_meta("slot_base", s["id"])
		slot_layer.add_child(base_spr)

		var label := Label.new()
		label.text = s["id"]
		label.position = s["pos"] + Vector2(-14, 36)
		label.add_theme_font_size_override("font_size", 18)
		label.modulate = Color(1, 1, 1, 0.4)
		label.set_meta("slot_label", s["id"])
		slot_layer.add_child(label)

func _setup_water() -> void:
	for w in DataRegistry.MAP["water_zones"]:
		var z := {
			"type": "NATURAL_WATER", "pos": w["pos"], "size": w["size"],
			"persistent": true, "expires": INF, "element": Element.WATER,
			"tick_damage": 0.0, "iced_until": 0.0,
		}
		zones.append(z)
		_spawn_zone_visual(z)

func _make_ring(color: Color, radius: float, width: float) -> Line2D:
	var ring := Line2D.new()
	var pts := PackedVector2Array()
	for i in 25:
		var a := TAU * i / 24.0
		pts.append(Vector2(cos(a), sin(a)) * radius)
	ring.points = pts
	ring.width = width
	ring.default_color = color
	ring.closed = true
	return ring

func _setup_ui() -> void:
	btn_pause.pressed.connect(func(): get_tree().paused = true; pause_panel.visible = true)
	btn_speed.pressed.connect(func():
		battle_speed = 2.0 if battle_speed == 1.0 else 1.0
		btn_speed.text = "×2" if battle_speed > 1.0 else "×1"
	)
	btn_upgrade.pressed.connect(_on_upgrade)
	btn_sell.pressed.connect(_on_sell)
	$UI/PausePanel/VBox/BtnResume.pressed.connect(func():
		get_tree().paused = false
		pause_panel.visible = false
	)
	$UI/PausePanel/VBox/BtnRestart.pressed.connect(func():
		get_tree().paused = false
		get_tree().reload_current_scene()
	)
	$UI/ResultPanel/VBox/BtnRetry.pressed.connect(func():
		get_tree().reload_current_scene()
	)
	$UI/ResultPanel/VBox/BtnHome.pressed.connect(func():
		get_tree().paused = false
		Game.go_title()
	)
	slot_panel.visible = false
	pause_panel.visible = false
	result_panel.visible = false
	chain_banner.visible = false
	toast_label.visible = false
	boss_bar.visible = false

	for id in DataRegistry.SPIRIT_ORDER:
		var cfg: Dictionary = DataRegistry.SPIRITS[id]
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(96, 120)
		btn.text = "%s\n%s\n%d" % [DataRegistry.element_name(cfg["element"]), cfg["name"], cfg["cost"]]
		btn.set_meta("spirit_id", id)
		btn.pressed.connect(_on_card_pressed.bind(id))
		card_bar.add_child(btn)

	_update_hud()

func _connect_events() -> void:
	EventBus.gold_changed.connect(func(v): gold = v; _update_hud())
	EventBus.base_hp_changed.connect(func(v, _m): base_hp = v; _update_hud())
	EventBus.chain_reached.connect(_on_chain)
	EventBus.battle_finished.connect(_on_finished)
	EventBus.slot_selected.connect(_on_slot_selected)

func _update_hud() -> void:
	hud_wave.text = "波次 %d/%d" % [mini(wave_index + 1, DataRegistry.WAVES.size()), DataRegistry.WAVES.size()]
	hud_hp.text = "❤ %d" % base_hp
	hud_gold.text = "◉ %d" % gold
	for btn in card_bar.get_children():
		var id: String = btn.get_meta("spirit_id")
		var cost: int = DataRegistry.SPIRITS[id]["cost"]
		btn.disabled = gold < cost

# ─── 输入 ────────────────────────────────────────────────
func _on_card_pressed(spirit_id: String) -> void:
	if selected_card == spirit_id:
		selected_card = ""
	else:
		selected_card = spirit_id
		selected_slot = ""
		slot_panel.visible = false
	EventBus.card_selected.emit(selected_card)
	_refresh_slot_visuals()

func _on_slot_input(_vp, event: InputEvent, _shape, slot_id: String) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_handle_slot_click(slot_id)
	elif event is InputEventScreenTouch and event.pressed:
		_handle_slot_click(slot_id)

func _handle_slot_click(slot_id: String) -> void:
	var slot: Dictionary = slots[slot_id]
	if slot["spirit"]:
		selected_slot = slot_id
		selected_card = ""
		EventBus.card_selected.emit("")
		EventBus.slot_selected.emit(slot_id)
	elif selected_card != "":
		if place_spirit(slot_id, selected_card):
			selected_card = ""
			selected_slot = slot_id
			EventBus.card_selected.emit("")
			EventBus.slot_selected.emit(slot_id)
	else:
		selected_slot = slot_id
		EventBus.slot_selected.emit(slot_id)
	_refresh_slot_visuals()

func _on_slot_selected(slot_id: String) -> void:
	if slot_id == "" or not slots.has(slot_id):
		slot_panel.visible = false
		return
	var slot: Dictionary = slots[slot_id]
	var spirit = slot["spirit"]
	if spirit == null:
		slot_panel_title.text = "空塔位 %s" % slot_id
		slot_panel_meta.text = "先点下方灵兽卡，再点塔位放置"
		btn_upgrade.visible = false
		btn_sell.visible = false
		slot_panel.visible = true
		return
	btn_upgrade.visible = true
	btn_sell.visible = true
	_refresh_slot_panel(spirit)
	slot_panel.visible = true

func _refresh_slot_panel(spirit: Dictionary) -> void:
	var cfg: Dictionary = spirit["config"]
	var el: int = cfg["element"]
	slot_panel_title.text = "%s %s  Lv.%d" % [DataRegistry.element_name(el), cfg["name"], spirit["level"]]
	slot_panel_meta.text = "%s\n伤害 %d · 范围 %d · 共鸣 ×%.2f" % [
		cfg["desc"], int(spirit["damage"]), int(spirit["range"]), spirit["resonance_bonus"]
	]
	var up = get_upgrade_cost(spirit)
	if up == null:
		btn_upgrade.text = "已满级"
		btn_upgrade.disabled = true
	else:
		btn_upgrade.text = "升级 %d" % up
		btn_upgrade.disabled = gold < int(up)
	btn_sell.text = "撤回 +%d" % int(cfg["cost"] * 0.5)

func _on_upgrade() -> void:
	if selected_slot == "":
		return
	upgrade_spirit(selected_slot)
	var slot: Dictionary = slots[selected_slot]
	if slot["spirit"]:
		_refresh_slot_panel(slot["spirit"])
	_update_hud()

func _on_sell() -> void:
	if selected_slot == "":
		return
	sell_spirit(selected_slot)
	slot_panel.visible = false
	selected_slot = ""
	_refresh_slot_visuals()
	_update_hud()

# ─── 放置 / 升级 ─────────────────────────────────────────
func place_spirit(slot_id: String, spirit_id: String) -> bool:
	var slot: Dictionary = slots[slot_id]
	var cfg: Dictionary = DataRegistry.SPIRITS[spirit_id]
	if slot["spirit"] or gold < cfg["cost"]:
		return false
	gold -= cfg["cost"]
	var spirit := {
		"id": randi(), "config_id": spirit_id, "config": cfg,
		"name": cfg["name"], "element": cfg["element"], "level": 1,
		"pos": slot["pos"], "slot_id": slot_id,
		"cd": 0.0, "range": cfg["range"], "damage": cfg["damage"],
		"resonance_bonus": 1.0,
	}
	slot["spirit"] = spirit
	spirits.append(spirit)
	_spawn_spirit_visual(spirit)
	rebuild_resonance(slot_id)
	_burst(slot["pos"], DataRegistry.element_color(cfg["element"]), 12)
	EventBus.gold_changed.emit(gold)
	EventBus.spirit_placed.emit(spirit, slot_id)
	return true

func get_upgrade_cost(spirit: Dictionary):
	var costs: Array = spirit["config"]["upgrade_cost"]
	if spirit["level"] >= 3:
		return null
	return costs[spirit["level"] - 1]

func upgrade_spirit(slot_id: String) -> bool:
	var slot: Dictionary = slots[slot_id]
	var spirit = slot["spirit"]
	if spirit == null:
		return false
	var cost = get_upgrade_cost(spirit)
	if cost == null or gold < int(cost):
		return false
	gold -= int(cost)
	spirit["level"] += 1
	spirit["damage"] += spirit["config"]["upgrade_damage"][spirit["level"] - 2]
	spirit["range"] += 15.0
	_burst(spirit["pos"], DataRegistry.element_color(spirit["element"]), 16)
	EventBus.gold_changed.emit(gold)
	EventBus.spirit_upgraded.emit(spirit)
	return true

func sell_spirit(slot_id: String) -> bool:
	var slot: Dictionary = slots[slot_id]
	var spirit = slot["spirit"]
	if spirit == null:
		return false
	var refund: int = int(spirit["config"]["cost"] * 0.5) + (spirit["level"] - 1) * 20
	gold += refund
	if spirit.has("visual") and is_instance_valid(spirit["visual"]):
		spirit["visual"].queue_free()
	slot["spirit"] = null
	spirits.erase(spirit)
	rebuild_resonance(slot_id)
	for n in slot["neighbors"]:
		rebuild_resonance(n)
	EventBus.gold_changed.emit(gold)
	return true

func rebuild_resonance(slot_id: String) -> void:
	var slot: Dictionary = slots[slot_id]
	if slot["spirit"] == null:
		return
	var bonus := 1.0
	for nid in slot["neighbors"]:
		var other: Dictionary = slots[nid]
		if other["spirit"] and other["spirit"]["element"] != slot["spirit"]["element"]:
			bonus += 0.2
	slot["spirit"]["resonance_bonus"] = minf(bonus, 1.8)
	for nid in slot["neighbors"]:
		var other: Dictionary = slots[nid]
		if other["spirit"] == null:
			continue
		var b := 1.0
		for nid2 in other["neighbors"]:
			var o2: Dictionary = slots[nid2]
			if o2["spirit"] and o2["spirit"]["element"] != other["spirit"]["element"]:
				b += 0.2
		other["spirit"]["resonance_bonus"] = minf(b, 1.8)
	_draw_resonance()

func _draw_resonance() -> void:
	for c in slot_layer.get_children():
		if c.has_meta("resonance"):
			c.queue_free()
	for a_id in slots:
		var a: Dictionary = slots[a_id]
		if a["spirit"] == null:
			continue
		for b_id in a["neighbors"]:
			if a_id >= b_id:
				continue
			var b: Dictionary = slots[b_id]
			if b["spirit"] == null or a["spirit"]["element"] == b["spirit"]["element"]:
				continue
			var line := Line2D.new()
			line.points = PackedVector2Array([a["pos"], b["pos"]])
			line.width = 3.0
			var ca := DataRegistry.element_color(a["spirit"]["element"])
			var cb := DataRegistry.element_color(b["spirit"]["element"])
			line.default_color = (ca + cb) * 0.5
			line.default_color.a = 0.55
			line.set_meta("resonance", true)
			slot_layer.add_child(line)

func _refresh_slot_visuals() -> void:
	for c in slot_layer.get_children():
		if c is Line2D and c.has_meta("slot_visual"):
			var sid: String = c.get_meta("slot_visual")
			var slot: Dictionary = slots[sid]
			if slot["spirit"]:
				c.default_color = Color(1, 1, 1, 0.05)
			elif selected_card != "" and gold >= DataRegistry.SPIRITS[selected_card]["cost"]:
				c.default_color = Color(1.0, 0.82, 0.35, 0.7)
			elif selected_slot == sid:
				c.default_color = Color(1.0, 0.82, 0.35, 0.9)
			else:
				c.default_color = Color(1, 1, 1, 0.12)
		if c is Sprite2D and c.has_meta("slot_base"):
			var sid2: String = c.get_meta("slot_base")
			var slot2: Dictionary = slots[sid2]
			if slot2["spirit"]:
				c.modulate = Color(1, 1, 1, 0.75)
			elif selected_card != "" and gold >= DataRegistry.SPIRITS[selected_card]["cost"]:
				c.modulate = Color(1.0, 0.95, 0.75, 1.0)
			else:
				c.modulate = Color(1, 1, 1, 0.92)

# ─── 视觉 ────────────────────────────────────────────────
func _spawn_spirit_visual(spirit: Dictionary) -> void:
	var root := Node2D.new()
	root.position = spirit["pos"] + Vector2(0, -6)

	var col := DataRegistry.element_color(spirit["element"])
	var glow := _blob(col, 40.0, 12.0, Vector2(0, 28))
	glow.color.a = 0.28
	root.add_child(glow)

	var halo := _make_ring(col, 36.0, 2.5)
	halo.position = Vector2(0, 26)
	halo.default_color.a = 0.35
	root.add_child(halo)

	var spr := Sprite2D.new()
	var path: String = spirit["config"].get("sprite", "")
	if path != "" and ResourceLoader.exists(path):
		spr.texture = load(path)
		var tw: float = maxf(spr.texture.get_width(), 1.0)
		var s := 118.0 / tw
		spr.scale = Vector2(s, s)
		spr.offset = Vector2(0, -spr.texture.get_height() * s * 0.52)
	else:
		var body := _blob(col, 30.0, 26.0)
		root.add_child(body)
		var head := _blob(col, 20.0, 20.0, Vector2(0, -20))
		root.add_child(head)
	root.add_child(spr)

	# 元素待机粒子容器
	var fx := Node2D.new()
	root.add_child(fx)

	spirit_layer.add_child(root)
	spirit["visual"] = root
	spirit["sprite"] = spr
	spirit["glow"] = glow
	spirit["halo"] = halo
	spirit["fx"] = fx
	spirit["anim"] = {
		"t": randf() * TAU,
		"attack_t": -1.0,
		"attack_dur": 0.4,
		"facing": 1.0,
		"idle_particle_cd": randf_range(0.0, 0.4),
		"base_y": root.position.y,
		"base_scale": spr.scale if spr.texture else Vector2.ONE,
	}

func _blob(color: Color, rx: float, ry: float, offset: Vector2 = Vector2.ZERO) -> Polygon2D:
	var p := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in 14:
		var a := TAU * i / 14.0
		pts.append(Vector2(cos(a) * rx, sin(a) * ry))
	p.polygon = pts
	p.color = color
	p.position = offset
	return p

func _spawn_zone_visual(zone: Dictionary) -> void:
	var rect := ColorRect.new()
	rect.size = zone["size"]
	rect.position = zone["pos"] - zone["size"] * 0.5
	match zone["type"]:
		"NATURAL_WATER", "PUDDLE":
			rect.color = Color(0.23, 0.65, 0.77, 0.28)
		"ICE":
			rect.color = Color(0.66, 0.83, 0.91, 0.4)
		"FIRE_FIELD":
			rect.color = Color(0.91, 0.36, 0.23, 0.3)
		"STEAM":
			rect.color = Color(0.82, 0.9, 0.88, 0.35)
		"STORM":
			rect.color = Color(0.48, 0.36, 1.0, 0.28)
		_:
			rect.color = Color(1, 1, 1, 0.15)
	zone["visual"] = rect
	env_layer.add_child(rect)

func _spawn_enemy_visual(enemy: Dictionary) -> void:
	var root := Node2D.new()
	root.position = enemy["pos"]
	# 地面阴影
	var shadow := _blob(Color(0, 0, 0, 0.25), enemy["radius"] * 1.1, enemy["radius"] * 0.4, Vector2(0, enemy["radius"] * 0.35))
	root.add_child(shadow)

	var spr := Sprite2D.new()
	var spath: String = enemy["config"].get("sprite", "")
	if spath != "" and ResourceLoader.exists(spath):
		spr.texture = load(spath)
		var target_w: float = enemy["radius"] * 2.4
		if enemy["config"]["is_boss"]:
			target_w = enemy["radius"] * 2.6
		elif enemy["config"]["tag"] == "swarm":
			target_w = enemy["radius"] * 2.2
		var tw: float = maxf(spr.texture.get_width(), 1.0)
		var s := target_w / tw
		spr.scale = Vector2(s, s)
		spr.offset = Vector2(0, -spr.texture.get_height() * s * 0.45)
		root.add_child(spr)
	else:
		var body := _blob(enemy["config"]["color"], enemy["radius"], enemy["radius"] * 0.9)
		root.add_child(body)
		var eye := _blob(enemy["config"]["accent"], 4.0, 4.0, Vector2(-7, -2))
		root.add_child(eye)
		var eye2 := _blob(enemy["config"]["accent"], 4.0, 4.0, Vector2(7, -2))
		root.add_child(eye2)

	# 状态染色环（元素表现）
	var status := _make_ring(Color(1, 1, 1, 0.0), enemy["radius"] + 6.0, 3.0)
	status.set_meta("status_ring", true)
	root.add_child(status)

	enemy_layer.add_child(root)
	enemy["visual"] = root
	enemy["sprite"] = spr
	enemy["status_ring"] = status

func _burst(pos: Vector2, color: Color, n: int) -> void:
	for i in n:
		var p := ColorRect.new()
		p.size = Vector2(6, 6)
		p.color = color
		p.position = pos
		effect_layer.add_child(p)
		var tw := create_tween()
		var dir := Vector2.RIGHT.rotated(randf() * TAU) * randf_range(40, 120)
		tw.tween_property(p, "position", pos + dir, 0.35)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.35)
		tw.tween_callback(p.queue_free)

func _reaction_vfx(pos: Vector2, name: String, color: Color) -> void:
	var label := Label.new()
	label.text = name
	label.position = pos + Vector2(-30, -50)
	label.add_theme_font_size_override("font_size", 28)
	label.modulate = color
	effect_layer.add_child(label)
	var ring := _make_ring(color, 40.0, 3.0)
	ring.position = pos
	effect_layer.add_child(ring)
	var tw := create_tween()
	tw.tween_property(ring, "scale", Vector2(2.2, 2.2), 0.4)
	tw.parallel().tween_property(ring, "modulate:a", 0.0, 0.4)
	tw.tween_callback(ring.queue_free)
	var tw2 := create_tween()
	tw2.tween_property(label, "position:y", label.position.y - 30.0, 0.5)
	tw2.parallel().tween_property(label, "modulate:a", 0.0, 0.5)
	tw2.tween_callback(label.queue_free)

# ─── 主循环 ──────────────────────────────────────────────
func _process(delta: float) -> void:
	if state != "playing":
		return
	var scale := battle_speed
	if Time.get_ticks_msec() / 1000.0 < slowmo_until:
		scale *= 0.35
	var dt := delta * scale
	_update_waves(dt)
	_update_spirits(dt)
	_update_projectiles(dt)
	_update_zones(dt)
	_update_enemies(dt)
	_update_shake(delta)
	_update_boss_bar()

func _update_waves(dt: float) -> void:
	if between_waves:
		wave_delay -= dt
		if wave_delay <= 0.0:
			_start_next_wave()
		return
	for q in spawn_queues:
		q["timer"] -= dt
		while q["remaining"] > 0 and q["timer"] <= 0.0:
			_spawn_enemy(q["enemy_id"])
			q["remaining"] -= 1
			q["timer"] += q["interval"]
	var pending := false
	for q in spawn_queues:
		if q["remaining"] > 0:
			pending = true
	if pending:
		return
	for e in enemies:
		if e["alive"] and not e["reached"]:
			return
	wave_index += 1
	EventBus.wave_completed.emit(wave_index)
	if wave_index >= DataRegistry.WAVES.size():
		_finish(true)
	else:
		between_waves = true
		wave_delay = 3.0
		gold += 20 + wave_index * 5
		EventBus.gold_changed.emit(gold)
	_update_hud()

func _start_next_wave() -> void:
	if wave_index >= DataRegistry.WAVES.size():
		return
	between_waves = false
	spawn_queues.clear()
	for entry in DataRegistry.WAVES[wave_index]:
		spawn_queues.append({
			"enemy_id": entry["enemy_id"], "remaining": entry["count"],
			"interval": entry["interval"], "timer": entry["delay"],
		})
	EventBus.wave_started.emit(wave_index + 1)
	_update_hud()

func _spawn_enemy(enemy_id: String) -> void:
	var cfg: Dictionary = DataRegistry.ENEMIES[enemy_id]
	var p0: Vector2 = DataRegistry.MAP["path"][0]
	var enemy := {
		"id": randi(), "config": cfg, "name": cfg["name"],
		"hp": cfg["max_hp"], "max_hp": cfg["max_hp"], "speed": cfg["speed"],
		"reward": cfg["reward"], "radius": cfg["radius"], "is_boss": cfg["is_boss"],
		"progress": 0.0, "pos": p0, "alive": true, "reached": false, "_killed": false,
		"frozen_until": 0.0, "slow_until": 0.0, "slow_factor": 1.0,
		"element": -1, "element_until": 0.0, "burn_until": 0.0, "burn_tick": 0.0,
		"shell_broken": false,
	}
	enemies.append(enemy)
	_spawn_enemy_visual(enemy)
	if cfg["is_boss"]:
		enemy["charge_cd"] = cfg["charge_interval"]
		enemy["summon_cd"] = cfg["summon_interval"]
	EventBus.enemy_spawned.emit(enemy)

# ─── 攻击 ────────────────────────────────────────────────
func _update_spirits(dt: float) -> void:
	for spirit in spirits:
		spirit["cd"] -= dt
		var target = _find_target(spirit)
		_update_spirit_anim(spirit, dt, target)
		if spirit["cd"] > 0.0:
			continue
		if target == null:
			continue
		spirit["cd"] = spirit["config"]["attack_interval"]
		_spirit_attack(spirit, target)

## 待机 / 攻击动画
func _update_spirit_anim(spirit: Dictionary, dt: float, target) -> void:
	if not spirit.has("anim") or not spirit.has("visual") or not is_instance_valid(spirit["visual"]):
		return
	var anim: Dictionary = spirit["anim"]
	var root: Node2D = spirit["visual"]
	anim["t"] += dt

	# 攻击窗口
	if anim["attack_t"] >= 0.0:
		anim["attack_t"] += dt
		var k: float = anim["attack_t"] / maxf(anim["attack_dur"], 0.01)
		_play_attack_pose(spirit, anim, k, target)
		if anim["attack_t"] >= anim["attack_dur"]:
			anim["attack_t"] = -1.0

	# 待机：呼吸起伏 + 元素粒子（无目标时更明显）
	var bob: float = sin(anim["t"] * 2.6) * 3.5
	var breathe: float = 1.0 + sin(anim["t"] * 3.1) * 0.035
	if anim["attack_t"] < 0.0:
		root.position.y = anim["base_y"] + bob
		if spirit.has("sprite") and is_instance_valid(spirit["sprite"]) and spirit["sprite"].texture:
			spirit["sprite"].scale = anim["base_scale"] * breathe
		if spirit.has("glow") and is_instance_valid(spirit["glow"]):
			spirit["glow"].color.a = 0.22 + 0.08 * (0.5 + 0.5 * sin(anim["t"] * 2.0))
		if spirit.has("halo") and is_instance_valid(spirit["halo"]):
			spirit["halo"].rotation = anim["t"] * 0.4

	anim["idle_particle_cd"] -= dt
	if anim["idle_particle_cd"] <= 0.0:
		anim["idle_particle_cd"] = 0.35 if target == null else 0.8
		_idle_particle(spirit)

func _play_attack_pose(spirit: Dictionary, anim: Dictionary, k: float, target) -> void:
	var root: Node2D = spirit["visual"]
	var spr = spirit.get("sprite")
	# 朝向目标
	if target != null and target.has("pos"):
		anim["facing"] = 1.0 if target["pos"].x >= spirit["pos"].x else -1.0
	var face: float = anim["facing"]

	# 前摇 0-0.35 蓄力压缩，0.35-0.55 发射前挺，0.55-1 回弹
	var sx := 1.0
	var sy := 1.0
	var y_off := 0.0
	if k < 0.35:
		var w := k / 0.35
		sx = lerp(1.0, 0.88, w)
		sy = lerp(1.0, 1.08, w)
		y_off = 2.0 * w
	elif k < 0.55:
		var w2 := (k - 0.35) / 0.2
		sx = lerp(0.88, 1.14, w2)
		sy = lerp(1.08, 0.92, w2)
		y_off = lerp(2.0, -4.0, w2)
	else:
		var w3 := (k - 0.55) / 0.45
		sx = lerp(1.14, 1.0, w3)
		sy = lerp(0.92, 1.0, w3)
		y_off = lerp(-4.0, 0.0, w3)

	if spr and is_instance_valid(spr) and spr.texture:
		spr.scale = anim["base_scale"] * Vector2(sx * face if face < 0 else sx, sy)
		if face < 0:
			spr.scale = anim["base_scale"] * Vector2(-sx, sy)
	root.position.y = anim["base_y"] + y_off

	if spirit.has("halo") and is_instance_valid(spirit["halo"]) and k < 0.55:
		spirit["halo"].default_color.a = 0.35 + 0.4 * (1.0 - k)

func _idle_particle(spirit: Dictionary) -> void:
	if not spirit.has("fx") or not is_instance_valid(spirit["fx"]):
		return
	var col := DataRegistry.element_color(spirit["element"])
	var p := ColorRect.new()
	var sz := randf_range(3.0, 6.0)
	p.size = Vector2(sz, sz)
	p.color = Color(col.r, col.g, col.b, 0.55)
	p.position = Vector2(randf_range(-18, 18), randf_range(-10, 8))
	spirit["fx"].add_child(p)
	var tw := create_tween()
	tw.tween_property(p, "position", p.position + Vector2(randf_range(-8, 8), -randf_range(18, 36)), 0.55)
	tw.parallel().tween_property(p, "modulate:a", 0.0, 0.55)
	tw.tween_callback(p.queue_free)

func _begin_attack_anim(spirit: Dictionary) -> void:
	if spirit.has("anim"):
		spirit["anim"]["attack_t"] = 0.0

func _find_target(spirit: Dictionary):
	var best = null
	var best_score := -INF
	var prefer_wet: bool = spirit["config"].get("prefer_wet", false)
	for e in enemies:
		if not e["alive"] or e["reached"]:
			continue
		var d: float = spirit["pos"].distance_to(e["pos"])
		if d > spirit["range"] + e["radius"]:
			continue
		var score: float = e["progress"] * 1000.0
		if prefer_wet and e["element"] == DataRegistry.Element.WATER:
			score += 500.0
		if score > best_score:
			best_score = score
			best = e
	return best

func _spirit_attack(spirit: Dictionary, target) -> void:
	var cfg: Dictionary = spirit["config"]
	var type: String = cfg["attack_type"]
	_begin_attack_anim(spirit)
	match type:
		"projectile":
			_fire_projectile(spirit, target)
		"beam":
			_beam_attack(spirit, target)
		"pulse":
			_pulse_attack(spirit)

func _skill_key(spirit: Dictionary) -> String:
	return spirit["config"].get("skill", "fireball")

func _skill_color(spirit: Dictionary) -> Color:
	return spirit["config"].get("skill_color", DataRegistry.element_color(spirit["element"]))

func _fire_projectile(spirit: Dictionary, target) -> void:
	var col := _skill_color(spirit)
	var skill: String = _skill_key(spirit)
	var proj := {
		"pos": spirit["pos"] + Vector2(0, -20), "target": target,
		"speed": spirit["config"]["projectile_speed"],
		"damage": spirit["damage"], "element": spirit["element"],
		"status": spirit["config"].get("status", ""),
		"status_duration": spirit["config"].get("status_duration", 2.0) * spirit["resonance_bonus"],
		"splash": spirit["config"].get("splash", 0.0), "color": col,
		"radius": 10.0, "alive": true, "skill": skill,
	}
	var vis := _make_skill_projectile_visual(skill, col)
	vis.position = proj["pos"]
	projectile_layer.add_child(vis)
	proj["visual"] = vis
	projectiles.append(proj)
	_cast_flash(spirit["pos"] + Vector2(0, -24), col)

func _make_skill_projectile_visual(skill: String, col: Color) -> Node2D:
	var root := Node2D.new()
	match skill:
		"fireball":
			var core := _blob(col, 12.0, 12.0)
			root.add_child(core)
			var outer := _blob(Color(col.r, col.g, col.b, 0.35), 20.0, 18.0)
			root.add_child(outer)
			var spark := _blob(Color(1, 0.9, 0.5, 0.8), 4.0, 4.0, Vector2(-4, -4))
			root.add_child(spark)
		"water_orb":
			var c := _blob(col, 11.0, 11.0)
			root.add_child(c)
			var shine := _blob(Color(1, 1, 1, 0.45), 4.0, 3.0, Vector2(-3, -3))
			root.add_child(shine)
			var ring := _make_ring(Color(col.r, col.g, col.b, 0.4), 16.0, 2.0)
			root.add_child(ring)
		"ice_shard":
			var shard := Polygon2D.new()
			shard.polygon = PackedVector2Array([
				Vector2(0, -14), Vector2(7, 0), Vector2(0, 14), Vector2(-7, 0)
			])
			shard.color = col
			root.add_child(shard)
			var core := _blob(Color(1, 1, 1, 0.7), 3.0, 5.0)
			root.add_child(core)
		_:
			root.add_child(_blob(col, 10.0, 10.0))
	return root

func _cast_flash(pos: Vector2, col: Color) -> void:
	var ring := _make_ring(col, 14.0, 3.0)
	ring.position = pos
	effect_layer.add_child(ring)
	var tw := create_tween()
	tw.tween_property(ring, "scale", Vector2(2.4, 2.4), 0.22)
	tw.parallel().tween_property(ring, "modulate:a", 0.0, 0.22)
	tw.tween_callback(ring.queue_free)

func _beam_attack(spirit: Dictionary, target) -> void:
	var hits := [target]
	var current = target
	var max_bounce: int = spirit["config"].get("chain_count", 2)
	for i in max_bounce:
		var next = null
		var best: float = spirit["config"].get("chain_range", 140.0)
		for e in enemies:
			if not e["alive"] or e["reached"] or e in hits:
				continue
			var d: float = current["pos"].distance_to(e["pos"])
			var bonus := -40.0 if e["element"] == DataRegistry.Element.WATER else 0.0
			if d + bonus < best:
				best = d + bonus
				next = e
		if next == null:
			break
		hits.append(next)
		current = next
	var col := _skill_color(spirit)
	for i in hits.size():
		var e = hits[i]
		var dmg: float = spirit["damage"] * (1.0 if i == 0 else 0.65)
		_apply_hit(e, dmg, spirit["element"], spirit["config"].get("status", ""), spirit["config"].get("status_duration", 2.0) * spirit["resonance_bonus"])
		var from: Vector2 = spirit["pos"] + Vector2(0, -28) if i == 0 else hits[i - 1]["pos"]
		_thunder_bolt(from, e["pos"], col)

func _thunder_bolt(a: Vector2, b: Vector2, col: Color) -> void:
	# 折线雷电
	var pts := PackedVector2Array()
	var segs := 6
	for i in segs + 1:
		var t := float(i) / float(segs)
		var p := a.lerp(b, t)
		if i > 0 and i < segs:
			var n := (b - a).normalized().orthogonal()
			p += n * randf_range(-12.0, 12.0)
		pts.append(p)
	var bolt := Line2D.new()
	bolt.points = pts
	bolt.width = 6.0
	bolt.default_color = col
	bolt.joint_mode = Line2D.LINE_JOINT_ROUND
	effect_layer.add_child(bolt)
	var glow := Line2D.new()
	glow.points = pts
	glow.width = 12.0
	glow.default_color = Color(col.r, col.g, col.b, 0.25)
	effect_layer.add_child(glow)
	var tw := create_tween()
	tw.tween_property(bolt, "modulate:a", 0.0, 0.2)
	tw.parallel().tween_property(glow, "modulate:a", 0.0, 0.18)
	tw.tween_callback(bolt.queue_free)
	tw.tween_callback(glow.queue_free)
	# 落点电花
	_burst(b, col, 8)
	var pop := _make_ring(Color(1, 1, 1, 0.8), 10.0, 2.0)
	pop.position = b
	effect_layer.add_child(pop)
	var tw2 := create_tween()
	tw2.tween_property(pop, "scale", Vector2(2.0, 2.0), 0.15)
	tw2.parallel().tween_property(pop, "modulate:a", 0.0, 0.15)
	tw2.tween_callback(pop.queue_free)

func _pulse_attack(spirit: Dictionary) -> void:
	var r: float = spirit["config"].get("pulse_radius", 110.0)
	var col := _skill_color(spirit)
	# 多层风环
	for i in 3:
		var ring := _make_ring(col, r * (0.35 + i * 0.25), 3.0 + i)
		ring.position = spirit["pos"] + Vector2(0, -10)
		ring.default_color.a = 0.55 - i * 0.12
		effect_layer.add_child(ring)
		var tw := create_tween()
		tw.tween_interval(0.04 * i)
		tw.tween_property(ring, "scale", Vector2(1.25, 1.25), 0.32)
		tw.parallel().tween_property(ring, "modulate:a", 0.0, 0.32)
		tw.tween_callback(ring.queue_free)
	# 飘叶
	for i in 8:
		var leaf := Polygon2D.new()
		leaf.polygon = PackedVector2Array([Vector2(0, -5), Vector2(4, 0), Vector2(0, 5), Vector2(-3, 0)])
		leaf.color = Color(col.r, col.g, col.b, 0.7)
		leaf.position = spirit["pos"] + Vector2(randf_range(-10, 10), randf_range(-8, 8))
		effect_layer.add_child(leaf)
		var ang := TAU * i / 8.0 + randf_range(-0.2, 0.2)
		var twl := create_tween()
		twl.tween_property(leaf, "position", leaf.position + Vector2(cos(ang), sin(ang) * 0.6) * r, 0.4)
		twl.parallel().tween_property(leaf, "rotation", randf_range(-2.0, 2.0), 0.4)
		twl.parallel().tween_property(leaf, "modulate:a", 0.0, 0.4)
		twl.tween_callback(leaf.queue_free)

	for e in enemies:
		if not e["alive"] or e["reached"]:
			continue
		if spirit["pos"].distance_to(e["pos"]) <= r + e["radius"]:
			_apply_hit(e, spirit["damage"], spirit["element"], spirit["config"].get("status", ""), spirit["config"].get("status_duration", 2.0) * spirit["resonance_bonus"])
	if spirit["config"].get("spread_env", false):
		for z in zones:
			if z["persistent"]:
				continue
			if spirit["pos"].distance_to(z["pos"]) < r + 80.0:
				z["expires"] = maxf(z["expires"], Time.get_ticks_msec() / 1000.0 + 1.2)

func _update_projectiles(dt: float) -> void:
	for p in projectiles:
		if not p["alive"]:
			continue
		var t = p["target"]
		if t == null or not t["alive"] or t["reached"]:
			p["alive"] = false
			if p.has("visual") and is_instance_valid(p["visual"]):
				p["visual"].queue_free()
			continue
		var to: Vector2 = t["pos"] - p["pos"]
		var d := to.length()
		var step: float = p["speed"] * dt
		if d <= step + t["radius"]:
			_apply_hit(t, p["damage"], p["element"], p["status"], p["status_duration"])
			_skill_hit_vfx(p.get("skill", ""), t["pos"], p["color"], p["element"])
			if p["splash"] > 0.0:
				for e in enemies:
					if e == t or not e["alive"]:
						continue
					if t["pos"].distance_to(e["pos"]) < p["splash"] + e["radius"]:
						_apply_hit(e, p["damage"] * 0.45, p["element"], p["status"], p["status_duration"] * 0.6)
			_leave_env_on_hit(t["pos"], p["element"])
			p["alive"] = false
			if p.has("visual") and is_instance_valid(p["visual"]):
				p["visual"].queue_free()
		else:
			p["pos"] += to.normalized() * step
			if p.has("visual") and is_instance_valid(p["visual"]):
				p["visual"].position = p["pos"]
				p["visual"].rotation += dt * 6.0
				# 弹道尾焰
				if p.get("skill", "") == "fireball" and randf() < 0.55:
					var tr := ColorRect.new()
					tr.size = Vector2(5, 5)
					tr.color = Color(p["color"].r, p["color"].g, p["color"].b, 0.5)
					tr.position = p["pos"] + Vector2(randf_range(-3, 3), randf_range(-3, 3))
					effect_layer.add_child(tr)
					var tw := create_tween()
					tw.tween_property(tr, "modulate:a", 0.0, 0.25)
					tw.tween_callback(tr.queue_free)
	projectiles = projectiles.filter(func(p): return p["alive"])

func _skill_hit_vfx(skill: String, pos: Vector2, col: Color, element: int) -> void:
	match skill:
		"fireball":
			_burst(pos, col, 14)
			_burst(pos, Color(1, 0.85, 0.4), 6)
			var r := _make_ring(Color(1, 0.6, 0.3, 0.7), 18.0, 3.0)
			r.position = pos
			effect_layer.add_child(r)
			var tw := create_tween()
			tw.tween_property(r, "scale", Vector2(2.8, 2.8), 0.28)
			tw.parallel().tween_property(r, "modulate:a", 0.0, 0.28)
			tw.tween_callback(r.queue_free)
		"water_orb":
			_burst(pos, col, 12)
			for i in 5:
				var drop := _blob(Color(0.6, 0.9, 1, 0.8), 3.0, 4.0)
				drop.position = pos
				effect_layer.add_child(drop)
				var twd := create_tween()
				var a := randf_range(-PI, 0.0)
				twd.tween_property(drop, "position", pos + Vector2(cos(a), sin(a)) * randf_range(20, 40), 0.3)
				twd.parallel().tween_property(drop, "modulate:a", 0.0, 0.3)
				twd.tween_callback(drop.queue_free)
		"ice_shard":
			_burst(pos, col, 10)
			for i in 6:
				var sp := Polygon2D.new()
				sp.polygon = PackedVector2Array([Vector2(0, -6), Vector2(3, 0), Vector2(0, 6), Vector2(-3, 0)])
				sp.color = col
				sp.position = pos
				effect_layer.add_child(sp)
				var tws := create_tween()
				var ang := TAU * i / 6.0
				tws.tween_property(sp, "position", pos + Vector2(cos(ang), sin(ang)) * 28.0, 0.28)
				tws.parallel().tween_property(sp, "modulate:a", 0.0, 0.28)
				tws.tween_callback(sp.queue_free)
		_:
			_burst(pos, col, 8)
			_cast_flash(pos, col)

func _leave_env_on_hit(pos: Vector2, element: int) -> void:
	if element == DataRegistry.Element.WATER:
		_spawn_dynamic_zone(pos, "PUDDLE", 3.2, 0.0, Vector2(56, 32))
	elif element == DataRegistry.Element.FIRE:
		_spawn_dynamic_zone(pos, "FIRE_FIELD", 1.6, 5.0, Vector2(48, 28))

# ─── 元素 / 反应 / 连锁 ─────────────────────────────────
func _apply_hit(enemy, damage: float, element: int, status: String, status_duration: float) -> void:
	if enemy == null or not enemy["alive"] or enemy["_killed"]:
		return
	var died := _damage(enemy, damage)
	_burst(enemy["pos"], DataRegistry.element_color(element), 6)
	if died:
		_kill_enemy(enemy)
		return
	if status == "BURN":
		enemy["burn_until"] = Time.get_ticks_msec() / 1000.0 + status_duration
	if status == "CHILL":
		enemy["slow_until"] = Time.get_ticks_msec() / 1000.0 + status_duration
		enemy["slow_factor"] = 0.55
	_apply_element(enemy, element, status_duration)

func _damage(enemy, amount: float) -> bool:
	if not enemy["alive"] or enemy["_killed"]:
		return false
	var dmg := amount
	if enemy["config"]["tag"] == "tank" and not enemy["shell_broken"]:
		dmg *= 0.65
	enemy["hp"] -= dmg
	if enemy["hp"] <= 0.0:
		enemy["hp"] = 0.0
		enemy["alive"] = false
		return true
	return false

func _apply_element(target, incoming: int, duration: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	var existing: int = -1
	if target["element"] >= 0 and now < target["element_until"]:
		existing = target["element"]
	if existing >= 0 and existing != incoming:
		var reaction: Dictionary = DataRegistry.find_reaction(existing, incoming)
		if not reaction.is_empty():
			_execute_reaction(target, reaction, incoming)
			return
	target["element"] = incoming
	target["element_until"] = now + duration
	EventBus.element_applied.emit(target, incoming)

func _next_context() -> Dictionary:
	var now := Time.get_ticks_msec() / 1000.0
	if not chain.is_empty() and now - chain["last_at"] < DataRegistry.CHAIN_WINDOW:
		chain["last_at"] = now
		chain["chain_level"] += 1
		chain_level = chain["chain_level"]
		return chain
	chain_id += 1
	chain = {
		"chain_id": chain_id, "chain_level": 1, "started_at": now, "last_at": now,
		"visited": [], "ultimate_fired": false,
	}
	chain_level = 1
	return chain

func _execute_reaction(target, reaction: Dictionary, incoming: int) -> void:
	var pos: Vector2 = target["pos"]
	var ctx := _next_context()
	target["element"] = -1
	target["element_until"] = 0.0

	var dmg: float = reaction["damage"] * (1.0 + (ctx["chain_level"] - 1) * 0.25)
	var died := _damage(target, dmg)
	_burst(pos, reaction["vfx_color"], 16)
	_reaction_vfx(pos, reaction["name"], reaction["vfx_color"])

	if reaction.get("freeze", false):
		target["frozen_until"] = Time.get_ticks_msec() / 1000.0 + reaction.get("duration", 2.0)
		for z in zones:
			if z["type"] == "NATURAL_WATER" or z["type"] == "PUDDLE":
				if _point_in_zone(pos, z):
					z["iced_until"] = Time.get_ticks_msec() / 1000.0 + 4.0
					if not z["persistent"] and z.has("visual") and is_instance_valid(z["visual"]):
						z["visual"].color = Color(0.66, 0.83, 0.91, 0.4)

	if reaction.get("bounce", false):
		_chain_lightning(target, reaction)

	if reaction.get("splash", 0.0) > 0.0:
		for e in enemies:
			if e == target or not e["alive"]:
				continue
			if pos.distance_to(e["pos"]) < reaction["splash"] + e["radius"]:
				_damage(e, reaction["damage"] * 0.5)
				_burst(e["pos"], reaction["vfx_color"], 6)

	if reaction.has("env_create"):
		_spawn_dynamic_zone(pos, reaction["env_create"]["type"], reaction["env_create"]["duration"], reaction.get("tick_damage", 0.0), Vector2(100, 56))

	if died:
		_kill_enemy(target)

	shake_trauma = clampf(shake_trauma + reaction.get("camera_shake", 0.15), 0.0, 1.0)
	EventBus.reaction_triggered.emit(reaction["id"], pos, ctx)
	_advance_chain(ctx, reaction)

func _chain_lightning(from, reaction: Dictionary) -> void:
	var range: float = reaction.get("bounce_range", 160.0)
	var max_n: int = reaction.get("bounce_count", 2)
	var current = from
	var hit := {from["id"]: true}
	for i in max_n:
		var next = null
		var best := range
		for e in enemies:
			if not e["alive"] or hit.has(e["id"]):
				continue
			var d: float = current["pos"].distance_to(e["pos"])
			if d < best:
				best = d
				next = e
		if next == null:
			break
		hit[next["id"]] = true
		var died := _damage(next, reaction["damage"] * 0.7)
		_line_vfx(current["pos"], next["pos"], reaction["vfx_color"])
		_burst(next["pos"], reaction["vfx_color"], 8)
		if died:
			_kill_enemy(next)
		current = next

func _advance_chain(ctx: Dictionary, reaction: Dictionary) -> void:
	ctx["visited"].append(reaction["id"])
	var level: int = ctx["chain_level"]
	EventBus.chain_reached.emit(level, ctx)
	if level == 2:
		_show_chain("×2  强化连锁  " + reaction["name"])
		shake_trauma = clampf(shake_trauma + 0.12, 0.0, 1.0)
	elif level == 3:
		_show_chain("×3  高级连锁  " + reaction["name"])
		shake_trauma = clampf(shake_trauma + 0.28, 0.0, 1.0)
		slowmo_until = Time.get_ticks_msec() / 1000.0 + 0.4
	elif level >= 4 and not ctx["ultimate_fired"]:
		ctx["ultimate_fired"] = true
		_show_chain("×4  山海异象  " + reaction["name"])
		shake_trauma = 0.55
		slowmo_until = Time.get_ticks_msec() / 1000.0 + 0.5
		for e in enemies:
			if e["alive"]:
				_apply_hit(e, 45.0, reaction.get("output", ""), "", 0.0)

func _show_chain(text: String) -> void:
	chain_banner.text = text
	chain_banner.visible = true
	chain_banner.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(1.2)
	tw.tween_property(chain_banner, "modulate:a", 0.0, 0.3)
	tw.tween_callback(func(): chain_banner.visible = false)

func _show_toast(msg: String) -> void:
	toast_label.text = msg
	toast_label.visible = true
	toast_label.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(2.0)
	tw.tween_property(toast_label, "modulate:a", 0.0, 0.3)
	tw.tween_callback(func(): toast_label.visible = false)

# ─── 环境 / 敌人 ─────────────────────────────────────────
func _spawn_dynamic_zone(pos: Vector2, type: String, duration: float, tick_damage: float, size: Vector2) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for z in zones:
		if z["persistent"]:
			continue
		if z["type"] == type and z["pos"].distance_to(pos) < 80.0:
			z["expires"] = now + duration
			return
	var z := {
		"type": type, "pos": pos, "size": size, "persistent": false,
		"expires": now + duration, "tick_damage": tick_damage, "iced_until": 0.0,
		"element": -1, "tick_timer": 0.0,
	}
	zones.append(z)
	_spawn_zone_visual(z)
	var dyn := zones.filter(func(x): return not x["persistent"])
	if dyn.size() > 12:
		var oldest = dyn[0]
		for x in dyn:
			if x["expires"] < oldest["expires"]:
				oldest = x
		if oldest.has("visual") and is_instance_valid(oldest["visual"]):
			oldest["visual"].queue_free()
		zones.erase(oldest)

func _point_in_zone(p: Vector2, z: Dictionary) -> bool:
	var half: Vector2 = z["size"] * 0.5
	return absf(p.x - z["pos"].x) <= half.x and absf(p.y - z["pos"].y) <= half.y

func _update_zones(dt: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for z in zones:
		if not z["persistent"] and now > z["expires"]:
			continue
		z["tick_timer"] = z.get("tick_timer", 0.0) + dt
		if z["tick_timer"] < 0.15:
			continue
		z["tick_timer"] = 0.0
		if z["type"] == "FIRE_FIELD" or z["type"] == "STORM":
			for e in enemies:
				if not e["alive"] or e["reached"]:
					continue
				if _point_in_zone(e["pos"], z):
					var died := _damage(e, z.get("tick_damage", 8.0) * 0.15)
					_burst(e["pos"], Color("ff8a4a") if z["type"] == "FIRE_FIELD" else Color("c4b5ff"), 2)
					if died:
						_kill_enemy(e)
		if z["type"] == "STEAM":
			for e in enemies:
				if e["alive"] and _point_in_zone(e["pos"], z):
					e["slow_until"] = now + 0.3
					e["slow_factor"] = 0.85
		if z["type"] == "ICE" or z.get("iced_until", 0.0) > now:
			for e in enemies:
				if e["alive"] and _point_in_zone(e["pos"], z):
					e["slow_until"] = now + 0.2
					e["slow_factor"] = 0.7
	# recycle
	var keep: Array = []
	for z in zones:
		if z["persistent"] or Time.get_ticks_msec() / 1000.0 <= z["expires"]:
			keep.append(z)
		else:
			if z.has("visual") and is_instance_valid(z["visual"]):
				z["visual"].queue_free()
	zones = keep

func _update_enemies(dt: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for e in enemies:
		if not e["alive"] or e["reached"]:
			continue
		if now < e["burn_until"]:
			e["burn_tick"] -= dt
			if e["burn_tick"] <= 0.0:
				e["burn_tick"] = 0.4
				var died := _damage(e, 4.0)
				if died:
					_kill_enemy(e)
					continue
		if e["element"] >= 0 and now > e["element_until"]:
			e["element"] = -1
		if e["config"]["tag"] == "tank" and not e["shell_broken"] and e["hp"] < e["max_hp"] * 0.5:
			e["shell_broken"] = true
		if e["progress"] >= 1.0:
			_reach_base(e)
			continue
		if now < e["frozen_until"]:
			continue
		var speed: float = e["speed"]
		if now < e["slow_until"]:
			speed *= e["slow_factor"]
		if e["config"]["tag"] == "tank" and e["shell_broken"]:
			speed *= 1.25
		e["progress"] = clampf(e["progress"] + (speed * dt) / path_len, 0.0, 1.0)
		e["pos"] = _point_on_path(e["progress"])
		if e.has("visual") and is_instance_valid(e["visual"]):
			e["visual"].position = e["pos"]
		_update_status_tint(e)
		if e["is_boss"]:
			_update_boss(e, dt)
	enemies = enemies.filter(func(e): return e["alive"])

func _update_status_tint(e) -> void:
	if not e.has("status_ring") or not is_instance_valid(e["status_ring"]):
		return
	var ring: Line2D = e["status_ring"]
	var now := Time.get_ticks_msec() / 1000.0
	if now < e["frozen_until"]:
		ring.default_color = Color(0.66, 0.83, 0.91, 0.85)
	elif e["element"] >= 0:
		ring.default_color = DataRegistry.element_color(e["element"])
		ring.default_color.a = 0.55
	elif now < e["burn_until"]:
		ring.default_color = Color(0.91, 0.36, 0.23, 0.45)
	else:
		ring.default_color = Color(1, 1, 1, 0.0)

func _reach_base(e) -> void:
	e["reached"] = true
	e["alive"] = false
	base_hp -= 5 if e["is_boss"] else 1
	shake_trauma = clampf(shake_trauma + 0.2, 0.0, 1.0)
	_burst(DataRegistry.MAP["base"], Color("e85d3a"), 14)
	EventBus.base_damaged.emit(1)
	EventBus.base_hp_changed.emit(base_hp, max_base_hp)
	if e.has("visual") and is_instance_valid(e["visual"]):
		e["visual"].queue_free()
	if base_hp <= 0:
		base_hp = 0
		_finish(false)

func _update_boss(boss, dt: float) -> void:
	boss["charge_cd"] -= dt
	boss["summon_cd"] -= dt
	if boss["charge_cd"] <= 0.0 and boss["progress"] > 0.15 and boss["progress"] < 0.85:
		boss["charge_cd"] = boss["config"]["charge_interval"]
		boss["speed"] = boss["config"]["speed"] * 2.4
		shake_trauma = clampf(shake_trauma + 0.25, 0.0, 1.0)
		_show_toast("蚀山君 冲锋！")
		var tw := create_tween()
		tw.tween_interval(1.6)
		tw.tween_callback(func():
			if boss["alive"]:
				boss["speed"] = boss["config"]["speed"]
		)
	if boss["summon_cd"] <= 0.0:
		boss["summon_cd"] = boss["config"]["summon_interval"]
		for i in 3:
			var tw2 := create_tween()
			tw2.tween_interval(0.25 * i)
			tw2.tween_callback(func():
				if state != "playing":
					return
				var cfg: Dictionary = DataRegistry.ENEMIES["enemy.ink_blob"]
				var e := {
					"id": randi(), "config": cfg, "name": cfg["name"],
					"hp": cfg["max_hp"], "max_hp": cfg["max_hp"], "speed": cfg["speed"],
					"reward": cfg["reward"], "radius": cfg["radius"], "is_boss": false,
					"progress": maxf(0.0, boss["progress"] - 0.03),
					"pos": _point_on_path(maxf(0.0, boss["progress"] - 0.03)),
					"alive": true, "reached": false, "_killed": false,
					"frozen_until": 0.0, "slow_until": 0.0, "slow_factor": 1.0,
					"element": -1, "element_until": 0.0, "burn_until": 0.0, "burn_tick": 0.0,
					"shell_broken": false,
				}
				enemies.append(e)
				_spawn_enemy_visual(e)
			)

func _kill_enemy(enemy) -> void:
	if enemy["_killed"]:
		return
	enemy["_killed"] = true
	enemy["alive"] = false
	total_kills += 1
	gold += enemy["reward"]
	_burst(enemy["pos"], Color("2a2a2a"), 16)
	if enemy.has("visual") and is_instance_valid(enemy["visual"]):
		enemy["visual"].queue_free()
	EventBus.enemy_died.emit(enemy, enemy["reward"])
	EventBus.gold_changed.emit(gold)

func _point_on_path(t: float) -> Vector2:
	var target := t * path_len
	for i in path_points.size() - 1:
		var a := path_points[i]
		var b := path_points[i + 1]
		var seg := a.distance_to(b)
		if target <= seg or i == path_points.size() - 2:
			var local := 0.0 if seg == 0.0 else clampf(target / seg, 0.0, 1.0)
			return a.lerp(b, local)
		target -= seg
	return path_points[path_points.size() - 1]

# ─── 反馈 / 结算 ─────────────────────────────────────────
func _line_vfx(a: Vector2, b: Vector2, color: Color) -> void:
	var line := Line2D.new()
	line.points = PackedVector2Array([a, b])
	line.width = 5.0
	line.default_color = color
	effect_layer.add_child(line)
	var tw := create_tween()
	tw.tween_property(line, "modulate:a", 0.0, 0.2)
	tw.tween_callback(line.queue_free)

func _update_shake(delta: float) -> void:
	if shake_trauma <= 0.0:
		effect_layer.position = Vector2.ZERO
		return
	shake_trauma = maxf(0.0, shake_trauma - 1.2 * delta)
	shake_t += delta * 30.0
	var s := shake_trauma * shake_trauma
	effect_layer.position = Vector2(12.0 * s * sin(shake_t * 1.7), 8.0 * s * sin(shake_t * 2.3))
	path_layer.position = effect_layer.position

func _update_boss_bar() -> void:
	var boss = null
	for e in enemies:
		if e["is_boss"] and e["alive"]:
			boss = e
	if boss:
		boss_bar.visible = true
		boss_bar.max_value = boss["max_hp"]
		boss_bar.value = boss["hp"]
	else:
		boss_bar.visible = false

func _on_chain(level: int, _ctx: Dictionary) -> void:
	pass

func _on_finished(victory: bool) -> void:
	pass

func _finish(victory: bool) -> void:
	if state != "playing":
		return
	state = "victory" if victory else "defeat"
	result_title.text = "山河复色" if victory else "灵种熄灭"
	result_stats.text = "击杀 %d · 剩余生命 %d · 金币 %d" % [total_kills, base_hp, gold]
	result_panel.visible = true
	EventBus.battle_finished.emit(victory)

# 战斗开始（由 UI 调用或 _ready 末尾）
func start_battle() -> void:
	state = "playing"
	gold = DataRegistry.MAP["starting_gold"]
	base_hp = DataRegistry.MAP["base_hp"]
	max_base_hp = base_hp
	wave_index = 0
	between_waves = true
	wave_delay = 2.0
	EventBus.gold_changed.emit(gold)
	EventBus.base_hp_changed.emit(base_hp, max_base_hp)
	_update_hud()
