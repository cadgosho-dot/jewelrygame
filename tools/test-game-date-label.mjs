import assert from 'node:assert/strict';
import { formatGameDateLabel } from '../js/ui/game-date-label.js';

const fakeDate = (year, monthIndex, day, weekday) => ({
  getFullYear: () => year,
  getMonth: () => monthIndex,
  getDate: () => day,
  getDay: () => weekday,
});

assert.equal(formatGameDateLabel(fakeDate(2026, 8, 5, 6)), '2026年9月5日（土）');
assert.equal(formatGameDateLabel(fakeDate(2027, 0, 1, 5)), '2027年1月1日（金）');
assert.equal(formatGameDateLabel(fakeDate(2028, 1, 29, 2)), '2028年2月29日（火）');
console.log('GAME DATE LABEL UNIT: PASS');
