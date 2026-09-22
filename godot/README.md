# 山海余烬 · 镜水涧 · Godot 4 Demo

Godot **4.7** 竖屏 2D 元素连锁塔防首关。

## 打开方式

1. 打开 Godot 4.x → 导入 `godot/project.godot`
2. 运行主场景 `scenes/ui/title_screen.tscn`（项目已配置）

命令行：

```bash
/Applications/Godot.app/Contents/MacOS/Godot --path godot
```

无头自检：

```bash
/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot res://tests/smoke_test.tscn
```

## 已修复

- **10 个塔位全部贴近路线**（距路线 65–157px，攻击范围 210+ 可覆盖）
- 背景图、标题图、UI 图集已接入

## 玩法

点底部灵兽卡 → 点空塔位放置 → 自动攻击。短时间连续反应升 2/3/4 连。相邻不同元素产生共鸣。

## 结构（对齐 GDD / 技术文档）

| 路径 | 职责 |
|------|------|
| `autoload/data_registry.gd` | 全部配置（灵兽/怪物/反应/波次/地图） |
| `autoload/event_bus.gd` | 事件广播 |
| `scripts/battle/battle.gd` | 战斗、反应、连锁、环境、表现 |
| `scenes/ui/title_screen.tscn` | 封面（标题图） |
| `scenes/battle/battle.tscn` | 战斗主场景（地图背景） |
| `assets/maps/mirror_stream_bg.png` | 镜水涧背景 |
| `assets/ui/title_art.png` | 标题/封面插画 |
| `assets/ui/ui_kit.png` | UI 图集 |
| `tests/smoke_test.tscn` | 无头验收 |

新增灵兽/怪物/反应：只改 `data_registry.gd`。

## 资源图

- 地图背景：`assets/maps/mirror_stream_bg.png`
- 标题插画：`assets/ui/title_art.png`
- UI 图集：`assets/ui/ui_kit.png`
