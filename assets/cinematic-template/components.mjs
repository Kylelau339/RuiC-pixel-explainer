// Coarse pixel teaching props. Each exported component is independent of the
// narration, speaker and topic. Values and state come from the episode.
import {t, getLocale, setLocale, FONT_FAMILY} from './i18n.mjs';

export {setLocale, getLocale};

const P = {ink: '#15221e', gold: '#b69a59', paper: '#e6debe', muted: '#8b947c', teal: '#82b6a1', red: '#b76850'};
const clamp = (x) => Math.max(0, Math.min(1, x));
function r(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function frame(c, x, y, w, h, color = P.gold, stroke = 3) {
  r(c, x, y, w, stroke, color);
  r(c, x, y + h - stroke, w, stroke, color);
  r(c, x, y, stroke, h, color);
  r(c, x + w - stroke, y, stroke, h, color);
}
function text(c, s, x, y, size = 30, color = P.paper, align = 'left') {
  c.font = `${size}px ${FONT_FAMILY}`;
  c.textAlign = align;
  c.textBaseline = 'top';
  c.fillStyle = color;
  c.fillText(s, Math.round(x), Math.round(y));
}
function panel(c, x, y, w, h, color = P.gold) {
  r(c, x + 7, y + 9, w, h, '#07110c');
  r(c, x, y, w, h, P.ink);
  frame(c, x, y, w, h, color);
  for (const [a, b] of [
    [x, y],
    [x + w - 6, y],
    [x, y + h - 6],
    [x + w - 6, y + h - 6],
  ])
    r(c, a, b, 6, 6, '#d5c48c');
}
function dashed(c, x, y, w, h, color = P.muted) {
  for (let a = x; a < x + w; a += 17) {
    r(c, a, y, 10, 3, color);
    r(c, a, y + h - 3, 10, 3, color);
  }
  for (let b = y; b < y + h; b += 17) {
    r(c, x, b, 3, 10, color);
    r(c, x + w - 3, b, 3, 10, color);
  }
}

export const componentGlyphs =
  '收藏栏资料已存入调取记忆未找到空白闭卷测试我的回答参考答案等待核对卡点即时反馈偏差答对了经验获得能力已解锁书籍先看再答先答再看验证成功检索任务问题对比之前之后步骤✓×?+0123456789≠ ·InventorySavedItemsRecallNotfoundClosed-bookMyanswerReferenceCheckingStuckFeedbackCorrectMissXPSkillunlockedStoredlearnedRetrieveStepsCompareBeforeAfterコレクション保存済資料想起見つからない閉本テスト自分の答え参考答え確認中つまずきフィードバック正解ずれ経験能力解除保存習得取り出し手順対比前後';

export function drawPaper(c, {x, y, w = 112, h = 72, label = '', mark = false, alpha = 1}) {
  c.save();
  c.globalAlpha = alpha;
  r(c, x + 5, y + 5, w, h, '#141c15');
  r(c, x, y, w, h, '#c4b58d');
  r(c, x + 6, y + 6, w - 12, h - 12, '#ddd2ae');
  r(c, x + 12, y + 16, w - 36, 4, '#77765b');
  r(c, x + 12, y + 27, w - 29, 4, '#888167');
  r(c, x + 12, y + 40, w - 49, 4, '#888167');
  r(c, x + w - 18, y + 9, 8, 14, P.gold);
  if (mark) {
    r(c, x + 10, y + 29, w - 30, 8, '#a06042');
    r(c, x + 14, y + 50, w - 45, 4, '#a06042');
  }
  if (label) text(c, label, x + w / 2, y + h + 8, 24, P.paper, 'center');
  c.restore();
}
export function drawInventory(c, {x, y, w = 278, count = 0, title, state, alpha = 1}) {
  title = title ?? t('inventoryTitle');
  state = state ?? t('inventoryState');
  c.save();
  c.globalAlpha = alpha;
  panel(c, x, y, w, 208);
  text(c, title, x + 18, y + 15, 30, '#d1bd7c');
  r(c, x + 17, y + 58, w - 34, 2, '#52604b');
  for (let i = 0; i < 3; i++) {
    const bx = x + 19 + i * 79,
      by = y + 80;
    r(c, bx, by, 67, 63, '#101a14');
    frame(c, bx, by, 67, 63, '#68785e', 2);
    drawPaper(c, {x: bx + 9, y: by + 10, w: 48, h: 35});
  }
  text(c, `${t('inventoryCount')} ${count}`, x + 19, y + 160, 30, '#d6c287');
  text(c, state, x + w - 17, y + 166, 24, P.muted, 'right');
  c.restore();
}
export function drawRecallPanel(c, {x, y, w = 358, title, state = 'empty', alpha = 1}) {
  title = title ?? t('queryTitle');
  c.save();
  c.globalAlpha = alpha;
  panel(c, x, y, w, 184, state === 'failed' ? P.red : P.gold);
  text(c, title, x + 19, y + 17, 30, P.paper);
  r(c, x + 17, y + 58, w - 34, 2, '#53604b');
  for (let i = 0; i < 3; i++) {
    const bx = x + 22 + i * 103;
    dashed(c, bx, y + 81, 89, 58, '#596651');
    text(c, state === 'success' ? '✓' : '?', bx + 44, y + 94, 36, state === 'success' ? P.teal : P.muted, 'center');
  }
  if (state === 'failed') text(c, t('queryFailed'), x + w / 2, y + 149, 24, P.red, 'center');
  c.restore();
}
export function drawOpenBook(c, {x, y, w = 196, h = 104, closed = 0, mark = false}) {
  const k = clamp(closed);
  if (k > 0.96) {
    r(c, x + 26, y + 18, w - 52, h - 19, '#283e31');
    r(c, x + 34, y + 24, w - 65, h - 31, '#517050');
    r(c, x + 42, y + 31, 8, h - 42, '#bdac74');
    r(c, x + 46, y + h - 9, w - 75, 7, '#baae89');
    return;
  }
  const spread = w * (1 - k * 0.7),
    left = x + (w - spread) / 2;
  panel(c, left, y, spread, h, '#8d815a');
  r(c, left + 5, y + 5, spread / 2 - 8, h - 10, '#d1c29a');
  r(c, left + spread / 2 + 3, y + 5, spread / 2 - 8, h - 10, '#e0d5b3');
  r(c, left + spread / 2 - 3, y + 3, 6, h - 6, '#887b52');
  for (let j = 0; j < 4; j++) {
    r(c, left + 13, y + 18 + j * 16, spread / 2 - 29, 3, '#858066');
    r(c, left + spread / 2 + 11, y + 18 + j * 16, spread / 2 - 29, 3, '#858066');
  }
  if (mark) r(c, left + spread / 2 + 9, y + 47, spread / 2 - 24, 7, '#b16b51');
}
export function drawQuizBoard(c, {x, y, w = 652, prompt = '', answer = '', reference = '', reveal = 0, correct = false, mark = false, alpha = 1}) {
  c.save();
  c.globalAlpha = alpha;
  panel(c, x, y, w, 242, correct ? P.teal : P.gold);
  text(c, t('quizTitle'), x + 20, y + 15, 30, '#d1bd7c');
  if (prompt) text(c, prompt, x + w - 20, y + 20, 24, P.muted, 'right');
  r(c, x + 17, y + 58, w - 34, 2, '#4b5a48');
  text(c, t('myAnswer'), x + 22, y + 78, 24, P.muted);
  dashed(c, x + 183, y + 71, w - 211, 54, mark ? P.red : '#596950');
  text(c, answer || '?', x + 205, y + 79, 30, mark ? P.red : P.paper);
  text(c, t('reference'), x + 22, y + 151, 24, P.muted);
  r(c, x + 183, y + 142, w - 211, 54, '#0c1912');
  frame(c, x + 183, y + 142, w - 211, 54, reveal > 0 ? P.teal : '#465444', 2);
  if (reveal > 0) {
    c.save();
    c.globalAlpha *= clamp(reveal);
    text(c, reference, x + 205, y + 150, 30, P.teal);
    c.restore();
  } else text(c, t('waitingCheck'), x + 205, y + 154, 24, '#52624e');
  if (correct) text(c, '✓', x + w - 63, y + 78, 36, P.teal);
  else if (mark) text(c, '×', x + w - 60, y + 78, 36, P.red);
  if (mark) r(c, x + 215, y + 120, Math.min(240, w - 270), 4, P.red);
  c.restore();
}
export function drawMarkerFlag(c, {x, y, label, alpha = 1}) {
  label = label ?? t('marker');
  c.save();
  c.globalAlpha = alpha;
  r(c, x, y - 73, 5, 73, '#88937c');
  r(c, x + 5, y - 73, 67, 35, '#9f5745');
  r(c, x + 12, y - 66, 45, 5, '#c88667');
  r(c, x - 9, y, 24, 6, '#323c2e');
  text(c, label, x + 33, y - 59, 24, '#eee0bd', 'center');
  c.restore();
}
export function drawFeedback(c, {x, y, w = 313, progress = 0, state = 'pending', alpha = 1}) {
  const correct = state === 'correct';
  c.save();
  c.globalAlpha = alpha;
  panel(c, x, y, w, 130, correct ? P.teal : P.gold);
  text(c, t('feedbackTitle'), x + 17, y + 13, 24, P.muted);
  text(c, correct ? t('feedbackOk') : t('feedbackMiss'), x + 18, y + 46, 36, correct ? P.teal : P.red);
  text(c, correct ? t('xpOk') : t('xpMiss'), x + w - 19, y + 55, 24, correct ? P.paper : P.muted, 'right');
  r(c, x + 17, y + 101, w - 34, 12, '#08170f');
  r(c, x + 19, y + 103, (w - 38) * clamp(progress), 8, correct ? '#88bda0' : '#715c43');
  c.restore();
}
export function drawRewardBadge(c, {x, y, label, alpha = 1}) {
  label = label ?? t('reward');
  c.save();
  c.globalAlpha = alpha;
  panel(c, x, y, 300, 82, '#c3a762');
  r(c, x + 18, y + 19, 39, 39, '#4a472c');
  r(c, x + 26, y + 27, 23, 6, '#d5be71');
  r(c, x + 31, y + 27, 6, 25, '#d5be71');
  r(c, x + 37, y + 41, 10, 6, '#d5be71');
  c.font = `30px ${FONT_FAMILY}`;
  const width = c.measureText(label).width,
    size = width > 204 ? Math.max(18, Math.floor((30 * 204) / width / 6) * 6) : 30;
  text(c, label, x + 78, y + 23, size, '#e0c984');
  c.restore();
}

/** Side-by-side compare cards (Before / After or custom). Hard-edge coarse panels. */
export function drawCompareCards(c, {
  x,
  y,
  w = 720,
  title,
  leftTitle,
  rightTitle,
  leftBody = '',
  rightBody = '',
  highlight = null,
  alpha = 1,
}) {
  title = title ?? t('compareTitle');
  leftTitle = leftTitle ?? t('compareLeft');
  rightTitle = rightTitle ?? t('compareRight');
  const gap = 24,
    cardW = (w - gap) / 2,
    h = 200;
  c.save();
  c.globalAlpha = alpha;
  text(c, title, x + w / 2, y - 36, 30, '#d1bd7c', 'center');
  for (const [side, tx, body, hi] of [
    ['left', leftTitle, leftBody, highlight === 'left'],
    ['right', rightTitle, rightBody, highlight === 'right'],
  ]) {
    const cx = side === 'left' ? x : x + cardW + gap;
    panel(c, cx, y, cardW, h, hi ? P.teal : P.gold);
    text(c, tx, cx + 18, y + 16, 30, hi ? P.teal : '#d1bd7c');
    r(c, cx + 16, y + 56, cardW - 32, 2, '#52604b');
    const lines = String(body || '').split('\n').slice(0, 3);
    lines.forEach((line, i) => text(c, line, cx + 18, y + 74 + i * 34, 28, P.paper));
    if (!lines.length) dashed(c, cx + 24, y + 80, cardW - 48, 80, '#596651');
  }
  c.restore();
}

/** Horizontal step bar: numbered beads + labels; `current` is 0-based active index. */
export function drawStepBar(c, {x, y, w = 900, steps = [], current = 0, title, alpha = 1}) {
  title = title ?? t('stepBarTitle');
  const list = steps.length ? steps : [t('compareLeft'), t('compareRight'), t('reward')];
  const n = list.length,
    pad = 40,
    usable = w - pad * 2,
    stepX = n > 1 ? usable / (n - 1) : 0;
  c.save();
  c.globalAlpha = alpha;
  panel(c, x, y, w, 120);
  text(c, title, x + 18, y + 12, 24, P.muted);
  const cy = y + 72;
  r(c, x + pad, cy - 2, usable, 4, '#2a3a30');
  if (n > 1 && current > 0) {
    const done = Math.min(current, n - 1);
    r(c, x + pad, cy - 2, stepX * done, 4, P.teal);
  }
  list.forEach((label, i) => {
    const cx = x + pad + stepX * i;
    const done = i < current,
      active = i === current;
    const col = active ? P.teal : done ? '#6a8a70' : '#4a5448';
    r(c, cx - 14, cy - 14, 28, 28, '#0a1410');
    frame(c, cx - 14, cy - 14, 28, 28, col, 3);
    text(c, String(i + 1), cx, cy - 10, 24, active ? P.teal : P.paper, 'center');
    text(c, label, cx, y + 92, 22, active ? '#e0d4a0' : P.muted, 'center');
  });
  c.restore();
}
