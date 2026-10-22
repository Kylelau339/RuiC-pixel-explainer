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

export const WORLD_GLYPHS = '落下环绕向心引力无有轨道实验台';
