extends Node
## 完整可玩性实测：接近真人操作的放置/升级/多波战斗/胜负

var fails := PackedStringArray()

func _ready() -> void:
	print("=== PLAYABLE SESSION TEST ===")
	var battle_ps = load("res://scenes/battle/battle.tscn")
	if battle_ps == null:
		push_error("no battle scene")
		get_tree().quit(1)
		return

	var battle = battle_ps.instantiate()
	add_child(battle)
	await get_tree().process_frame
	await get_tree().process_frame

	print("state=", battle.state, " gold=", battle.gold, " hp=", battle.base_hp)
	if battle.state != "playing":
		fails.append("not auto-started: " + str(battle.state))

	# 玩家式布阵（连锁核心位）
	var plan := [
		["S4", "spirit.azure_scale"],
		["S5", "spirit.frost_fox"],
		["S6", "spirit.red_feather"],
		["S1", "spirit.wind_fox"],
		["S3", "spirit.thunder_horn"],
	]
	for p in plan:
		if not battle.place_spirit(p[0], p[1]):
			# 金币不足时补充一点再试（模拟击杀所得）
			battle.gold += 100
			battle.gold = max(battle.gold, DataRegistry.SPIRITS[p[1]]["cost"])
			if not battle.place_spirit(p[0], p[1]):
				fails.append("place fail %s" % p[1])
	print("placed=", battle.spirits.size())

	# 持续模拟战斗（禁用树内 _process，手动步进，避免双跑）
	battle.set_process(false)
	var max_waves: int = DataRegistry.WAVES.size()
	var frames := 0
	var max_frames := 30 * 200  # ~200s 模拟
	while battle.state == "playing" and frames < max_frames:
		battle._process(1.0 / 30.0)
		frames += 1
		if frames % 90 == 0:
			var alive := 0
			for e in battle.enemies:
				if e["alive"]:
					alive += 1
			print("t=%.0fs wave=%d/%d hp=%d gold=%d enemies=%d kills=%d" % [
				frames / 30.0, battle.wave_index + 1, max_waves, battle.base_hp, battle.gold, alive, battle.total_kills
			])
			# 自动升级核心
			if battle.gold >= 80 and battle.slots.has("S5") and battle.slots["S5"]["spirit"]:
				battle.upgrade_spirit("S5")
			# 中期补塔
			if battle.wave_index >= 3 and battle.slots.has("S2") and battle.slots["S2"]["spirit"] == null:
				battle.gold += 60
				battle.place_spirit("S2", "spirit.red_feather")
			if battle.wave_index >= 4 and battle.slots.has("S8") and battle.slots["S8"]["spirit"] == null:
				battle.gold += 60
				battle.place_spirit("S8", "spirit.thunder_horn")

	print("---- end frames=", frames, " state=", battle.state, " wave=", battle.wave_index, " kills=", battle.total_kills, " hp=", battle.base_hp, " gold=", battle.gold)

	if battle.total_kills < 10:
		fails.append("too few kills: %d" % battle.total_kills)
	if battle.state == "playing" and battle.wave_index < 2 and battle.base_hp > 0:
		fails.append("stalled early wave=%d" % battle.wave_index)
	if battle.gold < 0:
		fails.append("negative gold")

	# 升级
	battle.gold = 200
	if battle.slots["S5"]["spirit"]:
		var lvl: int = battle.slots["S5"]["spirit"]["level"]
		battle._handle_slot_click("S5")
		battle._on_upgrade()
		if lvl < 3 and battle.slots["S5"]["spirit"]["level"] <= lvl:
			fails.append("upgrade failed")

	# 失败路径：清掉防守，灌怪冲线
	var battle2 = battle_ps.instantiate()
	add_child(battle2)
	await get_tree().process_frame
	battle2.set_process(false)
	battle2.base_hp = 1
	for i in 3:
		battle2._spawn_enemy("enemy.ink_hound")
		var e = battle2.enemies[battle2.enemies.size() - 1]
		e["progress"] = 0.99
	battle2._process(0.1)
	battle2._process(0.1)
	battle2._process(0.1)
	print("defeat-path state=", battle2.state, " hp=", battle2.base_hp)
	if battle2.state != "defeat" and battle2.base_hp > 0:
		# 可能还没走进度，再推
		for e in battle2.enemies:
			if e["alive"]:
				e["progress"] = 1.0
		battle2._process(0.1)
		print("defeat-path retry state=", battle2.state, " hp=", battle2.base_hp)
	if battle2.base_hp > 0 and battle2.state == "playing":
		fails.append("defeat path broken")

	# 胜利路径：直接清完
	if battle.state == "playing":
		for e in battle.enemies:
			if e["alive"]:
				battle._kill_enemy(e)
		battle.wave_index = DataRegistry.WAVES.size()
		battle.between_waves = false
		battle.spawn_queues.clear()
		battle.enemies.clear()
		battle._update_waves(0.05)
		print("victory-path state=", battle.state)
		if battle.state != "victory":
			fails.append("victory path broken")

	if fails.size() > 0:
		for f in fails:
			push_error(f)
		print("RESULT: FAIL")
		get_tree().quit(1)
	else:
		print("RESULT: PASS")
		get_tree().quit(0)
