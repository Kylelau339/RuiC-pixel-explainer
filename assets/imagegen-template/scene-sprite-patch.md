# A 路线 · 三步接入（sprite patch）

目标：复制 cinematic 模板后，**只改 JSON + 复制适配器**，不再手改 `big`/`small`/`bigLegacy`/`smallLegacy` 四处。

Phase 2 起，`CinematicScene` 已提供统一入口：

- `drawActorBig(...)` / `drawActorSmall(...)`
- `episode.actorMode: "code" | "sprite"`（默认 `code`）
- `async load()`：当 `actorMode==="sprite"` 时加载 `SpriteActor`

## 三步

### 1. 复制模板与适配器

```bash
cp -R <技能>/assets/cinematic-template <本期工程>
cp <技能>/assets/imagegen-template/sprite-actor.mjs <本期工程>/
```

注册图集（见 `INTEGRATION.md`）：

```bash
python3 <技能>/scripts/register_actor_sheet.py --sheet mini.png --grid 4x4 --canvas 256 --baseline 240 --out assets/sprites
python3 <技能>/scripts/register_actor_sheet.py --sheet half-body.png --grid 2x2 --canvas 512 --baseline 500 --out assets/bust
```

### 2. 在 `episode.json` 设开关与资产

```json
{
  "actorMode": "sprite",
  "actorAssets": {
    "mini": {
      "manifest": "assets/sprites/manifest.json",
      "visibleHeight": 190,
      "frameMs": 170,
      "frames": { "idle": [0, 1], "walk": [4, 5, 6, 7], "celebrate": [14] }
    },
    "portrait": {
      "manifest": "assets/bust/manifest.json",
      "visibleHeight": 560,
      "frameMs": 160,
      "frames": { "idle": [0], "talk": [0, 1], "blink": [2], "gesture": [3] }
    }
  },
  "actor": { "name": "阿岚" }
}
```

缺 `actorAssets` 且 `actorMode=sprite` → 构造期 **明确抛错**。

### 3. 播放器已 await `load()`（模板 `index.html`）

无需再改四处 actor 调用。验证：

```bash
rg 'frontActor\(|sideActor\(' scene.mjs
# 类的 big/small/legacy/events 方法中应为 0 命中；仅定义与 drawActor* 内部可出现。
```

## 附录：旧「四处替换」

若仍使用未升级的旧模板，见 `INTEGRATION.md` 附录。新工程请走本三步。
