export function formatInstallStatusText({ standalone = false, directInstallAvailable = false } = {}) {
  if (standalone) return 'ホーム画面へ追加済みです。';
  if (directInstallAvailable) return 'この端末へ直接追加できます。ブラウザのメニューを開く必要はありません。';
  return '追加ボタンを押してください。直接追加できない環境では、Chromeで開くボタンを表示します。';
}
