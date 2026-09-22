extends Node
## Headless smoke: battle scene + placement + reaction + slot range.

func _ready() -> void:
	print("=== 山海余烬 Godot smoke ===")
	var title = load("res://scenes/ui/title_screen.tscn")
	print("title_scene ", "OK" if title else "FAIL")

	var battle_ps = load("res://scenes/battle/battle.tscn")
	if battle_ps == null:
		push_error("battle.tscn failed")
		get_tree().quit(1)
		return
	print("battle_scene OK")

	var battle = battle_ps.instantiate()
	add_child(battle)
	await get_tree().process_frame
	await get_tree().process_frame

	if not battle.has_method("place_spirit"):
		push_error("battle script not attached")
		get_tree().quit(1)
		return

	var ok1 = battle.place_spirit("S5", "spirit.azure_scale")
	var ok2 = battle.place_spirit("S4", "spirit.frost_fox")
	var ok3 = battle.place_spirit("S6", "spirit.thunder_horn")
	var ok4 = battle.place_spirit("S1", "spirit.red_feather")
	var ok5 = battle.place_spirit("S2", "spirit.wind_fox")
	print("place spirits: ", ok1, ok2, ok3, ok4, ok5)
	if not (ok1 and ok2 and ok3 and ok4 and ok5):
		push_error("place_spirit failed")
		get_tree().quit(1)
		return

	# range check
	var min_r := 210.0
	var failed_range := false
	for s in DataRegistry.MAP["slots"]:
		var dmin := 99999.0
		for i in DataRegistry.MAP["path"].size() - 1:
			var a: Vector2 = DataRegistry.MAP["path"][i]
			var b: Vector2 = DataRegistry.MAP["path"][i + 1]
			dmin = minf(dmin, _dist_point_segment(s["pos"], a, b))
		print("slot ", s["id"], " dist=", snappedf(dmin, 0.1))
		if dmin > min_r - 10.0:
			push_error("slot too far: %s %f" % [s["id"], dmin])
			failed_range = true

	# combat
	battle._start_next_wave()
	for q in battle.spawn_queues:
		while q["remaining"] > 0:
			battle._spawn_enemy(q["enemy_id"])
			q["remaining"] -= 1
	print("enemies: ", battle.enemies.size())
	if battle.enemies.size() < 8:
		push_error("not enough enemies")
		get_tree().quit(1)
		return

	# Element: FIRE=0 WATER=1 LIGHTNING=2 WIND=3 ICE=4
	var e = battle.enemies[0]
	battle._apply_element(e, 1, 3.0)
	battle._apply_element(e, 4, 2.0)
	print("after freeze element=", e["element"], " chain=", battle.chain_level)

	var e2 = battle.enemies[1]
	battle._apply_element(e2, 0, 2.0)
	battle._apply_element(e2, 3, 2.0)
	print("zones=", battle.zones.size(), " chain=", battle.chain_level)

	var e3 = battle.enemies[2]
	battle._apply_element(e3, 2, 2.0)
	battle._apply_element(e3, 3, 2.0)
	print("storm chain=", battle.chain_level)

	if battle.zones.size() < 3:
		push_error("environment not created")
		failed_range = true

	# run a few frames of combat
	for i in 30:
		battle._process(0.033)

	print("gold=", battle.gold, " base_hp=", battle.base_hp, " kills=", battle.total_kills)
	if failed_range:
		print("RESULT: FAIL")
		get_tree().quit(1)
	else:
		print("RESULT: PASS")
		get_tree().quit(0)

func _dist_point_segment(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 0.001), 0.0, 1.0)
	return p.distance_to(a + ab * t)
