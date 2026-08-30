from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = (root / "styles.css").read_text(encoding="utf-8")
viewports = [(320,568),(360,640),(390,844),(412,915),(430,932),(844,390)]
html = f"""<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>{css}</style></head><body><button class="event-safety-recovery">イベント終了</button></body></html>"""
failures=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':320,'height':568})
    page.set_content(html)
    for width,height in viewports:
        page.set_viewport_size({'width':width,'height':height})
        result=page.evaluate("""() => {
          const el=document.querySelector('.event-safety-recovery');
          const r=el.getBoundingClientRect();
          const s=getComputedStyle(el);
          return {left:r.left,top:r.top,width:r.width,height:r.height,fontSize:parseFloat(s.fontSize),opacity:parseFloat(s.opacity),right:s.right,bottom:s.bottom};
        }""")
        if result['left'] > 1 or result['top'] > 1:
            failures.append((width,height,'not top-left',result))
        if result['height'] > 19.5 or result['width'] > 70:
            failures.append((width,height,'too large',result))
        if result['fontSize'] > 9:
            failures.append((width,height,'font too large',result))
        if result['opacity'] > .5:
            failures.append((width,height,'too prominent',result))
    browser.close()
if failures:
    for failure in failures: print('NG', failure)
    raise SystemExit(f'イベント終了ボタン検査に{len(failures)}件の失敗があります')
print(f'v0.10.488 イベント終了ボタン検査: OK（{len(viewports)}画面サイズ）')
print('画面上端・左端、幅70px以下、高さ19.5px以下、通常時不透明度0.5以下です。')
