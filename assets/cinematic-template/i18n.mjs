// Locale tables for component defaults and font scaffolding.
// zh + en are product-ready; ja is scaffold (labels + font preload only).
// ko is deferred (Phase 3).

export const LOCALES = ['zh', 'en', 'ja'];
export const DEFAULT_LOCALE = 'zh';

/** Same Fusion Pixel family covers Latin / CJK / kana; preload text must match locale. */
export const FONT_FAMILY =
  '"Fusion Pixel 12px Proportional Simplified Chinese",monospace';

export const STRINGS = {
  zh: {
    inventoryTitle: '收藏栏',
    inventoryState: '已存入',
    inventoryCount: '资料',
    queryTitle: '调取记忆',
    queryFailed: '未找到',
    quizTitle: '闭卷测试',
    myAnswer: '我的回答',
    reference: '参考答案',
    waitingCheck: '等待核对',
    marker: '卡点',
    feedbackTitle: '即时反馈',
    feedbackOk: '答对了',
    feedbackMiss: '偏差',
    xpOk: '经验 +1',
    xpMiss: '经验 +0',
    reward: '能力已解锁',
    contrast: '存下 ≠ 学会',
    taskTitle: '检索任务',
    compareTitle: '对比',
    compareLeft: '之前',
    compareRight: '之后',
    stepBarTitle: '步骤',
    loading: '正在布置场景…',
    noteSaved: '笔记 · 已保存',
    rememberQ: '记住了？',
    extracted: '已提取 · 能讲出来',
  },
  en: {
    inventoryTitle: 'Inventory',
    inventoryState: 'Saved',
    inventoryCount: 'Items',
    queryTitle: 'Recall',
    queryFailed: 'Not found',
    quizTitle: 'Closed-book',
    myAnswer: 'My answer',
    reference: 'Reference',
    waitingCheck: 'Checking…',
    marker: 'Stuck',
    feedbackTitle: 'Feedback',
    feedbackOk: 'Correct',
    feedbackMiss: 'Miss',
    xpOk: 'XP +1',
    xpMiss: 'XP +0',
    reward: 'Skill unlocked',
    contrast: 'Stored ≠ learned',
    taskTitle: 'Retrieve',
    compareTitle: 'Compare',
    compareLeft: 'Before',
    compareRight: 'After',
    stepBarTitle: 'Steps',
    loading: 'Setting the scene…',
    noteSaved: 'Notes · saved',
    rememberQ: 'Remember?',
    extracted: 'Retrieved · can teach',
  },
  ja: {
    inventoryTitle: 'コレクション',
    inventoryState: '保存済',
    inventoryCount: '資料',
    queryTitle: '想起',
    queryFailed: '見つからない',
    quizTitle: '閉本テスト',
    myAnswer: '自分の答え',
    reference: '参考答え',
    waitingCheck: '確認中…',
    marker: 'つまずき',
    feedbackTitle: 'フィードバック',
    feedbackOk: '正解',
    feedbackMiss: 'ずれ',
    xpOk: '経験 +1',
    xpMiss: '経験 +0',
    reward: '能力解除',
    contrast: '保存 ≠ 習得',
    taskTitle: '取り出し',
    compareTitle: '対比',
    compareLeft: '前',
    compareRight: '後',
    stepBarTitle: '手順',
    loading: 'シーンを準備中…',
    noteSaved: 'メモ · 保存済',
    rememberQ: '覚えた？',
    extracted: '取り出し · 説明できる',
  },
};

/** Extra glyph bag for font preload per locale (beyond episode strings). */
export const PRELOAD_EXTRA = {
  zh: '笔记 · 已保存记住了？已提取 · 能讲出来记忆资料未找到闭卷测试等待核对卡点即时反馈偏差答对了经验获得能力已解锁步骤对比之前之后✓×?≠',
  en: 'Inventory Saved Items Recall Not found Closed-book My answer Reference Checking Stuck Feedback Correct Miss XP Skill unlocked Stored learned Retrieve Steps Compare Before After ✓×?≠',
  ja: 'コレクション保存済資料想起見つからない閉本テスト自分の答え参考答え確認中つまずきフィードバック正解ずれ経験能力解除保存習得取り出し手順対比前後✓×?≠',
};

let _locale = DEFAULT_LOCALE;

export function normalizeLocale(raw) {
  const s = String(raw || DEFAULT_LOCALE).toLowerCase().slice(0, 2);
  return LOCALES.includes(s) ? s : DEFAULT_LOCALE;
}

export function setLocale(locale) {
  _locale = normalizeLocale(locale);
  return _locale;
}

export function getLocale() {
  return _locale;
}

export function t(key, locale = _locale) {
  const loc = normalizeLocale(locale);
  return STRINGS[loc]?.[key] ?? STRINGS.zh[key] ?? key;
}

export function fontFamily(_locale) {
  return FONT_FAMILY;
}

export function htmlLang(locale = _locale) {
  const loc = normalizeLocale(locale);
  return {zh: 'zh-CN', en: 'en', ja: 'ja'}[loc] || 'zh-CN';
}
