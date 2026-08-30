#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
css = (ROOT / 'styles.css').read_text(encoding='utf-8')

checks = {
    '3カテゴリ定義': "const TROPICAL_SHOP_CATEGORIES = ['fish', 'plant', 'display'];" in app,
    '水草商品データ': "plant: Object.freeze([" in app and "'アナカリス'" in app and "'アマゾンソード'" in app,
    'カテゴリ固定コントロールDOM': 'class="tropical-shop-controls"' in app,
    'カテゴリボタンDOM': 'data-action="tropical-shop-tab"' in app,
    'スワイプ案内': '左右にスワイプしても切替できます' in app,
    'スワイプ処理': 'function bindTropicalFishShopNavigation()' in app and 'moveTropicalShopCategory(1)' in app and 'moveTropicalShopCategory(-1)' in app,
    '入店時スクロールリセット': "tropicalResetScroll: true" in app and 'function resetTropicalFishShopScroll()' in app,
    '描画後バインド': "if (screen === 'tropicalFishShop') queueMicrotask(bindTropicalFishShopNavigation);" in app,
    'カテゴリ固定表示CSS': 'body[data-screen="tropicalFishShop"] .tropical-shop-controls' in css and 'position:sticky;' in css,
    '横スワイプCSS': 'touch-action:pan-y;' in css,
    '2段ヘッダー二重余白防止': 'body[data-header-mode="two-bar"][data-screen="tropicalFishShop"]' in css and 'padding-top:8px!important;' in css,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: 熱帯魚屋カテゴリ導線の回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: 熱帯魚屋は魚・水草・ディスプレイをタップ／左右スワイプで切替でき、カテゴリ導線はスクロール中も固定表示されます。')
