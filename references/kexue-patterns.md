# 科普实验模式目录（给 Agent 用）

> **硬门槛**：主题含 科普 / 科学 / 原理 / 物理 / 自然 因果时，**必须**从本目录选一个 `kexue.pattern`，不得默认做成半身 talking-head。  
> 视觉合同见 [kexue-visual.md](kexue-visual.md)。实现：`assets/cinematic-template/world-props.mjs` → `drawKexuePattern`。

## Agent 检查清单（写 episode 前勾选）

- [ ] 已选 `kexue.pattern`（下表五选一）  
- [ ] `profile: "kexue"` 且 `hud: false`  
- [ ] `actor.hide` 或半身 ≤ 30% 时长  
- [ ] **静音可懂**：道具在动；因果不靠字幕才能成立  
- [ ] 不用 Path 节点字冒充演示；不用 CompareCards 文案卡当双世界  
- [ ] 每片 ≤ 1 个 `focusUi`  
- [ ] `events` 用 `world.show` / `world.set`（时间纯函数，可 seek）

## 决策树：主题 → pattern

```text
要讲「力把路径掰弯 / 环绕」？     → orbit-pull
要讲「同一出发、两种因果」？     → dual-world
要讲「大小差几个数量级」？       → scale-ladder
要讲「A 变成 B 再变成 C」？       → flow-process
要讲「谁更重 / 何时平衡」？       → balance-scale
不确定？先 dual-world 或 orbit-pull，禁止回退半身口播。
```

## 模式目录

| id | 何时用 | 静音必见拍 | 样例 |
|---|---|---|---|
| **orbit-pull** | 引力、向心、轨道 | 质点被拉；轨迹弯向中心；拉力带 | `?ep=gravity` |
| **dual-world** | 有无外力、因果对照 | 左右同拍真动画，命运不同 | `?ep=kexue-dual` |
| **scale-ladder** | 数量级、尺度 | 多球依次长大；标记爬阶梯 | `?ep=kexue-scale` |
| **flow-process** | 相变、流程、转化 | 道具沿 A→B→C **变形移动** | `?ep=kexue-flow` |
| **balance-scale** | 质量、平衡、力矩 | 天平梁随重量倾斜 | `?ep=kexue-balance` |

### 事件草图

```json
{ "at": 0, "type": "actor.hide" }
{ "at": 200, "type": "world.show", "params": { "pattern": "scale-ladder", "scale": { "rungs": [/*…*/] } } }
{ "at": 10000, "type": "world.set", "params": { "focusUi": "一句结论", "restart": false } }
```

`orbit-pull` / `dual-world` 继续用 `full` / `left` / `right` 物理 cfg（`fall|coast|attract|orbit`）。  
`scale-ladder` → `params.scale.rungs`；`flow-process` → `params.flow.stations`；`balance-scale` → `params.balance.{leftMass,rightMass}`。

## 反模式（交片即不合格）

| 反模式 | 为什么挂 | 改成 |
|---|---|---|
| 半身对镜讲原理 | 关声只剩一张嘴 | 实验台 + 画外音字幕 |
| Path「落/心/绕」当演示 | 标签≠物理 | orbit-pull / dual-world |
| CompareCards 左右文案 | 文字对比不是实验 | dual-world 分屏动画 |
| Timeline+Ring+StepBar 堆满 | HUD 汤 | `hud:false` + ≤1 focusUi |
| StepBar 当相变 | 步骤条≠形态变化 | flow-process |
| 静态三图标比大小 | 图标不「长」 | scale-ladder 生长动画 |

## 画廊

| ep | 文件 | draft |
|---|---|---|
| gravity | `episode.zh-gravity.json` | `demo-zh-gravity-v2.draft.mp4` |
| kexue-dual | `episode.kexue-dual.json` | （预览 seek；可渲） |
| kexue-scale | `episode.kexue-scale.json` | `demo-zh-scale-ladder.draft.mp4` |
| kexue-flow | `episode.kexue-flow.json` | （预览 seek） |
| kexue-balance | `episode.kexue-balance.json` | `demo-zh-balance-scale.draft.mp4` |
