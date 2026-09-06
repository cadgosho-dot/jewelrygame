import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
// These current declarations have single-line headers. Match THROUGH the
// parameter list so destructuring/default-argument braces are not body braces.
function extractFunction(name) {
  const match = new RegExp(`^(?:async )?function ${name}\\([^\\n]*\\) \\{`, 'm').exec(app);
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
const names = ['canSpendMinutes', 'canSpendMealTime', 'spendMealTime', 'resumeActiveMealEvent', 'eatMeal'];
const source = names.map(extractFunction).join('\n');
const plain = (value) => JSON.parse(JSON.stringify(value));
const routes = {
  convenience: ['Cyclops'], ice: ['WhiteBunnyIce'], kebab: ['EmeraldCaptainKebab'],
  hamburger: ['TouristWoodSword', 'TerryCalifornia'], indian: ['DiamondPolishingLap', 'GaneshaTusk'],
  ramen: ['ChildhoodFriend'], soba: ['RidleyOkazakiSoba'], chinese: ['MysteryChineseMeal'], korean: ['GrayHoodAquarium'],
};
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function harness(options = {}) {
  const calls = [], saves = [], timers = [];
  const record = (name, ...args) => calls.push([name, ...plain(args)]);
  const meals = Object.fromEntries([...Object.keys(routes), 'plain'].map((id) => [id, { name: id, price: 800, recovery: 4 }]));
  const ctx = {
    state: {
      game: { money: options.money ?? 5000, minutes: options.minutes ?? 1200, day: 42, screen: 'main' },
      wellbeing: { hunger: options.hunger ?? 2, lastMeal: options.lastMeal ?? '', mealsEaten: options.mealsEaten ?? 0 },
      daily: { meals: [] }, events: options.events ?? {}, inventory: { rough: { ruby: 3 } }, finance: [],
    },
    mealTransitioning: options.busy ?? false, selectedMeal: null, screen: 'main', screenData: {}, navigation: ['meal'],
    pendingDayMoneyDelta: 123, hungerFeedback: null, hungerFeedbackTimer: 0, mealEatingCompletionController: {},
    MEALS: meals, MEAL_DURATION_MINUTES: 60, DAY_END_MINUTES: 1320, structuredClone,
    console: { error: () => record('error') },
    hungerLevel: () => ctx.state.wellbeing.hunger,
    showToast: (...args) => record('toast', ...args),
    mealTimeUnavailableMessage: () => '食事時間不足',
    tryRandomEventStarters: (starters) => starters.some((start) => start()),
    startIceMealAudio: () => record('ice-start'), stopIceMealAudio: () => record('ice-stop'),
    preloadMealAssets: async (id) => { record('preload', id); if (options.fail === 'preload') throw Error('preload'); await options.preload; },
    addFinance: (...args) => { record('finance', ...args); ctx.state.finance.push(args); },
    spendMinutes: (minutes, settings) => {
      record('spend', minutes, settings); ctx.state.game.minutes += minutes;
      if (settings.consumeHunger) ctx.state.wellbeing.hunger -= minutes / 60;
      if (options.fail === 'spend') throw Error('spend');
    },
    saveGame: () => { record('save'); saves.push(structuredClone(ctx.state)); },
    startMoneyFeedback: (...args) => { record('money-feedback', ...args); if (options.fail === 'feedback') throw Error('feedback'); },
    setScreen: (name, data = {}, ...rest) => { record('screen', name, data, ...rest); ctx.screen = name; ctx.screenData = data; },
    waitForMealEatingCompletion: () => { record('eating'); return options.eating ?? Promise.resolve(); },
    waitForNextPaintWithTimeout: async () => { record('paint'); if (options.fail === 'paint') throw Error('paint'); },
    startOyatsuIceReturnAfterMeal: () => { record('oyatsu'); return options.oyatsu ?? false; },
    clearTimeout: (id) => record('clear-timer', id),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    playSfx: (...args) => record('sound', ...args), render: () => record('render'),
  };
  for (const route of Object.values(routes).flat()) {
    ctx[`maybeStart${route}Event`] = () => { record('event', route); return route === options.event; };
  }
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:manual-meal' });
  return { ctx, calls, saves, timers, initial: structuredClone(ctx.state), eat: (id = 'plain', opts) => ctx.eatMeal(id, opts) };
}
const count = (h, name) => h.calls.filter((row) => row[0] === name).length;
function unchanged(h) { assert.deepEqual(plain(h.ctx.state), h.initial); assert.equal(h.saves.length, 0); }
function committed(h, id = 'plain', price = 800, hunger = 6) {
  assert.equal(h.ctx.state.game.money, h.initial.game.money - price);
  assert.equal(h.ctx.state.game.minutes, h.initial.game.minutes + 60);
  assert.equal(h.ctx.state.game.day, 42);
  assert.equal(h.ctx.state.wellbeing.hunger, hunger);
  assert.equal(h.ctx.state.wellbeing.lastMeal, id);
  assert.equal(h.ctx.state.wellbeing.mealsEaten, h.initial.wellbeing.mealsEaten + 1);
  assert.deepEqual(plain(h.ctx.state.daily.meals), [{ id, name: id, price, recovery: hunger - h.initial.wellbeing.hunger }]);
  assert.deepEqual(plain(h.ctx.state.finance), [[`${id}で食事`, 0, price]]);
  assert.deepEqual(plain(h.ctx.state.inventory), h.initial.inventory);
  assert.deepEqual(h.calls.filter((x) => x[0] === 'spend'), [['spend', 60, { consumeHunger: false }]]);
}
async function testGuardsAndTimeBoundary() {
  for (const [options, id, message] of [
    [{}, 'missing', null], [{ busy: true }, 'plain', null],
    [{ hunger: 7 }, 'plain', '空腹度は満タンです。'],
    [{ lastMeal: 'plain', mealsEaten: 1 }, 'plain', '栄養が片寄るので違うものを食べましょう'],
    [{ money: 799 }, 'plain', '所持金が足りません。'],
    [{ minutes: 1261 }, 'plain', '食事時間不足'],
  ]) {
    const h = harness(options); await h.eat(id); unchanged(h);
    assert.equal(count(h, 'preload'), 0);
    assert.equal(count(h, 'event'), 0);
    assert.deepEqual(h.calls, message ? [['toast', message, 'error']] : []);
  }
  const h = harness({ minutes: 1260, money: 800 }); await h.eat(); committed(h);
  assert.equal(h.ctx.state.game.minutes, 1320);
}
async function testAtomicCommitBeforePresentation() {
  const gate = deferred();
  const h = harness({ eating: gate.promise }); const task = h.eat();
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
  committed(h); assert.equal(h.saves.length, 1);
  assert.deepEqual(h.saves[0], plain(h.ctx.state));
  assert.equal(h.ctx.screen, 'meal'); assert.equal(h.ctx.mealTransitioning, true);
  const order = h.calls.map((x) => x[0]);
  for (const [a, b] of [['preload', 'finance'], ['finance', 'spend'], ['spend', 'save'], ['save', 'money-feedback'], ['save', 'screen'], ['screen', 'eating']]) {
    assert.ok(order.indexOf(a) < order.indexOf(b), `${a} must precede ${b}`);
  }
  await h.eat('ramen'); assert.equal(count(h, 'finance'), 1);
  gate.resolve(); await task;
  assert.equal(h.ctx.screen, 'main'); assert.equal(h.ctx.mealTransitioning, false);
  assert.equal(h.ctx.mealEatingCompletionController, null);
  assert.deepEqual(plain(h.ctx.hungerFeedback), { before: 2, after: 6, mealName: 'plain' });
  assert.equal(h.timers[0].ms, 1550); h.timers[0].fn();
  assert.equal(h.ctx.hungerFeedback, null); assert.equal(count(h, 'render'), 1);
}
async function testConcurrentPreloadGuard() {
  const gate = deferred(); const h = harness({ preload: gate.promise });
  const first = h.eat(); await h.eat('ramen');
  unchanged(h); assert.equal(count(h, 'preload'), 1); assert.equal(h.ctx.mealTransitioning, true);
  gate.resolve(); await first; committed(h); assert.equal(h.saves.length, 1);
}
async function testPriceNormalizationAndHungerCap() {
  for (const [value, expected] of [[null, 800], [0, 0], [-100, 0], ['123.9', 123], ['invalid', 0]]) {
    const h = harness({ hunger: 5 }); await h.eat('plain', { priceOverride: value }); committed(h, 'plain', expected, 7);
  }
  const firstMeal = harness({ lastMeal: 'plain', mealsEaten: 0 }); await firstMeal.eat(); committed(firstMeal);
  const ice = harness({ lastMeal: 'ice', mealsEaten: 2 }); await ice.eat('ice'); committed(ice, 'ice');
  assert.equal(count(ice, 'ice-start'), 1); assert.equal(count(ice, 'oyatsu'), 1);
}
async function testActiveEventResumePrecedesGuards() {
  for (const [meal, starters] of Object.entries(routes)) {
    for (const starter of starters) {
      const key = starter[0].toLowerCase() + starter.slice(1) + 'Event';
      const h = harness({ hunger: 7, money: 0, minutes: 1320, lastMeal: meal, mealsEaten: 2, events: { [key]: { active: true, stage: 'intro' } } });
      await h.eat(meal); unchanged(h);
      assert.deepEqual(h.calls, [['screen', key, { mealId: meal }, false]]);
    }
  }
  for (const event of [{ active: false, stage: 'intro' }, { active: true, stage: 'idle' }, { active: true, stage: 'completed' }, { active: true }]) {
    const h = harness({ events: { childhoodFriendEvent: event } }); await h.eat('ramen'); committed(h, 'ramen');
  }
  const first = harness({ events: { touristWoodSwordEvent: { active: true, stage: 'intro' }, terryCaliforniaEvent: { active: true, stage: 'intro' } } });
  await first.eat('hamburger'); assert.equal(first.ctx.screen, 'touristWoodSwordEvent'); unchanged(first);
}
async function testNewEventRoutesAndSkipOption() {
  for (const [meal, starters] of Object.entries(routes)) {
    for (const starter of starters) {
      const h = harness({ event: starter }); await h.eat(meal); unchanged(h);
      assert.deepEqual(h.calls, starters.slice(0, starters.indexOf(starter) + 1).map((x) => ['event', x]));
      const skipped = harness({ event: starter }); await skipped.eat(meal, { skipEventCheck: true }); committed(skipped, meal);
      assert.equal(count(skipped, 'event'), 0);
    }
  }
  const h = harness({ events: { childhoodFriendEvent: { active: true, stage: 'intro' } } });
  await h.eat('ramen', { skipEventCheck: true }); committed(h, 'ramen');
}
async function testPreCommitRollbackAndPostCommitRecovery() {
  for (const fail of ['preload', 'spend']) {
    const h = harness({ fail }); await h.eat();
    assert.deepEqual(plain(h.ctx.state), h.initial); assert.deepEqual(h.saves, [h.initial]);
    assert.equal(h.ctx.screen, 'main'); assert.equal(h.ctx.mealTransitioning, false);
    assert.equal(h.ctx.mealEatingCompletionController, null); assert.equal(h.ctx.pendingDayMoneyDelta, 0);
    assert.deepEqual(plain(h.ctx.navigation), []); assert.deepEqual(plain(h.ctx.screenData), {});
    assert.ok(h.calls.some((x) => x[0] === 'toast' && x[1].includes('直前の状態へ戻しました')));
  }
  for (const fail of ['feedback', 'paint']) {
    const h = harness({ fail }); await h.eat(); committed(h);
    assert.equal(h.saves.length, 2); assert.deepEqual(h.saves[0], h.saves[1]);
    assert.equal(h.ctx.screen, 'main'); assert.equal(h.ctx.state.game.screen, 'main');
    assert.equal(h.ctx.mealTransitioning, false); assert.equal(h.ctx.mealEatingCompletionController, null);
    assert.equal(h.ctx.pendingDayMoneyDelta, 0); assert.equal(count(h, 'finance'), 1);
    assert.ok(h.calls.some((x) => x[0] === 'toast' && x[1].includes('食事は完了しています')));
  }
}
async function testIceReturnAndFeedbackTimer() {
  const h = harness({ oyatsu: true }); await h.eat('ice'); committed(h, 'ice');
  assert.equal(h.calls.filter((x) => x[0] === 'screen' && x[1] === 'main').length, 0);
  assert.equal(h.ctx.mealTransitioning, false); assert.equal(h.ctx.mealEatingCompletionController, null);
  assert.equal(h.timers[0].ms, 1550); h.timers[0].fn(); assert.equal(h.ctx.hungerFeedback, null);
  assert.equal(count(h, 'render'), 0);
  const normal = harness(); await normal.eat(); normal.ctx.screen = 'phone'; normal.timers[0].fn();
  assert.equal(count(normal, 'render'), 0);
}
for (const test of [testGuardsAndTimeBoundary, testAtomicCommitBeforePresentation, testConcurrentPreloadGuard,
  testPriceNormalizationAndHungerCap, testActiveEventResumePrecedesGuards, testNewEventRoutesAndSkipOption,
  testPreCommitRollbackAndPostCommitRecovery, testIceReturnAndFeedbackTimer]) {
  await test(); console.log(`OK: ${test.name}`);
}
console.log('MANUAL MEAL REGRESSION: PASS');
