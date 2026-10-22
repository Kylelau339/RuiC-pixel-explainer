// Selectable coarse-pixel scene presets for episode.sceneId / episode.scenes.
// Keep flat fills, sparse micro-texture, and 2–3 landmark props per place.

export const SCENE_IDS = [
  'workshop',
  'archive',
  'study',
  'nightstreet',
  'terminal',
  'moonatelier',
];

export const SCENE_META = {
  workshop: {
    label: {zh: '钟表修理铺', en: 'Clock workshop', ja: '時計工房'},
    mood: 'warm desk lamp · tools · chair',
    pairsWith: 'crafts / practice / repair metaphors',
  },
  archive: {
    label: {zh: '记忆廊道', en: 'Memory hall', ja: '記憶の回廊'},
    mood: 'locked door · book path · retrieval',
    pairsWith: 'memory / unlock / travel metaphors',
  },
  study: {
    label: {zh: '书房', en: 'Study', ja: '書斎'},
    mood: 'desk · lamp · quiet shelves',
    pairsWith: 'reading / notes / reflection',
  },
  nightstreet: {
    label: {zh: '夜街', en: 'Night street', ja: '夜の街'},
    mood: 'lanterns · wet ground · distant windows',
    pairsWith: 'journey / choices / outside world',
  },
  terminal: {
    label: {zh: '终端房', en: 'Terminal room', ja: '端末室'},
    mood: 'screens · cool glow · console desk',
    pairsWith: 'systems / prompts / debugging',
  },
  moonatelier: {
    label: {zh: '月窗工坊', en: 'Moon atelier', ja: '月窓工房'},
    mood: 'moon window · steps · soft cool light',
    pairsWith: 'creation / writing / quiet craft',
  },
};

const W = 1920, H = 1080;

function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function frame(c, x, y, w, h, color, n = 4) {
  rect(c, x, y, w, n, color);
  rect(c, x, y + h - n, w, n, color);
  rect(c, x, y, n, h, color);
  rect(c, x + w - n, y, n, h, color);
}
function poly(c, points, color) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y))));
  c.closePath();
  c.fill();
}
function seeded(n) {
  let x = n;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
function text(c, s, x, y, size = 30, color = '#e9dec0', align = 'left') {
  c.font = `${size}px "Fusion Pixel 12px Proportional Simplified Chinese",monospace`;
  c.textAlign = align;
  c.textBaseline = 'top';
  c.fillStyle = color;
  c.fillText(s, Math.round(x), Math.round(y));
}
function lamp(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  rect(c, -2, -120, 4, 120, '#25221b');
  poly(c, [[-44, 15], [-32, 1], [-18, -10], [18, -10], [32, 1], [44, 15]], '#686147');
  rect(c, -48, 15, 96, 8, '#181b16');
  rect(c, -25, 23, 50, 8, '#dac488');
  rect(c, -17, 31, 34, 7, '#f3e4b1');
  c.restore();
}
function clock(c, x, y, r = 95) {
  const step = 8;
  for (let yy = -r; yy <= r; yy += step)
    for (let xx = -r; xx <= r; xx += step) {
      const d = Math.hypot(xx, yy);
      if (d < r) rect(c, x + xx, y + yy, step, step, d > r - 16 ? '#50432b' : d > r - 22 ? '#171b17' : '#837e62');
    }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 - Math.PI / 2;
    rect(c, x + Math.cos(a) * (r - 31) - 4, y + Math.sin(a) * (r - 31) - 4, 8, 8, '#35352c');
  }
  c.strokeStyle = '#262d24';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + 28, y - 30);
  c.moveTo(x, y);
  c.lineTo(x - 8, y - 53);
  c.stroke();
  rect(c, x - 5, y - 5, 10, 10, '#b4a26a');
}
function books(c, x, y, count = 5, scale = 1) {
  const colors = ['#66513c', '#736149', '#495a49', '#826346', '#51594d'];
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  for (let i = 0; i < count; i++) {
    const w = 155 + (i % 3) * 20,
      yy = -i * 25;
    rect(c, 0, yy, w, 23, '#191f1b');
    rect(c, 4, yy + 3, w - 8, 13, colors[i % colors.length]);
    rect(c, 10, yy + 16, w - 20, 4, '#a08a62');
    rect(c, 15, yy + 3, 8, 13, '#262c24');
  }
  c.restore();
}
function chair(c, x, y) {
  rect(c, x + 12, y + 10, 420, 430, '#191d19');
  rect(c, x + 22, y + 18, 400, 420, '#70463b');
  rect(c, x + 34, y + 30, 376, 390, '#4d2e2b');
  frame(c, x + 22, y + 18, 400, 420, '#302822', 10);
  for (let i = 0; i < 6; i++) {
    rect(c, x + 46 + i * 62, y + 39, 4, 4, '#987351');
    rect(c, x + 46 + i * 62, y + 392, 4, 4, '#987351');
  }
  rect(c, x, y + 398, 40, 42, '#503932');
  rect(c, x + 396, y + 398, 40, 42, '#503932');
}
function floor(c, y, color) {
  rect(c, 0, y, W, 130, color);
  for (let i = 0; i < 14; i++) {
    const x = 70 + i * 139;
    rect(c, x, y + 45 + (i % 3) * 18, 65, 2, '#988b65');
    rect(c, x + 31, y + 68 + (i % 2) * 13, 92, 2, '#6a6750');
  }
  rect(c, 0, y + 130, W, 14, '#343629');
  rect(c, 0, y + 144, W, 150, '#101511');
}
function panel(c, x, y, w, h) {
  rect(c, x, y, w, h, '#15221e');
  frame(c, x, y, w, h, '#b69a59', 3);
  for (const [a, b] of [
    [x, y],
    [x + w - 6, y],
    [x, y + h - 6],
    [x + w - 6, y + h - 6],
  ])
    rect(c, a, b, 6, 6, '#e0cd8b');
}

function paintWorkshop(c) {
  rect(c, 0, 0, W, H, '#0e1210');
  rect(c, 286, 35, 1320, 792, '#3f3c2f');
  rect(c, 328, 66, 1238, 664, '#524b36');
  for (let yy = 82; yy < 720; yy += 34)
    for (let xx = 330 - (Math.floor(yy / 34) % 2) * 70; xx < 1560; xx += 142) {
      rect(c, xx, yy, 118, 2, '#383c2e');
      rect(c, xx + 121, yy + 6, 2, 22, '#454431');
    }
  for (const xx of [104, 1654]) {
    rect(c, xx, 108, 165, 680, '#171e1a');
    rect(c, xx + 20, 130, 121, 636, '#202821');
    rect(c, xx + 43, 150, 78, 575, '#19221c');
    rect(c, xx - 20, 88, 208, 26, '#222821');
    rect(c, xx - 20, 772, 208, 20, '#24291f');
  }
  for (let i = 0; i < 3; i++) {
    rect(c, 343, 380 + i * 110, 178, 16, '#27271d');
    books(c, 360, 363 + i * 110, 3, 0.77);
  }
  rect(c, 1230, 535, 301, 166, '#2e3025');
  for (let i = 0; i < 4; i++) {
    frame(c, 1241 + i * 72, 548, 64, 59, '#42412d', 3);
    rect(c, 1263 + i * 72, 572, 15, 5, '#a18b4f');
  }
  rect(c, 1240, 620, 280, 72, '#252d23');
  clock(c, 1378, 326, 109);
  chair(c, 602, 362);
  rect(c, 291, 790, 1320, 30, '#64472e');
  rect(c, 294, 820, 1313, 32, '#35291f');
  rect(c, 324, 855, 1250, 108, '#1c241c');
  rect(c, 393, 799, 1081, 4, '#b88f4e');
  rect(c, 381, 748, 8, 40, '#806b39');
  rect(c, 343, 785, 83, 10, '#796437');
  poly(c, [[334, 732], [350, 713], [414, 713], [431, 732]], '#26483a');
  rect(c, 329, 732, 108, 10, '#143229');
  rect(c, 350, 742, 65, 5, '#afac72');
  rect(c, 1474, 766, 95, 32, '#3f3825');
  rect(c, 1482, 770, 81, 14, '#766041');
  rect(c, 1503, 734, 5, 32, '#b9a873');
  rect(c, 1520, 731, 5, 34, '#9f8a56');
  lamp(c, 870, 92, 1.05);
}

function paintArchive(c) {
  rect(c, 0, 0, W, H, '#0e1210');
  rect(c, 270, 79, 1390, 668, '#232a20');
  rect(c, 294, 98, 1342, 630, '#292d22');
  for (let yy = 120; yy < 730; yy += 49)
    for (let xx = 295 - (Math.floor(yy / 49) % 2) * 90; xx < 1630; xx += 188) {
      rect(c, xx, yy, 165, 2, '#222a20');
    }
  for (const xx of [106, 458, 1070, 1683]) {
    rect(c, xx, 144, 124, 600, '#20271f');
    rect(c, xx + 18, 165, 88, 569, '#303127');
    rect(c, xx + 37, 172, 43, 539, '#232b21');
    rect(c, xx - 10, 132, 145, 25, '#2c2d22');
    rect(c, xx - 13, 724, 153, 21, '#35372a');
  }
  rect(c, 200, 425, 193, 288, '#191f19');
  rect(c, 217, 441, 155, 249, '#29352c');
  for (let i = 0; i < 3; i++) {
    rect(c, 220, 482 + i * 64, 148, 9, '#584731');
    books(c, 230, 475 + i * 64, 2, 0.68);
  }
  floor(c, 741, '#9b9270');
  rect(c, 1360, 691, 60, 54, '#625b43');
  rect(c, 1418, 644, 66, 99, '#73694c');
  rect(c, 1484, 609, 72, 136, '#897650');
  rect(c, 1484, 192, 229, 429, '#151e18');
  rect(c, 1496, 207, 205, 414, '#3e4635');
  frame(c, 1496, 207, 205, 414, '#665d3d', 6);
  rect(c, 1510, 225, 174, 376, '#27362b');
  rect(c, 1518, 236, 153, 365, '#30402f');
  rect(c, 1547, 351, 52, 63, '#19261e');
  rect(c, 1561, 361, 23, 26, '#a18b4e');
  rect(c, 1566, 387, 13, 18, '#a18b4e');
  panel(c, 1488, 151, 220, 48);
  text(c, '记忆', 1598, 159, 30, '#c9b66f', 'center');
  lamp(c, 846, 133, 1.0);
}

function paintStudy(c) {
  rect(c, 0, 0, W, H, '#0c1010');
  rect(c, 240, 48, 1440, 760, '#2a3228');
  rect(c, 280, 78, 1360, 700, '#343c30');
  for (let yy = 100; yy < 740; yy += 42)
    for (let xx = 300 - (Math.floor(yy / 42) % 2) * 55; xx < 1600; xx += 160) {
      rect(c, xx, yy, 120, 2, '#2a3128');
    }
  // Left shelf wall
  rect(c, 120, 140, 200, 620, '#1a221c');
  rect(c, 140, 160, 160, 580, '#243028');
  for (let i = 0; i < 5; i++) {
    rect(c, 150, 200 + i * 100, 140, 10, '#4a3f2c');
    books(c, 160, 188 + i * 100, 2 + (i % 2), 0.55);
  }
  // Desk
  rect(c, 520, 620, 780, 28, '#5a4630');
  rect(c, 540, 648, 740, 90, '#2c2418');
  rect(c, 580, 560, 220, 60, '#1e2820');
  frame(c, 580, 560, 220, 60, '#6a5a3c', 3);
  rect(c, 600, 575, 40, 30, '#c4b58d');
  lamp(c, 980, 120, 0.9);
  // Window light block (quiet)
  rect(c, 1380, 160, 220, 320, '#1a2420');
  rect(c, 1400, 180, 180, 280, '#3a4a42');
  frame(c, 1400, 180, 180, 280, '#5a6a58', 4);
  rect(c, 1420, 200, 140, 240, '#4a6a62');
  floor(c, 760, '#8a8160');
}

function paintNightstreet(c) {
  rect(c, 0, 0, W, H, '#080a10');
  // Far buildings
  for (const [x, w, h, col] of [
    [80, 220, 520, '#141820'],
    [280, 180, 460, '#181c24'],
    [520, 260, 540, '#12161c'],
    [900, 200, 480, '#161a22'],
    [1180, 280, 560, '#101418'],
    [1520, 320, 500, '#14181e'],
  ]) {
    rect(c, x, 820 - h, w, h, col);
    for (let i = 0; i < 4; i++) {
      const wx = x + 30 + (i % 2) * 80;
      const wy = 820 - h + 60 + Math.floor(i / 2) * 120;
      if (wy + 40 < 780) rect(c, wx, wy, 36, 28, i % 3 === 0 ? '#3a3420' : '#1a2228');
    }
  }
  // Street
  rect(c, 0, 780, W, 300, '#1a1c18');
  for (let i = 0; i < 12; i++) rect(c, 40 + i * 160, 860, 90, 3, '#2a2e24');
  // Lanterns
  for (const x of [360, 860, 1360]) {
    rect(c, x, 420, 6, 200, '#2a2820');
    rect(c, x - 18, 400, 42, 36, '#6a5830');
    rect(c, x - 10, 408, 26, 20, '#c4a858');
  }
  // Wet sheen strips
  for (let i = 0; i < 8; i++) rect(c, 120 + i * 210, 900 + (i % 3) * 12, 140, 2, '#3a4838');
}

function paintTerminal(c) {
  rect(c, 0, 0, W, H, '#060a0c');
  rect(c, 200, 60, 1520, 720, '#121a1c');
  rect(c, 240, 90, 1440, 660, '#182226');
  // Screen bank
  for (let i = 0; i < 3; i++) {
    const x = 320 + i * 420;
    rect(c, x, 160, 360, 260, '#0a1214');
    frame(c, x, 160, 360, 260, '#3a5a58', 4);
    rect(c, x + 16, 176, 328, 220, '#0e2830');
    for (let r = 0; r < 6; r++) rect(c, x + 40, 200 + r * 28, 180 + (r % 3) * 40, 4, '#2a6a62');
    rect(c, x + 40, 380, 80, 8, '#4a8878');
  }
  // Console desk
  rect(c, 280, 520, 1360, 24, '#2a3a38');
  rect(c, 300, 544, 1320, 120, '#141c1e');
  for (let i = 0; i < 8; i++) {
    rect(c, 360 + i * 140, 570, 70, 40, '#1a2828');
    frame(c, 360 + i * 140, 570, 70, 40, '#3a4a48', 2);
  }
  // Cool side glow strips
  rect(c, 80, 200, 40, 480, '#0a2828');
  rect(c, 1800, 200, 40, 480, '#0a2828');
  floor(c, 740, '#2a3230');
}

function paintMoonatelier(c) {
  rect(c, 0, 0, W, H, '#0a0e14');
  rect(c, 260, 50, 1400, 740, '#1a2230');
  rect(c, 300, 80, 1320, 680, '#222a38');
  // Moon window
  rect(c, 1180, 120, 360, 360, '#121820');
  frame(c, 1180, 120, 360, 360, '#4a5a68', 6);
  for (let yy = -90; yy <= 90; yy += 10)
    for (let xx = -90; xx <= 90; xx += 10) {
      if (Math.hypot(xx, yy) < 88) rect(c, 1360 + xx, 300 + yy, 10, 10, Math.hypot(xx, yy) > 70 ? '#8a9ab0' : '#c8d4e0');
    }
  // Creation steps / platform
  rect(c, 420, 620, 520, 28, '#3a4250');
  rect(c, 460, 648, 440, 24, '#2a323e');
  rect(c, 500, 672, 360, 24, '#222830');
  // Desk with ink
  rect(c, 560, 540, 280, 80, '#2a2830');
  frame(c, 560, 540, 280, 80, '#5a4a40', 3);
  rect(c, 590, 560, 60, 40, '#1a1818');
  rect(c, 680, 565, 120, 8, '#c4b890');
  // Soft shelf
  rect(c, 180, 200, 160, 480, '#161c28');
  for (let i = 0; i < 4; i++) {
    rect(c, 190, 240 + i * 100, 140, 8, '#3a3a48');
    books(c, 200, 228 + i * 100, 2, 0.5);
  }
  lamp(c, 780, 140, 0.85);
  floor(c, 760, '#3a4250');
}

const PAINTERS = {
  workshop: paintWorkshop,
  archive: paintArchive,
  study: paintStudy,
  nightstreet: paintNightstreet,
  terminal: paintTerminal,
  moonatelier: paintMoonatelier,
};

const SEEDS = {
  workshop: 17,
  archive: 38,
  study: 51,
  nightstreet: 73,
  terminal: 91,
  moonatelier: 112,
};

/** Resolve big/small background ids from episode fields. Defaults keep old demo. */
export function resolveScenePair(ep = {}) {
  const big = ep.scenes?.big || ep.sceneId || 'workshop';
  const small = ep.scenes?.small || ep.sceneIdB || 'archive';
  const ok = (id) => (SCENE_IDS.includes(id) ? id : null);
  return {
    big: ok(big) || 'workshop',
    small: ok(small) || 'archive',
  };
}

export function listNeededScenes(ep = {}) {
  const {big, small} = resolveScenePair(ep);
  return [...new Set([big, small])];
}

/** Paint one preset onto a canvas context (1920×1080). */
export function paintPreset(c, name) {
  const id = SCENE_IDS.includes(name) ? name : 'workshop';
  PAINTERS[id](c);
  const rng = seeded(SEEDS[id] || 17);
  for (let i = 0; i < 650; i++) {
    const x = rng() * W,
      y = 150 + rng() * 615;
    rect(c, x, y, 3 + rng() * 7, 2, rng() > 0.5 ? '#31372a' : '#1e261e');
  }
}

export function buildPresetCanvas(name) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  paintPreset(c, name);
  return canvas;
}
