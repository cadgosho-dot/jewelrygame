import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

const renderStart = app.indexOf('function renderStore()');
const renderEnd = app.indexOf('function renderShowcaseUnit', renderStart);
const renderStore = renderStart >= 0 && renderEnd > renderStart ? app.slice(renderStart, renderEnd) : '';
const equipmentIndex = renderStore.indexOf('storefront-equipment-section');
const staffIndex = renderStore.indexOf('store-employee-link');
const evaluationIndex = renderStore.indexOf('store-evaluation-section');

const checks = [
  ['ショーケース位置の取得関数', app.includes('function captureStoreShowcaseReturnPosition(showcaseIndex)')],
  ['ショーケース位置の復元関数', app.includes('function restoreStoreShowcaseReturnPosition(snapshot)')],
  ['ショーケース単位の固定アンカー', app.includes('data-showcase-index="${showcaseIndex}"')],
  ['空き枠を開く前に位置を記録', app.includes('const returnStoreShowcaseScroll = captureStoreShowcaseReturnPosition(showcaseIndex);')],
  ['陳列後に位置を復元して店舗へ戻る', app.includes('restoreShowcaseScroll: returnStoreShowcaseScroll')],
  ['完成画面からの陳列も対象ショーケースへ移動', app.includes('restoreShowcaseScroll: { branchId: branch.id, showcaseIndex: position.showcaseIndex }')],
  ['描画後の遅延復元', app.includes('[45, 120, 260].forEach((delay) => setTimeout(restore, delay));')],
  ['店舗スタッフボタンは1個', (renderStore.match(/store-employee-link/g) || []).length === 1],
  ['店舗スタッフボタンを店頭設備の直後へ配置', equipmentIndex >= 0 && staffIndex > equipmentIndex && evaluationIndex > staffIndex],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'NG'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
