import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../js/ui/chinese-meal-image-variant.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { createMealImageVariantSelector } = await import(moduleUrl);

const images = ['existing.png', 'gyoza.png'];
const choose = createMealImageVariantSelector();

assert.equal(choose({ selectionKey: '1:540', images, random: () => 0.1 }), 'existing.png');
assert.equal(choose({ selectionKey: '1:540', images, random: () => 0.9 }), 'existing.png');
assert.equal(choose({ selectionKey: '1:600', images, random: () => 0.9 }), 'gyoza.png');
assert.equal(createMealImageVariantSelector()({ selectionKey: 'x', images, random: () => 1 }), 'gyoza.png');
assert.equal(createMealImageVariantSelector()({ selectionKey: 'x', images: [], random: () => 0.5 }), '');

console.log('chinese meal image variant: PASS');
