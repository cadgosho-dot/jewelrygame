import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/events/purple-capsule-event.js', import.meta.url), 'utf8');

assert.match(
  source,
  /window\.addEventListener\('click',\s*click,\s*true\)/,
  '紫のカプセル使用クリックは、既存のdocument側アイテム処理より先に捕捉できるようwindowのcaptureで登録する'
);

console.log('PURPLE CAPSULE CLICK PRIORITY: PASS');
