import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function findMatchingBrace(text, brace) {
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1] || '';
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error('matching brace not found');
}

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${name} definition not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  const end = findMatchingBrace(app, brace);
  return app.slice(start, end + 1);
}

function extractCase(label) {
  const re = new RegExp(`(?:^|\\n)(\\s*)case\\s+['"]${label}['"]:\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${label} case not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  const end = findMatchingBrace(app, brace);
  return app.slice(start, end + 1);
}

function extractIf(signature) {
  const start = app.indexOf(signature);
  assert.ok(start >= 0, `${signature} block not found`);
  const brace = app.indexOf('{', start);
  const end = findMatchingBrace(app, brace);
  return app.slice(start, end + 1);
}

const sources = {
  candidates: extractFunction('workshopStaffCraftCandidates'),
  quality: extractFunction('workshopStaffQualityRoll'),
  craftOne: extractFunction('workshopStaffCraftOne'),
  hireWorkshop: extractCase('hire-workshop-staff'),
  hireEmployee: extractCase('hire-employee'),
  employeeWorking: extractIf(`if (target.matches('[data-action="employee-working"]')) {`),
  workshopWorking: extractIf(`if (target.matches('[data-action="workshop-staff-working"]')) {`),
};

const plain = (value) => JSON.parse(JSON.stringify(value));

function controlledMath(randomValues = [0.5]) {
  const math = Object.create(Math);
  let index = 0;
  math.random = () => randomValues[Math.min(index++, randomValues.length - 1)] ?? 0.5;
  return math;
}

function makeActionHarness(overrides = {}) {
  const workshopStaff = {
    hired: overrides.staffHired ?? false,
    everHired: overrides.staffEverHired ?? false,
    working: overrides.staffWorking ?? false,
    workDays: overrides.staffWorkDays ?? 12,
    workMinutesBank: overrides.staffWorkMinutesBank ?? 180,
    workedMinutesToday: overrides.staffWorkedMinutesToday ?? 90,
    craftedToday: overrides.staffCraftedToday ?? [{ id: 'old' }],
    wageUnpaid: overrides.staffWageUnpaid ?? 3000,
  };
  const branch = overrides.branch === null ? null : (overrides.branch ?? {
    number: 2,
    employee: {
      name: '花子',
      hired: overrides.employeeHired ?? false,
      workDays: overrides.employeeWorkDays ?? 25,
      working: overrides.employeeWorking ?? false,
      wageUnpaid: overrides.employeeWageUnpaid ?? 4000,
    },
  });
  const state = { workshopStaff, facilities: { recruitment: true } };
  const calls = { saves: 0, renders: 0, toasts: [] };
  const context = {
    state,
    gameDate: () => new Date('2026-09-07T09:00:00+09:00'),
    workshopStaffHoliday: () => overrides.holiday ?? false,
    workshopStaffUnlockStatus: () => ({ unlocked: overrides.unlocked ?? true }),
    workshopStaffState: () => state.workshopStaff,
    currentStoreBranch: () => branch,
    storeEmployeeAvailable: () => overrides.employeeAvailable ?? true,
    storeBranchEmployee: (value) => value.employee,
    storeBranchDisplayName: () => '第2店舗',
    saveGame: () => { calls.saves += 1; },
    render: () => { calls.renders += 1; },
    showToast: (...args) => calls.toasts.push(args),
    Date,
    Number,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(`
    function runStaffAction(action) {
      switch (action) {
        ${sources.hireWorkshop}
        ${sources.hireEmployee}
        default: break;
      }
    }
    globalThis.__api = { runStaffAction };
  `, context);
  return { state, branch, calls, api: context.__api };
}

function makeChangeHarness(overrides = {}) {
  const state = {
    workshopStaff: {
      hired: true,
      everHired: true,
      working: overrides.staffWorking ?? true,
      workDays: 10,
      workMinutesBank: 0,
      workedMinutesToday: 0,
      craftedToday: [],
      wageUnpaid: 0,
    },
  };
  const branch = overrides.branch === null ? null : (overrides.branch ?? {
    number: 2,
    employee: { name: '花子', hired: true, working: overrides.employeeWorking ?? true, workDays: 5, wageUnpaid: 0 },
  });
  const calls = { saves: 0, renders: 0, toasts: [] };
  const context = {
    state,
    currentStoreBranch: () => branch,
    storeBranchEmployee: (value) => value.employee,
    workshopStaffHoliday: () => overrides.holiday ?? false,
    gameDate: () => new Date('2026-09-07T09:00:00+09:00'),
    workshopStaffState: () => state.workshopStaff,
    saveGame: () => { calls.saves += 1; },
    render: () => { calls.renders += 1; },
    showToast: (...args) => calls.toasts.push(args),
    Date,
    Number,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(`
    function runStaffChange(target) {
      ${sources.employeeWorking}
      ${sources.workshopWorking}
    }
    globalThis.__api = { runStaffChange };
  `, context);
  return { state, branch, calls, api: context.__api };
}

function targetFor(selector, checked) {
  return {
    checked,
    matches: (candidate) => candidate === selector,
  };
}

function testWorkshopStaffHireSuccess() {
  const h = makeActionHarness();
  h.api.runStaffAction('hire-workshop-staff');
  assert.deepEqual(plain(h.state.workshopStaff), {
    hired: true,
    everHired: true,
    working: true,
    workDays: 0,
    workMinutesBank: 0,
    workedMinutesToday: 0,
    craftedToday: [],
    wageUnpaid: 0,
  });
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
  assert.deepEqual(h.calls.toasts, [['職人スタッフを雇いました。']]);
}

function testWorkshopStaffHireGuards() {
  for (const row of [
    { holiday: true, toast: ['土日祝日は職人スタッフを設定できません。', 'error'] },
    { unlocked: false, toast: ['職人スタッフの解放条件を満たしていません。', 'error'] },
  ]) {
    const h = makeActionHarness(row);
    const before = plain(h.state.workshopStaff);
    h.api.runStaffAction('hire-workshop-staff');
    assert.deepEqual(plain(h.state.workshopStaff), before);
    assert.equal(h.calls.saves, 0);
    assert.equal(h.calls.renders, 0);
    assert.deepEqual(h.calls.toasts, [row.toast]);
  }
}

function testStoreEmployeeHireSuccess() {
  const h = makeActionHarness();
  h.api.runStaffAction('hire-employee');
  assert.deepEqual(plain(h.branch.employee), {
    name: '花子',
    hired: true,
    workDays: 0,
    working: true,
    wageUnpaid: 0,
  });
  assert.equal(h.state.facilities.recruitment, false);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
  assert.deepEqual(h.calls.toasts, [['第2店舗で店舗スタッフの花子さんを雇いました。']]);
}

function testStoreEmployeeHireGuard() {
  for (const overrides of [{ branch: null }, { employeeAvailable: false }]) {
    const h = makeActionHarness(overrides);
    const before = plain(h.state);
    h.api.runStaffAction('hire-employee');
    assert.deepEqual(plain(h.state), before);
    assert.equal(h.calls.saves, 0);
    assert.equal(h.calls.renders, 0);
    assert.deepEqual(h.calls.toasts, [['この店舗では店舗スタッフを雇えません。', 'error']]);
  }
}

function testStoreEmployeeWorkingToggle() {
  const h = makeChangeHarness({ employeeWorking: true });
  const target = targetFor('[data-action="employee-working"]', false);
  h.api.runStaffChange(target);
  assert.equal(h.branch.employee.working, false);
  assert.equal(h.calls.saves, 1);
  assert.equal(h.calls.renders, 1);
  assert.equal(h.calls.toasts.length, 0);

  const noBranch = makeChangeHarness({ branch: null });
  noBranch.api.runStaffChange(targetFor('[data-action="employee-working"]', true));
  assert.equal(noBranch.calls.saves, 1);
  assert.equal(noBranch.calls.renders, 1);
}

function testWorkshopStaffWorkingToggle() {
  const weekday = makeChangeHarness({ staffWorking: true });
  weekday.api.runStaffChange(targetFor('[data-action="workshop-staff-working"]', false));
  assert.equal(weekday.state.workshopStaff.working, false);
  assert.equal(weekday.calls.saves, 1);
  assert.equal(weekday.calls.renders, 1);

  const holiday = makeChangeHarness({ staffWorking: true, holiday: true });
  const target = targetFor('[data-action="workshop-staff-working"]', false);
  holiday.api.runStaffChange(target);
  assert.equal(target.checked, true);
  assert.equal(holiday.state.workshopStaff.working, true);
  assert.equal(holiday.calls.saves, 0);
  assert.equal(holiday.calls.renders, 0);
  assert.deepEqual(holiday.calls.toasts, [['土日祝日は職人スタッフを設定できません。', 'error']]);
}

function makeCandidateHarness(overrides = {}) {
  const state = {
    inventory: {
      jewelry: overrides.jewelry ?? [],
      capacity: overrides.capacity ?? 10,
    },
  };
  const context = {
    state,
    ITEMS: { ring: {} },
    DESIGNS: { classic: {} },
    FINISHES: { mirror: {} },
    METALS: { gold: {} },
    GEMS: { amethyst: {} },
    workshopOperating: () => overrides.operating ?? true,
    toolUsable: (id) => id === 'jewelryBench' && (overrides.benchUsable ?? true),
    looseShapeIdsForGem: () => ['round'],
    looseAvailableQuantity: () => overrides.looseQuantity ?? 1,
    productionHours: () => overrides.hours ?? 2,
    materialRequirementsFor: (draft) => ({
      enoughMetal: overrides.enoughMetal ?? true,
      enoughLoose: draft.useLoose ? (overrides.enoughLoose ?? true) : true,
    }),
    Number,
    Object,
    Math: controlledMath([overrides.random ?? 0.2]),
  };
  vm.createContext(context);
  vm.runInContext(`${sources.candidates}\nglobalThis.__api = { workshopStaffCraftCandidates };`, context);
  return { api: context.__api, state };
}

function testWorkshopStaffCraftCandidateGuards() {
  assert.deepEqual(plain(makeCandidateHarness().api.workshopStaffCraftCandidates(119)), []);
  assert.deepEqual(plain(makeCandidateHarness({ operating: false }).api.workshopStaffCraftCandidates(240)), []);
  assert.deepEqual(plain(makeCandidateHarness({ benchUsable: false }).api.workshopStaffCraftCandidates(240)), []);
  assert.deepEqual(plain(makeCandidateHarness({ capacity: 1, jewelry: [{ status: 'stored' }] }).api.workshopStaffCraftCandidates(240)), []);
  assert.deepEqual(plain(makeCandidateHarness({ enoughMetal: false }).api.workshopStaffCraftCandidates(240)), []);
}

function testWorkshopStaffCraftCandidatePreference() {
  const loosePreferred = plain(makeCandidateHarness({ random: 0.2 }).api.workshopStaffCraftCandidates(240));
  assert.equal(loosePreferred.length, 1);
  assert.equal(loosePreferred[0].usesLoose, true);
  assert.equal(loosePreferred[0].draft.useLoose, true);

  const plainPreferred = plain(makeCandidateHarness({ random: 0.9 }).api.workshopStaffCraftCandidates(240));
  assert.equal(plainPreferred.length, 1);
  assert.equal(plainPreferred[0].usesLoose, false);
  assert.equal(plainPreferred[0].draft.useLoose, false);

  const noLoose = plain(makeCandidateHarness({ looseQuantity: 0 }).api.workshopStaffCraftCandidates(240));
  assert.equal(noLoose.length, 1);
  assert.equal(noLoose[0].usesLoose, false);
}

function testWorkshopStaffQualityRoll() {
  function roll(value) {
    const context = { Math: controlledMath([value]), Number };
    vm.createContext(context);
    vm.runInContext(`${sources.quality}\nglobalThis.__api = { workshopStaffQualityRoll };`, context);
    return context.__api.workshopStaffQualityRoll({ premiumChance: 0.2, goodChance: 0.5 });
  }
  assert.equal(roll(0.1), 'premium');
  assert.equal(roll(0.4), 'good');
  assert.equal(roll(0.9), 'standard');
}

function makeCraftHarness(overrides = {}) {
  const oldCrafted = Array.from({ length: overrides.staffHistoryLength ?? 20 }, (_, i) => ({ id: `old-${i}` }));
  const state = {
    game: { day: overrides.day ?? 77, money: 123456 },
    inventory: {
      metals: { gold: overrides.ownedMetalWeight ?? 10 },
      jewelry: [],
    },
    daily: {
      crafted: [],
      workshopStaffCrafted: overrides.dailyCrafted ?? [],
    },
    workshopStaff: { craftedToday: oldCrafted },
  };
  const draft = overrides.draft ?? {
    orderId: null,
    item: 'ring',
    useLoose: overrides.useLoose ?? false,
    gem: 'amethyst',
    looseShape: 'round',
    metal: 'gold',
    design: 'classic',
    finish: 'mirror',
  };
  const requirements = {
    requiredLooseQuantity: overrides.requiredLooseQuantity ?? 1,
    ownedMetalWeight: overrides.ownedMetalWeight ?? 10,
    requiredMetalWeight: overrides.requiredMetalWeight ?? 2.3,
  };
  const candidates = overrides.noCandidates ? [] : [{ draft, hours: overrides.hours ?? 3, requirements }];
  const calls = { loose: [], profiles: [], notifications: [], failures: 0 };
  const context = {
    state,
    workshopStaffDefinition: () => ({ level: 4 }),
    workshopStaffCraftCandidates: () => candidates,
    randomFrom: (list) => overrides.selectedNull ? null : list[0],
    adjustLooseInventory: (...args) => calls.loose.push(args),
    roundedMetalWeight: (value) => Math.round(Number(value) * 10) / 10,
    workshopStaffQualityRoll: () => overrides.quality ?? 'good',
    craftProductionProfile: (value, options) => { calls.profiles.push([plain(value), plain(options)]); return { score: 88 }; },
    uid: () => 'staff-j1',
    itemName: () => 'スタッフリング',
    productionCost: () => 3000,
    craftsmanshipRecommendedPrice: () => 12000,
    craftsmanshipSnapshot: () => ({ craftsmanshipGrade: 'A' }),
    workshopStaffState: () => state.workshopStaff,
    checkWorkshopToolFailure: () => { calls.failures += 1; return overrides.brokenToolName ?? ''; },
    addNotification: (...args) => calls.notifications.push(args),
    Number,
    Math,
  };
  vm.createContext(context);
  vm.runInContext(`${sources.craftOne}\nglobalThis.__api = { workshopStaffCraftOne };`, context);
  return { state, calls, draft, requirements, api: context.__api };
}

function testWorkshopStaffCraftSuccess() {
  const h = makeCraftHarness({ brokenToolName: '彫金机' });
  const result = plain(h.api.workshopStaffCraftOne(180, { level: 4 }));
  assert.equal(h.state.inventory.metals.gold, 7.7);
  assert.equal(h.calls.loose.length, 0);
  assert.equal(h.state.inventory.jewelry.length, 1);
  const jewelry = plain(h.state.inventory.jewelry[0]);
  assert.equal(jewelry.id, 'staff-j1');
  assert.equal(jewelry.name, 'スタッフリング');
  assert.equal(jewelry.quality, 'good');
  assert.equal(jewelry.status, 'stored');
  assert.equal(jewelry.createdDay, 77);
  assert.equal(jewelry.madeBy, 'workshopStaff');
  assert.equal(jewelry.xp, 0);
  assert.equal(jewelry.recommendedPrice, 12000);
  assert.equal(jewelry.craftsmanshipGrade, 'A');
  assert.deepEqual(plain(h.calls.profiles), [[plain(h.draft), { artisanLevel: 14 }]]);
  assert.deepEqual(plain(h.state.daily.crafted), ['staff-j1']);
  assert.deepEqual(plain(h.state.daily.workshopStaffCrafted), [{ id: 'staff-j1', name: 'スタッフリング', quality: 'good', hours: 3 }]);
  assert.equal(h.state.workshopStaff.craftedToday.length, 20);
  assert.equal(h.state.workshopStaff.craftedToday.at(-1).id, 'staff-j1');
  assert.equal(h.state.workshopStaff.craftedToday[0].id, 'old-1');
  assert.deepEqual(plain(h.calls.notifications), [['彫金机が故障しました', '職人スタッフの制作後に故障しました。修理が完了するまで自動制作は止まります。', 'warning']]);
  assert.equal(h.calls.failures, 1);
  assert.equal(result.jewelry.id, 'staff-j1');
  assert.equal(result.hours, 3);
  assert.equal(result.brokenToolName, '彫金机');
  assert.equal(h.state.game.money, 123456);
}

function testWorkshopStaffCraftConsumesLoose() {
  const h = makeCraftHarness({ useLoose: true, requiredLooseQuantity: 2, staffHistoryLength: 0 });
  h.api.workshopStaffCraftOne(180, { level: 10 });
  assert.deepEqual(plain(h.calls.loose), [['amethyst', 'round', -2]]);
  assert.deepEqual(plain(h.calls.profiles), [[plain(h.draft), { artisanLevel: 20 }]]);
  assert.equal(h.calls.notifications.length, 0);
}

function testWorkshopStaffCraftNoCandidateRoutes() {
  for (const overrides of [{ noCandidates: true }, { selectedNull: true }]) {
    const h = makeCraftHarness(overrides);
    const before = plain(h.state);
    const result = h.api.workshopStaffCraftOne(180, { level: 4 });
    assert.equal(result, null);
    assert.deepEqual(plain(h.state), before);
    assert.equal(h.calls.loose.length, 0);
    assert.equal(h.calls.failures, 0);
  }
}

testWorkshopStaffHireSuccess();
testWorkshopStaffHireGuards();
testStoreEmployeeHireSuccess();
testStoreEmployeeHireGuard();
testStoreEmployeeWorkingToggle();
testWorkshopStaffWorkingToggle();
testWorkshopStaffCraftCandidateGuards();
testWorkshopStaffCraftCandidatePreference();
testWorkshopStaffQualityRoll();
testWorkshopStaffCraftSuccess();
testWorkshopStaffCraftConsumesLoose();
testWorkshopStaffCraftNoCandidateRoutes();

console.log('STAFF OPERATIONS REGRESSION: PASS');
console.log('Current staff behavior protected: workshop/store hiring, working toggles, holiday/unlock/availability guards, workshop auto-craft candidate selection and 70% loose preference, quality roll, material consumption, jewelry creation, daily/staff records, tool-failure notification, and no direct money/time mutation in these operations.');
