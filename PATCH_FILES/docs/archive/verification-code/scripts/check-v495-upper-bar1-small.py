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
      <span class="header-status-item header-calendar-date"><span class="header-full-label">2026年12月31日</span><span class="header-compact-label" aria-hidden="true">12/31</span></span>
      <span class="header-status-item header-weekday weekday-holiday"><span class="header-full-label">（木）</span><span class="header-compact-label" aria-hidden="true">木</span></span>
      <span class="header-status-item header-day">1234日目</span>
      <span class="header-status-item header-weather"><span class="header-weather-icon">☁</span><span class="header-full-label"> 曇り</span><span class="header-compact-label">曇り</span></span>
      <span class="header-time-slot header-time-primary"><span class="header-status-item header-time game-time-panel normal">21:00</span></span>
    </div>
    <div class="status-secondary-line">
      <span class="header-time-slot header-time-secondary"><span class="header-status-item header-time game-time-panel normal">21:00</span></span>
      <span class="header-status-item header-player-name">とても長いプレイヤー名前</span>
      <span class="header-status-item header-hunger"><span class="header-full-label">空腹度 </span><span class="header-compact-label">空腹 </span>7／7</span>
    </div>
  </div></div>
  <div class="header-money-area"><span class="header-money"><span class="header-money-value">99,999,999円</span></span></div>
  <div class="header-center"><button class="icon-button">←</button><div class="header-title"><strong>工房</strong></div><div class="header-actions header-secondary-actions"><button class="small-button header-main-button">メイン画面</button></div></div>
</header><section class="screen-content"></section></main></body></html>'''

viewports = [(280,568),(300,600),(320,568),(340,640),(360,740),(390,844)]
failures=[]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':320,'height':568})
    page.set_content(html)
    for width,height in viewports:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(30)
        result = page.evaluate('''() => {
          const rect = e => { const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
          const visible = e => { const s=getComputedStyle(e); const r=e.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; };
          const rowData = selector => {
            const row=document.querySelector(selector); const rr=rect(row);
            const kids=[...row.children].filter(visible).map(e=>({cls:e.className,r:rect(e)}));
            let overlap=0;
            for(let i=1;i<kids.length;i++) overlap=Math.max(overlap,kids[i-1].r.right-kids[i].r.left);
            return {r:rr,kids,overlap,overflow:Math.max(0,...kids.map(x=>x.r.right-rr.right))};
          };
          const status=rect(document.querySelector('.status-left'));
          const money=rect(document.querySelector('.header-money-area'));
          const compact=getComputedStyle(document.querySelector('.header-calendar-date .header-compact-label')).display;
          const full=getComputedStyle(document.querySelector('.header-calendar-date .header-full-label')).display;
          const player=document.querySelector('.header-player-name');
          return {
            status,money,
            primary:rowData('.status-primary-line'),
            secondary:rowData('.status-secondary-line'),
            compact,full,
            playerClient:player.clientWidth,playerScroll:player.scrollWidth,
            moneyText:rect(document.querySelector('.header-money-value')),
            moneyFont:parseFloat(getComputedStyle(document.querySelector('.header-money')).fontSize),
            itemFont:parseFloat(getComputedStyle(document.querySelector('.header-day')).fontSize),
          };
        }''')
        if result['status']['right'] > result['money']['left'] + 0.6:
            failures.append((width,'情報欄と所持金欄が重なる',result))
        if result['primary']['overlap'] > 0.6 or result['secondary']['overlap'] > 0.6:
            failures.append((width,'情報項目同士が重なる',result))
        if result['primary']['overflow'] > 0.6 or result['secondary']['overflow'] > 0.6:
            failures.append((width,'情報行が欄外へはみ出す',result))
        if result['moneyText']['right'] > result['money']['right'] + 0.6:
            failures.append((width,'所持金が欄外へはみ出す',result))
        if width <= 360:
            if result['compact'] == 'none' or result['full'] != 'none':
                failures.append((width,'小型端末用の短縮表示に切り替わらない',result))
            if result['itemFont'] < 9.9 or result['moneyFont'] < 10.7:
                failures.append((width,'文字が小さすぎる',result))
        else:
            if result['compact'] != 'none' or result['full'] == 'none':
                failures.append((width,'通常端末で完全表示に戻らない',result))
    browser.close()

if failures:
    for failure in failures[:20]:
        print('NG', failure)
    raise SystemExit(f'小型携帯の上部バー1検査に{len(failures)}件の失敗があります')

print('v0.10.495 小型携帯の上部バー1検査: OK（280px〜390px、長い日数・名前・所持金）')
print('- 360px以下では日付・曜日・空腹度を短縮表示')
print('- 情報項目、所持金、左右領域の重なりなし')
print('- 390px以上では従来の完全表示を維持')
