import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

const storeStart = app.indexOf('function renderStore()');
const storeEnd = app.indexOf('function renderShowcaseUnit', storeStart);
const renderStore = storeStart >= 0 && storeEnd > storeStart ? app.slice(storeStart, storeEnd) : '';

const customerStart = app.indexOf('function renderCustomer()');
const customerEnd = app.indexOf('function orderCustomerProfile', customerStart);
const renderCustomer = customerStart >= 0 && customerEnd > customerStart ? app.slice(customerStart, customerEnd) : '';

const declineIndex = renderCustomer.indexOf('data-action="ignore-customer"');
const orderIndex = renderCustomer.indexOf('data-action="accept-order"');

const helperStart = app.indexOf('function storeBranchHasWaitingCustomer(branchOrNumber = currentStoreBranch())');
const helperEnd = app.indexOf('\n\nfunction storeBusinessOpen', helperStart);
const helperSource = helperStart >= 0 && helperEnd > helperStart ? app.slice(helperStart, helperEnd) : '';
let helperBehavior = false;
if (helperSource) {
  const sampleState = {
    customers: {
      first: { visiting: true, visitingBranchNumber: 2 },
      second: { visiting: false, visitingBranchNumber: 1 },
    },
  };
  const buildHelper = new Function('state', 'currentStoreBranch', `${helperSource}; return storeBranchHasWaitingCustomer;`);
  const helper = buildHelper(sampleState, () => ({ number: 2 }));
  helperBehavior = helper(1) === false
    && helper(2) === true
    && helper({ number: 2 }) === true
    && helper(3) === false
    && helper() === true;
}

const checks = [
  ['店舗別の来店判定関数', Boolean(helperSource)],
  ['店舗別来店判定の動作テスト', helperBehavior],
  ['来店中フラグを判定', app.includes('Boolean(customer?.visiting)')],
  ['来店店舗番号を照合', app.includes('Number(customer.visitingBranchNumber)')],
  ['店舗選択ボタンで来店判定を使用', renderStore.includes('const customerWaiting = storeBranchHasWaitingCustomer(branch);')],
  ['来店中の店舗だけ赤丸を描画', renderStore.includes('customerWaiting ? \'<span class="store-visit-dot"')],
  ['赤丸に案内ラベルを付与', renderStore.includes('aria-label="お客様が来店中"')],
  ['赤丸の円形CSS', css.includes('.store-visit-dot{') && css.includes('border-radius:50%')],
  ['赤丸の赤色CSS', css.includes('background:#e32626')],
  ['注文を受けないをオーダー制作より先に表示', declineIndex >= 0 && orderIndex >= 0 && declineIndex < orderIndex],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'NG'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
