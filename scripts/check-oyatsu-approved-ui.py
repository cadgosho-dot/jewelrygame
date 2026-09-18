#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
module = (ROOT / 'js/events/oyatsu-daisuki-approved-ui.js').read_text(encoding='utf-8')
css = (ROOT / 'oyatsu-daisuki-approved-ui.css').read_text(encoding='utf-8')
game = (ROOT / 'game.html').read_text(encoding='utf-8')

checks = {
    '登録済みセリフを維持': "shopConfirm:'もう満足した？'" in app and "shopFarewell:'御徒町到着！、、、楽しかった！また行こうね！　ばいびー！、、、、'" in app,
    '既存イベント進行を維持': 'function chooseOyatsuShopConfirm(answer)' in app and 'function advanceOyatsuDaisukiEvent()' in app,
    '承認UIモジュール読込': "import './events/oyatsu-daisuki-approved-ui.js?v=" in app,
    '承認CSS読込': './oyatsu-daisuki-approved-ui.css?v=' in game,
    '満足確認シーンをDOMで限定': '[data-action="oyatsu-shop-confirm-choice"]' in module and 'SHOP_CONFIRM_CLASS' in module,
    '満足確認は熱帯魚屋背景': 'tropical-fish-shop.webp' in css and 'tropical-fish-shop-portrait.webp' in css,
    'アイス画面だけに専用クラス': ".meal-eating-panel-ice" in module and 'oyatsu-ice-approved-panel' in module,
    'アイス画像はcontain': 'object-fit:contain!important;' in css,
    '縦アイス全体表示サイズを固定': 'max-width:min(54vw,300px)!important;' in css and 'max-height:min(43dvh,500px)!important;' in css,
    '横アイスは上詰め': 'justify-content:flex-start!important;' in css and 'padding-top:0!important;' in css,
    '横アイス全体表示サイズを固定': 'max-width:min(25vw,330px)!important;' in css and 'max-height:min(34dvh,260px)!important;' in css,
    '表示モジュールはゲーム状態を書き換えない': all(token not in module for token in ('saveGame(', 'state.game', 'screenData', 'localStorage', 'indexedDB')),
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: おやつ大好き承認済みUI回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: おやつ大好きは承認済みv3表示（満足確認の熱帯魚屋背景・アイス全体表示・横上詰め）を維持しています。')
