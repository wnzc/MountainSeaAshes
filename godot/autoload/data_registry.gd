extends Node
## Resource / 配置注册表：按 ID 查询灵兽、怪物、反应、波次、地图。
## 新增内容只改本文件，不改核心 Manager。

enum Element { FIRE, WATER, LIGHTNING, WIND, ICE }

const ELEMENT_META := {
	Element.FIRE: { "name": "炎", "color": Color("e85d3a"), "glow": Color("ffb347") },
	Element.WATER: { "name": "沧", "color": Color("3ba7c4"), "glow": Color("7fd4e8") },
	Element.LIGHTNING: { "name": "霆", "color": Color("7b5cff"), "glow": Color("c4b5ff") },
	Element.WIND: { "name": "岚", "color": Color("5cb88a"), "glow": Color("a8e6c3") },
	Element.ICE: { "name": "霜", "color": Color("a8d4e8"), "glow": Color("e0f2ff") },
}

const SPIRITS := {
	"spirit.red_feather": {
		"id": "spirit.red_feather", "name": "赤羽", "element": Element.FIRE,
		"cost": 40, "range": 220.0, "attack_interval": 0.9, "damage": 16.0,
		"attack_type": "projectile", "splash": 40.0, "status": "BURN", "status_duration": 2.5,
		"projectile_speed": 420.0, "upgrade_cost": [50, 90], "upgrade_damage": [8.0, 12.0],
		"desc": "喷吐火团，命中留下短暂燃烧",
		"sprite": "res://assets/characters/spirit_red_feather.png",
		"skill": "fireball",
		"skill_color": Color("ff8a4a"),
	},
	"spirit.azure_scale": {
		"id": "spirit.azure_scale", "name": "沧璃", "element": Element.WATER,
		"cost": 50, "range": 230.0, "attack_interval": 1.1, "damage": 9.0,
		"attack_type": "projectile", "splash": 0.0, "status": "WET", "status_duration": 3.5,
		"projectile_speed": 380.0, "upgrade_cost": [55, 100], "upgrade_damage": [5.0, 8.0],
		"desc": "水弹使敌人潮湿并留下水迹",
		"sprite": "res://assets/characters/spirit_azure_scale.png",
		"skill": "water_orb",
		"skill_color": Color("5ec4de"),
	},
	"spirit.thunder_horn": {
		"id": "spirit.thunder_horn", "name": "雷角", "element": Element.LIGHTNING,
		"cost": 60, "range": 240.0, "attack_interval": 0.75, "damage": 18.0,
		"attack_type": "beam", "chain_range": 140.0, "chain_count": 2,
		"prefer_wet": true, "status": "CHARGED", "status_duration": 1.8,
		"projectile_speed": 0.0, "upgrade_cost": [70, 120], "upgrade_damage": [9.0, 14.0],
		"desc": "闪电攻击，优先向潮湿目标弹射",
		"sprite": "res://assets/characters/spirit_thunder_horn.png",
		"skill": "thunder_beam",
		"skill_color": Color("b39cff"),
	},
	"spirit.wind_fox": {
		"id": "spirit.wind_fox", "name": "风狸", "element": Element.WIND,
		"cost": 55, "range": 210.0, "attack_interval": 0.8, "damage": 7.0,
		"attack_type": "pulse", "pulse_radius": 110.0, "spread_env": true,
		"status": "GUSTED", "status_duration": 1.5, "projectile_speed": 0.0,
		"upgrade_cost": [55, 100], "upgrade_damage": [4.0, 6.0],
		"desc": "风刃并推动扩散已有元素区域",
		"sprite": "res://assets/characters/spirit_wind_fox.png",
		"skill": "wind_pulse",
		"skill_color": Color("8fd9b0"),
	},
	"spirit.frost_fox": {
		"id": "spirit.frost_fox", "name": "霜狐", "element": Element.ICE,
		"cost": 55, "range": 225.0, "attack_interval": 0.9, "damage": 10.0,
		"attack_type": "projectile", "splash": 0.0, "status": "CHILL", "status_duration": 2.8,
		"projectile_speed": 400.0, "upgrade_cost": [55, 100], "upgrade_damage": [5.0, 9.0],
		"desc": "冰刺减速，潮湿目标更易冻结",
		"sprite": "res://assets/characters/spirit_frost_fox.png",
		"skill": "ice_shard",
		"skill_color": Color("c9ecff"),
	},
}

const SPIRIT_ORDER := [
	"spirit.red_feather", "spirit.azure_scale", "spirit.thunder_horn",
	"spirit.wind_fox", "spirit.frost_fox",
]

const ENEMIES := {
	"enemy.ink_blob": {
		"id": "enemy.ink_blob", "name": "墨团", "max_hp": 80.0, "speed": 70.0,
		"reward": 8, "radius": 28.0, "tag": "normal", "color": Color("1a1a1a"),
		"accent": Color("c23b2e"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_ink_blob.png",
	},
	"enemy.ink_hound": {
		"id": "enemy.ink_hound", "name": "蚀犬", "max_hp": 55.0, "speed": 110.0,
		"reward": 9, "radius": 24.0, "tag": "fast", "color": Color("141414"),
		"accent": Color("e04040"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_ink_hound.png",
	},
	"enemy.ink_shell": {
		"id": "enemy.ink_shell", "name": "甲蚀", "max_hp": 220.0, "speed": 48.0,
		"reward": 16, "radius": 34.0, "tag": "tank", "color": Color("0f0f0f"),
		"accent": Color("8a8a8a"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_ink_shell.png",
	},
	"enemy.ink_worm": {
		"id": "enemy.ink_worm", "name": "吞灵虫", "max_hp": 32.0, "speed": 82.0,
		"reward": 4, "radius": 16.0, "tag": "swarm", "color": Color("1c1c1c"),
		"accent": Color("666666"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_ink_worm.png",
	},
	"enemy.ink_tiger": {
		"id": "enemy.ink_tiger", "name": "蚀山君", "max_hp": 1800.0, "speed": 38.0,
		"reward": 150, "radius": 58.0, "tag": "boss", "color": Color("0a0a0a"),
		"accent": Color("d0d0d0"), "is_boss": true,
		"charge_interval": 8.0, "summon_interval": 12.0,
		"sprite": "res://assets/enemies/enemy_ink_tiger.png",
	},
	"enemy.mist_shade": {
		"id": "enemy.mist_shade", "name": "雾影", "max_hp": 70.0, "speed": 75.0,
		"reward": 12, "radius": 26.0, "tag": "special", "color": Color("222222"),
		"accent": Color("e8e8e8"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_mist_shade.png",
		"stealth": true, "stealth_period": 3.5,
	},
	"enemy.crack_shell": {
		"id": "enemy.crack_shell", "name": "裂壳兽", "max_hp": 140.0, "speed": 60.0,
		"reward": 14, "radius": 30.0, "tag": "special", "color": Color("111111"),
		"accent": Color("9a9a9a"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_crack_shell.png",
		"crack": true,
	},
	"enemy.spirit_giant": {
		"id": "enemy.spirit_giant", "name": "噬灵魁", "max_hp": 480.0, "speed": 42.0,
		"reward": 40, "radius": 42.0, "tag": "elite", "color": Color("0d0d0d"),
		"accent": Color("cfcfcf"), "is_boss": false,
		"sprite": "res://assets/enemies/enemy_spirit_giant.png",
	},
}

## 双元素反应（无序组合 key = "A+B" 字母序）
const REACTIONS := {
	"LIGHTNING+WATER": {
		"id": "reaction.conduct", "name": "导电", "damage": 28.0,
		"chainable": true, "bounce": true, "bounce_range": 160.0, "bounce_count": 2,
		"camera_shake": 0.18, "vfx_color": Color("9b7bff"), "output": "CONDUCT",
	},
	"ICE+WATER": {
		"id": "reaction.freeze", "name": "冻结", "damage": 12.0, "duration": 2.2,
		"chainable": true, "freeze": true, "camera_shake": 0.12, "vfx_color": Color("a8d4e8"),
		"output": "FROZEN", "env_create": {"type": "ICE", "duration": 4.0},
	},
	"FIRE+WIND": {
		"id": "reaction.fire_vortex", "name": "火旋风", "damage": 10.0, "duration": 3.5,
		"chainable": true, "camera_shake": 0.2, "vfx_color": Color("ff8a4a"),
		"output": "FIRE_FIELD", "env_create": {"type": "FIRE_FIELD", "duration": 3.5},
		"tick_damage": 8.0,
	},
	"FIRE+WATER": {
		"id": "reaction.steam", "name": "蒸汽", "damage": 8.0, "duration": 3.0,
		"chainable": true, "camera_shake": 0.1, "vfx_color": Color("d0e8e0"),
		"output": "STEAM", "env_create": {"type": "STEAM", "duration": 3.0},
	},
	"FIRE+ICE": {
		"id": "reaction.melt_crack", "name": "融裂", "damage": 22.0,
		"chainable": true, "camera_shake": 0.22, "vfx_color": Color("ffb347"),
		"output": "MELT", "env_create": {"type": "STEAM", "duration": 2.5}, "splash": 70.0,
	},
	"LIGHTNING+WIND": {
		"id": "reaction.storm", "name": "雷暴", "damage": 16.0, "duration": 3.0,
		"chainable": true, "camera_shake": 0.28, "vfx_color": Color("c4b5ff"),
		"output": "STORM", "env_create": {"type": "STORM", "duration": 3.0},
		"tick_damage": 14.0,
	},
}

## 镜水涧：路线 + 紧贴路线的塔位（保证 min range 210 内可攻击）
const MAP := {
	"id": "map.mirror_stream",
	"name": "镜水涧",
	"base_hp": 20,
	"starting_gold": 320,
	"path": [
		Vector2(720, 200), Vector2(730, 270), Vector2(640, 330), Vector2(500, 390),
		Vector2(380, 460), Vector2(330, 540), Vector2(360, 630), Vector2(460, 700),
		Vector2(580, 760), Vector2(700, 820), Vector2(770, 900), Vector2(760, 980),
		Vector2(680, 1050), Vector2(560, 1110), Vector2(450, 1180), Vector2(400, 1260),
		Vector2(420, 1340), Vector2(490, 1400), Vector2(540, 1460),
	],
	"base": Vector2(540, 1500),
	"entry": Vector2(720, 200),
	"slots": [
		{"id": "S1", "pos": Vector2(500, 280), "neighbors": ["S2", "S3"]},
		{"id": "S2", "pos": Vector2(860, 300), "neighbors": ["S1", "S4"]},
		{"id": "S3", "pos": Vector2(240, 480), "neighbors": ["S1", "S5"]},
		{"id": "S4", "pos": Vector2(560, 420), "neighbors": ["S2", "S5", "S6"]},
		{"id": "S5", "pos": Vector2(300, 720), "neighbors": ["S3", "S4", "S6", "S7"]},
		{"id": "S6", "pos": Vector2(780, 760), "neighbors": ["S4", "S5", "S8"]},
		{"id": "S7", "pos": Vector2(400, 1100), "neighbors": ["S5", "S9"]},
		{"id": "S8", "pos": Vector2(820, 1080), "neighbors": ["S6", "S10"]},
		{"id": "S9", "pos": Vector2(280, 1260), "neighbors": ["S7", "S10"]},
		{"id": "S10", "pos": Vector2(620, 1360), "neighbors": ["S8", "S9"]},
	],
	"water_zones": [
		{"id": "w1", "pos": Vector2(380, 480), "size": Vector2(280, 90)},
		{"id": "w2", "pos": Vector2(600, 1080), "size": Vector2(240, 100)},
	],
}

const WAVES := [
	[{"enemy_id": "enemy.ink_blob", "count": 8, "interval": 0.85, "delay": 0.0}],
	[
		{"enemy_id": "enemy.ink_blob", "count": 10, "interval": 0.7, "delay": 0.0},
		{"enemy_id": "enemy.ink_hound", "count": 3, "interval": 1.2, "delay": 4.0},
	],
	[
		{"enemy_id": "enemy.ink_blob", "count": 6, "interval": 0.8, "delay": 0.0},
		{"enemy_id": "enemy.ink_hound", "count": 5, "interval": 0.6, "delay": 2.0},
		{"enemy_id": "enemy.ink_shell", "count": 2, "interval": 2.0, "delay": 6.0},
	],
	[
		{"enemy_id": "enemy.ink_worm", "count": 12, "interval": 0.35, "delay": 0.0},
		{"enemy_id": "enemy.ink_blob", "count": 4, "interval": 1.0, "delay": 3.0},
	],
	[
		{"enemy_id": "enemy.ink_shell", "count": 6, "interval": 1.4, "delay": 0.0},
		{"enemy_id": "enemy.ink_blob", "count": 8, "interval": 0.55, "delay": 1.5},
	],
	[
		{"enemy_id": "enemy.ink_blob", "count": 8, "interval": 0.5, "delay": 0.0},
		{"enemy_id": "enemy.ink_hound", "count": 6, "interval": 0.55, "delay": 2.0},
		{"enemy_id": "enemy.ink_shell", "count": 3, "interval": 1.8, "delay": 5.0},
		{"enemy_id": "enemy.ink_worm", "count": 8, "interval": 0.3, "delay": 8.0},
		{"enemy_id": "enemy.mist_shade", "count": 2, "interval": 2.5, "delay": 4.0},
		{"enemy_id": "enemy.crack_shell", "count": 2, "interval": 3.0, "delay": 7.0},
	],
	[
		{"enemy_id": "enemy.ink_worm", "count": 16, "interval": 0.28, "delay": 0.0},
		{"enemy_id": "enemy.ink_hound", "count": 8, "interval": 0.5, "delay": 2.5},
		{"enemy_id": "enemy.ink_shell", "count": 2, "interval": 2.2, "delay": 7.0},
		{"enemy_id": "enemy.mist_shade", "count": 3, "interval": 1.8, "delay": 3.0},
		{"enemy_id": "enemy.spirit_giant", "count": 1, "interval": 1.0, "delay": 10.0},
		{"enemy_id": "enemy.crack_shell", "count": 2, "interval": 2.5, "delay": 8.0},
	],
	[
		{"enemy_id": "enemy.ink_tiger", "count": 1, "interval": 1.0, "delay": 0.0},
		{"enemy_id": "enemy.ink_blob", "count": 6, "interval": 1.2, "delay": 3.0},
	],
]

const CHAIN_WINDOW := 2.2

func element_name(e: int) -> String:
	return ELEMENT_META[e]["name"]

func element_color(e: int) -> Color:
	return ELEMENT_META[e]["color"]

func spirit(id: String) -> Dictionary:
	return SPIRITS.get(id, {})

func enemy(id: String) -> Dictionary:
	return ENEMIES.get(id, {})

static func reaction_key(a: int, b: int) -> String:
	var names := [element_name_static(a), element_name_static(b)]
	names.sort()
	return names[0] + "+" + names[1]

static func element_name_static(e: int) -> String:
	match e:
		Element.FIRE: return "FIRE"
		Element.WATER: return "WATER"
		Element.LIGHTNING: return "LIGHTNING"
		Element.WIND: return "WIND"
		Element.ICE: return "ICE"
	return ""

func find_reaction(a: int, b: int) -> Dictionary:
	return REACTIONS.get(reaction_key(a, b), {})

func validate() -> PackedStringArray:
	var errors := PackedStringArray()
	for sid in SPIRITS:
		if not SPIRITS[sid].has("element"):
			errors.append("Spirit missing element: %s" % sid)
	for eid in ENEMIES:
		if ENEMIES[eid]["max_hp"] <= 0:
			errors.append("Enemy bad hp: %s" % eid)
	for wave in WAVES:
		for entry in wave:
			if not ENEMIES.has(entry["enemy_id"]):
				errors.append("Wave refs missing enemy: %s" % entry["enemy_id"])
	for slot in MAP["slots"]:
		for n in slot["neighbors"]:
			var found := false
			for other in MAP["slots"]:
				if other["id"] == n:
					found = true
			if not found:
				errors.append("Slot %s bad neighbor %s" % [slot["id"], n])
	return errors
