#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
modal_start = app.find("modalEl.addEventListener('click', async (event) => {")
modal_end = app.find("const scheduleInteractionAutosave", modal_start)
modal = app[modal_start:modal_end] if modal_start >= 0 and modal_end > modal_start else ''

checks = {
    '取消ボタンが確認モーダルを開く': "case 'gift-cancel':" in app and "action: 'gift-cancel-confirm'" in app,
    '確認用コードを保持': "screenData.giftCancelCode = button.dataset.code || '';" in app,
    'モーダル側に取消確定処理': "case 'gift-cancel-confirm': {" in modal,
    '確定時に対象コードを取得': "const code = screenData.giftCancelCode || '';" in modal,
    '確定時にモーダルを閉じる': 'closeModal();' in modal,
    '確定時に取消処理を実行': 'await cancelGift(code);' in modal,
    '取消処理本体を維持': 'async function cancelGift(code)' in app and 'await cancelGiftCode(currentUser.uid, code, restoreGiftToGameState);' in app,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: プレゼント取消確認モーダルの回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: プレゼント取消確認モーダルの処理接続を確認しました。')
