import assert from 'node:assert/strict';
import { formatWorkshopStaffQualityDescription } from '../js/ui/workshop-staff-quality-description.js';

const cases = [
  [undefined, '品質：標準のみ'],
  [null, '品質：標準のみ'],
  [{}, '品質：標準のみ'],
  [{ goodChance: 0, premiumChance: 0 }, '品質：標準のみ'],
  [{ goodChance: 0.2, premiumChance: 0 }, '品質：良品20%'],
  [{ goodChance: 0.34, premiumChance: 0.12 }, '品質：良品34%・上質12%'],
  [{ goodChance: '0.255', premiumChance: '0.075' }, '品質：良品26%・上質8%'],
  [{ goodChance: 0, premiumChance: 0.05 }, '品質：良品0%・上質5%'],
  [{ goodChance: 0.004, premiumChance: 0.004 }, '品質：標準のみ'],
  [{ goodChance: Number.NaN, premiumChance: Number.NaN }, '品質：標準のみ'],
];

for (const [definition, expected] of cases) {
  assert.equal(formatWorkshopStaffQualityDescription(definition), expected);
}

console.log('WORKSHOP STAFF QUALITY DESCRIPTION TEST: PASS');
