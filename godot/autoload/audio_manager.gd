extends Node
## 简易音效合成（无外部音频文件）

var _enabled := true
var _ctx: AudioStreamGenerator = null

func play(id: String) -> void:
	if not _enabled:
		return
	match id:
		"click":
			_beep(660.0, 0.05, 0.03)
		"place":
			_beep(440.0, 0.08, 0.04)
		"upgrade":
			_beep(780.0, 0.08, 0.04)
		"hit":
			_beep(180.0, 0.04, 0.02)
		"die":
			_beep(120.0, 0.1, 0.03)
		"coin":
			_beep(880.0, 0.05, 0.03)
		"reaction":
			_beep(600.0, 0.06, 0.03)
		_:
			pass

func _beep(freq: float, dur: float, vol: float) -> void:
	var p := AudioStreamPlayer.new()
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = 22050.0
	gen.buffer_length = maxf(dur + 0.05, 0.05)
	p.stream = gen
	add_child(p)
	p.play()
	var pb: AudioStreamGeneratorPlayback = p.get_stream_playability() if false else p.get_stream_playback()
	# Godot: need play() first then get_stream_playback
	pb = p.get_stream_playback()
	if pb == null:
		p.queue_free()
		return
	var frames := int(22050.0 * dur)
	for i in frames:
		var t := float(i) / 22050.0
		var env := 1.0 - t / dur
		var s := sin(TAU * freq * t) * vol * env
		pb.push_frame(Vector2(s, s))
	p.finished.connect(p.queue_free)
