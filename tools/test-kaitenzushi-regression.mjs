import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const match = new RegExp(`^function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
  assert.ok(match, `${name} definition missing`);
  const start = match.index;
  const brace = start + match[0].length - 1;
  let depth = 0, quote = null, escaped = false, line = false, block = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i], next = app[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && next === '/') { block = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { line = true; i += 1; continue; }
    if (c === '/' && next === '*') { block = true; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`${name} closing brace missing`);
}

const names = ['startKaitenzushi', 'finishKaitenzushiFromParent', 'completeKaitenzushi', 'handleKaitenzushiMessage'];
const source = names.map(extractFunction).join('\n');
const plain = (value) => JSON.parse(JSON.stringify(value));

function harness(options = {}) {
  const calls = [];
  const saves = [];
  class FakeFrame {}
  const frame = new FakeFrame();
  frame.contentWindow = {};
  const eventState = {
    active: Boolean(options.eventActive),
    stage: options.eventStage || 'idle',
    lastCheckedDate: '',
  };
  const ctx = {
    state: {
      game: { money: options.money ?? 2000, minutes: 900, screen: 'meal' },
      wellbeing: {
        hunger: options.hunger ?? 2,
        maxHunger: options.maxHunger ?? 7,
        lastMeal: options.lastMeal ?? '',
        mealsEaten: options.mealsEaten ?? 0,
      },
      daily: { meals: [] },
      events: { sushiChefEvent: eventState },
      finance: [],
    },
    screen: options.screen || 'meal',
    kaitenzushiSession: null,
    kaitenzushiReadyTimer: null,
    hungerFeedback: null,
    hungerFeedbackTimer: null,
    root: { querySelector: () => frame },
    HTMLIFrameElement: FakeFrame,
    console,
    hungerLevel: () => ctx.state.wellbeing.hunger,
    sushiChefEventState: () => eventState,
    canSpendMealTime: () => options.canSpendTime !== false,
    mealTimeUnavailableMessage: () => '今日は食事をする時間がありません。',
    maybeStartSushiChefEvent: () => Boolean(options.startEvent),
    clearKaitenzushiLoadWatch: () => calls.push(['clear-load-watch']),
    setScreen: (name, data = {}, push = true) => {
      ctx.screen = name;
      calls.push(['screen', name, plain(data), push]);
    },
    showToast: (...args) => calls.push(['toast', ...plain(args)]),
    addFinance: (...args) => {
      calls.push(['finance', ...plain(args)]);
      ctx.state.finance.push(args);
    },
    startMoneyFeedback: (...args) => calls.push(['money-feedback', ...plain(args)]),
    spendMealTime: () => {
      calls.push(['spend-meal-time']);
      ctx.state.game.minutes += 60;
    },
    saveGame: () => {
      calls.push(['save']);
      saves.push(structuredClone(ctx.state));
    },
    vibrate: (...args) => calls.push(['vibrate', ...plain(args)]),
    goMain: () => {
      ctx.screen = 'main';
      ctx.state.game.screen = 'main';
      calls.push(['go-main']);
    },
    playSfx: (...args) => calls.push(['sfx', ...plain(args)]),
    yen: (value) => `¥${Number(value).toLocaleString('ja-JP')}`,
    clearTimeout: (id) => calls.push(['clear-timeout', id]),
    setTimeout: (fn, ms) => { calls.push(['set-timeout', ms]); return 1; },
    duckCurrentAmbient: (...args) => calls.push(['duck', ...plain(args)]),
    structuredClone,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:kaitenzushi' });
  return {
    ctx, calls, saves, frame, eventState,
    start: (opts) => ctx.startKaitenzushi(opts),
    finish: (total, plates) => ctx.completeKaitenzushi(total, plates),
    parentFinish: () => ctx.finishKaitenzushiFromParent(),
    message: (data, sourceOverride = frame.contentWindow) => ctx.handleKaitenzushiMessage({ source: sourceOverride, data }),
  };
}

const count = (h, name) => h.calls.filter((row) => row[0] === name).length;

function testStartGuardsAndBudget() {
  for (const [options, expected] of [
    [{ hunger: 7 }, '空腹度は満タンです。'],
    [{ lastMeal: 'kaitenzushi', mealsEaten: 1 }, '栄養が片寄るので違うものを食べましょう'],
    [{ money: 189 }, '回転寿司を食べるための所持金が足りません。'],
    [{ canSpendTime: false }, '今日は食事をする時間がありません。'],
  ]) {
    const h = harness(options);
    h.start();
    assert.equal(h.ctx.kaitenzushiSession, null);
    assert.ok(h.calls.some((row) => row[0] === 'toast' && row[1] === expected));
  }

  const h = harness({ money: 1234 });
  h.start();
  assert.equal(h.ctx.screen, 'kaitenzushi');
  assert.deepEqual(plain(h.ctx.kaitenzushiSession), {
    budget: 1234, total: 0, plates: 0, settled: false, free: false, ready: false, loadError: false,
  });
}

function testResumeAndFreeStart() {
  const intro = harness({ eventActive: true, eventStage: 'intro1', hunger: 7, money: 0, canSpendTime: false });
  intro.start();
  assert.equal(intro.ctx.screen, 'sushiChefEvent');
  assert.equal(intro.ctx.kaitenzushiSession, null);

  const playing = harness({ eventActive: true, eventStage: 'playing', hunger: 7, money: 0, canSpendTime: false });
  playing.start();
  assert.equal(playing.ctx.screen, 'kaitenzushi');
  assert.equal(playing.ctx.kaitenzushiSession.free, true);
  assert.equal(playing.ctx.kaitenzushiSession.budget, Number.MAX_SAFE_INTEGER);

  const explicit = harness({ money: 0 });
  explicit.start({ skipEventCheck: true, free: true });
  assert.equal(explicit.ctx.kaitenzushiSession.free, true);
  assert.equal(explicit.ctx.kaitenzushiSession.budget, Number.MAX_SAFE_INTEGER);
}

function testAmountPlateValidation() {
  const mismatch = harness();
  mismatch.start();
  mismatch.ctx.kaitenzushiSession.total = 380;
  mismatch.ctx.kaitenzushiSession.plates = 2;
  mismatch.finish(570, 3);
  assert.equal(mismatch.ctx.kaitenzushiSession.settled, false);
  assert.equal(mismatch.ctx.state.game.money, 2000);
  assert.equal(count(mismatch, 'finance'), 0);
  assert.equal(count(mismatch, 'spend-meal-time'), 0);

  const implausible = harness();
  implausible.start();
  implausible.ctx.kaitenzushiSession.total = 100;
  implausible.ctx.kaitenzushiSession.plates = 1;
  implausible.finish(100, 1);
  assert.equal(implausible.ctx.kaitenzushiSession.settled, false);
  assert.equal(implausible.ctx.state.game.money, 2000);

  const overBudget = harness({ money: 300 });
  overBudget.start();
  overBudget.ctx.kaitenzushiSession.total = 380;
  overBudget.ctx.kaitenzushiSession.plates = 2;
  overBudget.finish(380, 2);
  assert.equal(overBudget.ctx.kaitenzushiSession.settled, false);
  assert.equal(overBudget.ctx.state.game.money, 300);
  assert.ok(overBudget.calls.some((row) => row[0] === 'toast' && row[1].includes('お会計金額を確認できませんでした')));
}

function testNormalSettlementAndDoubleSettlement() {
  const h = harness({ money: 2000, hunger: 2 });
  h.start();
  h.ctx.kaitenzushiSession.total = 760;
  h.ctx.kaitenzushiSession.plates = 2;
  h.finish(760, 2);

  assert.equal(h.ctx.state.game.money, 1240);
  assert.deepEqual(plain(h.ctx.state.finance), [['回転寿司で食事', 0, 760]]);
  assert.equal(h.ctx.state.game.minutes, 960);
  assert.equal(h.ctx.state.wellbeing.hunger, 4);
  assert.equal(h.ctx.state.wellbeing.lastMeal, 'kaitenzushi');
  assert.equal(h.ctx.state.wellbeing.mealsEaten, 1);
  assert.deepEqual(plain(h.ctx.state.daily.meals), [{
    id: 'kaitenzushi', name: '回転寿司', price: 760, recovery: 2, plates: 2,
  }]);
  assert.equal(h.saves.length, 1);
  assert.equal(h.ctx.kaitenzushiSession, null);
  assert.equal(h.ctx.screen, 'main');
  assert.equal(count(h, 'finance'), 1);
  assert.equal(count(h, 'spend-meal-time'), 1);

  h.finish(760, 2);
  assert.equal(h.ctx.state.game.money, 1240);
  assert.equal(count(h, 'finance'), 1);
  assert.equal(count(h, 'spend-meal-time'), 1);
  assert.equal(h.saves.length, 1);
}

function testZeroPlateExit() {
  const h = harness({ money: 777, hunger: 3 });
  h.start();
  h.finish(0, 0);
  assert.equal(h.ctx.state.game.money, 777);
  assert.equal(h.ctx.state.game.minutes, 900);
  assert.equal(h.ctx.state.wellbeing.hunger, 3);
  assert.equal(h.ctx.state.wellbeing.lastMeal, '');
  assert.equal(h.ctx.state.wellbeing.mealsEaten, 0);
  assert.deepEqual(plain(h.ctx.state.daily.meals), []);
  assert.deepEqual(plain(h.ctx.state.finance), []);
  assert.equal(count(h, 'spend-meal-time'), 0);
  assert.equal(h.saves.length, 1);
  assert.ok(h.calls.some((row) => row[0] === 'toast' && row[1] === '何も食べずにお店を出ました。'));
}

function testFreeSettlementReturnsEvent() {
  const h = harness({ eventActive: true, eventStage: 'playing', money: 0, hunger: 1 });
  h.start();
  h.ctx.kaitenzushiSession.total = 0;
  h.ctx.kaitenzushiSession.plates = 3;
  h.finish(0, 3);

  assert.equal(h.ctx.state.game.money, 0);
  assert.equal(h.ctx.state.game.minutes, 960);
  assert.equal(h.ctx.state.wellbeing.hunger, 4);
  assert.deepEqual(plain(h.ctx.state.daily.meals), [{
    id: 'kaitenzushi', name: '回転寿司', price: 0, recovery: 3, plates: 3,
  }]);
  assert.equal(h.eventState.active, true);
  assert.equal(h.eventState.stage, 'farewell');
  assert.equal(h.eventState.lastPlates, 3);
  assert.equal(h.eventState.lastHungerBefore, 1);
  assert.equal(h.eventState.lastHungerAfter, 4);
  assert.equal(h.ctx.state.game.screen, 'sushiChefEvent');
  assert.equal(h.ctx.screen, 'sushiChefEvent');
  assert.equal(h.ctx.kaitenzushiSession, null);
  assert.equal(count(h, 'finance'), 0);
  assert.equal(count(h, 'money-feedback'), 0);
  assert.equal(count(h, 'spend-meal-time'), 1);
  assert.equal(h.saves.length, 1);
  assert.equal(count(h, 'vibrate'), 1);
}

function testMessageProgressAndCheckout() {
  const h = harness({ money: 1000 });
  h.start();
  h.message({ source: 'jxj-kaitenzushi', type: 'progress', total: 380, plates: 2 }, {});
  assert.equal(h.ctx.kaitenzushiSession.total, 0);
  assert.equal(h.ctx.kaitenzushiSession.plates, 0);

  h.message({ source: 'jxj-kaitenzushi', type: 'progress', total: 380, plates: 2 });
  assert.equal(h.ctx.kaitenzushiSession.total, 380);
  assert.equal(h.ctx.kaitenzushiSession.plates, 2);

  h.message({ source: 'jxj-kaitenzushi', type: 'progress', total: 1200, plates: 3 });
  assert.equal(h.ctx.kaitenzushiSession.total, 380);
  assert.equal(h.ctx.kaitenzushiSession.plates, 2);

  h.message({ source: 'jxj-kaitenzushi', type: 'checkout', total: 380, plates: 2 });
  assert.equal(h.ctx.state.game.money, 620);
  assert.equal(h.ctx.kaitenzushiSession, null);
  assert.equal(count(h, 'finance'), 1);

  h.message({ source: 'jxj-kaitenzushi', type: 'checkout', total: 380, plates: 2 });
  assert.equal(h.ctx.state.game.money, 620);
  assert.equal(count(h, 'finance'), 1);
}

function testParentFinishUsesTrackedProgress() {
  const h = harness({ money: 1000 });
  h.start();
  h.ctx.kaitenzushiSession.total = 570;
  h.ctx.kaitenzushiSession.plates = 3;
  h.parentFinish();
  assert.equal(h.ctx.state.game.money, 430);
  assert.equal(h.ctx.state.wellbeing.hunger, 5);

  const empty = harness();
  empty.parentFinish();
  assert.equal(empty.ctx.screen, 'meal');
}

for (const test of [
  testStartGuardsAndBudget,
  testResumeAndFreeStart,
  testAmountPlateValidation,
  testNormalSettlementAndDoubleSettlement,
  testZeroPlateExit,
  testFreeSettlementReturnsEvent,
  testMessageProgressAndCheckout,
  testParentFinishUsesTrackedProgress,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('KAITENZUSHI REGRESSION: PASS');
