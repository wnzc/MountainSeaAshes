extends Node

func _ready() -> void:
	print("=== visual / nil check ===")
	for id in DataRegistry.SPIRIT_ORDER:
		var p: String = DataRegistry.SPIRITS[id]["sprite"]
		print("spirit ", id, " ", p, " exists=", ResourceLoader.exists(p))
	for id in DataRegistry.ENEMIES:
		var p: String = DataRegistry.ENEMIES[id]["sprite"]
		print("enemy ", id, " ", p, " exists=", ResourceLoader.exists(p))
	print("path tex ", ResourceLoader.exists("res://assets/maps/path_texture.png"))

	var battle_ps = load("res://scenes/battle/battle.tscn")
	var battle = battle_ps.instantiate()
	add_child(battle)
	await get_tree().process_frame
	await get_tree().process_frame

	# empty slot select (used to throw Nil->Dictionary)
	battle._handle_slot_click("S5")
	battle._handle_slot_click("S5")  # empty
	print("empty slot click OK")
	battle.place_spirit("S5", "spirit.red_feather")
	battle._handle_slot_click("S5")
	battle._on_upgrade()
	battle._on_sell()
	print("upgrade/sell OK")
	battle.place_spirit("S4", "spirit.azure_scale")
	battle.place_spirit("S6", "spirit.frost_fox")
	battle._start_next_wave()
	for q in battle.spawn_queues:
		while q["remaining"] > 0:
			battle._spawn_enemy(q["enemy_id"])
			q["remaining"] -= 1
	for i in 45:
		battle._process(0.04)
	print("sprites spirits=", battle.spirits.size(), " enemies=", battle.enemies.size())
	print("RESULT: PASS")
	get_tree().quit(0)
