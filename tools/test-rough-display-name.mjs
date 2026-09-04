import assert from 'node:assert/strict';
import { formatRoughDisplayName } from '../js/ui/rough-display-name.js';

const gems = Object.freeze({
  ruby: Object.freeze({ name: 'ルビー', roughName: 'ルビーの原石' }),
  sapphire: Object.freeze({ name: 'サファイア' }),
  emerald: Object.freeze({ name: 'エメラルド', roughName: '' }),
});

assert.equal(formatRoughDisplayName('ruby', gems), 'ルビーの原石');
assert.equal(formatRoughDisplayName('sapphire', gems), 'サファイア原石');
assert.equal(formatRoughDisplayName('emerald', gems), 'エメラルド原石');
assert.equal(formatRoughDisplayName('unknown', gems), '原石');
assert.equal(formatRoughDisplayName('', gems), '原石');
assert.equal(Object.keys(gems).length, 3);
console.log('ROUGH DISPLAY NAME TEST: PASS');
