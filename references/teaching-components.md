# 讲解组件与语义事件

用于“画面单调、希望多一些组件和元素”的反馈。原有粗像素、低对比背景、独立大小人物与局部暖光继续保留。增加的是内容动作与反馈，不是更精细的纹理。

## 可复用组件

文件：`assets/cinematic-template/components.mjs`。坐标原生 1920×1080；未传标签时按 `episode.locale` 从 `i18n.mjs` 取默认。

| 组件 | 主要参数 | 何时用 |
|---|---|---|
| `drawPaper` | x / y / w / h / mark / alpha | 内容卡进入、移出、被标记 |
| `drawInventory` | x / y / w / count / title / state / alpha | 收藏、装备、资源、学习库存 |
| `drawRecallPanel` | x / y / w / title / state / alpha | 查询、检索；state empty / failed / success |
| `drawOpenBook` | x / y / w / h / closed / mark | 看资料、合上、闭卷 |
| `drawQuizBoard` | prompt / answer / reference / reveal / correct / mark | 答题对照 |
| `drawMarkerFlag` | x / y / label / alpha | 卡点 |
| `drawFeedback` | progress / state | 即时对错 |
| `drawRewardBadge` | label | 解锁 |
| `drawCompareCards` | left* / right* / highlight | 前后 / A-B 对比 |
| `drawStepBar` | steps[] / current | 多步流程条 |
| `drawTimeline` | steps[] / activeIndex / progress | 阶段时间线（2–5 节点） |
| `drawSpeechBubble` | text / tail / tone | 短对话泡（≤12 汉 / ≤22 Latin；更长用字幕） |
| `drawPathNodes` | nodes[] / edges[] | 路径节点 + 短划边 |
| `drawCountdownRing` | progress / mode / label | 分段方块进度环 |

默认布局与遮挡：半身 timeline `x=480,y=140`；speech `x=920,y=220`；ring `cx=1680,cy=200`。小人 path 三点 `520/900/1280`，与行走路径垂直错开。同一焦点建议 2–4s 推进；compare 与 speech 同帧互斥。

## 主题 → 推荐组件链

| 主题 | 必开 | 可选 | 备注 |
|---|---|---|---|
| **物理 / 自然 科普** | 必选 kexue pattern + `world.show/set` | 单条 `focusUi`；字幕 | 目录 [kexue-patterns.md](kexue-patterns.md)；合同 [kexue-visual.md](kexue-visual.md) |
| 记忆 / 提取 | Inventory → Recall → Quiz → Feedback → Reward | Marker, OpenBook | `visualBeats` 或等价 `events` |
| 对比抉择 | CompareCards → Feedback/Reward | StepBar, Speech | 科普因果对比请用 split world，不用文案卡 |
| 步骤 / 结构 | Timeline + StepBar + Path | Ring, Speech, Compare | 中文非记忆秀 `episode.zh-path.json` |
| 系统 / 调试 | Recall(failed) → Quiz → Feedback | Compare, Ring | `terminal` |
| 旅程 / 选择 | Path + walk → Reward | Marker, Speech | `nightstreet` |

## `events[]`（推荐）与 `visualBeats`（兼容）

```text
if (episode.events?.length) → 事件消费路径
else if (episode.visualBeats) → 旧增强路径（像素行为保持）
else → legacy 简单镜
```

适配层：`events-adapter.mjs` 的 `expandVisualBeats(vb)` / `resolveEpisodeEvents(ep)` / `foldEvents(ep, ms)`。

### 旧字段 → 事件 type

| 旧 `visualBeats` | 展开为 |
|---|---|
| `collectAt` | `inventory.show` |
| `queryAt` | `recall.show`；`+750` → `recall.setState` failed |
| `contrastAt` | `contrast.show` |
| `retrieveAt` | `task.show` |
| `compareAt` / `stepsAt` | `compare.show` / `stepbar.show` |
| `testAt` / `checkAt` / `correctAt` | `quiz.*` / `feedback.show` |
| `closeAt` / `markAt` | `book.setClosed` / `book.mark` + `flag.show` |
| `rewardAt` | `reward.show` + `actor.celebrate` |
| `unlockAt` / `walkAt` | `door.unlock` / `actor.walk` |

新 type：`timeline.show|setActive`、`speech.show|hide`、`path.show|litEdge|setNode`、`ring.show|set`、`stepbar.advance`、`compare.show`、`world.show|set|hide`、`actor.show|hide`。未知 type 忽略并 `console.warn`。`at` 为整片绝对毫秒。

世界物理：`assets/cinematic-template/world-props.mjs`（`sampleWorld` / `drawSplitWorld`）。科普样片 `episode.zh-gravity.json`（`?ep=gravity`）。

新样片默认写 `events`（见 `episode.zh-path.json`）。旧 `memory-key` 可继续只写 `visualBeats`。

## 场景预设

`workshop` `archive` `study` `nightstreet` `terminal` `moonatelier` — `sceneId` / `scenes.{big,small}`。

## 让「丰富」仍然清楚

1. 一拍一个因果；新组件入场时上一焦点退场或降透明。  
2. 面板与角色行动错开；静帧三时刻（半身桌边、行走中段、答题/奖励）必过。  
3. 字体预载含 `componentGlyphs`、`PRELOAD_EXTRA[locale]`、当期标签与字幕。  
4. 交付前建议：`node scripts/qa_stills.mjs ...`（声明 bbox；挡脸夹具 `?ep=occlusion-fail` 必须 fail）。
