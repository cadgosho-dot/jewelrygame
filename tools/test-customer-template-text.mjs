import assert from 'node:assert/strict';
import { formatCustomerTemplateText } from '../js/ui/customer-template-text.js';
assert.equal(formatCustomerTemplateText('ご希望は{item}です', 'リング'), 'ご希望はリングです');
assert.equal(formatCustomerTemplateText('{item}と{item}を確認', 'ペンダント'), 'ペンダントとペンダントを確認');
assert.equal(formatCustomerTemplateText('置換なし', 'ピアス'), '置換なし');
assert.equal(formatCustomerTemplateText('', 'リング'), '');
assert.equal(formatCustomerTemplateText(null, 'リング'), '');
assert.equal(formatCustomerTemplateText('{item}'), 'ジュエリー');
console.log('CUSTOMER TEMPLATE TEXT UNIT: PASS');
