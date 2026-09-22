extends Node

func _ready() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	var battle_ps = load("res://scenes/battle/battle.tscn")
	var battle = battle_ps.instantiate()
	add_child(battle)
	await get_tree().process_frame
	await get_tree().process_frame
	battle.set_process(false)

	battle.gold = 9999
	battle.place_spirit("S4", "spirit.azure_scale")
	battle.place_spirit("S5", "spirit.frost_fox")
	battle.place_spirit("S6", "spirit.red_feather")
	battle.place_spirit("S3", "spirit.thunder_horn")
	battle.place_spirit("S1", "spirit.wind_fox")
	battle.place_spirit("S2", "spirit.wind_fox")
	battle._start_next_wave()
	for q in battle.spawn_queues:
		while q["remaining"] > 0:
			battle._spawn_enemy(q["enemy_id"])
			q["remaining"] -= 1
	# 额外新怪
	battle._spawn_enemy("enemy.mist_shade")
	battle._spawn_enemy("enemy.crack_shell")
	battle._spawn_enemy("enemy.spirit_giant")
	for i in 18:
		battle._process(0.05)

	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	img.save_png("res://output/shot_ui_v2.png")
	img.save_png("/Users/mac-mini/Documents/deepseek/game111/output/shot_ui_v2.png")
	print("saved shot_ui_v2")
	get_tree().quit(0)
