import assert from 'node:assert/strict';
import { formatSaveDiagnosticBytesLabel } from '../js/ui/save-diagnostic-bytes-label.js';

assert.equal(formatSaveDiagnosticBytesLabel(null), '0 B');
assert.equal(formatSaveDiagnosticBytesLabel('not-a-number'), '0 B');
assert.equal(formatSaveDiagnosticBytesLabel(-10), '0 B');
assert.equal(formatSaveDiagnosticBytesLabel(0), '0 B');
assert.equal(formatSaveDiagnosticBytesLabel(1), '1 B');
assert.equal(formatSaveDiagnosticBytesLabel(1023.6), '1,024 B');
assert.equal(formatSaveDiagnosticBytesLabel(1024), '1.0 KB');
assert.equal(formatSaveDiagnosticBytesLabel(1536), '1.5 KB');
assert.equal(formatSaveDiagnosticBytesLabel(1024 * 1024 - 1), '1024.0 KB');
assert.equal(formatSaveDiagnosticBytesLabel(1024 * 1024), '1.00 MB');
assert.equal(formatSaveDiagnosticBytesLabel(1572864), '1.50 MB');
console.log('SAVE DIAGNOSTIC BYTES LABEL UNIT: PASS');
