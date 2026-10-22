# 科普视觉验收（Show, don’t tell）

> 触发：地心引力 talking-head 样片被拒——「太假，像人在讲话，不像科普」。  
> P1–P3（场景 / i18n / 导出）**不等于**科普合格。权威设计：Project store `docs/phase4-kexue-visual.md`。

## 静音验收（必须过）

关掉声音看完整片，观众仍能读出因果，例如引力片：

1. 有质量在**动**（落 / 被拉 / 绕）  
2. 力的方向可见（轨迹弯向中心，或拉力带）  
3. 「环绕＝不停往中心落」不靠字幕才能懂  

**不过**：半身对镜讲话 + HUD 标签（落/心/绕路径点）当主演示；对比卡两块文字当英雄镜头。

## 硬规则（写进配方）

| 规则 | 要求 |
|---|---|
| 实验台优先 | 场景 = 沙盘 / 桌面落体 / 星体台；不是讲话背景墙纸 |
| 道具物理层 | `world-props.mjs`：吸引源 + 质点 + 轨迹；`sampleWorld(cfg, ms)` 时间纯函数 |
| 双世界对比 | `drawSplitWorld` 左右同拍真动画；**禁止**用 CompareCards 文案卡代替 |
| 说话让位 | 半身出镜 ≤ 总时长 **30%**，或全程画外音 + 全屏实验（`actor.hide`） |
| HUD 纪律 | `profile: "kexue"` 或 `hud: false` 默认关章节轨；每片最多 **1** 个焦点 UI（`world.focusUi`） |
| 禁伪路径 | 不用 path 节点字「落/心/绕」冒充物理演示 |

## 事件 API（摘要）

| type | 作用 |
|---|---|
| `world.show` | `layout: full\|split` + `full` / `left` / `right` 物理 cfg |
| `world.set` | 切换布局或模式；默认 `restart` 重开本地时钟 |
| `world.hide` | 退场 |
| `actor.hide` / `actor.show` | 控制半身是否入镜 |

物理 `mode`：`fall`（直坠）· `coast`（惯性直线）· `attract`（向心拉）· `orbit`（近圆轨道）。

## 主题菜单补丁

| 主题类型 | 必开 | 禁止当英雄 |
|---|---|---|
| **物理 / 自然 科普** | 必选 [kexue-patterns.md](kexue-patterns.md) 中一个 pattern | 半身口播、Path 标签、Compare 文案卡、Timeline/Ring 堆叠 |
| 记忆 / 提取 | 仍用 Inventory 链 | — |

## 模式速览（11）

`orbit-pull` · `dual-world` · `scale-ladder` · `flow-process` · `balance-scale` · `collision-transfer` · `cycle-loop` · `threshold-tip` · `field-lines` · `ratio-mix` · `chain-reaction`

完整目录、反模式、决策树、镜头抛光 → [kexue-patterns.md](kexue-patterns.md)。
