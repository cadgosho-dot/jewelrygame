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

const finishMiningRockSource = extractFunctionSource('finishMiningRock');
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness({
  noGame = false,
  resolved = false,
  winningRocks = [2],
  diamondLapOwned = false,
  weightedGem = 'ruby',
  unlockedLocations = [{ name: '山道' }],
} = {}) {
  const state = {
    inventory: { rough: { ruby: 2, diamond: 1 } },
    daily: { mined: [] },
    miningProgress: { successfulFinds: 4 },
  };
  const rocks = [{ disabled: false }, { disabled: false }, { disabled: false }];
  const buttonClasses = [];
  const button = { classList: { add: (name) => buttonClasses.push(name) } };
  const location = {
    id: 'river',
    hours: 2,
    gems: [
      { id: 'diamond', weight: 25 },
      { id: 'ruby', weight: 75 },
    ],
  };
  const calls = {
    buttonClasses,
    spendHours: [],
    weightedPools: [],
    unlocks: 0,
    saves: 0,
    timers: [],
    sfx: [],
    vibrations: [],
    screens: [],
    missImages: 0,
    rockQueries: [],
  };
  const miningGame = noGame ? null : {
    resolved,
    locationId: 'river',
    winningRocks: [...winningRocks],
  };
  const context = {
    state,
    miningGame,
    root: {
      querySelectorAll(selector) {
        calls.rockQueries.push(selector);
        return rocks;
      },
    },
    miningLocationById(id) {
      assert.equal(id, 'river');
      return location;
    },
    spendHours(hours) { calls.spendHours.push(hours); },
    pickRandomMiningBrokenRockImage() {
      calls.missImages += 1;
      return 'broken-rock.png';
    },
    toolOwned(id) {
      return id === 'diamondPolishingLap' ? diamondLapOwned : false;
    },
    weightedPick(pool) {
      calls.weightedPools.push(pool.map((entry) => ({ ...entry })));
      const match = pool.find((entry) => entry.id === weightedGem);
      return (match || pool[0]).id;
    },
    unlockMiningLocationsIfNeeded() {
      calls.unlocks += 1;
      return unlockedLocations.map((row) => ({ ...row }));
    },
    saveGame() { calls.saves += 1; },
    setTimeout(callback, delay) { calls.timers.push({ callback, delay }); return calls.timers.length; },
    playSfx(...args) { calls.sfx.push(args); },
    vibrate(value) { calls.vibrations.push(value); },
    setScreen(...args) { calls.screens.push(args); },
  };
  vm.createContext(context);
  new vm.Script(`"use strict";\n${finishMiningRockSource}\nglobalThis.__finishMiningRock = finishMiningRock;`).runInContext(context);
  const flushTimers = () => {
    const pending = calls.timers.splice(0);
    for (const timer of pending) timer.callback();
  };
  return { state, rocks, button, calls, context, location, finishMiningRock: context.__finishMiningRock, flushTimers };
}

function testSuccessfulMiningFind() {
  const h = createHarness();
  h.finishMiningRock(2, h.button);

  assert.equal(h.context.miningGame.resolved, true);
  assert.deepEqual(h.calls.buttonClasses, ['breaking']);
  assert.deepEqual(h.calls.rockQueries, ['.mining-rock']);
  assert.ok(h.rocks.every((rock) => rock.disabled));
  assert.deepEqual(h.calls.spendHours, [2]);
  assert.equal(h.calls.missImages, 1);
  assert.deepEqual(plain(h.calls.weightedPools), [[{ id: 'ruby', weight: 75 }]]);
  assert.equal(h.state.inventory.rough.ruby, 3);
  assert.equal(h.state.inventory.rough.diamond, 1);
  assert.deepEqual(plain(h.state.daily.mined), [{ gem: 'ruby', qty: 1 }]);
  assert.equal(h.state.miningProgress.successfulFinds, 5);
  assert.equal(h.calls.unlocks, 1);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.timers.length, 1);
  assert.equal(h.calls.timers[0].delay, 560);
  assert.equal(h.calls.sfx.length, 0);
  assert.equal(h.calls.screens.length, 0);

  h.flushTimers();
  assert.equal(h.context.miningGame, null);
  assert.deepEqual(plain(h.calls.sfx), [['mining-win', { gain: 1.15 }]]);
  assert.deepEqual(plain(h.calls.vibrations), [[55, 35, 85]]);
  assert.deepEqual(plain(h.calls.screens), [[
    'miningResult',
    { result: { gem: 'ruby', qty: 1, unlockedLocation: '山道' } },
    false,
  ]]);
}

function testMiningMissStillConsumesTimeAndSaves() {
  const h = createHarness({ winningRocks: [1], unlockedLocations: [] });
  const beforeInventory = plain(h.state.inventory);
  h.finishMiningRock(2, h.button);

  assert.equal(h.context.miningGame.resolved, true);
  assert.deepEqual(h.calls.spendHours, [2]);
  assert.deepEqual(plain(h.state.inventory), beforeInventory);
  assert.deepEqual(plain(h.state.daily.mined), []);
  assert.equal(h.state.miningProgress.successfulFinds, 4);
  assert.equal(h.calls.weightedPools.length, 0);
  assert.equal(h.calls.unlocks, 0);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.timers.length, 1);
  assert.equal(h.calls.timers[0].delay, 560);

  h.flushTimers();
  assert.equal(h.context.miningGame, null);
  assert.deepEqual(plain(h.calls.sfx), [['mining-miss', { gain: 1.12 }]]);
  assert.deepEqual(plain(h.calls.vibrations), []);
  assert.deepEqual(plain(h.calls.screens), [[
    'miningResult',
    { result: { missRockImage: 'broken-rock.png' } },
    false,
  ]]);
}

function assertGuard(options) {
  const h = createHarness(options);
  const before = JSON.stringify({ state: h.state, miningGame: h.context.miningGame, rocks: h.rocks });
  h.finishMiningRock(2, h.button);
  const after = JSON.stringify({ state: h.state, miningGame: h.context.miningGame, rocks: h.rocks });
  assert.equal(after, before);
  assert.deepEqual(h.calls.buttonClasses, []);
  assert.deepEqual(h.calls.spendHours, []);
  assert.equal(h.calls.saves, 0);
  assert.equal(h.calls.timers.length, 0);
  assert.equal(h.calls.screens.length, 0);
}

function testMiningResolutionGuardRails() {
  assertGuard({ noGame: true });
  assertGuard({ resolved: true });
}

for (const test of [testSuccessfulMiningFind, testMiningMissStillConsumesTimeAndSaves, testMiningResolutionGuardRails]) {
  test();
  console.log(`OK: ${test.name}`);
}
console.log('FINISH MINING ROCK REGRESSION: PASS');
