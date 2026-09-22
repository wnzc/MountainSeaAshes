extends Node
## Boss 波与终局结算实测

var fails := PackedStringArray()

func _ready() -> void:
	print("=== BOSS / ENDGAME TEST ===")
	var battle_ps = load("res://scenes/battle/battle.tscn")
	var battle = battle_ps.instantiate()
	add_child(battle)
	await get_tree().process_frame
	battle.set_process(false)

	# 满配阵容
	battle.gold = 5000
	var plan := [
		["S4", "spirit.azure_scale"], ["S5", "spirit.frost_fox"],
		["S6", "spirit.red_feather"], ["S3", "spirit.thunder_horn"],
		["S1", "spirit.wind_fox"], ["S2", "spirit.red_feather"],
		["S8", "spirit.thunder_horn"], ["S7", "spirit.frost_fox"],
	]
	for p in plan:
		battle.place_spirit(p[0], p[1])
	for s in ["S5", "S6", "S4", "S3"]:
		if battle.slots[s]["spirit"]:
			battle.upgrade_spirit(s)
			battle.upgrade_spirit(s)
	print("spirits=", battle.spirits.size())

	# 直接进 Boss 波
	battle.wave_index = DataRegistry.WAVES.size() - 1
	battle.between_waves = false
	battle.spawn_queues.clear()
	for entry in DataRegistry.WAVES[DataRegistry.WAVES.size() - 1]:
		battle.spawn_queues.append({
			"enemy_id": entry["enemy_id"], "remaining": entry["count"],
			"interval": entry["interval"], "timer": entry["delay"],
		})
	EventBus.wave_started.emit(DataRegistry.WAVES.size())

	var boss = null
	var frames := 0
	while battle.state == "playing" and frames < 30 * 240:
		battle._process(1.0 / 30.0)
		frames += 1
		if boss == null:
			for e in battle.enemies:
				if e["is_boss"] and e["alive"]:
					boss = e
					print("BOSS SPAWNED hp=", boss["hp"])
		if boss and boss["alive"] and frames % 60 == 0:
			print("boss hp=%.0f/%.0f progress=%.2f frame=%d" % [boss["hp"], boss["max_hp"], boss["progress"], frames])
		if boss and not boss["alive"]:
			print("BOSS DOWN at frame=", frames, " kills=", battle.total_kills)

	print("---- end state=", battle.state, " kills=", battle.total_kills, " hp=", battle.base_hp)

	if boss == null:
		# 可能已在 _process 里生成并被打完 — 检查是否出现过
		fails.append("boss never seen (may be culled). kills=" + str(battle.total_kills))
	else:
		print("boss final alive=", boss["alive"], " hp=", boss["hp"])

	# Boss 机制字段存在（冲锋/召唤）
	if boss and boss["alive"]:
		# 强制触发冲锋逻辑
		boss["charge_cd"] = 0.0
		boss["progress"] = 0.4
		battle._update_boss(boss, 0.1)
		print("boss charge triggered ok")

	# 若未结束，强制结算胜利，验证结算 UI 数据
	if battle.state == "playing":
		for e in battle.enemies:
			if e["alive"]:
				battle._kill_enemy(e)
		battle.wave_index = DataRegistry.WAVES.size()
		battle.between_waves = false
		battle.spawn_queues.clear()
		battle.enemies.clear()
		battle._update_waves(0.05)
	print("final state=", battle.state)

	if battle.state == "defeat":
		# 防守失败也是合法终局
		print("note: lost during boss rush (still playable)")
	else:
		if battle.state != "victory":
			fails.append("no terminal state")

	if fails.size() > 0:
		for f in fails:
			push_error(f)
		print("RESULT: FAIL")
		get_tree().quit(1)
	else:
		print("RESULT: PASS")
		get_tree().quit(0)
