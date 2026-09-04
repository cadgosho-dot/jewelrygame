import assert from 'node:assert/strict';
import { formatSaveDiagnosticDateLabel } from '../js/ui/save-diagnostic-date-label.js';

assert.equal(formatSaveDiagnosticDateLabel(null), '—');
assert.equal(formatSaveDiagnosticDateLabel(''), '—');
assert.equal(formatSaveDiagnosticDateLabel('not-a-date'), '—');
const iso = '2026-09-04T13:05:06.000Z';
assert.equal(formatSaveDiagnosticDateLabel(iso), new Date(iso).toLocaleString('ja-JP'));
const numeric = 1788527106000;
assert.equal(formatSaveDiagnosticDateLabel(numeric), new Date(numeric).toLocaleString('ja-JP'));

console.log('SAVE DIAGNOSTIC DATE LABEL TEST: PASS');
