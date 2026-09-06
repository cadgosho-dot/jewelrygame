import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

function extractFunction(name) {
  const re = new RegExp(`(?:^|\\n)function\\s+${name}\\s*\\([^\\n]*\\)\\s*\\{`, 'm');
  const match = re.exec(app);
  assert.ok(match, `${name} definition not found`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const brace = app.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < app.length; i += 1) {
    const c = app[i];
    const next = app[i + 1] || '';
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
      if (depth === 0) return app.slice(start, i + 1);
    }
  }
  throw new Error(`${name} end not found`);
}

const usePhoneItemSource = extractFunction('usePhoneItem');
const togglePhoneEquipmentSource = extractFunction('togglePhoneEquipment');
const plain = (value) => JSON.parse(JSON.stringify(value));

function makeHarness(overrides = {}) {
  const calls = {
    toasts: [],
    saves: 0,
    sfx: [],
    vibrations: [],
    feedback: [],
    effectText: [],
    renders: 0,
    timeouts: [],
  };

  const GENERAL_ITEMS = {
    snack: { id: 'snack', name: '軽食', usable: true, effect: { hunger: 2 }, sfx: 'eat', symbol: '●' },
    energyDrink: { id: 'energyDrink', name: 'エナジードリンク', usable: true, effect: { hunger: 3 }, sfx: 'drink', symbol: '⚡' },
    inert: { id: 'inert', name: '飾り', usable: true, effect: { hunger: 0 }, symbol: '○' },
    unusable: { id: 'unusable', name: '未使用品', usable: false, effect: { hunger: 2 } },
  };
  const EQUIPMENT_ITEMS = {
    apron: { id: 'apron', name: 'エプロン', slot: 'body', symbol: '◇' },
    glove: { id: 'glove', name: '手袋', slot: 'body' },
  };

  const state = {
    game: { money: overrides.money ?? 12345 },
    wellbeing: { hunger: overrides.hunger ?? 3 },
    inventory: {
      items: {
        snack: overrides.snack ?? 2,
        energyDrink: overrides.energyDrink ?? 1,
        inert: overrides.inert ?? 1,
        unusable: overrides.unusable ?? 1,
      },
      equipment: {
        apron: overrides.apron ?? 1,
        glove: overrides.glove ?? 1,
      },
      equipped: { body: overrides.equippedBody ?? '' },
    },
  };

  const context = {
    state,
    GENERAL_ITEMS,
    EQUIPMENT_ITEMS,
    hungerLevel: () => state.wellbeing.hunger,
    showToast: (...args) => calls.toasts.push(args),
    saveGame: () => { calls.saves += 1; },
    playSfx: (...args) => calls.sfx.push(args),
    vibrate: (...args) => calls.vibrations.push(args),
    setPhoneItemFeedback: (...args) => calls.feedback.push(args),
    phoneItemEffectText: (item, before, after) => {
      calls.effectText.push([item.id, before, after]);
      return `${item.id}:${before}->${after}`;
    },
    render: () => { calls.renders += 1; },
    Math,
    Number,
  };
  context.window = {
    setTimeout: (fn, delay) => {
      calls.timeouts.push(delay);
      fn();
      return 1;
    },
  };

  vm.createContext(context);
  vm.runInContext(`
    ${usePhoneItemSource}
    ${togglePhoneEquipmentSource}
    globalThis.__usePhoneItem = usePhoneItem;
    globalThis.__togglePhoneEquipment = togglePhoneEquipment;
  `, context);

  return {
    state,
    calls,
    usePhoneItem: context.__usePhoneItem,
    togglePhoneEquipment: context.__togglePhoneEquipment,
  };
}

function testUsePhoneItemSuccess() {
  const h = makeHarness({ hunger: 3, snack: 2 });
  h.usePhoneItem('snack');
  assert.equal(h.state.wellbeing.hunger, 5);
  assert.equal(h.state.inventory.items.snack, 1);
  assert.equal(h.state.game.money, 12345);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.sfx), [['eat']]);
  assert.deepEqual(plain(h.calls.effectText), [['snack', 3, 5]]);
  assert.deepEqual(plain(h.calls.feedback), [['軽食を使いました', 'snack:3->5', '●']]);
  assert.equal(h.calls.renders, 1);
  assert.deepEqual(h.calls.toasts, []);
  assert.deepEqual(h.calls.timeouts, []);
  assert.deepEqual(h.calls.vibrations, []);
}

function testUsePhoneItemCapsHungerAndDoesNotWasteAtMax() {
  const capped = makeHarness({ hunger: 6, snack: 2 });
  capped.usePhoneItem('snack');
  assert.equal(capped.state.wellbeing.hunger, 7);
  assert.equal(capped.state.inventory.items.snack, 1);
  assert.deepEqual(plain(capped.calls.effectText), [['snack', 6, 7]]);

  const full = makeHarness({ hunger: 7, snack: 2 });
  full.usePhoneItem('snack');
  assert.equal(full.state.wellbeing.hunger, 7);
  assert.equal(full.state.inventory.items.snack, 2);
  assert.equal(full.calls.saves, 0);
  assert.equal(full.calls.renders, 0);
  assert.deepEqual(full.calls.toasts, [['今はこのアイテムを使う必要がありません。', 'error']]);

  const inert = makeHarness({ hunger: 2, inert: 1 });
  inert.usePhoneItem('inert');
  assert.equal(inert.state.inventory.items.inert, 1);
  assert.equal(inert.calls.saves, 0);
  assert.deepEqual(inert.calls.toasts, [['今はこのアイテムを使う必要がありません。', 'error']]);
}

function testUsePhoneItemGuards() {
  const missing = makeHarness();
  missing.usePhoneItem('missing');
  assert.deepEqual(missing.calls.toasts, [['使用できるアイテムがありません。', 'error']]);
  assert.equal(missing.calls.saves, 0);

  const unusable = makeHarness({ unusable: 1 });
  unusable.usePhoneItem('unusable');
  assert.deepEqual(unusable.calls.toasts, [['使用できるアイテムがありません。', 'error']]);
  assert.equal(unusable.calls.saves, 0);

  const empty = makeHarness({ snack: 0 });
  empty.usePhoneItem('snack');
  assert.deepEqual(empty.calls.toasts, [['使用できるアイテムがありません。', 'error']]);
  assert.equal(empty.calls.saves, 0);
}

function testEnergyDrinkSpecialEffects() {
  const h = makeHarness({ hunger: 2, energyDrink: 1 });
  h.usePhoneItem('energyDrink');
  assert.equal(h.state.wellbeing.hunger, 5);
  assert.equal(h.state.inventory.items.energyDrink, 0);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.sfx), [['drink'], ['success', { gain: 0.72 }]]);
  assert.deepEqual(h.calls.timeouts, [260]);
  assert.deepEqual(plain(h.calls.vibrations), [[[25, 22, 48]]]);
  assert.deepEqual(plain(h.calls.feedback), [['エナジードリンクを使いました', 'energyDrink:2->5', '⚡']]);
  assert.equal(h.calls.renders, 1);
}

function testTogglePhoneEquipmentEquipAndUnequip() {
  const h = makeHarness({ apron: 1, equippedBody: '' });
  h.togglePhoneEquipment('apron');
  assert.equal(h.state.inventory.equipped.body, 'apron');
  assert.equal(h.state.game.money, 12345);
  assert.equal(h.calls.saves, 1);
  assert.deepEqual(plain(h.calls.sfx), [['success']]);
  assert.deepEqual(plain(h.calls.feedback), [['エプロン', '装備しました。', '◇']]);
  assert.equal(h.calls.renders, 1);

  h.togglePhoneEquipment('apron');
  assert.equal(h.state.inventory.equipped.body, '');
  assert.equal(h.calls.saves, 2);
  assert.deepEqual(plain(h.calls.feedback[1]), ['エプロン', '装備を外しました。', '◇']);
  assert.equal(h.calls.renders, 2);
}

function testTogglePhoneEquipmentReplacesSameSlotAndUsesFallbackSymbol() {
  const h = makeHarness({ glove: 1, equippedBody: 'apron' });
  h.togglePhoneEquipment('glove');
  assert.equal(h.state.inventory.equipped.body, 'glove');
  assert.deepEqual(plain(h.calls.feedback), [['手袋', '装備しました。', '◇']]);
  assert.equal(h.calls.saves, 1);
}

function testTogglePhoneEquipmentGuards() {
  const missing = makeHarness({ equippedBody: 'apron' });
  missing.togglePhoneEquipment('missing');
  assert.equal(missing.state.inventory.equipped.body, 'apron');
  assert.deepEqual(missing.calls.toasts, [['その装備品を持っていません。', 'error']]);
  assert.equal(missing.calls.saves, 0);
  assert.equal(missing.calls.renders, 0);

  const empty = makeHarness({ apron: 0, equippedBody: '' });
  empty.togglePhoneEquipment('apron');
  assert.equal(empty.state.inventory.equipped.body, '');
  assert.deepEqual(empty.calls.toasts, [['その装備品を持っていません。', 'error']]);
  assert.equal(empty.calls.saves, 0);
}

testUsePhoneItemSuccess();
testUsePhoneItemCapsHungerAndDoesNotWasteAtMax();
testUsePhoneItemGuards();
testEnergyDrinkSpecialEffects();
testTogglePhoneEquipmentEquipAndUnequip();
testTogglePhoneEquipmentReplacesSameSlotAndUsesFallbackSymbol();
testTogglePhoneEquipmentGuards();

console.log('PHONE ITEM/EQUIPMENT REGRESSION: PASS');
console.log('usePhoneItem()/togglePhoneEquipment() current behavior protected: ownership/usability guards, hunger cap and no-waste rule, item consumption, save/sfx/feedback, energy drink special effects, equipment slot toggle/replacement, and no direct money/time mutation.');
