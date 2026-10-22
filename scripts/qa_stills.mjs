// Light stills QA: declared face × component panel bbox overlap + subtitle band + edge margin.
// Canvas has no DOM — overlap uses episode/runtime declared rectangles (not CV).
//
//   node qa_stills.mjs --url http://127.0.0.1:8778/ --out qa-stills \
//     --times 1.6,6.2,10.5,14.8,18.4 --face 578,268,280,320 --fail-on warn
//
// Occlusion fixture: --ep occlusion-fail (must fail Q3).
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d = '') => {const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] ?? '') : d;};
const url = arg('url', 'http://127.0.0.1:5273/');
const outDir = path.resolve(arg('out', 'qa-stills'));
const ep = arg('ep');
const dsf = Number(arg('dsf', '1.5'));
const times = arg('times', '1.6,6.2,10.5,14.8,18.4').split(',').map(Number).filter(Number.isFinite);
const failOn = arg('fail-on', 'fail'); // fail | warn
const faceArg = arg('face', '');
const bandArg = arg('subtitle-band', '940,1080');
const edgePx = Number(arg('edge', '8'));
const overlapThresh = Number(arg('overlap', '0.12')); // fraction of face area

const [bandY0, bandY1] = bandArg.split(',').map(Number);
const parseFace = (s) => {
  if (!s) return null;
  const [x, y, w, h] = s.split(',').map(Number);
  return {x, y, w, h};
};

function intersectArea(a, b) {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

function panelFromDecl(p) {
  if (!p) return null;
  // Path: check each node bead (not the huge union bbox — labels sit above ground).
  if (p.kind === 'path' && Array.isArray(p.nodes)) {
    return p.nodes.map((n) => ({x: n.x - 22, y: n.y - 22, w: 44, h: 44, kind: 'path-node'}));
  }
  if (p.w != null) return [p];
  return null;
}

const home = homedir();
const candidates = [arg('playwright'), process.env.PLAYWRIGHT_PATH,
  path.join(process.cwd(), 'node_modules/playwright/index.mjs'),
  path.join(home, 'Desktop/zcode/ai-explain-game/game/node_modules/playwright/index.mjs')].filter(Boolean);
let chromium;
for (const c of candidates) {try {({chromium} = await import(pathToFileURL(c).href)); break;} catch {}}
if (!chromium) {try {({chromium} = await import('playwright'));} catch {}}
if (!chromium) {console.error('找不到 playwright'); process.exit(2);}

await mkdir(outDir, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1280, height: 720}, deviceScaleFactor: dsf});
const params = new URLSearchParams({t: '0', play: '0', rec: '1', subs: '1'});
if (ep) params.set('ep', ep);
await page.goto(`${url.replace(/\/$/, '')}/?${params}`, {waitUntil: 'load'});
await page.waitForFunction(() => window.__player && !document.querySelector('.loading'), null, {timeout: 60000});

const report = {times: [], fails: 0, warns: 0};
const faceOverride = parseFace(faceArg);

for (const s of times) {
  await page.evaluate((ms) => window.__player.set(ms), s * 1000);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const shot = s * 1000 < (await page.evaluate(() => window.__player.episode.cutMs)) ? 'big' : 'small';
  const info = await page.evaluate((shotName) => {
    const face = window.__player.facePreset?.(shotName) || {x: 578, y: 268, w: 280, h: 320};
    const panels = (window.__player.getQaPanels?.() || []).slice();
    const line = (window.__player.episode.lines || []).find((v) => window.__player.get() >= v.at && window.__player.get() < v.end);
    return {face, panels, hasCaption: !!line, title: window.__player.episode.title};
  }, shot);
  const face = faceOverride || info.face;
  const issues = [];
  for (const raw of info.panels) {
    const panels = panelFromDecl(raw);
    if (!panels) continue;
    for (const panel of panels) {
      const area = intersectArea(face, panel);
      const frac = area / (face.w * face.h);
      if (frac > overlapThresh) {
        issues.push({id: 'Q3', level: 'fail', msg: `face∩${panel.kind || 'panel'} overlap ${(frac * 100).toFixed(1)}%`});
      }
      if (panel.x < edgePx || panel.y < edgePx || panel.x + panel.w > 1920 - edgePx || panel.y + panel.h > 1080 - edgePx) {
        issues.push({id: 'Q2', level: 'warn', msg: `panel ${panel.kind} near canvas edge`});
      }
      if (panel.kind !== 'path-node' && panel.y + panel.h > bandY0) {
        issues.push({id: 'Q1', level: 'warn', msg: `panel ${panel.kind} enters subtitle band y≥${bandY0}`});
      }
    }
  }
  const file = path.join(outDir, `t-${String(s).replace('.', '_')}.png`);
  await page.locator('.frame').screenshot({path: file});
  const entry = {t: s, shot, face, panels: info.panels, issues, file};
  report.times.push(entry);
  for (const i of issues) {
    if (i.level === 'fail') report.fails++;
    else report.warns++;
    console.log(`${i.level.toUpperCase()} @${s}s [${i.id}] ${i.msg}`);
  }
  if (!issues.length) console.log(`ok @${s}s → ${file}`);
}

await writeFile(path.join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
await browser.close();

const hardFail = report.fails > 0 || (failOn === 'warn' && report.warns > 0);
console.log(`qa_stills: ${report.fails} fail, ${report.warns} warn → ${outDir}/qa-report.json`);
if (hardFail) process.exit(1);
