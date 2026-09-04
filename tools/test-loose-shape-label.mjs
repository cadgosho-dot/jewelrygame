import assert from 'node:assert/strict';
import { formatLooseShapeLabel } from '../js/ui/loose-shape-label.js';

const shapes = {
  round: { name: 'ラウンド' },
  oval: { name: 'オーバル' },
  empty: { name: '' },
  1: { name: '数値カット' },
};

assert.equal(formatLooseShapeLabel('round', shapes), 'ラウンド');
assert.equal(formatLooseShapeLabel('oval', shapes), 'オーバル');
assert.equal(formatLooseShapeLabel('unknown-shape', shapes), 'unknown-shape');
assert.equal(formatLooseShapeLabel('empty', shapes), 'empty');
assert.equal(formatLooseShapeLabel('', shapes), 'カット不明');
assert.equal(formatLooseShapeLabel(null, shapes), 'カット不明');
assert.equal(formatLooseShapeLabel(undefined, shapes), 'カット不明');
assert.equal(formatLooseShapeLabel(1, shapes), '数値カット');
assert.equal(formatLooseShapeLabel(0, shapes), 'カット不明');
console.log('LOOSE SHAPE LABEL TEST: PASS');
