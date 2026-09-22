# 山海余烬 · 镜水涧 · Cocos Creator 版

Godot / HTML5 Demo 的 **Cocos Creator 3.8** 迁移实现。数据驱动结构与 `js/data.js`、`godot/autoload/data_registry.gd` 对齐。

## 打开方式

1. 安装 **Cocos Creator 3.8.x**
2. 用 Creator 打开本目录 `cocos/`
3. 打开场景 `assets/scenes/main.scene`（双击 Assets 中的 `main`）
4. 预览 / 构建：Web Mobile、微信小游戏、原生 iOS/Android

### 打开是空的？按这个修

| 现象 | 处理 |
|------|------|
| 层级里 GameRoot 组件丢失/红色 | 删掉丢失组件，重新 **添加组件 → 自定义脚本 → GameRoot** |
| 场景打不开/损坏 | 新建 UI 场景，Canvas 下建空节点 `GameRoot`，挂上 `GameRoot.ts` |
| 仍是灰屏 | 菜单 **开发者 → 扩展 → 重新编译脚本**，再预览；看控制台是否有 `[GameRoot] init failed` |
| 脚本 UUID 变了 | 打开 `assets/scripts/ui/GameRoot.ts.meta`，把其中 uuid 压成 22 位后写入 `main.scene` 里组件的 `__type__`（或直接重新挂组件让 Creator 写回） |

当前 `main.scene` 使用 Creator 编译注册的脚本 ID：`0d6c12uEO1JgIH3fMZYmoaK`（文件 uuid `0d6c1dae-10ed-4980-81f7-7cc6589a868a`，以 `temp/**/GameRoot` 里 `_RF.push` 的第二参数为准）。

> 首次打开 Creator 会生成 `library/`、`temp/`、`.meta` 并导入 `assets/resources/textures/`。

## 迁移对照

| 模块 | HTML / Godot | Cocos（本目录） |
|------|--------------|-----------------|
| 元素/灵兽/怪/反应/地图/波次 | `js/data.js` · `data_registry.gd` | `scripts/config/GameConfig.ts` |
| 事件总线 | `eventBus.js` · `event_bus.gd` | `scripts/core/EventBus.ts` |
| 战斗主循环/经济/波次 | `engine.js` Game · `battle.gd` | `scripts/core/Battle.ts` |
| 元素附着与双元素反应 | `applyElement` / `REACTIONS` | `scripts/core/ReactionSystem.ts` |
| 2/3/4 连 + 山海异象 | `advanceChain` · `chain` | `scripts/core/ChainSystem.ts` |
| 邻接共鸣 | `rebuildResonance` | `scripts/core/Resonance.ts` |
| 敌人路径/状态/Boss | `Enemy` · `updateBoss` | `scripts/core/EnemyUnit.ts` |
| HUD / 卡牌 / 塔位面板 | `main.js` DOM | `scripts/ui/GameUI.ts` |
| 入口组装 | `index.html` | `scripts/ui/GameRoot.ts` + `scenes/main.scene` |

## 目录

```
cocos/
  package.json / tsconfig.json
  settings/
  assets/
    scenes/main.scene
    scripts/
      config/GameConfig.ts      # 全部数值配置
      core/
        EventBus.ts
        Battle.ts               # 主状态机
        ReactionSystem.ts
        ChainSystem.ts
        Resonance.ts
        EnemyUnit.ts
        SpiritUnit.ts
        Projectile.ts
        Zone.ts
      ui/
        GameRoot.ts             # 场景入口，程序化搭 UI
        GameUI.ts
        GraphicsUtil.ts
    resources/textures/
      maps/ characters/ enemies/
```

## 设计分辨率

- 画布 **1080 × 2700**（约 9:22.5，覆盖 21:9 及更修长手机）
- 灵兽卡 / 顶部按钮触控加大；背景 `mirror_stream_bg_v2` cover 铺满

## 玩法（与 Demo 一致）

1. 底部选灵兽卡 → 点空塔位放置  
2. 两种元素附着同一目标触发双元素反应  
3. 短时连续反应升 2/3/4 连，4 连「山海异象」  
4. 相邻不同元素共鸣，延长元素状态  
5. 守住 8 波（末波 Boss 蚀山君）

## 后续可拆（工程化）

1. **资源**：`resources/textures` → `assets/art` + 图集 / Spine  
2. **预制体**：Spirit / Enemy / Projectile 拆 `.prefab`，不再纯代码建节点  
3. **配置**：`GameConfig.ts` 导出为 `.json` 或 Creator 资源，热更数值  
4. **表现**：粒子、震屏、慢镜头、音效（对齐 HTML `AudioManager`）  
5. **平台**：微信登录 / 分享 / 原生广告 SDK  

核心玩法已按 HTML/Godot 验收项对齐：路径移动、塔位与共鸣、金币收支、反应顺序无关、连锁、环境区、8 波胜负。
