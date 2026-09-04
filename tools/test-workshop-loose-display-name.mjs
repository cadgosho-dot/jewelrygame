import assert from 'node:assert/strict';
import { formatWorkshopLooseDisplayName } from '../js/ui/workshop-loose-display-name.js';

const cases = [
  [undefined, undefined, 'ルース'],
  [null, { name: 'ラウンド' }, 'ルース'],
  [{ id: 'original-1', name: '星空ルース', originalLoose: true }, { name: 'オーバル' }, '星空ルース'],
  [{ id: 'pearl', name: '真珠' }, { name: 'パール' }, '真珠'],
  [{ id: 'ruby', name: 'ルビー' }, { name: 'ラウンド' }, 'ルビー・ラウンド'],
  [{ id: 'sapphire', name: 'サファイア' }, undefined, 'サファイア・'],
  [{ id: 'emerald', name: 'エメラルド' }, {}, 'エメラルド・'],
];

for (const [gem, shape, expected] of cases) {
  assert.equal(formatWorkshopLooseDisplayName(gem, shape), expected);
}

console.log('WORKSHOP LOOSE DISPLAY NAME TEST: PASS');
