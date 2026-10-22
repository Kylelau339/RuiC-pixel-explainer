# 科普实验模式目录（给 Agent 用）

> **硬门槛**：主题含 科普 / 科学 / 原理 / 物理 / 自然 因果时，**必须**从本目录选一个 `kexue.pattern`，不得默认做成半身 talking-head。  
> 视觉合同见 [kexue-visual.md](kexue-visual.md)。实现：`assets/cinematic-template/world-props.mjs` → `drawKexuePattern` + `sampleCamera`。

## Agent 检查清单（写 episode 前勾选）

- [ ] 已选 `kexue.pattern`（下表十一选一）  
- [ ] `profile: "kexue"` 且 `hud: false`  
- [ ] `actor.hide` 或半身 ≤ 30% 时长  
- [ ] **静音可懂**：道具在动；因果不靠字幕才能成立  
- [ ] 不用 Path 节点字冒充演示；不用 CompareCards 文案卡当双世界  
- [ ] 每片 ≤ 1 个 `focusUi`  
- [ ] 拍与拍之间有停顿（`world.set` 间隔 ≥0.8s 或字幕留白）  
- [ ] `events` 用 `world.show` / `world.set`（时间纯函数，可 seek）

## 决策树：主题 → pattern

```text
力把路径掰弯 / 环绕          → orbit-pull
同一出发、两种因果            → dual-world
大小差几个数量级              → scale-ladder
A 变成 B 再变成 C             → flow-process
谁更重 / 何时平衡             → balance-scale
碰撞后速度换主人              → collision-transfer
闭环循环（水循环等）          → cycle-loop
堆到阈值才崩                  → threshold-tip
场 / 风向偏转粒子             → field-lines
配方比例混合                  → ratio-mix
多米诺 / 连锁触发             → chain-reaction
不确定？dual-world 或 orbit-pull — 禁止回退半身口播。
```

## 模式目录（11）

| id | 何时用 | 静音必见拍 | 样例 |
|---|---|---|---|
| **orbit-pull** | 引力、向心、轨道 | 质点被拉；弯轨；拉力带 | `?ep=gravity` |
| **dual-world** | 有无外力对照 | 左右同拍真动画 | `?ep=kexue-dual` |
| **scale-ladder** | 数量级 | 多球依次长大 | `?ep=kexue-scale` |
| **flow-process** | 相变、转化 | 道具 A→B→C 变形移动 | `?ep=kexue-flow` |
| **balance-scale** | 质量、平衡 | 梁随重量倾斜 | `?ep=kexue-balance` |
| **collision-transfer** | 动量、碰撞 | A 撞 B，速度交接 | `?ep=kexue-collision` |
| **cycle-loop** | 循环系统 | 金点沿环路跑，节点点亮 | `?ep=kexue-cycle` |
| **threshold-tip** | 临界、崩塌 | 堆到线后倾斜崩落 | `?ep=kexue-threshold` |
| **field-lines** | 场、力线 | 箭头场 + 粒子弯轨 | `?ep=kexue-field` |
| **ratio-mix** | 比例、配方 | 两色注入；唇上色块＝比例 | `?ep=kexue-ratio` |
| **chain-reaction** | 连锁 | 多米诺依次倾倒 | `?ep=kexue-chain` |

### 事件草图

```json
{ "at": 0, "type": "actor.hide" }
{ "at": 200, "type": "world.show", "params": {
  "pattern": "collision-transfer",
  "collision": { "hitAt": 3.2 },
  "camera": { "keyframes": [{ "atMs": 0, "zoom": 1, "x": 960, "y": 540 }] }
}}
{ "at": 9000, "type": "world.set", "params": { "focusUi": "一句结论", "restart": false } }
```

专用 cfg：`scale` / `flow` / `balance` / `collision` / `cycle` / `threshold` / `field` / `ratio` / `chain`。  
可选 `camera.keyframes`；缺省用 `defaultCameraForPattern(pattern)`。

## 反模式

| 反模式 | 改成 |
|---|---|
| 半身对镜讲原理 | 实验台 + 画外音 |
| Path「落/心/绕」 | orbit-pull / dual-world |
| CompareCards 文案双世界 | dual-world 动画 |
| HUD 汤 | `hud:false` + ≤1 focusUi |
| StepBar 当相变/循环 | flow-process / cycle-loop |
| 静态三图标比大小 | scale-ladder |
| 文字写「发生碰撞」 | collision-transfer 真撞 |

## 画廊

| ep | draft |
|---|---|
| gravity | `demo-zh-gravity-v2-polish.draft.mp4` |
| kexue-scale / balance | 既有 draft |
| kexue-collision / field / chain | 新 draft（本 PR） |
| dual / flow / cycle / threshold / ratio | `?ep=` seek 预览 |

## 镜头抛光（4c）

- `sampleCamera` → **letterbox punch-in**（按焦点偏移加黑边裁切；**禁止** canvas `scale`/`translate` 跟焦——会破坏 PNG 字节自检）  
- 轨迹：更亮青绿 + 近端加粗 + 离散 alpha 档  
- 拉力带：更粗虚线 + 箭头翼  
- 节拍：重力样片 22s，拍间留白（「看清楚这一下」「停一秒，对比」）
