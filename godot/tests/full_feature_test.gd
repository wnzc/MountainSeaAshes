extends Node
## 全功能运行时验收：底座、五灵兽动画、技能特效、战斗循环

func _ready() -> void:
	print("=== FULL FEATURE RUNTIME ===")
	var errs := PackedStringArray()

	# 资源
	var base_ok := ResourceLoader.exists("res://assets/ui/tower_base.png")
	print("tower_base: ", base_ok)
	if not base_ok:
		errs.append("tower_base missing")

	for id in DataRegistry.SPIRIT_ORDER:
		var cfg: Dictionary = DataRegistry.SPIRITS[id]
		if not ResourceLoader.exists(cfg["sprite"]):
			errs.append("sprite missing " + id)
		if not cfg.has("skill"):
			errs.append("skill missing " + id)

	var battle_ps = load("res://scenes/battle/battle.tscn")
	if battle_ps == null:
		push_error("battle scene fail")
		get_tree().quit(1)
		return
	var battle = battle_ps.instantiate()
	add_child(battle)
	await get_tree().process_frame
	await get_tree().process_frame

	# 底座节点
	var bases := 0
	for c in battle.slot_layer.get_children():
		if c.has_meta("slot_base"):
			bases += 1
	print("slot bases: ", bases)
	if bases < 10:
		errs.append("not enough bases")

	# 放置全部五灵兽
	for i in DataRegistry.SPIRIT_ORDER.size():
		var sid: String = DataRegistry.SPIRIT_ORDER[i]
		var slot_id: String = "S%d" % (i + 1)
		# 补满金币便于测试
		battle.gold = 9999
		if not battle.place_spirit(slot_id, sid):
			errs.append("place fail " + sid + " on " + slot_id)
	print("spirits placed: ", battle.spirits.size())

	# 每只灵兽：待机粒子 + 攻击动画 + 技能
	for spirit in battle.spirits:
		if not spirit.has("anim"):
			errs.append("no anim state " + spirit["name"])
		else:
			battle._update_spirit_anim(spirit, 0.016, null)  # idle
			battle._begin_attack_anim(spirit)
			for i in 12:
				var dummy_target = {"pos": spirit["pos"] + Vector2(80, 0), "alive": true, "radius": 20.0}
				battle._update_spirit_anim(spirit, 0.04, dummy_target)
			# 直接调用技能路径（构造假敌人）
			battle._start_next_wave()
			for q in battle.spawn_queues:
				while q["remaining"] > 0:
					battle._spawn_enemy(q["enemy_id"])
					q["remaining"] -= 1
			var t = null
			for e in battle.enemies:
				if e["alive"]:
					t = e
					break
			if t == null:
				battle._spawn_enemy("enemy.ink_blob")
				t = battle.enemies[battle.enemies.size() - 1]
			battle._spirit_attack(spirit, t)
			print("attack ok: ", spirit["name"], " skill=", spirit["config"].get("skill"))

	# 模拟若干帧战斗（弹道/特效/待机）
	for i in 60:
		battle._process(0.04)

	print("projectiles=", battle.projectiles.size(), " enemies=", battle.enemies.size(), " zones=", battle.zones.size())

	# 触发反应特效
	if battle.enemies.size() >= 2:
		var e1 = battle.enemies[0]
		var e2 = battle.enemies[1]
		battle._apply_element(e1, 1, 3.0)  # WATER
		battle._apply_element(e1, 4, 2.0)  # ICE
		battle._apply_element(e2, 0, 2.0)  # FIRE
		battle._apply_element(e2, 3, 2.0)  # WIND
		print("reaction chain=", battle.chain_level, " zones=", battle.zones.size())

	# 空槽点击 / 升级不报错
	battle._handle_slot_click("S9")
	battle.gold = 500
	battle.place_spirit("S9", "spirit.wind_fox")
	battle._handle_slot_click("S9")
	battle._on_upgrade()
	battle._on_sell()

	if errs.size() > 0:
		for e in errs:
			push_error(e)
		print("RESULT: FAIL")
		get_tree().quit(1)
	else:
		print("RESULT: PASS")
		get_tree().quit(0)
