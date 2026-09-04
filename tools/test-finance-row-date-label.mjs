import assert from 'node:assert/strict';
import { formatFinanceRowDateLabel } from '../js/ui/finance-row-date-label.js';

const fakeDate = (monthIndex, day) => ({
  getMonth: () => monthIndex,
  getDate: () => day,
});

assert.equal(formatFinanceRowDateLabel(fakeDate(0, 1)), '1月1日');
assert.equal(formatFinanceRowDateLabel(fakeDate(8, 5)), '9月5日');
assert.equal(formatFinanceRowDateLabel(fakeDate(11, 31)), '12月31日');
console.log('FINANCE ROW DATE LABEL UNIT: PASS');
