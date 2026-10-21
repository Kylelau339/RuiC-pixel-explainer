// Worker: capture a half-open frame range [fromFrame, toFrame) into --out-dir as frame-NNNNNN.png.
// Spawned by render_episode.mjs as a SEPARATE Chromium process (not multi-page).
//
//   node render_segment.mjs --url http://127.0.0.1:8778/ --out-dir /tmp/seg0 \
//     --from-frame 0 --to-frame 150 --fps 30 --dsf 1.5 [--ep zh-path]
//
// PNG path never uses CDP optimizeForSpeed (destroys alpha / byte contract).
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d = '') => {const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] ?? '') : d;};
if (argv.includes('--optimize-for-speed')) {
  console.error('PNG/alpha capture: --optimize-for-speed is forbidden (HyperFrames: breaks alpha; byte self-check).');
  process.exit(2);
}

const url = arg('url', 'http://127.0.0.1:5273/');
const outDir = path.resolve(arg('out-dir'));
const ep = arg('ep');
const fps = Number(arg('fps', '30'));
const dsf = Number(arg('dsf', '1.5'));
const fromFrame = Number(arg('from-frame', '0'));
const toFrame = Number(arg('to-frame', '0'));
const workerId = arg('worker-id', '0');

if (!outDir || !Number.isFinite(fromFrame) || !Number.isFinite(toFrame) || toFrame <= fromFrame) {
  console.error('need --out-dir and --from-frame < --to-frame');
  process.exit(2);
}

const home = homedir();
const candidates = [arg('playwright'), process.env.PLAYWRIGHT_PATH,
  path.join(process.cwd(), 'node_modules/playwright/index.mjs'),
  path.join(home, 'Desktop/zcode/ai-explain-game/game/node_modules/playwright/index.mjs')].filter(Boolean);
let chromium;
for (const c of candidates) {try {({chromium} = await import(pathToFileURL(c).href)); break;} catch {}}
if (!chromium) {try {({chromium} = await import('playwright'));} catch {}}
if (!chromium) {console.error(`[worker ${workerId}] no playwright`); process.exit(2);}

await mkdir(outDir, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1280, height: 720}, deviceScaleFactor: dsf});
const params = new URLSearchParams({t: String(Math.round((fromFrame / fps) * 1000)), play: '0', rec: '1', subs: '1'});
if (ep) params.set('ep', ep);
await page.goto(`${url.replace(/\/$/, '')}/?${params}`, {waitUntil: 'load'});
await page.waitForFunction(() => window.__player && !document.querySelector('.loading'), null, {timeout: 60000});

const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
const shoot = async (frame) => {
  await page.evaluate((ms) => window.__player.set(ms), (frame / fps) * 1000);
  await settle();
  if (await page.evaluate(() => document.fonts.status === 'loading')) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate((ms) => window.__player.set(ms + 0.001), (frame / fps) * 1000);
    await settle();
    await page.evaluate((ms) => window.__player.set(ms), (frame / fps) * 1000);
    await settle();
  }
  // locator PNG — never CDP optimizeForSpeed
  return page.locator('.frame').screenshot({type: 'png'});
};

const t0 = Date.now();
for (let f = fromFrame; f < toFrame; f++) {
  const buf = await shoot(f);
  const name = `frame-${String(f).padStart(6, '0')}.png`;
  await writeFile(path.join(outDir, name), buf);
}
await browser.close();
const n = toFrame - fromFrame;
console.log(`[worker ${workerId}] ${n} frames [${fromFrame},${toFrame}) in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${outDir}`);
