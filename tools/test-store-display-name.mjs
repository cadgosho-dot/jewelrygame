import assert from 'node:assert/strict';
import { formatStoreDisplayName } from '../js/ui/store-display-name.js';
assert.equal(formatStoreDisplayName('g-Lab.'), 'g-Lab.');
assert.equal(formatStoreDisplayName('  JEWELRY  '), 'JEWELRY');
assert.equal(formatStoreDisplayName(''), '店舗');
assert.equal(formatStoreDisplayName('   '), '店舗');
assert.equal(formatStoreDisplayName(null), '店舗');
assert.equal(formatStoreDisplayName(undefined), '店舗');
console.log('STORE DISPLAY NAME UNIT: PASS');
