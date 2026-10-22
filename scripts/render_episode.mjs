// 像素游戏讲解片 · 逐帧导出成片
//
// 原理：画面是时间 t 的纯函数；定点截图 → ffmpeg。Phase 3 可用多 Chromium **进程**分帧段并行截取，
//       再按全局帧序 stitch（同 browser 多 page 更慢，禁止）。
//
// 用法：
//   node render_episode.mjs --url http://127.0.0.1:8778/ --out <成片.mp4>
//        [--ep practice] [--from 0] [--to 0] [--fps 30] [--dsf 1.5] [--size 1920x1080]
//        [--audio <口播.m4a>] [--crf 16] [--verify-repeat 5] [--preset draft|final]
//        [--workers 1..4] [--playwright <路径>]
//
// 说明：
//   · --preset draft|final：日常迭代用 draft；交付用 final（自检不可跳过）。
//   · --workers N：N 个独立 Chromium 进程分帧段；--workers 1 即回滚到单进程语义。
//   · --from / --to（秒）只渲区间。
//   · PNG 路径禁止 CDP optimizeForSpeed（破坏 alpha / 字节合同）。
//   · 有音轨时按画面长度补齐静音（不用 -shortest）。
import {spawn} from 'node:child_process';
import {stat, mkdir, rm, readdir, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {homedir, cpus, tmpdir} from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d = '') => {const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] ?? '') : d;};
const has = (n) => argv.includes(`--${n}`);
if (has('optimize-for-speed')) {
  console.error('PNG/alpha：禁止 --optimize-for-speed（会破坏 alpha 与字节自检）。opaque draft 亦不在本脚本开启。');
  process.exit(2);
}

const url = arg('url', 'http://127.0.0.1:5273/');
let out = path.resolve(arg('out', 'episode.mp4'));
const ep = arg('ep') || (() => {
  try {return new URL(url.includes('://') ? url : `http://127.0.0.1${url}`).searchParams.get('ep') || '';}
  catch {return '';}
})();
const presetRaw = arg('preset', '');
const preset = presetRaw === 'draft' || presetRaw === 'final' ? presetRaw : '';
if (presetRaw && !preset) throw new Error('--preset must be draft or final');

const fps = Number(arg('fps', preset === 'draft' ? '15' : '30'));
const dsf = Number(arg('dsf', '1.5'));
const threads = Number(arg('threads', '2'));
if (!Number.isInteger(threads) || threads < 1 || threads > 4) throw new Error('--threads must be an integer from 1 to 4');
const size = arg('size', '1920x1080');
const audio = arg('audio');
const crf = arg('crf', preset === 'draft' ? '23' : '16');
const from = Number(arg('from', '0'));
const to = Number(arg('to', '0'));
const x264Preset = arg('x264-preset', preset === 'draft' ? 'veryfast' : 'medium');
const verifyDefault = preset === 'draft' ? '1' : '5';
const verifyRepeat = has('verify-repeat') ? Number(arg('verify-repeat', verifyDefault)) : Number(verifyDefault);

// Parallel workers: draft/final default 2; bare invoke stays 1 (Phase-1-compatible rollback).
const cpuN = Math.max(1, cpus()?.length || 1);
const workersDefault = preset ? String(Math.min(2, cpuN)) : '1';
let workers = Number(arg('workers', workersDefault));
if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new Error('--workers must be an integer from 1 to 4');
workers = Math.min(workers, cpuN, 4);

if (preset) {
  const dir = path.dirname(out);
  const base = path.basename(out, path.extname(out));
  const ext = path.extname(out) || '.mp4';
  if (!base.endsWith(`.${preset}`) && !base.includes(`.${preset}.`)) {
    out = path.join(dir, `${base}.${preset}${ext}`);
  }
  console.log(`[preset=${preset}] out=${out} fps=${fps} crf=${crf} x264=${x264Preset} verify-repeat=${verifyRepeat} workers=${workers}`);
} else {
  console.log(`[workers=${workers}] out=${out} fps=${fps}`);
}

const home = homedir();
const candidates = [arg('playwright'), process.env.PLAYWRIGHT_PATH,
  path.join(process.cwd(), 'node_modules/playwright/index.mjs'),
  path.join(home, 'Desktop/zcode/ai-explain-game/game/node_modules/playwright/index.mjs')].filter(Boolean);
let chromium;
for (const c of candidates) {try {({chromium} = await import(pathToFileURL(c).href)); break;} catch {}}
if (!chromium) {try {({chromium} = await import('playwright'));} catch {}}
if (!chromium) {
  console.error('找不到 playwright：在游戏工程目录里跑本脚本，或用 --playwright <playwright/index.mjs> 指定。');
  process.exit(2);
}
await mkdir(path.dirname(out), {recursive: true});

const selfDir = path.dirname(fileURLToPath(import.meta.url));
const segmentScript = path.join(selfDir, 'render_segment.mjs');

function splitRanges(startFrame, endFrame, n) {
  const total = endFrame - startFrame;
  const ranges = [];
  const k = Math.min(n, total);
  for (let i = 0; i < k; i++) {
    const a = startFrame + Math.floor((total * i) / k);
    const b = startFrame + Math.floor((total * (i + 1)) / k);
    if (a < b) ranges.push([a, b]);
  }
  return ranges;
}

function buildPageUrl(extra = {}) {
  // Merge --url (may already have ?ep=) with --ep and capture flags; never nest "?…/?…"
  const base = url.includes('://') ? url : `http://127.0.0.1${url.startsWith('/') ? '' : '/'}${url}`;
  const u = new URL(base);
  if (!u.pathname || u.pathname === '') u.pathname = '/';
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, String(v));
  if (ep) u.searchParams.set('ep', ep);
  return u.toString();
}

async function openProbePage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1280, height: 720}, deviceScaleFactor: dsf});
  await page.goto(buildPageUrl({t: String(Math.round(from * 1000)), play: '0', rec: '1', subs: '1'}), {waitUntil: 'load'});
  await page.waitForFunction(() => window.__player && !document.querySelector('.loading'), null, {timeout: 60000});
  return {browser, page};
}

const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
const shootOn = async (page, frame) => {
  await page.evaluate((ms) => window.__player.set(ms), (frame / fps) * 1000);
  await settle(page);
  if (await page.evaluate(() => document.fonts.status === 'loading')) {
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate((ms) => window.__player.set(ms + 0.001), (frame / fps) * 1000);
    await settle(page);
    await page.evaluate((ms) => window.__player.set(ms), (frame / fps) * 1000);
    await settle(page);
  }
  return page.locator('.frame').screenshot({type: 'png'});
};

const {browser, page} = await openProbePage();
const total = await page.evaluate(() => window.__player.total);
const startFrame = Math.round(from * fps);
const endFrame = to > 0 ? Math.round(to * fps) : Math.floor((total / 1000) * fps);
const frameCount = Math.max(0, endFrame - startFrame);
if (frameCount === 0) {console.error('帧数为 0：检查 --from / --to'); await browser.close(); process.exit(2);}
console.log(`导出 ${frameCount} 帧（${(frameCount / fps).toFixed(1)}s @${fps}fps，${size}，workers=${workers}）→ ${out}`);

// Determinism self-check on the probe page (same contract as Phase 1 final).
if (verifyRepeat > 0) {
  const picks = Array.from({length: Math.min(verifyRepeat, frameCount)}, (_, i) => startFrame + Math.floor(((i + 0.5) * frameCount) / Math.min(verifyRepeat, frameCount)));
  let worst = 0;
  for (const f of picks) {
    const a = createHash('sha256').update(await shootOn(page, f)).digest('hex');
    const b = createHash('sha256').update(await shootOn(page, f)).digest('hex');
    if (a !== b) worst++;
  }
  if (worst > 0) {await browser.close(); throw new Error(`Deterministic rendering failed on ${worst} sampled frames; fix wall-clock/CSS animations before exporting`);}
  console.log(`确定性自检通过（${picks.length} 帧各截两次，字节一致）`);
}

const probeSize = await page.evaluate(() => {
  const el = document.querySelector('.frame');
  return el ? {w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height} : null;
});
const shotW = Math.round((probeSize?.w ?? 1280) * dsf), shotH = Math.round((probeSize?.h ?? 720) * dsf);
const [wantW, wantH] = size.split('x').map(Number);

function buildFfmpegArgs(inputKind) {
  // inputKind: 'pipe' | {framesDir, startNumber}
  const args = ['-hide_banner', '-loglevel', 'error'];
  if (inputKind === 'pipe') {
    args.push('-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps), '-i', '-');
  } else {
    args.push('-framerate', String(fps), '-start_number', String(inputKind.startNumber),
      '-i', path.join(inputKind.framesDir, 'frame-%06d.png'), '-frames:v', String(frameCount));
  }
  if (audio) args.push('-i', audio);
  args.push('-c:v', 'libx264', '-threads', String(threads), '-preset', x264Preset, '-crf', crf, '-pix_fmt', 'yuv420p');
  if (wantW !== shotW || wantH !== shotH) args.push('-vf', `scale=${wantW}:${wantH}:flags=neighbor`);
  if (audio) args.push('-af', 'apad', '-c:a', 'aac', '-b:a', '192k', '-t', (frameCount / fps).toFixed(3));
  args.push('-movflags', '+faststart', '-y', out);
  return args;
}

const t0 = Date.now();
let captureMs = 0;
let encodeMs = 0;

if (workers === 1) {
  // Phase-1 rollback path: single process, image2pipe (no disk spool).
  const ff = spawn('ffmpeg', buildFfmpegArgs('pipe'));
  let failed = null;
  ff.on('error', (e) => {failed = e;});
  ff.stderr.on('data', (d) => process.stderr.write(d));
  const write = (buf) => new Promise((resolve) => {
    if (!ff.stdin.write(buf)) ff.stdin.once('drain', resolve); else resolve();
  });
  for (let i = 0; i < frameCount; i++) {
    if (failed) break;
    await write(await shootOn(page, startFrame + i));
    if ((i + 1) % fps === 0) {
      const done = i + 1;
      const eta = (Date.now() - t0) / done * (frameCount - done) / 1000;
      console.log(`${done}/${frameCount} 帧（${(done / fps).toFixed(1)}s）｜剩余约 ${eta.toFixed(0)}s`);
    }
  }
  captureMs = Date.now() - t0;
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  await browser.close();
  if (failed) throw failed;
  if (code !== 0) {console.error(`ffmpeg 退出码 ${code}`); process.exit(1);}
  encodeMs = Date.now() - t0 - captureMs;
} else {
  await browser.close();
  const workRoot = path.join(tmpdir(), `ruic-render-${process.pid}-${Date.now()}`);
  await mkdir(workRoot, {recursive: true});
  const ranges = splitRanges(startFrame, endFrame, workers);
  console.log(`并行截帧：${ranges.length} 个 Chromium 进程 → ${workRoot}`);
  const kids = ranges.map(([a, b], i) => {
    const segDir = path.join(workRoot, `w${i}`);
    // Pass a clean origin URL; workers re-apply --ep via their own buildPageUrl.
    const origin = (() => {try {const u = new URL(url.includes('://') ? url : `http://127.0.0.1${url}`); return `${u.origin}/`;} catch {return url;}})();
    const wargs = [segmentScript, '--url', origin, '--out-dir', segDir,
      '--from-frame', String(a), '--to-frame', String(b),
      '--fps', String(fps), '--dsf', String(dsf), '--worker-id', String(i)];
    const epForWorker = ep || (() => {try {return new URL(url.includes('://') ? url : `http://127.0.0.1${url}`).searchParams.get('ep');} catch {return '';}})();
    if (epForWorker) wargs.push('--ep', epForWorker);
    if (arg('playwright')) wargs.push('--playwright', arg('playwright'));
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, wargs, {stdio: ['ignore', 'pipe', 'pipe']});
      let err = '';
      child.stdout.on('data', (d) => process.stdout.write(d));
      child.stderr.on('data', (d) => {err += d; process.stderr.write(d);});
      child.on('error', reject);
      child.on('close', (code) => code === 0 ? resolve(segDir) : reject(new Error(`worker ${i} exit ${code}: ${err}`)));
    });
  });
  await Promise.all(kids);
  const framesDir = path.join(workRoot, 'frames');
  await mkdir(framesDir, {recursive: true});
  for (let i = 0; i < ranges.length; i++) {
    const segDir = path.join(workRoot, `w${i}`);
    for (const f of (await readdir(segDir)).filter((n) => n.startsWith('frame-'))) {
      await copyFile(path.join(segDir, f), path.join(framesDir, f));
    }
  }
  for (let f = startFrame; f < endFrame; f++) {
    const name = `frame-${String(f).padStart(6, '0')}.png`;
    try {await stat(path.join(framesDir, name));}
    catch {throw new Error(`missing frame after merge: ${name}`);}
  }
  captureMs = Date.now() - t0;
  console.log(`截帧墙钟 ${(captureMs / 1000).toFixed(1)}s（${(captureMs / frameCount).toFixed(0)} ms/帧，workers=${workers}）`);

  const tEncode = Date.now();
  const ff = spawn('ffmpeg', buildFfmpegArgs({framesDir, startNumber: startFrame}));
  let failed = null;
  ff.on('error', (e) => {failed = e;});
  ff.stderr.on('data', (d) => process.stderr.write(d));
  const code = await new Promise((r) => ff.on('close', r));
  if (failed) throw failed;
  if (code !== 0) {console.error(`ffmpeg 退出码 ${code}`); process.exit(1);}
  encodeMs = Date.now() - tEncode;
  try {await rm(workRoot, {recursive: true, force: true});} catch {}
}

const wallMs = Date.now() - t0;
const miB = await stat(out).then((s) => (s.size / 1024 ** 2).toFixed(1));
console.log(`${miB} MiB → ${out}`);
console.log(`计时 capture≈${(captureMs / 1000).toFixed(1)}s encode≈${(encodeMs / 1000).toFixed(1)}s wall=${(wallMs / 1000).toFixed(1)}s workers=${workers}`);
