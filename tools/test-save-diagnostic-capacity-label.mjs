import assert from 'node:assert/strict';
import { formatSaveDiagnosticCapacityLabel } from '../js/ui/save-diagnostic-capacity-label.js';

assert.equal(formatSaveDiagnosticCapacityLabel(0, 0), '確認不能');
assert.equal(formatSaveDiagnosticCapacityLabel(1, -1), '確認不能');
assert.equal(formatSaveDiagnosticCapacityLabel(0, 10), '余裕あり');
assert.equal(formatSaveDiagnosticCapacityLabel(7, 10), '余裕あり');
assert.equal(formatSaveDiagnosticCapacityLabel(8, 10), '注意');
assert.equal(formatSaveDiagnosticCapacityLabel(9, 10), '注意');
assert.equal(formatSaveDiagnosticCapacityLabel(10, 10), '上限付近');
assert.equal(formatSaveDiagnosticCapacityLabel(11, 10), 'クラウド上限超過');
assert.equal(formatSaveDiagnosticCapacityLabel('8', '10'), 'クラウド上限超過');
console.log('SAVE DIAGNOSTIC CAPACITY LABEL UNIT: PASS');
