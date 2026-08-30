from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = ''  # 画面固有の変形を除き、共通ヘッダー補正関数そのものを検査する
app = (root / 'js/app.js').read_text(encoding='utf-8')
def extract_function(name):
    start = app.index(f'function {name}(')
    body_start = app.index('{', start)
    depth = 0
    quote = None
    escaped = False
    for i in range(body_start, len(app)):
        ch = app[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in ('\"', "'", '`'):
            quote = ch
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return app[start:i + 1]
    raise RuntimeError(f'{name}の終端が見つかりません')

function_source = '\n'.join([
    extract_function('visibleHeaderBottom'),
    extract_function('polishingTopAnchor'),
    extract_function('syncScreenContentTopOffset'),
])

screens = [
    'mining','miningGame','miningResult','okachimachi','okachimachiQuiz','supplier','supplierMetals',
    'supplierMetalHistory','pureMetalProfessionalGuide','supplierRough','looseShop','jewelryShop',
    'looseInventoryDetail','looseGemGuide','looseCutGuide','displayShop','realEstate','workshop','craft',
    'craftLoose','polishing','completion','inventory','finishedItemDetail','workshopTool','workshopToolGuide',
    'workshopStaff','metalInventoryDetail','metalProfessionalGuide','glab','glabSns','glabTool','glabToolGuide',
    'store','showcaseSelect','showcaseDetail','customer','orders','employee','phone','todayGem','meal',
    'kaitenzushi','settings','robberyReport','dayResult'
]
viewports = [(320,568),(360,640),(390,844),(412,915),(430,932)]
header_heights = [72,126,180]

html = f'''<!doctype html><html data-device-class="phone" data-orientation="portrait"><head><style>{css}</style>
<style>
html,body{{margin:0;width:100%;height:100%;overflow:hidden}}
#app,.screen-shell{{position:relative;width:100%;height:100%}}
.game-header{{display:block!important;position:fixed!important;inset:0 0 auto 0!important;height:var(--test-header-height)!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;box-sizing:border-box!important;overflow:hidden!important;transform:none!important;z-index:50!important}}
.game-header>*{{display:none!important}}
.screen-content{{position:absolute!important;inset:0!important;overflow:auto!important;padding:12px!important;padding-top:238px!important;box-sizing:border-box!important}}
html[data-device-class="phone"][data-orientation="portrait"] body[data-header-mode="two-bar"] .screen-shell>.screen-content{{padding-top:238px!important}}
.screen-content>.test-first{{display:block;margin-top:0!important;height:40px}}
</style></head><body data-screen="looseGemGuide" data-header-mode="two-bar"><div id="app"><main class="screen-shell"><header class="game-header"><div class="game-time-panel"></div></header><section class="screen-content"><div class="test-first">本文先頭</div><div style="height:1200px"></div></section></main></div></body></html>'''

failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 320, 'height': 568})
    page.set_content(html)
    page.add_script_tag(content=f"let screen='looseGemGuide'; const root=document.getElementById('app');\n{function_source}")
    for width, height in viewports:
        page.set_viewport_size({'width': width, 'height': height})
        for index, screen_id in enumerate(screens):
            header_height = header_heights[index % len(header_heights)]
            result = page.evaluate('''([screenId, headerHeight]) => {
              screen = screenId;
              document.body.dataset.screen = screenId;
              document.documentElement.style.setProperty('--test-header-height', `${headerHeight}px`);
              const content = document.querySelector('.screen-content');
              content.style.removeProperty('padding-top');
              content.style.removeProperty('scroll-padding-top');
              syncScreenContentTopOffset();
              content.scrollTop = 0;
              const header = document.querySelector('.game-header').getBoundingClientRect();
              const first = document.querySelector('.test-first').getBoundingClientRect();
              const applied = getComputedStyle(content).paddingTop;
              return { gap: first.top - header.bottom, applied, headerBottom: header.bottom, firstTop: first.top };
            }''', [screen_id, header_height])
            expected_gap = 16 if screen_id == 'polishing' else 8
            if result['headerBottom'] > 0.5 and abs(result['gap'] - expected_gap) > 0.51:
                failures.append((width, height, screen_id, header_height, result))
    browser.close()

if failures:
    for failure in failures[:20]:
        print('NG', failure)
    raise SystemExit(f'縦画面ヘッダー検査に{len(failures)}件の失敗があります')

print(f'v0.10.493 縦画面ヘッダー検査: OK（{len(screens)}画面 × {len(viewports)}端末サイズ = {len(screens)*len(viewports)}ケース）')
print('上部バーと本文先頭の間隔は、通常画面8px・原石研磨16pxです。')
