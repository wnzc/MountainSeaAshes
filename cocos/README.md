# 山海余烬 · Cocos Creator 移动端（9:21）

与 **Godot** 版画面/逻辑对齐的 Cocos Creator **3.8.8** 工程。

## 设计分辨率

- **1080 × 2520（9:21 竖屏）**
- 地图背景：`assets/resources/maps/map_bg_921.png`
- 适配现代手机长屏（同 GDD「9:21 长屏」）

## 打开

1. 安装 Cocos Creator **3.8.8+**
2. 打开本目录 `cocos/`
3. 用 `BattleView` + 资源组装主场景，或将 `assets/scripts` 挂到空场景

## 与 Godot 对齐

| 模块 | Godot | Cocos |
|------|-------|-------|
| 配置 | `autoload/data_registry.gd` | `assets/scripts/Data.ts` |
| 事件 | `autoload/event_bus.gd` | `assets/scripts/EventBus.ts` |
| 战斗/反应/连锁 | `scripts/battle/battle.gd` | `assets/scripts/BattleCore.ts` |
| 视图 | `scenes/battle/battle.tscn` | `assets/scripts/BattleView.ts` |

逻辑包含：Catmull-Rom 圆润路线、塔位离路 108px、六种 P0 反应、2/3/4 连、8 波+Boss、共鸣加成。

## 浏览器可玩预览（9:21）

```bash
open cocos/preview/index.html
```

或任意静态服务器打开 `cocos/preview/`，画布为 1080×2520。
