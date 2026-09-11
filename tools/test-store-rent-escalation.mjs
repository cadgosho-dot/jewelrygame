import assert from 'node:assert/strict';
import { calculateStoreMonthlyRent } from '../js/finance/store-rent.js';

const sequences = new Map([
  [150000, [150000, 180000, 216000, 260000, 312000, 375000, 450000, 540000, 648000, 778000, 934000]],
  [400000, [400000, 480000, 576000, 692000, 831000, 998000, 1198000, 1438000, 1726000, 2072000, 2487000]],
  [700000, [700000, 840000, 1008000, 1210000, 1452000, 1743000, 2092000, 2511000, 3014000, 3617000, 4341000]],
]);

for (const [base, expected] of sequences) {
  const actual = expected.map((_, year) => calculateStoreMonthlyRent(base, 100 + (year * 360), 100));
  assert.deepEqual(actual, expected, `rent sequence mismatch for ${base}`);
}

assert.equal(calculateStoreMonthlyRent(150000, 459, 100), 150000);
assert.equal(calculateStoreMonthlyRent(150000, 460, 100), 180000);
assert.equal(calculateStoreMonthlyRent(150000, 3699, 100), 778000);
assert.equal(calculateStoreMonthlyRent(150000, 3700, 100), 934000);
assert.equal(calculateStoreMonthlyRent(150000, 99999, 100), 934000);
assert.equal(calculateStoreMonthlyRent(150000, 99999, undefined), 150000);
assert.equal(calculateStoreMonthlyRent(0, 99999, 100), 0);

console.log('STORE RENT ESCALATION REGRESSION: PASS');
