import assert from 'node:assert/strict';
import { formatTimeRemainingLabel } from '../js/ui/time-remaining-label.js';

const cases = [
  [undefined, 'あと0分'],
  [null, 'あと0分'],
  [0, 'あと0分'],
  [-5, 'あと0分'],
  [1, 'あと1分'],
  [59, 'あと59分'],
  [60, 'あと1時間'],
  [61, 'あと1時間1分'],
  [119, 'あと1時間59分'],
  [120, 'あと2時間'],
  [121, 'あと2時間1分'],
  [60.4, 'あと1時間'],
  [60.6, 'あと1時間1分'],
  ['61', 'あと1時間1分'],
  ['bad', 'あと0分'],
  [Number.NaN, 'あと0分'],
];

for (const [input, expected] of cases) {
  assert.equal(formatTimeRemainingLabel(input), expected, `input=${String(input)}`);
}

console.log('TIME REMAINING LABEL TEST: PASS');
