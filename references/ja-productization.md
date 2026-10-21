# 日语（ja）产品化清单（Phase 3）

ko 仍延后。Fusion Pixel 语言字形是补丁方案——以样片实测为准，不承诺全 CJK 扩展。

| # | 项 | 状态 / 做法 |
|---|---|---|
| J1 | 字体包映射 | `locale: ja` → 同目录 `Fusion-Pixel-…Simplified-Chinese.css`（内含 Hiragana/Katakana 分包）。见 `i18n.FONT_CSS_BY_LOCALE`。独立 TakWolf `ja` 包未入库。 |
| J2 | 预载全文 | `index.html` 合并 `componentGlyphs` + `PRELOAD_EXTRA.ja` + `componentLabels` + `chapters` + `lines` |
| J3 | 缺字 checklist | 出片前扫字幕/标签：扩展区汉字、罕见人名；缺则改写。CJK Unified ≈92% |
| J4 | 行长 | 字幕单行约 **13 全角**（SDH 可到 16）；组件标签宜短 |
| J5 | 语速 | TTS 规划 ~5.8 字/秒，估窗 ×0.8；字幕阅读 ~4 cps **勿**当口播。先 TTS 实测再钉 `at/end` |
| J6 | 混排 | 半角 Latin 与全角假名宽度差大；HUD 少塞长英文专名 |
| J7 | 样片 | `episode.ja.json`（`?ep=ja`）：20s 非记忆「メモのすき間」；compare + stepbar + events |
| J8 | TTS 示例 | 用户自带后端，例如：`{"type":"http","url":"https://your-tts/api","voice":"ja-JP-…","body":{"text":"{text}","speaker":"{voice}"}}` — **不内置密钥** |

## 预览

```bash
python3 assets/cinematic-template/serve.py --port 8778
# 打开 http://127.0.0.1:8778/?ep=ja
node scripts/stills.mjs --url http://127.0.0.1:8778/ --ep ja --out stills-ja \
  --times 1.6,6.2,10.5,14.8,18.4
```

有日文 TTS 后再 `render_episode.mjs --ep ja --preset final --workers 2`。
