import assert from 'node:assert/strict';
import { formatStoreBranchLabel } from '../js/ui/store-branch-label.js';

function legacyStoreBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}

const cases = [undefined, null, 0, 1, 2, 3, -1, '2', ' 3 ', 2.5, NaN, Infinity, -Infinity, 'abc'];
for (const value of cases) {
  const expected = value === undefined ? legacyStoreBranchLabel() : legacyStoreBranchLabel(value);
  const actual = value === undefined ? formatStoreBranchLabel() : formatStoreBranchLabel(value);
  assert.equal(actual, expected, `store branch label mismatch: ${String(value)}`);
}

assert.equal(formatStoreBranchLabel(), '店舗1');
assert.equal(formatStoreBranchLabel(3), '店舗3');
console.log('STORE BRANCH LABEL TEST: PASS');
