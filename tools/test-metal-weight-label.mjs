import assert from 'node:assert/strict';
import { formatMetalWeightLabel } from '../js/ui/metal-weight-label.js';

const cases = [
  [undefined, '0'],
  [null, '0'],
  ['', '0'],
  ['bad', '0'],
  [-3.2, '0'],
  [0, '0'],
  [1, '1'],
  ['1.20', '1.2'],
  [1.24, '1.2'],
  [1.25, '1.3'],
  [1.999, '2'],
  [12.04, '12'],
  [12.06, '12.1'],
];

for (const [value, expected] of cases) {
  assert.equal(formatMetalWeightLabel(value), expected);
}

console.log('METAL WEIGHT LABEL TEST: PASS');
