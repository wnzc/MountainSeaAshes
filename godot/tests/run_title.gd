extends Node
func _ready() -> void:
	var ps = load("res://scenes/ui/title_screen.tscn")
	add_child(ps.instantiate())
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("/Users/mac-mini/Documents/deepseek/game111/output/shot_title2.png")
	print("title saved")
	get_tree().quit(0)
