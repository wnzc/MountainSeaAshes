extends Node
## 全局流程 / 场景切换

var current_run := {}

func go_title() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/title_screen.tscn")

func go_battle() -> void:
	get_tree().change_scene_to_file("res://scenes/battle/battle.tscn")

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_pause"):
		get_tree().paused = not get_tree().paused
