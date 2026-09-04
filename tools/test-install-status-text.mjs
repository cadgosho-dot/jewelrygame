import assert from 'node:assert/strict';
import { formatInstallStatusText } from '../js/ui/install-status-text.js';
assert.equal(formatInstallStatusText({ standalone: true, directInstallAvailable: true }), 'ホーム画面へ追加済みです。');
assert.equal(formatInstallStatusText({ standalone: false, directInstallAvailable: true }), 'この端末へ直接追加できます。ブラウザのメニューを開く必要はありません。');
assert.equal(formatInstallStatusText({ standalone: false, directInstallAvailable: false }), '追加ボタンを押してください。直接追加できない環境では、Chromeで開くボタンを表示します。');
assert.equal(formatInstallStatusText(), '追加ボタンを押してください。直接追加できない環境では、Chromeで開くボタンを表示します。');
console.log('INSTALL STATUS TEXT UNIT: PASS');
