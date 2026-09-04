import assert from 'node:assert/strict';
import { clampViewportNumber } from '../js/ui/viewport-clamp.js';

function legacyClampViewportValue(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

const cases = [
  [undefined, 0.84, 1.08], [null, 0.84, 1.08], [0, 0.84, 1.08],
  [0.5, 0.84, 1.08], [0.84, 0.84, 1.08], [0.9, 0.84, 1.08],
  [1.08, 0.84, 1.08], [2, 0.84, 1.08], [-1, 0.84, 1.08],
  ['0.9', 0.84, 1.08], ['abc', 0.84, 1.08], [NaN, 0.84, 1.08],
  [Infinity, 0.84, 1.08], [-Infinity, 0.84, 1.08],
  [1.25, -2, 2], [0, -2, 2], [10, 5, 3],
];
for (const [value, min, max] of cases) {
  assert.equal(
    clampViewportNumber(value, min, max),
    legacyClampViewportValue(value, min, max),
    `viewport clamp mismatch: value=${String(value)} min=${min} max=${max}`,
  );
}
assert.equal(clampViewportNumber(0.7, 0.84, 1.08), 0.84);
assert.equal(clampViewportNumber(0.95, 0.84, 1.08), 0.95);
assert.equal(clampViewportNumber(1.2, 0.84, 1.08), 1.08);
console.log('VIEWPORT CLAMP TEST: PASS');
