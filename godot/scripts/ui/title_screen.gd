extends Control
## 启动页：图片按钮 + 点击动效

@onready var art: TextureRect = $Art
@onready var title: Label = $VBox/Title
@onready var tagline: Label = $VBox/Tagline
@onready var sub: Label = $VBox/Sub
@onready var btn_start: Button = $VBox/BtnStart
@onready var btn_settings: Button = $VBox/HBox/BtnSettings

func _ready() -> void:
	var tex: Texture2D = load("res://assets/ui/title_art.png")
	if tex:
		art.texture = tex

	_style_image_button(btn_start, "res://assets/ui/btn_primary.png", "进入山河", true)
	_style_image_button(btn_settings, "res://assets/ui/btn_settings.png", "设置", false)

	btn_start.pressed.connect(func():
		_click_feedback(btn_start)
		get_tree().change_scene_to_file("res://scenes/battle/battle.tscn")
	)
	btn_settings.pressed.connect(func():
		_click_feedback(btn_settings)
		$SettingsPanel.visible = not $SettingsPanel.visible
	)

func _style_image_button(btn: Button, icon_path: String, label_text: String, large: bool) -> void:
	var icon: Texture2D = load(icon_path) if ResourceLoader.exists(icon_path) else null
	btn.focus_mode = Control.FOCUS_NONE
	btn.clip_text = false
	if large:
		btn.custom_minimum_size = Vector2(360, 100)
	else:
		btn.custom_minimum_size = Vector2(96, 96)
	if icon:
		btn.icon = icon
		btn.expand_icon = true
		btn.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		btn.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		btn.add_theme_constant_override("icon_max_width", 320 if large else 72)
	btn.text = label_text
	btn.add_theme_font_size_override("font_size", 30 if large else 18)
	btn.add_theme_color_override("font_color", Color(0.95, 0.9, 0.78))
	btn.add_theme_color_override("font_hover_color", Color(1, 0.96, 0.85))
	btn.add_theme_color_override("font_pressed_color", Color(1, 0.98, 0.9))
	btn.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	btn.add_theme_stylebox_override("hover", StyleBoxEmpty.new())
	btn.add_theme_stylebox_override("pressed", StyleBoxEmpty.new())
	btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	btn.add_theme_stylebox_override("disabled", StyleBoxEmpty.new())
	btn.pressed.connect(func(): pass)
	btn.button_down.connect(func(): _pop(btn, 0.92))
	btn.button_up.connect(func(): _pop(btn, 1.08))

func _pop(btn: Button, scale_to: float) -> void:
	var tw := create_tween()
	tw.tween_property(btn, "scale", Vector2(scale_to, scale_to), 0.08).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(btn, "scale", Vector2.ONE, 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

func _click_feedback(btn: Button) -> void:
	_pop(btn, 0.88)
	# 轻闪
	var tw := create_tween()
	tw.tween_property(btn, "modulate", Color(1.3, 1.2, 0.9, 1), 0.05)
	tw.tween_property(btn, "modulate", Color(1, 1, 1, 1), 0.15)
