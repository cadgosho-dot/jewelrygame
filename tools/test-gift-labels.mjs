import assert from 'node:assert/strict';
import { giftCategoryLabel, giftStatusLabel } from '../js/ui/gift-labels.js';

assert.equal(giftCategoryLabel('rough'), '原石');
assert.equal(giftCategoryLabel('loose'), 'ルース');
assert.equal(giftCategoryLabel('item'), 'アイテム');
assert.equal(giftCategoryLabel('metal'), '地金');
assert.equal(giftCategoryLabel('jewelry'), '完成品');
assert.equal(giftCategoryLabel('unknown'), 'プレゼント');
assert.equal(giftCategoryLabel(''), 'プレゼント');
assert.equal(giftCategoryLabel(null), 'プレゼント');

assert.equal(giftStatusLabel('pending'), '未受取');
assert.equal(giftStatusLabel('claimed'), '受取済み');
assert.equal(giftStatusLabel('cancelled'), '取消済み');
assert.equal(giftStatusLabel('custom'), 'custom');
assert.equal(giftStatusLabel(''), '不明');
assert.equal(giftStatusLabel(null), '不明');

console.log('GIFT LABELS TEST: PASS');
