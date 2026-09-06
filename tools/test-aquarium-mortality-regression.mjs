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

const names = ['processAquariumFishMortality', 'processAquariumPlantMortality'];
const source = names.map(extractFunction).join('\n');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeNotices(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}`, day: index + 1 }));
}

function harness(options = {}) {
  const calls = [];
  const fishIndividuals = options.fishIndividuals ?? [
    { id: 'f1', bornDay: 1 },
    { id: 'f2', bornDay: 2 },
    { id: 'f3', bornDay: 3 },
  ];
  const plantIndividuals = options.plantIndividuals ?? [
    { id: 'p1', plantedDay: 1 },
    { id: 'p2', plantedDay: 2 },
    { id: 'p3', plantedDay: 3 },
  ];
  const aquarium = {
    fish: {
      neon: {
        owned: options.fishOwned ?? 3,
        inTank: options.fishInTank ?? 2,
        individuals: structuredClone(fishIndividuals),
      },
    },
    plants: {
      moss: {
        owned: options.plantOwned ?? 3,
        inTank: options.plantInTank ?? 2,
        individuals: structuredClone(plantIndividuals),
      },
    },
    mortality: {
      lastProcessedDay: options.lastProcessedDay ?? 0,
      totalDeaths: options.totalDeaths ?? 4,
      lastViewedDeathDay: 0,
      pendingNotices: options.pendingNotices ? structuredClone(options.pendingNotices) : [],
      plantLastProcessedDay: options.plantLastProcessedDay ?? 0,
      totalWithered: options.totalWithered ?? 5,
      lastViewedWitherDay: 0,
      plantPendingNotices: options.plantPendingNotices ? structuredClone(options.plantPendingNotices) : [],
    },
    lastSyncRevision: options.lastSyncRevision ?? 10,
  };
  const fakeMath = Object.create(Math);
  const randomValues = [...(options.randomValues ?? [])];
  fakeMath.random = () => randomValues.length ? randomValues.shift() : (options.random ?? 0.99);
  const ctx = {
    state: options.missingState ? null : { game: { day: options.day ?? 12 } },
    AQUARIUM_CONFIG: {
      fish: [{ id: 'neon', name: 'ネオンテトラ' }],
      plants: [{ id: 'moss', name: 'ウィローモス' }],
    },
    aquariumUnlocked: () => options.unlocked !== false,
    aquariumState: () => aquarium,
    ensureAquariumFishIndividuals: (value) => value,
    ensureAquariumPlantIndividuals: (value) => value,
    aquariumMortalityState: (value) => value.mortality,
    aquariumDailyMortalityFactor: () => options.tankFactor ?? 1,
    aquariumIndividualDeathChance: (...args) => {
      calls.push(['fish-chance', ...plain(args)]);
      return options.fishChance ?? 0;
    },
    aquariumIndividualPlantDeathChance: (...args) => {
      calls.push(['plant-chance', ...plain(args)]);
      return options.plantChance ?? 0;
    },
    refreshAquariumLoad: (value) => calls.push(['refresh-load', value.lastSyncRevision]),
    Math: fakeMath,
    Date: class extends Date { static now() { return 1234567890; } },
    structuredClone,
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx, { filename: 'app.js:aquarium-mortality' });
  return {
    ctx,
    aquarium,
    calls,
    fish: () => plain(ctx.processAquariumFishMortality()),
    plants: () => plain(ctx.processAquariumPlantMortality()),
  };
}

function testLockedAndSameDayGuards() {
  const locked = harness({ unlocked: false, fishChance: 1, plantChance: 1 });
  assert.deepEqual(locked.fish(), []);
  assert.deepEqual(locked.plants(), []);
  assert.equal(locked.aquarium.mortality.lastProcessedDay, 0);
  assert.equal(locked.aquarium.mortality.plantLastProcessedDay, 0);
  assert.equal(locked.calls.length, 0);

  const sameDay = harness({ day: 12, lastProcessedDay: 12, plantLastProcessedDay: 12, fishChance: 1, plantChance: 1 });
  assert.deepEqual(sameDay.fish(), []);
  assert.deepEqual(sameDay.plants(), []);
  assert.equal(sameDay.aquarium.fish.neon.owned, 3);
  assert.equal(sameDay.aquarium.plants.moss.owned, 3);
  assert.equal(sameDay.calls.length, 0);
}

function testFishNoDeathStillMarksDay() {
  const h = harness({ day: 12, fishChance: 0, random: 0.99 });
  assert.deepEqual(h.fish(), []);
  assert.equal(h.aquarium.mortality.lastProcessedDay, 12);
  assert.equal(h.aquarium.fish.neon.owned, 3);
  assert.equal(h.aquarium.fish.neon.inTank, 2);
  assert.equal(h.aquarium.fish.neon.individuals.length, 3);
  assert.equal(h.aquarium.mortality.totalDeaths, 4);
  assert.equal(h.aquarium.mortality.pendingNotices.length, 0);
  assert.equal(h.aquarium.lastSyncRevision, 10);
  assert.equal(h.calls.filter((row) => row[0] === 'fish-chance').length, 2);
  assert.equal(h.calls.filter((row) => row[0] === 'refresh-load').length, 0);
  assert.deepEqual(h.fish(), []);
  assert.equal(h.calls.filter((row) => row[0] === 'fish-chance').length, 2);
}

function testFishDeathsUpdateCountsNoticeAndRevision() {
  const oldNotices = makeNotices('old-fish', 30);
  const h = harness({ day: 12, fishChance: 1, random: 0, pendingNotices: oldNotices });
  const deaths = h.fish();
  assert.deepEqual(deaths, [{ id: 'neon', name: 'ネオンテトラ', count: 2 }]);
  assert.equal(h.aquarium.mortality.lastProcessedDay, 12);
  assert.equal(h.aquarium.fish.neon.owned, 1);
  assert.equal(h.aquarium.fish.neon.inTank, 0);
  assert.deepEqual(plain(h.aquarium.fish.neon.individuals), [{ id: 'f3', bornDay: 3 }]);
  assert.equal(h.aquarium.mortality.totalDeaths, 6);
  assert.equal(h.aquarium.mortality.pendingNotices.length, 30);
  assert.equal(h.aquarium.mortality.pendingNotices[0].id, 'old-fish-1');
  const notice = h.aquarium.mortality.pendingNotices.at(-1);
  assert.equal(notice.day, 12);
  assert.deepEqual(plain(notice.deaths), deaths);
  assert.equal(h.aquarium.lastSyncRevision, 11);
  assert.equal(h.calls.filter((row) => row[0] === 'refresh-load').length, 1);
  assert.equal(h.calls.filter((row) => row[0] === 'fish-chance').length, 2);
}

function testPlantNoWitherStillMarksDay() {
  const h = harness({ day: 12, plantChance: 0, random: 0.99 });
  assert.deepEqual(h.plants(), []);
  assert.equal(h.aquarium.mortality.plantLastProcessedDay, 12);
  assert.equal(h.aquarium.plants.moss.owned, 3);
  assert.equal(h.aquarium.plants.moss.inTank, 2);
  assert.equal(h.aquarium.plants.moss.individuals.length, 3);
  assert.equal(h.aquarium.mortality.totalWithered, 5);
  assert.equal(h.aquarium.mortality.plantPendingNotices.length, 0);
  assert.equal(h.aquarium.lastSyncRevision, 10);
  assert.equal(h.calls.filter((row) => row[0] === 'plant-chance').length, 2);
  assert.deepEqual(h.plants(), []);
  assert.equal(h.calls.filter((row) => row[0] === 'plant-chance').length, 2);
}

function testPlantWitherUpdatesCountsNoticeAndRevision() {
  const oldNotices = makeNotices('old-plant', 30);
  const h = harness({ day: 12, plantChance: 1, random: 0, plantPendingNotices: oldNotices });
  const withered = h.plants();
  assert.deepEqual(withered, [{ id: 'moss', name: 'ウィローモス', count: 2 }]);
  assert.equal(h.aquarium.mortality.plantLastProcessedDay, 12);
  assert.equal(h.aquarium.plants.moss.owned, 1);
  assert.equal(h.aquarium.plants.moss.inTank, 0);
  assert.deepEqual(plain(h.aquarium.plants.moss.individuals), [{ id: 'p3', plantedDay: 3 }]);
  assert.equal(h.aquarium.mortality.totalWithered, 7);
  assert.equal(h.aquarium.mortality.plantPendingNotices.length, 30);
  assert.equal(h.aquarium.mortality.plantPendingNotices[0].id, 'old-plant-1');
  const notice = h.aquarium.mortality.plantPendingNotices.at(-1);
  assert.equal(notice.day, 12);
  assert.deepEqual(plain(notice.withered), withered);
  assert.equal(h.aquarium.lastSyncRevision, 11);
  assert.equal(h.calls.filter((row) => row[0] === 'plant-chance').length, 2);
  assert.equal(h.calls.filter((row) => row[0] === 'refresh-load').length, 0);
}

for (const test of [
  testLockedAndSameDayGuards,
  testFishNoDeathStillMarksDay,
  testFishDeathsUpdateCountsNoticeAndRevision,
  testPlantNoWitherStillMarksDay,
  testPlantWitherUpdatesCountsNoticeAndRevision,
]) {
  test();
  console.log(`OK: ${test.name}`);
}

console.log('AQUARIUM MORTALITY REGRESSION: PASS');
