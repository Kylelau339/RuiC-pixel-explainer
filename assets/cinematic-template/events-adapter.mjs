// visualBeats → events[] adapter + event state fold for the cinematic scene.
// Prefer absolute timeline milliseconds (same as legacy visualBeats fields).

/** Expand legacy visualBeats object into events[]. */
export function expandVisualBeats(vb = {}) {
  const ev = [];
  const push = (at, type, params = {}) => {
    if (at == null || !Number.isFinite(at)) return;
    ev.push({at, type, params});
  };
  push(vb.collectAt, 'inventory.show', {});
  push(vb.queryAt, 'recall.show', {state: 'empty'});
  if (vb.queryAt != null) push(vb.queryAt + 750, 'recall.setState', {state: 'failed'});
  push(vb.contrastAt, 'contrast.show', {});
  push(vb.retrieveAt, 'task.show', {});
  push(vb.compareAt, 'compare.show', {});
  push(vb.stepsAt, 'stepbar.show', {});
  push(vb.testAt, 'quiz.show', {});
  push(vb.closeAt, 'book.setClosed', {});
  push(vb.markAt, 'book.mark', {});
  push(vb.markAt, 'flag.show', {});
  push(vb.checkAt, 'feedback.show', {state: 'pending'});
  push(vb.checkAt, 'quiz.reveal', {});
  push(vb.correctAt, 'quiz.correct', {});
  push(vb.correctAt, 'feedback.show', {state: 'correct'});
  push(vb.rewardAt, 'reward.show', {});
  push(vb.rewardAt, 'actor.celebrate', {});
  push(vb.unlockAt, 'door.unlock', {});
  push(vb.walkAt, 'actor.walk', {from: 470, to: 1390, durationMs: 3800});
  return ev.sort((a, b) => a.at - b.at || String(a.type).localeCompare(b.type));
}

/** Resolve episode events: native events[] wins; else expand visualBeats. */
export function resolveEpisodeEvents(ep = {}) {
  if (Array.isArray(ep.events) && ep.events.length) {
    return ep.events
      .filter((e) => e && Number.isFinite(e.at) && e.type)
      .slice()
      .sort((a, b) => a.at - b.at || String(a.type).localeCompare(b.type));
  }
  if (ep.visualBeats) return expandVisualBeats(ep.visualBeats);
  return [];
}

function labelOf(ep, key, fallback) {
  if (!key) return fallback;
  const L = ep.componentLabels || {};
  if (L[key] != null) return L[key];
  // dotted keys like timeline.title → try nested then flat
  if (key.includes('.')) {
    const flat = key.replace(/\./g, '');
    if (L[key] != null) return L[key];
    if (L[flat] != null) return L[flat];
  }
  return fallback;
}

/**
 * Fold events up to `ms` into a draw state. Unknown types are ignored (warn once).
 */
const warned = new Set();
export function foldEvents(ep, ms) {
  const events = resolveEpisodeEvents(ep);
  const L = ep.componentLabels || {};
  const state = {
    inventory: null,
    recall: null,
    contrast: null,
    task: null,
    book: {closed: 0, mark: false},
    quiz: null,
    flag: null,
    feedback: null,
    reward: null,
    door: {openAt: null},
    walk: null,
    celebrate: false,
    timeline: null,
    speech: null,
    path: null,
    ring: null,
    stepbar: null,
    compare: null,
    world: null,
    actorVisible: true,
    panels: [],
  };

  for (const e of events) {
    if (e.at > ms) break;
    const p = e.params || {};
    switch (e.type) {
      case 'inventory.show':
        state.inventory = {
          at: e.at,
          title: labelOf(ep, p.titleKey, L.inventoryTitle),
          countFrom: p.countFrom ?? 1,
        };
        break;
      case 'inventory.setCount':
        if (state.inventory) state.inventory.count = p.count ?? state.inventory.count;
        break;
      case 'recall.show':
        state.recall = {at: e.at, title: labelOf(ep, p.titleKey, L.queryTitle), state: p.state || 'empty'};
        break;
      case 'recall.setState':
        if (state.recall) state.recall.state = p.state || state.recall.state;
        break;
      case 'contrast.show':
        state.contrast = {at: e.at, text: labelOf(ep, p.textKey, L.contrast)};
        break;
      case 'task.show':
        state.task = {at: e.at, title: labelOf(ep, p.titleKey, L.taskTitle)};
        break;
      case 'compare.show':
        state.compare = {
          at: e.at,
          title: labelOf(ep, p.titleKey, L.compareTitle),
          leftTitle: labelOf(ep, p.leftKey, L.compareLeft),
          rightTitle: labelOf(ep, p.rightKey, L.compareRight),
          leftBody: labelOf(ep, p.leftBodyKey, L.compareLeftBody || ''),
          rightBody: labelOf(ep, p.rightBodyKey, L.compareRightBody || ''),
        };
        break;
      case 'stepbar.show':
        state.stepbar = {
          at: e.at,
          steps: p.steps || L.steps || [],
          current: p.activeIndex ?? p.current ?? 0,
          title: labelOf(ep, p.titleKey, L.stepBarTitle),
        };
        break;
      case 'stepbar.advance':
        if (state.stepbar) state.stepbar.current = (state.stepbar.current || 0) + (p.by ?? 1);
        break;
      case 'book.setClosed':
        state.book.closedAt = e.at;
        break;
      case 'book.mark':
        state.book.mark = true;
        break;
      case 'quiz.show':
        state.quiz = {
          at: e.at,
          prompt: labelOf(ep, p.promptKey, L.prompt),
          wrong: L.wrongAnswer || '',
          right: L.rightAnswer || '',
          revealAt: null,
          correctAt: null,
        };
        break;
      case 'quiz.reveal':
        if (state.quiz) state.quiz.revealAt = e.at;
        break;
      case 'quiz.correct':
        if (state.quiz) state.quiz.correctAt = e.at;
        break;
      case 'flag.show':
        state.flag = {at: e.at, label: labelOf(ep, p.labelKey, L.marker)};
        break;
      case 'feedback.show':
        state.feedback = {at: e.at, state: p.state || 'pending'};
        break;
      case 'reward.show':
        state.reward = {at: e.at, label: labelOf(ep, p.labelKey, L.reward)};
        break;
      case 'door.unlock':
        state.door.openAt = e.at;
        break;
      case 'actor.walk':
        state.walk = {
          at: e.at,
          from: p.from ?? 470,
          to: p.to ?? 1390,
          durationMs: p.durationMs ?? 3800,
        };
        break;
      case 'actor.celebrate':
        state.celebrate = true;
        break;
      case 'timeline.show':
        state.timeline = {
          at: e.at,
          steps: (p.steps || []).map((s) => (typeof s === 'string' ? {label: s} : s)),
          activeIndex: p.activeIndex ?? 0,
          progress: p.progress ?? 0,
          title: labelOf(ep, p.titleKey, L['timeline.title'] || L.timelineTitle),
        };
        break;
      case 'timeline.setActive':
        if (state.timeline) {
          state.timeline.activeIndex = p.activeIndex ?? state.timeline.activeIndex;
          state.timeline.progress = p.progress ?? state.timeline.progress;
        }
        break;
      case 'speech.show':
        state.speech = {
          at: e.at,
          text: labelOf(ep, p.textKey, p.text || L.bubble1 || ''),
          tail: p.tail || 'bl',
          tone: p.tone || 'neutral',
          x: p.x,
          y: p.y,
        };
        break;
      case 'speech.hide':
        state.speech = null;
        break;
      case 'path.show': {
        const labels = p.nodes || [];
        const defaults = [
          {x: 520, y: 760},
          {x: 900, y: 750},
          {x: 1280, y: 740},
        ];
        state.path = {
          at: e.at,
          nodes: defaults.map((d, i) => ({
            ...d,
            ...(typeof labels[i] === 'object' ? labels[i] : {}),
            label: typeof labels[i] === 'string' ? labelOf(ep, labels[i], labels[i]) : labels[i]?.label || d.label,
            state: i === 0 ? 'active' : 'open',
          })),
          edges: [
            {from: 0, to: 1, lit: false},
            {from: 1, to: 2, lit: false},
          ],
        };
        break;
      }
      case 'path.litEdge':
        if (state.path) {
          for (const edge of state.path.edges) {
            if (edge.from === (p.from ?? 0) && edge.to === (p.to ?? 1)) edge.lit = true;
          }
          const to = p.to ?? 1;
          if (state.path.nodes[to]) state.path.nodes[to].state = 'active';
          const from = p.from ?? 0;
          if (state.path.nodes[from]) state.path.nodes[from].state = 'done';
        }
        break;
      case 'path.setNode':
        if (state.path && state.path.nodes[p.index ?? 0]) {
          state.path.nodes[p.index ?? 0].state = p.state || 'done';
        }
        break;
      case 'ring.show':
        state.ring = {
          at: e.at,
          progress: p.progress ?? 1,
          label: labelOf(ep, p.labelKey, L['ring.think'] || L.ringThink),
          mode: p.mode || 'countDown',
          x: p.x,
          y: p.y,
        };
        break;
      case 'ring.set':
        if (state.ring) {
          if (p.progress != null) state.ring.progress = p.progress;
          if (p.mode) state.ring.mode = p.mode;
          if (p.labelKey || p.label) state.ring.label = labelOf(ep, p.labelKey, p.label || state.ring.label);
        }
        break;
      case 'world.show':
        state.world = {
          at: e.at,
          pattern: p.pattern || (p.layout === 'split' ? 'dual-world' : 'orbit-pull'),
          layout: p.layout || (p.pattern === 'dual-world' ? 'split' : 'full'),
          left: p.left || {mode: 'fall'},
          right: p.right || {mode: 'orbit'},
          full: p.full || p.cfg || {mode: 'orbit'},
          scale: p.scale || null,
          flow: p.flow || null,
          balance: p.balance || null,
          collision: p.collision || null,
          cycle: p.cycle || null,
          threshold: p.threshold || null,
          field: p.field || null,
          ratio: p.ratio || null,
          chain: p.chain || null,
          backdrop: p.backdrop || null,
          camera: p.camera || null, // {keyframes:[{atMs,zoom,x,y}]}
          leftLabel: labelOf(ep, p.leftLabelKey, p.leftLabel || L.worldLeft || ''),
          rightLabel: labelOf(ep, p.rightLabelKey, p.rightLabel || L.worldRight || ''),
          fullLabel: labelOf(ep, p.fullLabelKey, p.fullLabel || ''),
          showPull: p.showPull !== false,
          focusUi: p.focusUi || null, // optional single focus string drawn in-scene
        };
        break;
      case 'world.set':
        if (state.world) {
          if (p.pattern) state.world.pattern = p.pattern;
          if (p.layout) state.world.layout = p.layout;
          if (p.left) state.world.left = {...state.world.left, ...p.left};
          if (p.right) state.world.right = {...state.world.right, ...p.right};
          if (p.full || p.cfg) state.world.full = {...state.world.full, ...(p.full || p.cfg)};
          if (p.scale) state.world.scale = {...(state.world.scale || {}), ...p.scale};
          if (p.flow) state.world.flow = {...(state.world.flow || {}), ...p.flow};
          if (p.balance) state.world.balance = {...(state.world.balance || {}), ...p.balance};
          if (p.collision) state.world.collision = {...(state.world.collision || {}), ...p.collision};
          if (p.cycle) state.world.cycle = {...(state.world.cycle || {}), ...p.cycle};
          if (p.threshold) state.world.threshold = {...(state.world.threshold || {}), ...p.threshold};
          if (p.field) state.world.field = {...(state.world.field || {}), ...p.field};
          if (p.ratio) state.world.ratio = {...(state.world.ratio || {}), ...p.ratio};
          if (p.chain) state.world.chain = {...(state.world.chain || {}), ...p.chain};
          if (p.backdrop) state.world.backdrop = p.backdrop;
          if (p.camera) state.world.camera = p.camera;
          if (p.leftLabel != null || p.leftLabelKey)
            state.world.leftLabel = labelOf(ep, p.leftLabelKey, p.leftLabel ?? state.world.leftLabel);
          if (p.rightLabel != null || p.rightLabelKey)
            state.world.rightLabel = labelOf(ep, p.rightLabelKey, p.rightLabel ?? state.world.rightLabel);
          if (p.fullLabel != null || p.fullLabelKey)
            state.world.fullLabel = labelOf(ep, p.fullLabelKey, p.fullLabel ?? state.world.fullLabel);
          if (p.showPull != null) state.world.showPull = p.showPull;
          if (p.focusUi !== undefined) state.world.focusUi = p.focusUi;
          // Restart local clock when layout/mode changes so each beat reads clearly
          if (p.restart !== false) state.world.at = e.at;
        }
        break;
      case 'world.hide':
        state.world = null;
        break;
      case 'actor.show':
        state.actorVisible = true;
        break;
      case 'actor.hide':
        state.actorVisible = false;
        break;
      default:
        if (!warned.has(e.type)) {
          warned.add(e.type);
          console.warn(`[events] unknown type ignored: ${e.type}`);
        }
    }
  }
  return state;
}

/** Whether episode should use the events draw path (native events[] only). */
export function usesNativeEvents(ep = {}) {
  return Array.isArray(ep.events) && ep.events.length > 0;
}
