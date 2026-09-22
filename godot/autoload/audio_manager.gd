extends Node
## 简易音效合成（无外部音频文件时的占位实现）

var _players: Array[AudioStreamPlayer] = []

func _ready() -> void:
	for i in 4:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)

func play(_id: String) -> void:
	pass
