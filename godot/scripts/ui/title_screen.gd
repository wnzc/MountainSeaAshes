extends Control
## 启动页 / Logo 页

@onready var art: TextureRect = $Art
@onready var title: Label = $VBox/Title
@onready var tagline: Label = $VBox/Tagline
@onready var sub: Label = $VBox/Sub
@onready var btn_start: Button = $VBox/BtnStart

func _ready() -> void:
	var tex: Texture2D = load("res://assets/ui/title_art.png")
	if tex:
		art.texture = tex
	btn_start.pressed.connect(_on_start)

func _on_start() -> void:
	get_tree().change_scene_to_file("res://scenes/battle/battle.tscn")
