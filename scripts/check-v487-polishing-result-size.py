from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = (root / 'styles.css').read_text(encoding='utf-8')
viewports = [
    (320, 568), (360, 640), (375, 667), (390, 844), (412, 915), (430, 932),
    (568, 320), (640, 360), (667, 375), (740, 360), (760, 400), (844, 390), (915, 412), (932, 430),
    (691, 1536), (1536, 691),
]
html = (
    '<!doctype html><html><head><style>' + css + '</style><style>'
    'html,body{margin:0;width:100%;height:100%;overflow:hidden}'
    '#modal-layer{position:fixed;inset:0}'
    '.modal-backdrop{position:absolute;inset:0;display:grid;place-items:center;background:#222}'
    '.loose-visual{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#59c 28%,#126 70%)}'
    '</style></head><body><div id="modal-layer"><div class="modal-backdrop">'
    '<section class="modal polishing-result-modal">'
    '<h2>アメシスト原石をラウンドへカットしました</h2>'
    '<div class="modal-body"><section class="polishing-result-modal-content">'
    '<div class="polishing-result-loose-visual"><div class="loose-visual polishing-result-loose-image"></div></div>'
    '<button class="secondary-button polishing-result-return-button">戻る</button>'
    '</section></div></section></div></div></body></html>'
)
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 320, 'height': 568})
    page.set_content(html)
    for width, height in viewports:
        page.set_viewport_size({'width': width, 'height': height})
        data = page.evaluate("""() => {
          const modal = document.querySelector('.polishing-result-modal').getBoundingClientRect();
          const visual = document.querySelector('.polishing-result-loose-visual').getBoundingClientRect();
          const button = document.querySelector('.polishing-result-return-button').getBoundingClientRect();
          return {mw:modal.width,mh:modal.height,mx:modal.x,my:modal.y,vw:visual.width,vh:visual.height,bw:button.width,bh:button.height};
        }""")
        portrait = height >= width
        if portrait and width <= 820:
            max_modal = min(286, width - 40) + 1
            max_visual = 88.5
        elif (not portrait) and height <= 620:
            max_modal = min(430, width - 28) + 1
            max_visual = 92.5
        else:
            max_modal = min(330, width - 36) + 1
            max_visual = 112.5
        if data['mw'] > max_modal:
            errors.append(f'{width}x{height}: 枠幅{data["mw"]:.1f}px > {max_modal:.1f}px')
        if data['vw'] > max_visual:
            errors.append(f'{width}x{height}: 石幅{data["vw"]:.1f}px > {max_visual:.1f}px')
        if data['vw'] < 71:
            errors.append(f'{width}x{height}: 石幅が小さすぎます {data["vw"]:.1f}px')
        if data['mx'] < -1 or data['my'] < -1 or data['mx'] + data['mw'] > width + 1 or data['my'] + data['mh'] > height + 1:
            errors.append(f'{width}x{height}: 結果枠が画面外です')
        cx = data['mx'] + data['mw'] / 2
        cy = data['my'] + data['mh'] / 2
        if abs(cx - width / 2) > 1.5:
            errors.append(f'{width}x{height}: 結果枠が横中央からずれています ({cx-width/2:.1f})')
        if portrait and abs(cy - height / 2) > 1.5:
            errors.append(f'{width}x{height}: 縦画面の結果枠が縦中央からずれています ({cy-height/2:.1f})')
    browser.close()

if errors:
    for error in errors:
        print('NG', error)
    raise SystemExit(f'原石研磨完成画面サイズ検査に{len(errors)}件の失敗')

print(f'v0.10.487 原石研磨完成画面サイズ検査: OK（{len(viewports)}サイズ）')
print('- 完成ルース: 縦88px以下、低い横92px以下、通常112px以下')
print('- 結果枠: 縦286px以下、低い横430px以下、通常330px以下')
print('- 縦画面は縦横中央、横画面は横中央で画面内に収まることを確認')
