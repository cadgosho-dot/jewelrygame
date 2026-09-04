import assert from 'node:assert/strict';
import { formatPhoneItemEffectText } from '../js/ui/phone-item-effect-text.js';

assert.equal(formatPhoneItemEffectText({ effect: { hunger: 1 } }, 3, 4), '空腹度 3 → 4');
assert.equal(formatPhoneItemEffectText({ effect: { hunger: '2' } }, 0, 2), '空腹度 0 → 2');
assert.equal(formatPhoneItemEffectText({ effect: { hunger: 0 } }, 3, 3), '効果が発動しました。');
assert.equal(formatPhoneItemEffectText({ effect: { hunger: -1 } }, 3, 2), '効果が発動しました。');
assert.equal(formatPhoneItemEffectText({}, 3, 3), '効果が発動しました。');
assert.equal(formatPhoneItemEffectText(null, 3, 3), '効果が発動しました。');

console.log('PHONE ITEM EFFECT TEXT TEST: PASS');
