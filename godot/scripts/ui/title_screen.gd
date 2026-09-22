extends Control
## 启动页：图版按钮 + 点击动效

@onready var art: TextureRect = $Art
@onready var btn_start: Button = $VBox/BtnStart
@onready var btn_settings: Button = $VBox/HBox/BtnSettings
@onready var settings_panel: PanelContainer = $SettingsPanel

func _ready() -> void:
	var tex: Texture2D = load("res://assets/ui/title_art.png")
	if tex:
		art.texture = tex

	_apply_plate(btn_start, "res://assets/ui/btn_cta.png", Vector2(420, 120), "进入山河", 34)
	_apply_plate(btn_settings, "res://assets/ui/btn_settings.png", Vector2(120, 120), "", 18)
	btn_settings.tooltip_text = "设置"

	_apply_panel_style(settings_panel, "res://assets/ui/panel_tall.png")
	for lab_path in ["SettingsPanel/VBox/T", "SettingsPanel/VBox/Hint"]:
		var lab := get_node_or_null(lab_path) as Label
		if lab:
			lab.add_theme_color_override("font_color", Color(0.98, 0.94, 0.82))

	btn_start.pressed.connect(func():
		_pop(btn_start, 0.88)
		get_tree().change_scene_to_file("res://scenes/battle/battle.tscn")
	)
	btn_settings.pressed.connect(func():
		_pop(btn_settings, 0.9)
		settings_panel.visible = not settings_panel.visible
	)

func _apply_plate(btn: Button, plate: String, size: Vector2, text: String, font_size: int) -> void:
	btn.focus_mode = Control.FOCUS_NONE
	btn.custom_minimum_size = size
	btn.text = text
	btn.clip_text = false
	btn.add_theme_font_size_override("font_size", font_size)
	btn.add_theme_color_override("font_color", Color(0.98, 0.94, 0.82))
	btn.add_theme_color_override("font_hover_color", Color(1, 0.98, 0.9))
	btn.add_theme_color_override("font_pressed_color", Color(1, 1, 1))
	if ResourceLoader.exists(plate):
		var sb := StyleBoxTexture.new()
		sb.texture = load(plate)
		# 9-slice，适配按钮高度
		sb.texture_margin_left = 32
		sb.texture_margin_right = 32
		sb.texture_margin_top = 32
		sb.texture_margin_bottom = 32
		sb.content_margin_left = 18
		sb.content_margin_right = 18
		sb.content_margin_top = 10
		sb.content_margin_bottom = 10
		for st in ["normal", "hover", "pressed", "focus", "disabled"]:
			btn.add_theme_stylebox_override(st, sb)
	btn.button_down.connect(func(): _pop(btn, 0.92))
	btn.button_up.connect(func(): _pop(btn, 1.06))

func _apply_panel_style(panel: PanelContainer, plate: String) -> void:
	if not ResourceLoader.exists(plate):
		return
	var sb := StyleBoxTexture.new()
	sb.texture = load(plate)
	sb.texture_margin_left = 36
	sb.texture_margin_right = 36
	sb.texture_margin_top = 36
	sb.texture_margin_bottom = 36
	sb.content_margin_left = 28
	sb.content_margin_right = 28
	sb.content_margin_top = 24
	sb.content_margin_bottom = 24
	panel.add_theme_stylebox_override("panel", sb)

func _pop(btn: Button, s: float) -> void:
	var tw := create_tween()
	tw.tween_property(btn, "scale", Vector2(s, s), 0.07).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(btn, "scale", Vector2.ONE, 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(btn, "modulate", Color(1.15, 1.1, 0.9, 1), 0.05)
	tw.tween_property(btn, "modulate", Color(1, 1, 1, 1), 0.12)
