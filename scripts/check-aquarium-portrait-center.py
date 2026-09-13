#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'assets/minigames/aquarium/index.html'
text = path.read_text(encoding='utf-8')

checks = {
    '縦画面でアプリ領域を中央配置': '@media(max-width:640px){.app{justify-content:center;padding-top:0}}' in text,
    '旧上寄せ指定を除去': '@media(max-width:640px){.app{justify-content:flex-start;padding-top:3vh}}' not in text,
    '水槽ステージを維持': 'class="stage"' in text and '.stage{position:relative;width:100%;aspect-ratio:3/2;' in text,
    '観察ボタンを維持': '<button id="observe">観察する</button>' in text,
    '横画面専用中央配置を維持': '@media (orientation:landscape){' in text and '.app{max-width:none;min-height:calc(100dvh - 16px);justify-content:center;align-items:center;gap:0}' in text,
}


marker = '<style id="aquarium-mobile-badge-return-clearance">'
mobile_badge_style = text.split(marker, 1)[1].split('</style>', 1)[0] if marker in text else ''
checks['携帯の飼育負荷を親画面の戻るボタンから右上へ退避'] = all(token in mobile_badge_style for token in (
    '@media (orientation:portrait) and (max-width:820px),',
    '(orientation:landscape) and (max-height:700px)',
    'left:auto!important;',
    'right:max(8px,env(safe-area-inset-right))!important;',
))
checks['水槽PC表示の既存左上バッジ位置を維持'] = '.badge{position:fixed;left:8px;top:8px;' in text

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: 水槽の縦画面中央配置の回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: 水槽の縦画面中央配置を確認しました。')
