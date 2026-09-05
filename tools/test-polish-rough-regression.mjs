import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appSource = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

function extractFunctionSource(name) {
  const marker = `function ${name}(`;
  const start = appSource.indexOf(marker);
  if (start < 0) throw new Error(`${name} definition was not found`);
  let depth = 0;
  let seen = false;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;
  for (let i = start; i < appSource.length; i += 1) {
    const ch = appSource[i];
    const next = appSource[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (quote === '`' && ch === '$' && next === '{') { templateDepth += 1; i += 1; continue; }
      if (quote === '`' && ch === '}' && templateDepth > 0) { templateDepth -= 1; continue; }
      if (ch === quote && templateDepth === 0) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; seen = true; }
    if (ch === '}') {
      depth -= 1;
      if (seen && depth === 0) return appSource.slice(start, i + 1);
    }
  }
  throw new Error(`${name} closing brace was not found`);
}

const polishRoughSource = extractFunctionSource('polishRough');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness({
  gemId = 'ruby',
  selectedShape = 'round',
  normalizedShape = selectedShape,
  roughQty = 2,
  workshopOpen = true,
  polishingMachineUsable = true,
  polishingMachineOwned = true,
  diamondLapUsable = true,
  canSpend = true,
  randomValue = 0.5,
} = {}) {
  const state = {
    inventory: { rough: { ruby: gemId === 'ruby' ? roughQty : 0, diamond: gemId === 'diamond' ? roughQty : 0 } },
    daily: { polished: [] },
  };
  const calls = {
    toasts: [], looseAdjust: [], spendHours: [], activeHours: [], notifications: [], xp: [],
    saves: 0, sfx: [], vibrations: [], renders: 0, modals: [], normalize: [],
  };
  const diamondEvent = { totalPolished: 4 };
  const diamondLap = { status: 'usable', failureDueDay: 8, repairCompleteDay: 12 };
  const context = {
    state,
    GEMS: { ruby: { id: 'ruby' }, diamond: { id: 'diamond' } },
    selectedPolishing: gemId,
    selectedPolishingShape: selectedShape,
    POLISHING_HOURS: 2,
    Math: Object.create(Math),
    workshopOperating: () => workshopOpen,
    normalizeLooseShape: (id, shape) => { calls.normalize.push([id, shape]); return normalizedShape; },
    toolUsable: (id) => id === 'polishingMachine' ? polishingMachineUsable : id === 'diamondPolishingLap' ? diamondLapUsable : true,
    toolOwned: (id) => id === 'polishingMachine' ? polishingMachineOwned : true,
    workshopToolStatusText: () => '故障中',
    canSpendHours: (hours) => hours === 2 && canSpend,
    adjustLooseInventory: (...args) => calls.looseAdjust.push(args),
    spendHours: (hours) => calls.spendHours.push(hours),
    addWorkshopActiveHours: (hours) => calls.activeHours.push(hours),
    diamondPolishingLapEventState: () => diamondEvent,
    workshopToolRecord: (id) => id === 'diamondPolishingLap' ? diamondLap : null,
    addNotification: (...args) => calls.notifications.push(args),
    addArtisanXp: (amount) => calls.xp.push(amount),
    saveGame: () => { calls.saves += 1; },
    playSfx: (...args) => calls.sfx.push(args),
    vibrate: (value) => calls.vibrations.push(value),
    render: () => { calls.renders += 1; },
    showModal: (value) => calls.modals.push(value),
    roughDisplayName: (id) => id === 'diamond' ? 'ダイヤモンドの原石' : 'ルビーの原石',
    looseShapeLabel: (shape) => ({ round: 'ラウンド', oval: 'オーバル' }[shape] || shape),
    looseVisual: (id, cls, extra, shape) => `<loose data-id="${id}" data-class="${cls}" data-shape="${shape}"></loose>`,
    showToast: (...args) => calls.toasts.push(args),
  };
  context.Math.random = () => randomValue;
  vm.createContext(context);
  new vm.Script(`"use strict";\n${polishRoughSource}\nglobalThis.__polishRough = polishRough;`).runInContext(context);
  return { state, calls, context, diamondEvent, diamondLap, polishRough: context.__polishRough };
}

function testSuccessfulPolishing() {
  const h = createHarness({ selectedShape: 'round', normalizedShape: 'oval' });
  h.polishRough();
  assert.equal(h.state.inventory.rough.ruby, 1);
  assert.deepEqual(plain(h.calls.normalize), [['ruby', 'round']]);
  assert.deepEqual(plain(h.calls.looseAdjust), [['ruby', 'oval', 1]]);
  assert.deepEqual(plain(h.calls.spendHours), [2]);
  assert.deepEqual(plain(h.calls.activeHours), [2]);
  assert.deepEqual(plain(h.state.daily.polished), [{ gem: 'ruby', looseShape: 'oval', qty: 1 }]);
  assert.equal(h.diamondEvent.totalPolished, 5);
  assert.deepEqual(plain(h.calls.xp), [1]);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.sfx), [['loose-sparkle', { gain: 1.12 }]]);
  assert.deepEqual(plain(h.calls.vibrations), [[35, 25, 55]]);
  assert.equal(h.calls.renders, 1);
  assert.equal(h.calls.modals.length, 1);
  const modal = h.calls.modals[0];
  assert.equal(modal.title, 'ルビーの原石をオーバルへカットしました');
  assert.equal(modal.hideActions, true);
  assert.equal(modal.className, 'polishing-result-modal');
  assert.match(modal.body, /polishing-result-loose-image/);
  assert.match(modal.body, /polishing-result-return/);
  assert.equal(h.calls.notifications.length, 0);
}

function testDiamondLapFailurePath() {
  const h = createHarness({ gemId: 'diamond', randomValue: 0 });
  h.polishRough();
  assert.equal(h.state.inventory.rough.diamond, 1);
  assert.equal(h.diamondLap.status, 'unusable');
  assert.equal(h.diamondLap.failureDueDay, null);
  assert.equal(h.diamondLap.repairCompleteDay, null);
  assert.deepEqual(plain(h.calls.notifications), [[
    'ダイヤモンド研磨用平面研磨盤が故障しました',
    'g-Lab.で50,000円、1週間の修理を依頼できます。',
    'warning',
  ]]);
  assert.equal(h.calls.saves, 1);
}

function snapshotMutation(h) {
  return JSON.stringify({ state: h.state, event: h.diamondEvent, lap: h.diamondLap });
}

function assertGuard(options, expectedMessage) {
  const h = createHarness(options);
  const before = snapshotMutation(h);
  h.polishRough();
  assert.equal(snapshotMutation(h), before);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.renders, 0);
  assert.equal(h.calls.modals.length, 0);
  assert.equal(h.calls.toasts.length, 1);
  assert.equal(h.calls.toasts[0][0], expectedMessage);
  assert.equal(h.calls.toasts[0][1], 'error');
}

function testPolishingGuardRails() {
  assertGuard({ workshopOpen: false }, '工房は作業停止中です。');
  assertGuard({ polishingMachineUsable: false, polishingMachineOwned: true }, '宝石研磨用平面研磨機は故障中です。');
  assertGuard({ polishingMachineUsable: false, polishingMachineOwned: false }, '宝石研磨用平面研磨機が必要です。');
  assertGuard({ gemId: 'diamond', diamondLapUsable: false }, '選択した原石は研磨できません。');
  assertGuard({ roughQty: 0 }, '選択した原石を持っていません。');
  assertGuard({ canSpend: false }, '今日は研磨する時間がありません。');
}

for (const test of [testSuccessfulPolishing, testDiamondLapFailurePath, testPolishingGuardRails]) {
  test();
  console.log(`OK: ${test.name}`);
}
console.log('POLISH ROUGH REGRESSION: PASS');
