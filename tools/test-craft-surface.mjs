import assert from 'node:assert/strict';
import { craftSurfaceParts, craftSurfaceFinishId } from '../js/ui/craft-surface.js';

const expectedParts = new Map([
  ['mirror', { base: 'mirror', decorated: false }],
  ['matte', { base: 'matte', decorated: false }],
  ['decorated', { base: null, decorated: true }],
  ['mirrorDecorated', { base: 'mirror', decorated: true }],
  ['matteDecorated', { base: 'matte', decorated: true }],
  ['unknown', { base: 'mirror', decorated: false }],
]);

for (const [finishId, expected] of expectedParts) {
  assert.deepEqual(craftSurfaceParts(finishId), expected, `parts mismatch: ${finishId}`);
}
assert.deepEqual(craftSurfaceParts(), { base: 'mirror', decorated: false });

const expectedIds = [
  [['mirror', false], 'mirror'],
  [['matte', false], 'matte'],
  [[null, false], 'mirror'],
  [['mirror', true], 'mirrorDecorated'],
  [['matte', true], 'matteDecorated'],
  [[null, true], 'decorated'],
  [['other', true], 'decorated'],
];
for (const [[base, decorated], expected] of expectedIds) {
  assert.equal(craftSurfaceFinishId(base, decorated), expected, `id mismatch: ${base}/${decorated}`);
}

for (const finishId of ['mirror', 'matte', 'decorated', 'mirrorDecorated', 'matteDecorated']) {
  const parts = craftSurfaceParts(finishId);
  assert.equal(craftSurfaceFinishId(parts.base, parts.decorated), finishId, `round trip mismatch: ${finishId}`);
}

console.log('CRAFT SURFACE TEST: PASS');
