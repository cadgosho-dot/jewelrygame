import assert from 'node:assert/strict';
import { formatMetalMarketDateLabel } from '../js/ui/metal-market-date-label.js';

const cases = [
  [undefined, true, ''],
  [null, true, ''],
  ['', true, ''],
  ['2026-09-04', true, '2026年9月4日'],
  ['2026-09-04', false, '9月4日'],
  ['0001-01-01', true, '1年1月1日'],
  ['2026-12-31', false, '12月31日'],
  ['2026-9-04', true, ''],
  ['2026-09-4', true, ''],
  ['bad', true, ''],
  [0, true, ''],
];

for (const [value, includeYear, expected] of cases) {
  assert.equal(formatMetalMarketDateLabel(value, includeYear), expected);
}

assert.equal(formatMetalMarketDateLabel('2026-09-04'), '2026年9月4日');

console.log('METAL MARKET DATE LABEL TEST: PASS');
