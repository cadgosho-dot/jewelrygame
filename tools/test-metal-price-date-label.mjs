import assert from 'node:assert/strict';
import { formatMetalPriceDateLabel } from '../js/ui/metal-price-date-label.js';

for (const value of [undefined, null, '', 'bad']) {
  assert.equal(formatMetalPriceDateLabel(value), '');
}

const options = {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
};
for (const value of ['2026-09-04T12:35:00Z', '2026-01-01T00:05:00Z', '2026-12-31T15:00:00Z']) {
  const expected = new Intl.DateTimeFormat('ja-JP', options).format(new Date(value));
  assert.equal(formatMetalPriceDateLabel(value), expected);
}

console.log('METAL PRICE DATE LABEL TEST: PASS');
