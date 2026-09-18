#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
module = (ROOT / 'js/aquarium/tropical-shop-approved-ui.js').read_text(encoding='utf-8')
css = (ROOT / 'tropical-shop-approved-ui.css').read_text(encoding='utf-8')
game = (ROOT / 'game.html').read_text(encoding='utf-8')

checks = {
    '3カテゴリ定義': "const TROPICAL_SHOP_CATEGORIES = ['fish', 'plant', 'display'];" in app,
    '既存カテゴリボタンDOMを維持': 'data-action="tropical-shop-tab"' in app,
    '既存購入処理を維持': 'function purchaseTropicalShopItem(){' in app,
    '承認UIモジュール読込': "import './aquarium/tropical-shop-approved-ui.js?v=" in app,
    '承認CSS読込': './tropical-shop-approved-ui.css?v=' in game,
    '入店時はカテゴリメニュー': "let viewMode = 'menu';" in module and "if (!wasActive) viewMode = 'menu';" in module,
    'カテゴリ選択後だけ商品一覧': "viewMode = 'category';" in module and "controls.hidden = viewMode !== 'menu'" in module,
    '商品一覧から戻るとカテゴリメニュー': "if (viewMode === 'category')" in module and 'returnToCategoryMenu(event);' in module,
    'ウーパールーパー説明を他魚と同じ表示へ': 'fish-axolotl.png' in module and "smalls[1].classList.add(HIDDEN_CLASS)" in module and "title !== 'ウーパールーパー'" in module,
    'カテゴリボタン内部透明': 'background-color:rgba(0,0,0,0)!important;' in css and 'all:unset!important;' in css,
    '縦画面カテゴリは縦並び': 'grid-template-columns:1fr!important;' in css and 'min-height:84px!important;' in css and 'gap:24px!important;' in css,
    '横画面カテゴリは縦中央': 'align-items:center!important;' in css and 'grid-template-columns:repeat(3,minmax(0,1fr))!important;' in css,
    '縦画面はヘッダーと本文を物理分離': 'grid-template-rows:auto minmax(0,1fr)!important;' in css and 'grid-row:2!important;' in css,
    '商品一覧は縦1列': 'grid-template-columns:minmax(0,1fr)!important;' in css,
    '商品一覧は横4列': 'grid-template-columns:repeat(4,minmax(0,1fr))!important;' in css,
    '購入画面は上部バー直下': 'top:var(--jwj-tropical-content-top,190px)!important;' in css and 'align-items:flex-start!important;' in css,
    '横購入画面はスクロール可能': '@media (orientation:landscape)' in css and 'overflow-y:auto!important;' in css,
}

failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    print('NG: 熱帯魚屋の承認済みカテゴリ導線/UI回帰検査に失敗しました。')
    for name in failed:
        print('- ' + name)
    sys.exit(1)
print('OK: 熱帯魚屋は承認済みv26 UI（入口3択・透明ボタン・縦横配置・商品一覧・購入画面）を維持しています。')
