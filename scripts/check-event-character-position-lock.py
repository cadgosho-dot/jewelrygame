#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
lock_path = ROOT / 'js/events/oyatsu-character-position-lock.js'
helper_path = ROOT / 'js/events/event-state-helpers.js'

lock = lock_path.read_text(encoding='utf-8') if lock_path.is_file() else ''
helper = helper_path.read_text(encoding='utf-8') if helper_path.is_file() else ''

checks = {
    '新イベント共通キャラクターを対象': "const CHARACTER_SELECTOR = '.jxj-new-event-character';" in lock,
    'おやつ画面だけに限定しない': 'OYATSU_SCREEN' not in lock,
    '画面ごとにロックを分離': 'lockedRects = new Map()' in lock and 'activeScreen' in lock,
    '画像ごとにロックを分離': 'imageSource(image)' in lock and 'lockKey(screen, orientation, source)' in lock,
    '向き変更で再取得': 'orientationchange' in lock and 'clearLocks()' in lock,
    '大幅な横幅変更で再取得': 'WIDTH_RESET_THRESHOLD_PX' in lock,
    '承認済み通常イベントUIを直接対象にしない': '.visit-character' not in lock,
    '承認済みクイズイベントUIを直接対象にしない': '.jxj-quiz-character-v2' not in lock,
    'イベント状態ヘルパーから読み込む': "import './oyatsu-character-position-lock.js';" in helper,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)

if failed:
    print('NG: イベントキャラクター位置固定の回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)

print('OK: 新イベント共通キャラクターの位置固定と、通常/クイズ固定UIの分離を確認しました。')
