import assert from 'node:assert/strict';
import {
  LAST_CRAFT_METAL_STORAGE_KEY,
  lastPlayerCraftMetal,
  previousCraftMetal,
  rememberCompletedCraftMetal,
  storedCraftMetal,
} from '../js/workshop/craft-last-metal-selection.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

assert.equal(lastPlayerCraftMetal([]), '', 'no history keeps the existing default');

assert.equal(
  lastPlayerCraftMetal([
    { metal: 'silver', createdDay: 1 },
    { metal: 'gold', createdDay: 2, status: 'sold' },
  ]),
  'gold',
  'the latest manually crafted jewelry metal is available as migration fallback',
);

assert.equal(
  lastPlayerCraftMetal([
    { metal: 'silver', createdDay: 1 },
    { metal: 'platinum', madeBy: 'workshopStaff', createdDay: 2 },
    { metal: 'gold', autopilot: true, createdDay: 3 },
    { metal: 'platinum', acquisition: 'jewelryShop', purchasedDay: 4 },
    { metal: 'gold', receivedGiftCode: 'gift-1', createdDay: 5 },
  ]),
  'silver',
  'staff, autopilot, shop purchases, and received gifts do not replace the player choice history',
);

const storage = memoryStorage();
assert.equal(storedCraftMetal(storage), '', 'empty preference does not invent a metal');
assert.equal(
  previousCraftMetal(storage, [{ metal: 'silver', createdDay: 1 }]),
  'silver',
  'existing jewelry history is used before the first stored preference exists',
);
assert.equal(
  rememberCompletedCraftMetal(storage, 'gold'),
  true,
  'a successfully completed craft metal can be stored',
);
assert.equal(storage.getItem(LAST_CRAFT_METAL_STORAGE_KEY), 'gold');
assert.equal(storedCraftMetal(storage), 'gold');
assert.equal(
  previousCraftMetal(storage, [{ metal: 'silver', createdDay: 1 }]),
  'gold',
  'the explicitly remembered completed metal wins over older inventory history',
);

assert.equal(
  rememberCompletedCraftMetal(storage, '   '),
  false,
  'blank metal values are never remembered',
);

const throwingStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};
assert.equal(storedCraftMetal(throwingStorage), '', 'blocked browser storage is safe');
assert.equal(
  rememberCompletedCraftMetal(throwingStorage, 'platinum'),
  false,
  'blocked browser storage does not break crafting',
);

console.log('CRAFT LAST METAL SELECTION: PASS');
