# 讲解组件与语义事件

用于“画面单调、希望多一些组件和元素”的反馈。原有粗像素、低对比背景、独立大小人物与局部暖光继续保留。增加的是内容动作与反馈，不是更精细的纹理。

## 可复用组件

文件：`assets/cinematic-template/components.mjs`。函数均接收 Canvas context 与一个参数对象，坐标为原生 1920×1080；值、状态、标签和透明度由该期时间轴决定。未传标签时，按 `episode.locale`（`zh`|`en`|`ja`）从 `i18n.mjs` 取默认文案。

| 组件 | 主要参数 | 何时用 |
|---|---|---|
| `drawPaper` | x / y / w / h / mark / alpha | 内容卡进入、移出、被标记 |
| `drawInventory` | x / y / w / count / title / state / alpha | 收藏、装备、资源、学习库存 |
| `drawRecallPanel` | x / y / w / title / state / alpha | 查询、检索、缺失结果；state 为 empty / failed / success |
| `drawOpenBook` | x / y / w / h / closed / mark | 看资料、合上资料、闭卷、卡点 |
| `drawQuizBoard` | x / y / w / prompt / answer / reference / reveal / correct / mark / alpha | 问题、尝试回答、展开参考答案、对照与修正 |
| `drawMarkerFlag` | x / y / label / alpha | 错误、路上的卡点、待练项目 |
| `drawFeedback` | x / y / w / progress / state / alpha | 即时对错、经验变化；correct 与 pending 两种状态 |
| `drawRewardBadge` | x / y / label / alpha | 获得能力、通过验证、解锁道具 |
| `drawCompareCards` | x / y / w / title / leftTitle / rightTitle / leftBody / rightBody / highlight / alpha | 前后对比、方案 A/B、误区 vs 正解 |
| `drawStepBar` | x / y / w / steps[] / current / title / alpha | 多步流程、操作清单、章节内进度 |

这些都是世界里的独立道具或游戏 HUD，不是完整页面截图。组件标签从当前 episode 数据传入；库默认随 locale，不绑定某一期口播音色。

## 主题 → 推荐组件链

| 主题 | 必开 | 可选 | 备注 |
|---|---|---|---|
| 记忆 / 提取 | Inventory → Recall → Quiz → Feedback → Reward | Marker, OpenBook | 经典样片弧；`visualBeats` 全字段 |
| 对比抉择 | CompareCards → Feedback 或 Reward | StepBar, Paper | 设 `compareAt` + `componentLabels.compare*` |
| 步骤流程 | StepBar（current 随时间推进） | Paper, Inventory, Marker | 设 `stepsAt` + `labels.steps[]` |
| 系统 / 调试 | Recall(failed) → Quiz → Feedback | CompareCards | 配 `terminal` 场景 |
| 旅程 / 选择 | Marker + walk → Reward | CompareCards, Inventory | 配 `nightstreet` |

## 原生场景中的增强分支

`scene.mjs` 保留原先的简单镜头。当 `episode.visualBeats` 存在时启用增强镜头，事件字段以整条时间轴的毫秒为单位：

```json
{
  "locale": "en",
  "sceneId": "workshop",
  "scenes": { "big": "workshop", "small": "archive" },
  "visualBeats": {
    "collectAt": 500,
    "queryAt": 2000,
    "contrastAt": 4500,
    "retrieveAt": 7000,
    "compareAt": 8200,
    "stepsAt": null,
    "testAt": 11000,
    "closeAt": 11000,
    "markAt": 13500,
    "checkAt": 14500,
    "correctAt": 16500,
    "rewardAt": 17300,
    "unlockAt": 18200,
    "walkAt": 15400
  },
  "componentLabels": {
    "inventoryTitle": "Inventory",
    "queryTitle": "Recall",
    "contrast": "Stored ≠ learned",
    "taskTitle": "Retrieve",
    "prompt": "This question",
    "wrongAnswer": "My try",
    "rightAnswer": "Reference",
    "reward": "Skill unlocked",
    "compareTitle": "Compare",
    "compareLeft": "Before",
    "compareRight": "After",
    "compareLeftBody": "Pile notes",
    "compareRightBody": "Speak once",
    "steps": ["Collect", "Recall", "Teach"],
    "stepBarTitle": "Steps"
  }
}
```

- `compareAt` / `stepsAt`：可选；设了才画对比卡 / 步骤条。大镜段（`< cutMs`）与小镜段分别判断时间。
- 不用的组件把对应 `*At` 省略或设为 `null`，不要硬塞满。
- 这是接口示例，不是每个主题的固定故事模板。

## 场景预设（`sceneId`）

六套通用粗像素背景，见 `scene-presets.mjs`：`workshop` `archive` `study` `nightstreet` `terminal` `moonatelier`。

- `episode.sceneId`：默认大镜；兼容旧片。
- `episode.scenes.big` / `scenes.small`：双镜分别指定。
- `episode.sceneIdB`：小镜别名。
- 未指定时仍为 `workshop` + `archive`。

## 让“丰富”仍然清楚

1. 一拍一个因果变化。资料飞入时看库存，检索失败时看结果，核对时看回答与参考答案，成功后才给奖励。
2. 面板与角色行动分开编排。至少考虑角色初始站位、行走中经过的区域和终点；当前静帧没挡脸，不代表后续移动也安全。
3. 背景门先绘，角色和手持道具在中间，奖励与 HUD 最后绘；不能让开门的背景矩形把奖章抹掉。
4. 展开答案、计数、旗帜、进度、打勾等有不同信息作用。不要把多个同义文本框堆满画面。
5. 入场、出场、状态切换与打字相位全部由场景时间计算，保持同帧重截一致。字体预载包含 `componentGlyphs`、`PRELOAD_EXTRA[locale]` 和当前标签。
6. 游戏演示数字应来自当前模拟状态，不暗示有真实研究统计依据。
