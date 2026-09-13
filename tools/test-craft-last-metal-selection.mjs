import assert from 'node:assert/strict';
import { lastPlayerCraftMetal } from '../js/workshop/craft-last-metal-selection.js';

assert.equal(lastPlayerCraftMetal([]), '', 'no history keeps the existing default');

assert.equal(
  lastPlayerCraftMetal([
    { metal: 'silver', createdDay: 1 },
    { metal: 'gold', createdDay: 2, status: 'sold' },
  ]),
  'gold',
  'the latest manually crafted jewelry metal is restored even after sale',
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

assert.equal(
  lastPlayerCraftMetal([
    { metal: 'silver', createdDay: 1 },
    { metal: 'platinum', createdDay: 2, orderId: 'order-1' },
  ]),
  'platinum',
  'a manually completed order counts as the previous metal used by the player',
);

assert.equal(
  lastPlayerCraftMetal([null, {}, { metal: '   ' }, { metal: 'silver' }]),
  'silver',
  'invalid history rows are ignored safely',
);

console.log('CRAFT LAST METAL SELECTION: PASS');
