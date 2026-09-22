extends Node
func _ready() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	img.save_png("/Users/mac-mini/Documents/deepseek/game111/output/shot_title_ui.png")
	get_tree().quit(0)
