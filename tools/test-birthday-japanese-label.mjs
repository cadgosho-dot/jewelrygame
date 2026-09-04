import assert from 'node:assert/strict';
import { formatBirthdayJapaneseLabel } from '../js/ui/birthday-japanese-label.js';

assert.equal(formatBirthdayJapaneseLabel('12-24'), '12月24日');
assert.equal(formatBirthdayJapaneseLabel('01-05'), '1月5日');
assert.equal(formatBirthdayJapaneseLabel('02-29'), '2月29日');
assert.equal(formatBirthdayJapaneseLabel(''), '');
assert.equal(formatBirthdayJapaneseLabel(null), '');
console.log('BIRTHDAY JAPANESE LABEL UNIT: PASS');
