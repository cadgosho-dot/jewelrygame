import assert from 'node:assert/strict';
import { formatNotificationDateLabel } from '../js/ui/notification-date-label.js';

const fakeDate = (year, monthIndex, day) => ({
  getFullYear: () => year,
  getMonth: () => monthIndex,
  getDate: () => day,
});

assert.equal(formatNotificationDateLabel(fakeDate(2026, 8, 5)), '2026年9月5日');
assert.equal(formatNotificationDateLabel(fakeDate(2027, 0, 1)), '2027年1月1日');
assert.equal(formatNotificationDateLabel(fakeDate(2028, 1, 29)), '2028年2月29日');
console.log('NOTIFICATION DATE LABEL UNIT: PASS');
