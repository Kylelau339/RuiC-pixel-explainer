---
name: ruic-pixel-explainer
description: 生成粗像素 RPG 横屏讲解片，按实际生图能力分为参考角色生图与纯代码两条路线。有生图用4×4动作小人和独立半身表情图，无生图用半身、大头平面脸、无突出鼻子的代码角色；两路都配角色专属场景、语义组件与确定性MP4导出。适用读书讲解、像素讲堂、像《刻意练习》那种视频及大小人物样片。
user-invocable: true
metadata:
  dsh:
    compatibility: native
    requires:
      - node
      - ffmpeg
      - python3
      - curl
---

# ruic-pixel-explainer · 粗像素电影式讲解片

把知识点演成像素世界中的动作，交付带口播的 16:9 MP4 与可修改工程。默认 1920×1080 / 30 fps；时长、文案、人物、场景以用户这次要求为准。

## 先判断模式

- **新主题 / 新人物 / 新场景**：原创生成。参考片决定像素粗细、比例、灯光与节奏；人物与道具重新设计。
- **沿用已有一期**：只修改该期数据和需要的场景，保留其他期。
- **逐帧恢复参考视频**：仅在用户明确要求恢复素材或重建原画面时使用。恢复像素不是原创动画，也不能把整片画面包当成可编辑人物骨骼。详见 [references/reference-modes.md](references/reference-modes.md)。

## 先检查生图能力，再选路线

以本次宿主实际可调用的工具或使用者已配置且授权的图片生成后端为准。能读图片、目录里有一段生图脚本、或模型名称里写 img2，都不等于已具备可运行的生图能力。不为这条技能重复安装插件、下载模型或寻找密钥。

| 情况 | 路线 | 角色资源 |
|---|---|---|
| 有可用图片生成能力，用户未禁用 | **A 生图角色路线** | 参考图 → 每角色4×4透明动作表＋独立半身表情表 → 注册PNG → Canvas场景 |
| 没有图片生成能力，或用户选择纯代码 | **B 代码角色路线** | 独立半身与Q版小人绘制函数 → 角色色表 / 发型 / 帽饰 / 动作 → Canvas场景 |
| 没有实时生图能力，但已有用户提供的有效角色PNG | 复用PNG接入A的渲染段 | 明确说明使用已有资产，不能称新生成 |

A开工读 [references/imagegen-route.md](references/imagegen-route.md)，用 `scripts/register_actor_sheet.py` 与 `assets/imagegen-template/sprite-actor.mjs` 接入。B开工读 [references/code-route.md](references/code-route.md)，复制已升级的 `assets/cinematic-template/`。无论哪路，都复用同一套字幕、讲解组件与导出器。

有工具但当前生成失败或额度受限时，说明实际限制，按任务允许的范围改用已有PNG或B，不偷偷称调用成功。用户硬性要求特定生图方法时，先完成可独立推进的文案、场景与资产需求，缺该方法的角色生成不能冒充完成。

已有React游戏工程 `~/Desktop/zcode/ai-explain-game/game/` 仍可用于完整地图、选择题、评分和通关流程，接口见 [references/pipeline.md](references/pipeline.md)。只在需要其交互时接入；旧14×21精灵不是当前角色规范，不能原样放大作大人物。

把模板复制到本次项目再改；不修改已验收的旧期。产线检查入口缺失时核实实际工程，不另装替代系统。权威源是 `~/.agents/skills/ruic-pixel-explainer/`，其他agent经软链使用。

## 视觉重点

用户希望的是**原片那种简单、可读的粗像素**，不是更精细的像素插画。不要默认加密集纹理、蒸汽朋克装饰、发丝、亮晶晶大眼或满屏棋盘光环。

- **大人物是独立半身设计**：从完整帽子或头盔到腰线，包含肩膀、胸部、袖子、手臂和方手，腿脚不入镜。保留参考的脸与服装；不能把全身小人放大裁腿冒充半身。
- **小人物是同一人的Q版行动版**：大头、短身体、厚的阶梯轮廓、平面小脸。保留帽饰、眼色、眼罩、发型与服装；可正面或轻3/4走路，不强求解剖侧脸。A用4×4动作表；B至少有站立、走路和庆祝，别缩成看不清的小点。
- **脸上不额外画鼻子**：无突出的侧鼻、鼻梁、中央鼻影或鼻尖高光。用眼睛、小嘴和少量腮红表达表情。PNG路线不在资产上再绘五官；代码路线的面部轮廓保持平整。
- **环境与人物不是同一个细节尺度**：建筑的大体块比人物像素更大；细小表面线条少而低对比。避免密集 AI 插画，也避免把整面墙画成巨型棋盘。
- **场景对应角色**：按角色气质、服装与本期动作设计空间，不给所有人套同一个房间或只换背景色。最新样片的暖色排练室与月窗创作工坊是差异化示例，不是固定身份和世界。
- **空间靠层次成立**：后墙 / 人物 / 讲解道具 / 前景桌边或平台 / 原生分辨率光照 / 字幕。桌边可以挡腿，道具不能挡脸，字幕保留独立暗区。
- **每场一个主光源**：暖灯或屏幕光形成局部明暗，边缘压暗；柔光不必像素化，脸与道具轮廓要保持硬边。按参考片选择暖棕、灰绿或冷夜色，别把固定蓝紫色板套到所有主题。
- **HUD 服务于场景**：大人物引入可以先不显示章节轨。进入小人物关卡后再出现简短导航与署名。地点卡可选，别把三件套硬塞满每一镜。
- **字幕按参考片选字体**：本样板用真实加载的 Fusion Pixel 粗像素字，白色外描边＋暗内描边＋金色关键词。不是默认系统圆体。保持单行，长度以实际排版为准，超过宽度就分拍。

数值、角色比例与配方见 [references/style-dna.md](references/style-dna.md)。最新视频的四张视觉锚点在 `assets/reference-frames/`，用于定标，不把示例角色或场景当成所有主题的默认。

## 让人物有事可演

粗像素不等于只有小人走路和嘴巴开合。根据每个知识点选择可操作的讲解组件，把一句抽象结论转成看得见的事件链。按当前主题选配方，不把「收藏→检索→答题」硬套到所有视频。

### 主题 → 推荐组件链（菜单）

| 主题类型 | 必开组件 | 可选 | 场景预设建议 |
|---|---|---|---|
| 记忆 / 提取 | Inventory → Recall → Quiz → Feedback → Reward | MarkerFlag, OpenBook | `workshop` + `archive` |
| 对比抉择（Before/After） | **CompareCards** → StepBar 或 Feedback | Paper, RewardBadge | `study` / `terminal` |
| 步骤 / 结构（非记忆） | **Timeline** + StepBar + **Path** | Speech, Ring, Compare | `terminal` / `study` |
| 系统 / 调试 | Recall(failed) → Quiz → Feedback | CompareCards, Ring | `terminal` |
| 旅程 / 选择 | Path + walk → Reward | Speech, MarkerFlag | `nightstreet` + `archive` |

完整参数与 **`events[]` / `visualBeats` 迁移表**见 [references/teaching-components.md](references/teaching-components.md)。新样片优先 `events`；旧片可继续 `visualBeats`。`locale`（`zh`|`en`|`ja` 脚手架）；`sceneId` 点选六套场景。交付前建议跑 `scripts/qa_stills.mjs`（不取代遮挡三时刻人工检）。

- 优先组合道具动作与信息反馈；组件有独立状态与时间参数，不能只贴静态文字框。
- 同一段落内按语义推进；一个组件成为焦点时，上一组件停止、变暗或退场。
- 对照或答题面板留在头部上方或旁边；组件不盖脸、不压字幕。

## 从文案到成片

1. 确认主题、时长、**locale**、参考风格。明确数字或专有事实才查出处；纯教学比喻不为凑事实表虚构引用。用户让你选文案就直接写。
2. 把文案分成**语义拍**，给每拍一个动作；从表里选组件链与 `sceneId`，不必每句话切镜头。
3. 人物与场景分别设计。新人物应改变剪影或特征组合；先锁身份特征，再完成半身与小人。
4. 逐句合成口播，量真实时长，再填字幕、说话区间与动作时间。口播走**使用者自己的**配音后端（见 [references/pipeline.md](references/pipeline.md) 第 5 节）——先 `voice_track.py --check`；不要靠极端变速迁就拍脑袋的时间轴。
5. **质量门禁（强制）**：用时间的纯函数绘制后，**必须**跑静帧，再 draft / final 出片。同帧重截不一致必须修正；CSS 墙钟动画和 `Math.random()` 不进入录制画面。

### 静帧时间点模板（交付前必跑）

对 20s 双镜片，至少抽：

```bash
node <技能目录>/scripts/stills.mjs --url http://127.0.0.1:8778/ --out stills \
  --times 1.6,4.5,6.2,8.5,10.5,12.0,14.8,16.8,18.4 --dsf 1.5
```

**遮挡三时刻**（见 [references/cinematic-profile.md](references/cinematic-profile.md)）必须各有一张静帧可勾选：① 半身开场桌边挡腿但不挡脸；② 小人行走途中组件不压帽发脸；③ 答题/奖励弹出时不压字幕带。交付物须含 `stills/` 目录。

用户已经授权具体样片或给了明确结构时，直接把样片做完给他审。复杂长片、内容有实质歧义时才澄清。

## 命令与入口

```bash
# B：先复制纯代码模板。episode.json 改文案、locale、sceneId 与角色参数。
cp -R <技能目录>/assets/cinematic-template <本次项目目录>
python3 <本次项目目录>/serve.py --port 8778 --open
# 英样例：浏览器打开 ?ep=en ；日文脚手架：?ep=ja

# 口播两步走；work 换到本期独立工作目录。
python3 <技能目录>/scripts/voice_track.py --check
python3 <技能目录>/scripts/voice_track.py --lines lines.json --work <work> --tts-only
python3 <技能目录>/scripts/voice_track.py --lines lines-abs.json --work <work> --out voice.wav

# 静帧（强制）→ draft 预览 → 局部重渲 → final 交付
node <技能目录>/scripts/stills.mjs --url http://127.0.0.1:8778/ --out stills \
  --times 1.6,4.5,6.2,8.5,10.5,12.0,14.8,16.8,18.4 --dsf 1.5
node <技能目录>/scripts/render_episode.mjs --url http://127.0.0.1:8778/ \
  --out sample.mp4 --audio voice.wav --preset draft --threads 2
# 只重渲后半段（秒）：
node <技能目录>/scripts/render_episode.mjs --url http://127.0.0.1:8778/ \
  --out sample.mp4 --preset draft --from 10 --to 20
node <技能目录>/scripts/render_episode.mjs --url http://127.0.0.1:8778/ \
  --out sample.mp4 --audio voice.wav --preset final --threads 2
# 轻量 QA（声明 bbox；挡脸夹具应 fail）
node <技能目录>/scripts/qa_stills.mjs --url http://127.0.0.1:8778/ --ep zh-path --out qa-stills
node <技能目录>/scripts/qa_stills.mjs --url http://127.0.0.1:8778/ --ep occlusion-fail --out qa-fail --times 1.0 ; echo "expect fail"
```

- `--preset draft`：约 15fps、更快 x264、`verify-repeat=1`，输出文件名带 `.draft`；**不可当作交付成片**。
- `--preset final`：30fps、完整确定性自检、交付档；输出带 `.final`。
- `--from` / `--to`（秒）局部重渲，改完一段不必整片等数分钟。

1280×720 视口 × dsf 1.5 直接得到 1920×1080 截图。编码默认两线程，不能把全机吃满。

## 交付与声明

交付 MP4、可修改工程、关键静帧、口播文本与真实规格。输出放用户指定目录；当前宿主要求 outputs/ 时遵守宿主，不把固定桌面路径写死到每个任务。

检查视频时长、帧数、音轨、字幕安全区和时间轴确定性；有交互才检查实际输入与自动继续。渲完直接给用户审，不派代理重复整片审片。

**原创片没有逐帧 RGB 一致性承诺。** 视觉参考只是风格与规格依据；只有实际采用恢复像素并完成校验时才可报告恢复数据的像素一致性。不要拿这套指标证明原创生成与原片看不出区别。
