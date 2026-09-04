import assert from 'node:assert/strict';
import { mealTimeUnavailableText } from '../js/ui/meal-time-message.js';

const expected = '今日は食事をする時間がありません。';
assert.equal(mealTimeUnavailableText(), expected);
assert.equal(typeof mealTimeUnavailableText(), 'string');
assert.equal(mealTimeUnavailableText().trim(), expected);
console.log('MEAL TIME MESSAGE TEST: PASS');
