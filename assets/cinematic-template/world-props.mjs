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

/** Fading orbit / fall trail (oldest → newest). fillRect only for determinism. */
export function drawTrail(c, points, {color = '#7eb8a4', width = 4, alpha = 1} = {}) {
  if (!points || points.length < 2) return;
  const w = Math.max(2, Math.round(width));
  c.save();
  for (let i = 0; i < points.length; i++) {
    const a = ((i + 1) / points.length) * alpha;
    c.globalAlpha = a;
    const p = points[i];
    rect(c, Math.round(p.x) - Math.floor(w / 2), Math.round(p.y) - Math.floor(w / 2), w, w, color);
    if (i > 0) {
      // Bresenham-ish coarse segment with rects (no stroke AA)
      const p0 = points[i - 1];
      const x0 = Math.round(p0.x),
        y0 = Math.round(p0.y),
        x1 = Math.round(p.x),
        y1 = Math.round(p.y);
      const steps = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / steps);
        const y = Math.round(y0 + ((y1 - y0) * s) / steps);
        rect(c, x - 1, y - 1, 3, 3, color);
      }
    }
  }
  c.restore();
}

/** Subtle pull ribbon from mass toward attractor (show the force). */
export function drawPullRibbon(c, from, to, {alpha = 0.55, color = '#e0c46a'} = {}) {
  if (!from || !to) return;
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  c.save();
  c.globalAlpha = alpha;
  // dashed pull ticks
  for (let d = 28; d < len - 40; d += 22) {
    const x = from.x + ux * d,
      y = from.y + uy * d;
    rect(c, x - 2, y - 2, 5, 5, color);
  }
  // arrow head near attractor
  const ax = to.x - ux * 56,
    ay = to.y - uy * 56;
  rect(c, ax - 3, ay - 3, 7, 7, color);
  c.restore();
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
 * Dispatch by pattern id. orbit-pull / dual-world reuse gravity drawers.
 * cfg mirrors world event params; localMs is time since world.at.
 */
export function drawKexuePattern(c, pattern, worldState, localMs) {
  const p = pattern || 'orbit-pull';
  if (p === 'scale-ladder') {
    return drawScaleLadder(c, worldState.scale || worldState.full || {}, localMs, {
      backdrop: worldState.backdrop || 'bench',
    });
  }
  if (p === 'flow-process') {
    return drawFlowProcess(c, worldState.flow || worldState.full || {}, localMs, {
      backdrop: worldState.backdrop || 'bench',
    });
  }
  if (p === 'balance-scale') {
    return drawBalanceScale(c, worldState.balance || worldState.full || {}, localMs, {
      backdrop: worldState.backdrop || 'bench',
    });
  }
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
  '落下环绕向心引力无有轨道实验台固液气大小天平轻重阶梯流程相变数量级平衡';
