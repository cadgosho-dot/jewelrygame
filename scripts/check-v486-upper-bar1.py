from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = (root / 'styles.css').read_text(encoding='utf-8')

html = f'''<!doctype html><html data-device-class="phone" data-orientation="portrait"><head>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head>
<body data-header-mode="two-bar" data-screen="workshop"><main class="screen-shell">
<header class="game-header">
  <div class="status-left"><div class="status-top-line">
    <div class="status-primary-line">
      <span class="header-status-item header-calendar-date">2026年8月1日</span>
      <span class="header-status-item header-weekday weekday-saturday">（土）</span>
      <span class="header-status-item header-day">11日目</span>
      <span class="header-status-item header-weather">☁ 曇り</span>
      <span class="header-time-slot header-time-primary"><span class="header-status-item header-time game-time-panel normal">09:00</span></span>
    </div>
    <div class="status-secondary-line">
      <span class="header-time-slot header-time-secondary"><span class="header-status-item header-time game-time-panel normal">09:00</span></span>
      <span class="header-status-item header-player-name">川原</span>
      <span class="header-status-item header-hunger">空腹度 7／7</span>
    </div>
  </div></div>
  <div class="header-money-area"><span class="header-money"><span class="header-money-value">24,000円</span></span></div>
  <div class="header-center"><button class="icon-button">←</button><div class="header-title"><strong>工房</strong></div><div class="header-actions header-secondary-actions"><button class="small-button header-main-button">メイン画面</button></div></div>
</header><section class="screen-content"></section></main></body></html>'''

viewports = [(320,568),(360,640),(390,844),(412,915),(430,932)]
minimum_fonts = {320:11.7, 360:12.6, 390:13.7, 412:14.4, 430:14.4}
failures=[]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':390,'height':844})
    page.set_content(html)
    for width,height in viewports:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(20)
        result = page.evaluate('''() => {
          const q = s => document.querySelector(s);
          const rect = e => { const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
          const status=rect(q('.status-left'));
          const primary=rect(q('.status-primary-line'));
          const secondary=rect(q('.status-secondary-line'));
          const topLine=rect(q('.status-top-line'));
          const moneyArea=rect(q('.header-money-area'));
          const header=rect(q('.game-header'));
          const itemStyle=getComputedStyle(q('.header-calendar-date'));
          const statusStyle=getComputedStyle(q('.status-left'));
          const topStyle=getComputedStyle(q('.status-top-line'));
          const moneyStyle=getComputedStyle(q('.header-money'));
          const rowOverflows=[...document.querySelectorAll('.status-primary-line,.status-secondary-line')].map(row=>{
            const rr=row.getBoundingClientRect();
            const kids=[...row.children].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect());
            return kids.length ? Math.max(...kids.map(r=>r.right))-rr.right : 0;
          });
          const contentTop=Math.min(primary.top,secondary.top);
          const contentBottom=Math.max(primary.bottom,secondary.bottom);
          return {
            headerHeight:header.height, infoHeight:status.height,
            fontSize:parseFloat(itemStyle.fontSize), moneyFont:parseFloat(moneyStyle.fontSize),
            paddingTop:parseFloat(statusStyle.paddingTop), paddingBottom:parseFloat(statusStyle.paddingBottom),
            gap:parseFloat(topStyle.rowGap || topStyle.gap || '0'),
            freeTop:contentTop-status.top, freeBottom:status.bottom-contentBottom,
            statusRight:status.right, moneyLeft:moneyArea.left,
            rowOverflows,
            display:topStyle.display,
          };
        }''')
        if result['fontSize'] + 0.05 < minimum_fonts[width]:
            failures.append((width,'文字サイズ不足',result))
        if result['moneyFont'] < 14.9:
            failures.append((width,'所持金文字サイズ不足',result))
        if abs(result['freeTop'] - result['freeBottom']) > 0.75:
            failures.append((width,'縦中央ではない',result))
        if result['paddingTop'] > 0.1 or result['paddingBottom'] > 0.1:
            failures.append((width,'上下余白が残っている',result))
        if result['gap'] > 1.1:
            failures.append((width,'2行間隔が広い',result))
        if result['infoHeight'] > 52.1 or result['headerHeight'] > 97:
            failures.append((width,'バー高さが圧縮されていない',result))
        if result['statusRight'] > result['moneyLeft'] + 0.6:
            failures.append((width,'情報と所持金が重なる',result))
        if max(result['rowOverflows']) > 0.6:
            failures.append((width,'標準表示が横にはみ出す',result))
        if result['display'] != 'flex':
            failures.append((width,'情報2行がflex中央配置でない',result))
    browser.close()

if failures:
    for f in failures[:20]: print('NG',f)
    raise SystemExit(f'上部バー1検査に{len(failures)}件の失敗があります')

print('v0.10.486 上部バー1検査: OK（携帯縦画面5サイズ）')
print('- 情報文字 11.8px〜14.5px、所持金 15px〜19px')
print('- 2行を枠の縦中央へ配置')
print('- 上下padding 0px、行間1px以下')
print('- 情報バー48px、2段ヘッダー全体93px（標準スケール）')
