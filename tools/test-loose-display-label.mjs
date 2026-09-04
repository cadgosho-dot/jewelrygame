import assert from 'node:assert/strict';
import { formatLooseDisplayLabel } from '../js/ui/loose-display-label.js';
assert.equal(formatLooseDisplayLabel('diamond', 'ダイヤモンド', 'ラウンド'), 'ダイヤモンド・ラウンド');
assert.equal(formatLooseDisplayLabel('diamond', 'ダイヤモンド', 'ラウンド', { suffix: true }), 'ダイヤモンド・ラウンドルース');
assert.equal(formatLooseDisplayLabel('pearl', '真珠', 'ラウンド'), '真珠');
assert.equal(formatLooseDisplayLabel('pearl', '真珠', 'ラウンド', { suffix: true }), '真珠ルース');
assert.equal(formatLooseDisplayLabel('unknown', 'ルース', 'オーバル'), 'ルース・オーバル');
console.log('LOOSE DISPLAY LABEL UNIT: PASS');
