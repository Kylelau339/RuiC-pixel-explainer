// Deterministic world physics props for 科普 (science popularization).
// Time is a pure function: seek(ms) always yields the same positions / trails.
// No CDP, no shared mutable sim — integrate from t=0 with fixed substeps.

const DT = 1 / 120; // seconds per substep (fixed → byte-stable across seeks)
const TWO_PI = Math.PI * 2;

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
function lerp(a, b, k) {
  return a + (b - a) * k;
}
function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Soft-edged attractor (planet / mass). fillRect only — no gradients/strokes (byte-stable). */
export function drawAttractor(c, {x, y, r = 48, color = '#c9a24a', core = '#f0d98a', glow = true}) {
  const cx = Math.round(x),
    cy = Math.round(y);
  if (glow) {
    const gr = Math.floor(r * 1.85);
    for (let dy = -gr; dy <= gr; dy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, gr * gr - dy * dy)));
      if (half > 0) rect(c, cx - half, cy + dy, half * 2, 1, '#3a3420');
    }
  }
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    rect(c, cx - half, cy + dy, half * 2, 1, color);
  }
  const cr = Math.max(6, Math.floor(r * 0.35));
  for (let dy = -cr; dy <= cr; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, cr * cr - dy * dy)));
    rect(c, cx - half - 4, cy + dy - 6, half * 2, 1, core);
  }
}

/** Apple / test mass — readable at sandbox scale. */
export function drawMass(c, {x, y, r = 18, color = '#b84a3a', stem = true}) {
  const cx = Math.round(x),
    cy = Math.round(y);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    rect(c, cx - half, cy + dy, half * 2, 1, color);
  }
  rect(c, cx - 4, cy - 6, 5, 4, '#d97868');
  if (stem) {
    rect(c, cx - 1, cy - r - 8, 3, 10, '#3d4a32');
    rect(c, cx + 2, cy - r - 6, 8, 3, '#5a7a48');
  }
}

/**
 * Fading orbit / fall trail (oldest → newest). fillRect only for determinism.
 * Phase 4c polish: brighter color + thicker tip; avoid multi-layer alpha underlays
 * (those flake PNG bytes across repeated screenshots).
 */
export function drawTrail(c, points, {color = '#b6ecd8', width = 6, alpha = 1} = {}) {
  if (!points || points.length < 2) return;
  const base = Math.max(3, Math.round(width));
  c.save();
  for (let i = 0; i < points.length; i++) {
    const u = (i + 1) / points.length;
    // discrete alpha steps (avoid continuous float alpha flake)
    const aStep = Math.round(u * 8) / 8;
    const a = aStep * alpha;
    const w = 3 + Math.round(3 * u);
    c.globalAlpha = a;
    const p = points[i];
    rect(c, Math.round(p.x) - Math.floor(w / 2), Math.round(p.y) - Math.floor(w / 2), w, w, color);
    if (i > 0) {
      const p0 = points[i - 1];
      const x0 = Math.round(p0.x),
        y0 = Math.round(p0.y),
        x1 = Math.round(p.x),
        y1 = Math.round(p.y);
      const steps = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps);
        const y = Math.round(y0 + ((y1 - y0) * s) / steps);
        rect(c, x - 1, y - 1, Math.max(3, w - 1), Math.max(3, w - 1), color);
      }
    }
  }
  c.restore();
}

/** Pull ribbon toward attractor — thicker ticks + arrow (opaque rects, discrete alpha). */
export function drawPullRibbon(c, from, to, {alpha = 0.75, color = '#f0d98a'} = {}) {
  if (!from || !to) return;
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  c.save();
  const a = Math.round(alpha * 8) / 8;
  c.globalAlpha = a;
  for (let d = 28; d < len - 48; d += 16) {
    const x = from.x + ux * d,
      y = from.y + uy * d;
    rect(c, x - 3, y - 3, 8, 8, color);
  }
  const ax = to.x - ux * 56,
    ay = to.y - uy * 56;
  rect(c, ax - 5, ay - 5, 11, 11, color);
  rect(c, Math.round(ax - ux * 12 - uy * 9) - 2, Math.round(ay - uy * 12 + ux * 9) - 2, 7, 7, color);
  rect(c, Math.round(ax - ux * 12 + uy * 9) - 2, Math.round(ay - uy * 12 - ux * 9) - 2, 7, 7, color);
  c.restore();
}

/**
 * Deterministic camera: gentle punch-in / focus on active prop.
 * keyframes: [{atMs, zoom, x, y}] absolute local ms; ease between.
 */
export function sampleCamera(localMs, keyframes) {
  const easeCam = (x) => {
    const v = clamp(x, 0, 1);
    return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
  };
  // Pan-only camera (zoom locked to 1): fractional canvas scale flakes PNG bytes
  // across two screenshots of the same ms on Chromium. Punch-in simulated by
  // stronger focus offsets in keyframes instead.
  const snap = (_z, x, y) => ({
    zoom: 1,
    x: Math.round(x),
    y: Math.round(y),
  });
  const kfs = keyframes && keyframes.length
    ? keyframes
    : [
        {atMs: 0, zoom: 1, x: 960, y: 540},
        {atMs: 1800, zoom: 1.08, x: 960, y: 500},
        {atMs: 5000, zoom: 1.04, x: 960, y: 520},
      ];
  const t = Math.max(0, localMs);
  if (t <= kfs[0].atMs) return snap(kfs[0].zoom, kfs[0].x, kfs[0].y);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i],
      b = kfs[i + 1];
    if (t <= b.atMs) {
      const u = easeCam((t - a.atMs) / Math.max(1, b.atMs - a.atMs));
      return snap(lerp(a.zoom, b.zoom, u), lerp(a.x, b.x, u), lerp(a.y, b.y, u));
    }
  }
  const last = kfs[kfs.length - 1];
  return snap(last.zoom, last.x, last.y);
}

/** Default camera beats per pattern (local ms). */
export function defaultCameraForPattern(pattern) {
  switch (pattern) {
    case 'orbit-pull':
      return [
        {atMs: 0, zoom: 1, x: 960, y: 520},
        {atMs: 2200, zoom: 1.12, x: 1020, y: 480},
        {atMs: 4800, zoom: 1.06, x: 960, y: 500},
      ];
    case 'dual-world':
      return [
        {atMs: 0, zoom: 1, x: 960, y: 540},
        {atMs: 2500, zoom: 1.05, x: 960, y: 520},
      ];
    case 'collision-transfer':
      return [
        {atMs: 0, zoom: 1, x: 700, y: 560},
        {atMs: 2800, zoom: 1.14, x: 960, y: 560},
        {atMs: 4200, zoom: 1.08, x: 1200, y: 560},
      ];
    case 'field-lines':
      return [
        {atMs: 0, zoom: 1, x: 600, y: 400},
        {atMs: 3500, zoom: 1.1, x: 1000, y: 520},
        {atMs: 7000, zoom: 1.06, x: 1200, y: 620},
      ];
    case 'chain-reaction':
      return [
        {atMs: 0, zoom: 1.08, x: 400, y: 620},
        {atMs: 2000, zoom: 1.05, x: 960, y: 620},
        {atMs: 5500, zoom: 1.02, x: 1400, y: 620},
      ];
    case 'threshold-tip':
      return [
        {atMs: 0, zoom: 1.05, x: 900, y: 640},
        {atMs: 5000, zoom: 1.12, x: 920, y: 560},
        {atMs: 7500, zoom: 1.08, x: 1100, y: 600},
      ];
    case 'cycle-loop':
      return [
        {atMs: 0, zoom: 1, x: 960, y: 480},
        {atMs: 4000, zoom: 1.08, x: 960, y: 460},
      ];
    case 'ratio-mix':
      return [
        {atMs: 0, zoom: 1.04, x: 960, y: 500},
        {atMs: 3000, zoom: 1.1, x: 960, y: 560},
      ];
    case 'scale-ladder':
      return [
        {atMs: 0, zoom: 1.05, x: 500, y: 620},
        {atMs: 4500, zoom: 1.02, x: 960, y: 600},
        {atMs: 8000, zoom: 1.06, x: 1400, y: 580},
      ];
    case 'balance-scale':
      return [
        {atMs: 0, zoom: 1.06, x: 960, y: 480},
        {atMs: 3500, zoom: 1.12, x: 1100, y: 500},
        {atMs: 7500, zoom: 1.05, x: 960, y: 460},
      ];
    case 'flow-process':
      return [
        {atMs: 0, zoom: 1.08, x: 400, y: 500},
        {atMs: 3500, zoom: 1.05, x: 960, y: 500},
        {atMs: 7000, zoom: 1.08, x: 1500, y: 480},
      ];
    default:
      return [
        {atMs: 0, zoom: 1, x: 960, y: 540},
        {atMs: 2000, zoom: 1.06, x: 960, y: 520},
      ];
  }
}

/**
 * Integrate one particle under a mode.
 * modes:
 *   fall   — downward g only (everyday drop)
 *   coast  — no forces (straight inertial line)
 *   attract — pull toward attractor (can spiral / fall in)
 *   orbit  — attract + initial tangential speed tuned for near-circle
 */
export function stepParticle(p, attractor, mode, dt, opts = {}) {
  const g = opts.g ?? 980;
  const mu = opts.mu ?? 2.8e6; // gravitational parameter (px³/s²), tuned for sandbox
  const floorY = opts.floorY;
  let {x, y, vx, vy} = p;
  let ax = 0,
    ay = 0;

  if (mode === 'fall') {
    ay = g;
  } else if (mode === 'coast') {
    // nothing
  } else if (mode === 'attract' || mode === 'orbit') {
    const dx = attractor.x - x,
      dy = attractor.y - y;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.sqrt(dist2) || 1;
    const soft = Math.max(dist, attractor.r * 1.15);
    const a = mu / (soft * soft);
    ax = (dx / dist) * a;
    ay = (dy / dist) * a;
  }

  vx += ax * dt;
  vy += ay * dt;
  x += vx * dt;
  y += vy * dt;

  if (floorY != null && y + (opts.massR || 18) >= floorY && mode === 'fall') {
    y = floorY - (opts.massR || 18);
    vx *= 0.35;
    vy = 0;
  }

  // Soft bounce off attractor surface (prevent tunneling)
  if (mode === 'attract' || mode === 'orbit') {
    const dx = x - attractor.x,
      dy = y - attractor.y;
    const dist = Math.hypot(dx, dy) || 1;
    const minD = attractor.r + (opts.massR || 18) + 2;
    if (dist < minD) {
      const nx = dx / dist,
        ny = dy / dist;
      x = attractor.x + nx * minD;
      y = attractor.y + ny * minD;
      const vn = vx * nx + vy * ny;
      if (vn < 0) {
        vx -= 1.6 * vn * nx;
        vy -= 1.6 * vn * ny;
      }
    }
  }

  return {x, y, vx, vy};
}

function initialForMode(mode, attractor, seed = {}) {
  const R = seed.orbitR ?? attractor.r + 160;
  if (mode === 'orbit') {
    // Circular: v = sqrt(mu / R), tangential
    const mu = seed.mu ?? 2.8e6;
    const speed = Math.sqrt(mu / R);
    const ang = seed.angle ?? -Math.PI / 2; // start above
    return {
      x: attractor.x + Math.cos(ang) * R,
      y: attractor.y + Math.sin(ang) * R,
      vx: -Math.sin(ang) * speed,
      vy: Math.cos(ang) * speed,
    };
  }
  if (mode === 'attract') {
    return {
      x: seed.x ?? attractor.x - 220,
      y: seed.y ?? attractor.y - 260,
      vx: seed.vx ?? 210,
      vy: seed.vy ?? 40,
    };
  }
  if (mode === 'coast') {
    return {
      x: seed.x ?? attractor.x - 40,
      y: seed.y ?? attractor.y - 280,
      vx: seed.vx ?? 160,
      vy: seed.vy ?? 20,
    };
  }
  // fall
  return {
    x: seed.x ?? attractor.x,
    y: seed.y ?? attractor.y - 300,
    vx: seed.vx ?? 0,
    vy: seed.vy ?? 0,
  };
}

/**
 * Pure sample of one sandbox at absolute local time `localMs` (ms since world start).
 * Returns {particle, trail[], attractor}.
 */
export function sampleWorld(cfg, localMs) {
  const attractor = {
    x: cfg.attractor?.x ?? 960,
    y: cfg.attractor?.y ?? 520,
    r: cfg.attractor?.r ?? 52,
  };
  const mode = cfg.mode || 'orbit';
  const opts = {
    g: cfg.g ?? 980,
    mu: cfg.mu ?? 2.8e6,
    floorY: cfg.floorY,
    massR: cfg.massR ?? 18,
  };
  const seed = cfg.seed || {};
  let p = initialForMode(mode, attractor, {...seed, mu: opts.mu, orbitR: cfg.orbitR});
  const trail = [{x: p.x, y: p.y}];
  const tEnd = Math.max(0, localMs) / 1000;
  let t = 0;
  let trailAcc = 0;
  const trailEvery = cfg.trailEvery ?? 0.04; // seconds between trail samples
  const maxTrail = cfg.maxTrail ?? 90;

  while (t < tEnd - 1e-9) {
    const step = Math.min(DT, tEnd - t);
    p = stepParticle(p, attractor, mode, step, opts);
    t += step;
    trailAcc += step;
    if (trailAcc >= trailEvery) {
      trail.push({x: p.x, y: p.y});
      trailAcc = 0;
      if (trail.length > maxTrail) trail.shift();
    }
  }
  return {attractor, particle: p, trail, mode};
}

/** Lab backdrop: deep space / sandbox — not a talking-room wallpaper. */
export function drawLabBackdrop(c, {w = 1920, h = 1080, variant = 'space'} = {}) {
  if (variant === 'space') {
    rect(c, 0, 0, w, h, '#070b12');
    rect(c, 0, 0, w, h, '#0b1220');
    // sparse stars (deterministic grid hash)
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137 + 41) % 60) * 32 + 20;
      const sy = ((i * 89 + 17) % 34) * 31 + 18;
      const on = (i * 13) % 5 !== 0;
      if (on) rect(c, sx, sy, 3, 3, i % 3 === 0 ? '#d8c9a0' : '#6a7a88');
    }
    // edge darken without radial gradients (determinism)
    rect(c, 0, 0, w, 48, '#04060a');
    rect(c, 0, h - 48, w, 48, '#04060a');
    rect(c, 0, 0, 48, h, '#04060a');
    rect(c, w - 48, 0, 48, h, '#04060a');
  } else {
    rect(c, 0, 0, w, h, '#12160f');
    rect(c, 0, h - 120, w, 120, '#1a2218');
  }
}

function drawWorldPane(c, cfg, localMs, box, {showPull = true, label = ''} = {}) {
  const {x, y, w, h} = box;
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();

  // pane fill
  rect(c, x, y, w, h, '#0a1018');
  // stars inside pane
  for (let i = 0; i < 28; i++) {
    const sx = x + 12 + ((i * 97 + 11) % Math.max(1, w - 24));
    const sy = y + 12 + ((i * 53 + 7) % Math.max(1, h - 24));
    rect(c, sx, sy, 2, 2, '#5a6a78');
  }

  // remap attractor into pane local coords if cfg uses pane-local=false (absolute)
  const sampleCfg = {
    ...cfg,
    attractor: {
      x: cfg.attractor?.x ?? x + w / 2,
      y: cfg.attractor?.y ?? y + h / 2,
      r: cfg.attractor?.r ?? 44,
    },
    floorY: cfg.floorY != null ? cfg.floorY : modeFloor(cfg.mode, y, h),
  };
  const world = sampleWorld(sampleCfg, localMs);

  drawTrail(c, world.trail, {
    color: cfg.mode === 'fall' || cfg.mode === 'coast' ? '#a08060' : '#7eb8a4',
    width: 4,
    alpha: 0.95,
  });
  // Fall/coast: dim ghost mass at center (same world, no pull). Orbit/attract: full glow.
  if (cfg.mode === 'fall' || cfg.mode === 'coast') {
    c.save();
    c.globalAlpha = 0.35;
    drawAttractor(c, {
      x: world.attractor.x,
      y: world.attractor.y,
      r: world.attractor.r,
      color: '#5a6248',
      core: '#7a8460',
      glow: false,
    });
    c.restore();
  } else {
    drawAttractor(c, {
      x: world.attractor.x,
      y: world.attractor.y,
      r: world.attractor.r,
      color: cfg.attractorColor || '#c9a24a',
      core: '#f0d98a',
    });
  }
  if (showPull && (cfg.mode === 'attract' || cfg.mode === 'orbit')) {
    drawPullRibbon(c, world.particle, world.attractor, {alpha: 0.5});
  }
  drawMass(c, {
    x: world.particle.x,
    y: world.particle.y,
    r: cfg.massR ?? 16,
    color: cfg.massColor || '#b84a3a',
  });

  // thin pane frame (fillRect borders — no stroke AA)
  rect(c, x, y, w, 3, '#6a7a55');
  rect(c, x, y + h - 3, w, 3, '#6a7a55');
  rect(c, x, y, 3, h, '#6a7a55');
  rect(c, x + w - 3, y, 3, h, '#6a7a55');

  if (label) {
    c.font = '28px "Fusion Pixel Proportional", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillStyle = '#c8c4a8';
    c.fillText(label, x + w / 2, y + 14);
  }
  c.restore();
  return world;
}

function modeFloor(mode, y, h) {
  return mode === 'fall' ? y + h - 36 : null;
}

/**
 * Full-bleed single sandbox.
 */
export function drawFullWorld(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'space'});
  const box = opts.box || {x: 120, y: 80, w: 1680, h: 820};
  return drawWorldPane(c, cfg, localMs, box, {
    showPull: opts.showPull !== false,
    label: opts.label || '',
  });
}

/**
 * Dual-world split stage: left vs right animate simultaneously.
 * This is the 科普 compare — not text CompareCards.
 */
export function drawSplitWorld(c, leftCfg, rightCfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'space'});
  const gap = opts.gap ?? 28;
  const marginX = opts.marginX ?? 60;
  const marginY = opts.marginY ?? 70;
  const totalW = 1920 - marginX * 2 - gap;
  const paneW = Math.floor(totalW / 2);
  const paneH = opts.paneH ?? 820;
  const leftBox = {x: marginX, y: marginY, w: paneW, h: paneH};
  const rightBox = {x: marginX + paneW + gap, y: marginY, w: paneW, h: paneH};

  // remapped attractors centered in each pane
  const left = {
    ...leftCfg,
    attractor: {
      x: leftBox.x + leftBox.w / 2,
      y: leftBox.y + leftBox.h * 0.55,
      r: leftCfg.attractor?.r ?? 40,
    },
  };
  const right = {
    ...rightCfg,
    attractor: {
      x: rightBox.x + rightBox.w / 2,
      y: rightBox.y + rightBox.h * 0.55,
      r: rightCfg.attractor?.r ?? 40,
    },
  };

  const L = drawWorldPane(c, left, localMs, leftBox, {
    showPull: false,
    label: opts.leftLabel || '',
  });
  const R = drawWorldPane(c, right, localMs, rightBox, {
    showPull: true,
    label: opts.rightLabel || '',
  });

  // center divider tick (not a card)
  rect(c, 958, marginY + 40, 4, paneH - 80, '#3a4a38');

  return {left: L, right: R, leftBox, rightBox};
}

/** Convenience: build default gravity demo configs. */
export function gravityDemoConfigs() {
  return {
    fall: {mode: 'fall', massR: 16, g: 1100, seed: {x: null, y: null}},
    orbit: {mode: 'orbit', massR: 16, mu: 2.8e6, orbitR: 200},
    attract: {
      mode: 'attract',
      massR: 16,
      mu: 3.2e6,
      seed: {x: null, y: null, vx: 240, vy: 30},
    },
  };
}

/** Catalog ids — agents must pick one for 科普 / 原理 themes. */
export const KEXUE_PATTERNS = [
  'orbit-pull',
  'dual-world',
  'scale-ladder',
  'flow-process',
  'balance-scale',
  'collision-transfer',
  'cycle-loop',
  'threshold-tip',
  'field-lines',
  'ratio-mix',
  'chain-reaction',
];

function easeInOut(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function disc(c, x, y, r, color) {
  const cx = Math.round(x),
    cy = Math.round(y),
    rr = Math.max(2, Math.round(r));
  for (let dy = -rr; dy <= rr; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, rr * rr - dy * dy)));
    if (half > 0) rect(c, cx - half, cy + dy, half * 2, 1, color);
  }
}

/**
 * scale-ladder — orders of magnitude with moving props (not static icons).
 * cfg.rungs: [{label, targetR, color}] length 2–4
 * Mute: sizes grow on a ladder; a highlight climbs; relative scale is visible without text.
 */
export function drawScaleLadder(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const rungs = cfg.rungs || [
    {label: '小', targetR: 14, color: '#7eb8a4'},
    {label: '中', targetR: 42, color: '#c9a24a'},
    {label: '大', targetR: 110, color: '#b84a3a'},
  ];
  const n = rungs.length;
  const baseY = opts.baseY ?? 780;
  const left = opts.left ?? 280;
  const span = opts.span ?? 1360;
  // ladder rail
  rect(c, left - 40, baseY - 20, span + 80, 16, '#2a3228');
  rect(c, left - 40, 180, 16, baseY - 180, '#2a3228');
  rect(c, left + span + 24, 180, 16, baseY - 180, '#2a3228');

  const t = localMs / 1000;
  // reveal rungs one by one; each grows from tiny → target
  for (let i = 0; i < n; i++) {
    const appear = i * 2.2;
    const grow = easeInOut(clamp((t - appear) / 1.6, 0, 1));
    if (grow <= 0) continue;
    const x = left + (span * (i + 0.5)) / n;
    const r = lerp(4, rungs[i].targetR, grow);
    const y = baseY - r - 8;
    // rung tick
    rect(c, x - 3, baseY - 8, 6, 28, '#6a7a55');
    disc(c, x, y, r, rungs[i].color || '#c9a24a');
    if (grow > 0.85 && rungs[i].label) {
      c.font = '28px "Fusion Pixel Proportional", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillStyle = '#c8c4a8';
      c.fillText(rungs[i].label, Math.round(x), Math.round(y - r - 40));
    }
  }
  // climbing marker (shows “ladder” motion)
  const climbT = easeInOut(clamp((t - 0.4) / Math.max(1, n * 2.2), 0, 1));
  const mx = left + climbT * span;
  rect(c, mx - 10, 200, 20, 14, '#e0c46a');
  rect(c, mx - 3, 214, 6, baseY - 230, '#8a7a40');
  return {pattern: 'scale-ladder', climbT};
}

/**
 * flow-process — A→B→C transformation on stage (not StepBar text).
 * cfg.stations: [{label, color}] length 3
 * Mute: prop morphs and travels A→B→C; stations light as it arrives.
 */
export function drawFlowProcess(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const stations = cfg.stations || [
    {label: '固', color: '#8ab4c8'},
    {label: '液', color: '#4a8ac8'},
    {label: '气', color: '#c8c4a8'},
  ];
  const ys = opts.y ?? 520;
  const xs = [360, 960, 1560];
  const t = localMs / 1000;
  // pipes / conveyor
  rect(c, xs[0], ys + 40, xs[2] - xs[0], 10, '#3a4a38');
  for (let i = 0; i < 3; i++) {
    const lit = t > i * 3.2;
    disc(c, xs[i], ys, 54, lit ? stations[i].color : '#2a3228');
    disc(c, xs[i], ys, 28, lit ? '#0a1210' : '#1a2218');
    c.font = '28px "Fusion Pixel Proportional", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillStyle = lit ? '#e4d7a8' : '#5a6658';
    c.fillText(stations[i].label || '', xs[i], ys + 70);
  }
  // prop phase: 0 solid cube → 1 melt to blob → 2 rise as gas dots
  const phaseDur = 3.2;
  const phase = Math.min(2, Math.floor(t / phaseDur));
  const local = (t - phase * phaseDur) / phaseDur;
  const x = lerp(xs[Math.min(phase, 2)], xs[Math.min(phase + 1, 2)], easeInOut(clamp(local, 0, 1)));
  if (phase === 0) {
    const s = Math.round(lerp(48, 36, local));
    rect(c, x - s / 2, ys - s / 2 - 10, s, s, '#a8d0e0');
    rect(c, x - s / 2 + 6, ys - s / 2 - 4, s - 12, 8, '#d0e8f0');
  } else if (phase === 1) {
    const r = Math.round(lerp(22, 18, local));
    disc(c, x, ys - 8, r, '#4a8ac8');
    disc(c, x - 8, ys - 4, Math.max(6, r - 8), '#6aa8d8');
  } else {
    for (let i = 0; i < 7; i++) {
      const ox = ((i * 37) % 40) - 20;
      const rise = easeInOut(clamp(local, 0, 1)) * (80 + i * 12);
      disc(c, x + ox, ys - 10 - rise, 5 + (i % 3), '#c8c4a8');
    }
  }
  // forward chevrons (motion, not HUD soup)
  for (let i = 0; i < 2; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2;
    const on = t > (i + 0.5) * phaseDur;
    rect(c, cx - 8, ys + 28, 16, 6, on ? '#e0c46a' : '#3a4a38');
    rect(c, cx + 4, ys + 22, 10, 6, on ? '#e0c46a' : '#3a4a38');
  }
  return {pattern: 'flow-process', phase};
}

/**
 * balance-scale — tipping beam shows unequal / equal weights (force made visible).
 * cfg: {leftMass, rightMass} target weights; animate from 0.
 * Mute: beam tips toward heavier side; pans move; no talking needed.
 */
export function drawBalanceScale(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const t = localMs / 1000;
  const leftTarget = cfg.leftMass ?? 1;
  const rightTarget = cfg.rightMass ?? 2;
  // load-in animation
  const leftW = leftTarget * easeInOut(clamp(t / 2.2, 0, 1));
  const rightW = rightTarget * easeInOut(clamp((t - 1.2) / 2.2, 0, 1));
  const tip = clamp((rightW - leftW) / Math.max(0.01, leftTarget + rightTarget), -1, 1);
  const angle = tip * 0.32; // radians-ish visual
  const cx = 960,
    cy = 420;
  // fulcrum
  rect(c, cx - 18, cy, 36, 220, '#3a4a38');
  disc(c, cx, cy, 22, '#c9a24a');
  // beam (approximate rotation with offset pans)
  const half = 420;
  const lx = cx - Math.cos(angle) * half,
    ly = cy - Math.sin(angle) * half;
  const rx = cx + Math.cos(angle) * half,
    ry = cy + Math.sin(angle) * half;
  // beam body as thick stepped rects
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = Math.round(lerp(lx, rx, k));
    const y = Math.round(lerp(ly, ry, k));
    rect(c, x - 8, y - 6, 16, 12, '#8a7a40');
  }
  // pans + masses
  const pan = (px, py, w, color) => {
    rect(c, px - 70, py + 8, 140, 14, '#5a6658');
    rect(c, px - 4, py - 40, 8, 50, '#5a6658');
    if (w > 0.05) {
      const r = 12 + w * 18;
      disc(c, px, py + 8 + r, r, color);
    }
  };
  pan(lx, ly, leftW, '#7eb8a4');
  pan(rx, ry, rightW, '#b84a3a');
  // equality flash when balanced (both loaded and tip~0)
  if (Math.abs(leftTarget - rightTarget) < 0.05 && t > 4) {
    rect(c, cx - 40, cy - 80, 80, 12, '#e0c46a');
  }
  return {pattern: 'balance-scale', tip, leftW, rightW};
}

/**
 * collision-transfer — momentum / bounce exchange (mute: A hits B, speed swaps visibly).
 * cfg: {speedA, speedB} relative; floor y implicit.
 */
export function drawCollisionTransfer(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const t = localMs / 1000;
  const y = opts.y ?? 620;
  rect(c, 200, y + 40, 1520, 14, '#2a3228'); // floor
  const rA = cfg.rA ?? 36,
    rB = cfg.rB ?? 36;
  const x0A = 320,
    x0B = 1280;
  const meet = 960;
  const hitT = cfg.hitAt ?? 3.2;
  const vIn = (meet - x0A - rA) / hitT;
  let xA, xB, vA, vB;
  if (t < hitT) {
    xA = x0A + vIn * t;
    xB = x0B;
    vA = vIn;
    vB = 0;
  } else {
    // equal mass elastic: velocities swap
    const dt = t - hitT;
    xA = meet - rA + 0 * dt; // A stops (approx after swap with resting B)
    xB = meet + rB + vIn * dt;
    vA = 0;
    vB = vIn;
    // soft clamp so A doesn't drift
    xA = meet - rA;
  }
  disc(c, xA, y, rA, '#7eb8a4');
  disc(c, xB, y, rB, '#b84a3a');
  // speed ticks under each (diegetic motion readout)
  const tick = (x, v, color) => {
    const n = Math.max(0, Math.min(8, Math.round(Math.abs(v) / 40)));
    for (let i = 0; i < n; i++) rect(c, x - 40 + i * 12, y + 56, 8, 6, color);
  };
  tick(xA, vA, '#7eb8a4');
  tick(xB, vB, '#b84a3a');
  if (t >= hitT && t < hitT + 0.45) {
    // impact flash
    rect(c, meet - 8, y - 50, 16, 100, '#e0c46a');
  }
  return {pattern: 'collision-transfer', xA, xB, hit: t >= hitT};
}

/**
 * cycle-loop — closed cycle stages around a ring (not StepBar).
 * cfg.nodes: [{label, color}] length 3–5
 */
export function drawCycleLoop(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const nodes = cfg.nodes || [
    {label: '蒸', color: '#8ab4c8'},
    {label: '凝', color: '#4a8ac8'},
    {label: '流', color: '#7eb8a4'},
    {label: '升', color: '#c9a24a'},
  ];
  const n = nodes.length;
  const cx = 960,
    cy = 480,
    R = 260;
  const t = localMs / 1000;
  // ring track
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2;
    rect(c, cx + Math.cos(ang) * R - 3, cy + Math.sin(ang) * R - 3, 6, 6, '#2a3228');
  }
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const x = cx + Math.cos(ang) * R;
    const y = cy + Math.sin(ang) * R;
    const lit = (Math.floor(t / 2.2) % n) === i || t > i * 2.2;
    disc(c, x, y, 48, lit ? nodes[i].color : '#2a3228');
    disc(c, x, y, 22, '#0a1210');
    c.font = '28px "Fusion Pixel Proportional", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = lit ? '#e4d7a8' : '#5a6658';
    c.fillText(nodes[i].label || '', Math.round(x), Math.round(y));
  }
  // circulating packet
  const prog = (t / 2.2) % n;
  const i0 = Math.floor(prog);
  const f = prog - i0;
  const a0 = -Math.PI / 2 + (i0 / n) * Math.PI * 2;
  const a1 = -Math.PI / 2 + (((i0 + 1) % n) / n) * Math.PI * 2;
  // shortest forward arc
  let da = a1 - a0;
  if (da < 0) da += Math.PI * 2;
  const ang = a0 + da * easeInOut(f);
  const px = cx + Math.cos(ang) * R;
  const py = cy + Math.sin(ang) * R;
  disc(c, px, py, 18, '#e0c46a');
  return {pattern: 'cycle-loop', prog};
}

/**
 * threshold-tip — pile until tip/collapse visibly triggers.
 * cfg: {capacity, rate} blocks pile then tip.
 */
export function drawThresholdTip(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const t = localMs / 1000;
  const capacity = cfg.capacity ?? 8;
  const rate = cfg.rate ?? 1.15; // blocks per second
  const piled = Math.min(capacity, Math.floor(t * rate));
  const tipped = t * rate >= capacity + 0.35;
  const baseX = 820,
    baseY = 780;
  rect(c, 600, baseY, 720, 18, '#2a3228');
  // platform that tips
  const tipAng = tipped ? easeInOut(clamp((t * rate - capacity) / 1.4, 0, 1)) * 0.55 : 0;
  const blocks = tipped ? Math.max(0, capacity - Math.floor((t * rate - capacity) * 3)) : piled;
  for (let i = 0; i < blocks; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = baseX + col * 70 + tipAng * row * 40;
    const by = baseY - 28 - row * 52 + tipAng * col * 30;
    rect(c, bx, by, 64, 48, i % 3 === 0 ? '#c9a24a' : '#7eb8a4');
    rect(c, bx + 6, by + 6, 20, 8, '#e0c46a');
  }
  // falling debris after tip
  if (tipped) {
    const fallT = t * rate - capacity;
    for (let i = 0; i < 5; i++) {
      const fx = 1100 + i * 50 + fallT * (40 + i * 20);
      const fy = baseY - 200 + fallT * fallT * 80 + i * 15;
      rect(c, fx, Math.min(baseY - 20, fy), 40, 32, '#b84a3a');
    }
  }
  // threshold mark on wall
  rect(c, 760, baseY - 28 - Math.ceil(capacity / 2) * 52, 12, 8, '#e0c46a');
  return {pattern: 'threshold-tip', piled, tipped};
}

/**
 * field-lines — directional field bends a test particle.
 * cfg: {strength} ; arrows + particle curve.
 */
export function drawFieldLines(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'space'});
  const t = localMs / 1000;
  const strength = cfg.strength ?? 1;
  // field arrows (grid)
  for (let gy = 0; gy < 6; gy++) {
    for (let gx = 0; gx < 10; gx++) {
      const x = 220 + gx * 150;
      const y = 220 + gy * 110;
      // field points right-downish
      const len = 28 + strength * 10;
      rect(c, x, y, len, 4, '#3a5a48');
      rect(c, x + len - 6, y - 6, 10, 4, '#3a5a48');
      rect(c, x + len - 6, y + 6, 10, 4, '#3a5a48');
    }
  }
  // test particle: integrates simple constant field → parabolic-ish path from pure function
  const x0 = 280,
    y0 = 240;
  const vx = 180,
    ay = 90 * strength;
  const x = x0 + vx * t;
  const y = y0 + 0.5 * ay * t * t;
  // trail samples
  const trail = [];
  for (let s = 0; s <= Math.min(t, 8); s += 0.08) {
    trail.push({x: x0 + vx * s, y: y0 + 0.5 * ay * s * s});
  }
  drawTrail(c, trail, {color: '#7eb8a4', width: 4, alpha: 0.9});
  disc(c, x, y, 20, '#e0c46a');
  // source badge
  disc(c, 200, 200, 36, '#c9a24a');
  return {pattern: 'field-lines', x, y};
}

/**
 * ratio-mix — two ingredients mix; diegetic proportion bars ARE the props.
 * cfg: {left, right} target fractions 0–1 that animate in.
 */
export function drawRatioMix(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const t = localMs / 1000;
  const leftT = cfg.left ?? 0.35;
  const rightT = cfg.right ?? 0.65;
  const left = leftT * easeInOut(clamp(t / 2.5, 0, 1));
  const right = rightT * easeInOut(clamp((t - 0.8) / 2.5, 0, 1));
  const bowlX = 960,
    bowlY = 560,
    bowlW = 520,
    bowlH = 280;
  // bowl outline
  rect(c, bowlX - bowlW / 2, bowlY - bowlH / 2, bowlW, bowlH, '#1a2218');
  rect(c, bowlX - bowlW / 2, bowlY - bowlH / 2, bowlW, 10, '#6a7a55');
  rect(c, bowlX - bowlW / 2, bowlY + bowlH / 2 - 10, bowlW, 10, '#6a7a55');
  rect(c, bowlX - bowlW / 2, bowlY - bowlH / 2, 10, bowlH, '#6a7a55');
  rect(c, bowlX + bowlW / 2 - 10, bowlY - bowlH / 2, 10, bowlH, '#6a7a55');
  const innerW = bowlW - 40,
    innerH = bowlH - 40;
  const leftW = Math.round(innerW * left);
  const rightW = Math.round(innerW * right);
  // stacked / side mix fill
  rect(c, bowlX - innerW / 2, bowlY + innerH / 2 - Math.round(innerH * 0.7), leftW, Math.round(innerH * 0.7), '#7eb8a4');
  rect(c, bowlX - innerW / 2 + leftW, bowlY + innerH / 2 - Math.round(innerH * 0.7), rightW, Math.round(innerH * 0.7), '#b84a3a');
  // pour streams
  if (t < 3.5) {
    rect(c, 520, 200, 18, 200, '#7eb8a4');
    disc(c, 529, 200, 22, '#7eb8a4');
  }
  if (t > 0.8 && t < 4.3) {
    rect(c, 1380, 200, 18, 200, '#b84a3a');
    disc(c, 1389, 200, 22, '#b84a3a');
  }
  // diegetic ratio ticks on bowl lip (not HUD)
  const total = Math.max(0.001, left + right);
  const pctL = Math.round((left / total) * 10);
  for (let i = 0; i < 10; i++) {
    rect(c, bowlX - 100 + i * 22, bowlY - bowlH / 2 - 28, 16, 12, i < pctL ? '#7eb8a4' : '#b84a3a');
  }
  return {pattern: 'ratio-mix', left, right};
}

/**
 * chain-reaction — domino / linked triggers fall in sequence.
 * cfg: {count}
 */
export function drawChainReaction(c, cfg, localMs, opts = {}) {
  drawLabBackdrop(c, {variant: opts.backdrop || 'bench'});
  const t = localMs / 1000;
  const count = cfg.count ?? 9;
  const baseY = 700;
  const left = 280;
  const gap = 150;
  rect(c, 200, baseY + 40, 1520, 14, '#2a3228');
  for (let i = 0; i < count; i++) {
    const fallAt = 0.8 + i * 0.55;
    const falling = t >= fallAt;
    const k = falling ? easeInOut(clamp((t - fallAt) / 0.4, 0, 1)) : 0;
    const x = left + i * gap;
    // upright → tip right
    const lean = k * 70;
    const yShrink = k * 20;
    rect(c, x + lean, baseY - 120 + yShrink, 28, 120 - yShrink, i % 2 ? '#c9a24a' : '#7eb8a4');
    if (falling && k > 0.2 && k < 0.85) {
      rect(c, x + 40, baseY - 40, 20, 8, '#e0c46a'); // spark between
    }
  }
  // striker
  const sx = 200 + Math.min(80, t * 100);
  disc(c, sx, baseY - 40, 24, '#e0c46a');
  return {pattern: 'chain-reaction', count};
}

/**
 * Dispatch by pattern id. orbit-pull / dual-world reuse gravity drawers.
 * cfg mirrors world event params; localMs is time since world.at.
 */
export function drawKexuePattern(c, pattern, worldState, localMs) {
  const p = pattern || 'orbit-pull';
  const bd = worldState.backdrop || 'bench';
  const table = {
    'scale-ladder': () => drawScaleLadder(c, worldState.scale || worldState.full || {}, localMs, {backdrop: bd}),
    'flow-process': () => drawFlowProcess(c, worldState.flow || worldState.full || {}, localMs, {backdrop: bd}),
    'balance-scale': () => drawBalanceScale(c, worldState.balance || worldState.full || {}, localMs, {backdrop: bd}),
    'collision-transfer': () =>
      drawCollisionTransfer(c, worldState.collision || worldState.full || {}, localMs, {backdrop: bd}),
    'cycle-loop': () => drawCycleLoop(c, worldState.cycle || worldState.full || {}, localMs, {backdrop: bd}),
    'threshold-tip': () => drawThresholdTip(c, worldState.threshold || worldState.full || {}, localMs, {backdrop: bd}),
    'field-lines': () => drawFieldLines(c, worldState.field || worldState.full || {}, localMs, {backdrop: worldState.backdrop || 'space'}),
    'ratio-mix': () => drawRatioMix(c, worldState.ratio || worldState.full || {}, localMs, {backdrop: bd}),
    'chain-reaction': () => drawChainReaction(c, worldState.chain || worldState.full || {}, localMs, {backdrop: bd}),
  };
  if (table[p]) return table[p]();
  // dual-world or orbit-pull with split layout
  if (p === 'dual-world' || worldState.layout === 'split') {
    return drawSplitWorld(c, worldState.left || {mode: 'fall'}, worldState.right || {mode: 'orbit'}, localMs, {
      leftLabel: worldState.leftLabel || '',
      rightLabel: worldState.rightLabel || '',
    });
  }
  // orbit-pull full (default)
  return drawFullWorld(c, worldState.full || {mode: 'orbit'}, localMs, {
    label: worldState.fullLabel || '',
    showPull: worldState.showPull !== false,
  });
}

export const WORLD_GLYPHS =
  '落下环绕向心引力无有轨道实验台固液气大小天平轻重阶梯流程相变数量级平衡碰撞动量循环阈值场力混合比例多米诺连锁扩散蒸凝流升';
