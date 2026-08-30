from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = (root / 'styles.css').read_text(encoding='utf-8')
app = (root / 'js/app.js').read_text(encoding='utf-8')

start = app.index('function renderDayResult() {')
end = app.index('\nfunction weightedPick(entries) {', start)
render_source = app[start:end]
headings = ['今日の作業', '販売・店舗', 'スタッフ', '今日の収支', '食事']
positions = [render_source.index(f'>{heading}<') for heading in headings]
assert positions == sorted(positions), f'区分順が不正です: {positions}'
assert render_source.index('day-result-meal-section') > render_source.index('day-result-finance-heading')
assert 'casesUsed' not in render_source and 'casesRemaining' not in render_source

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head>
<body data-screen="dayResult">
<main class="day-result-screen"><section class="sleep-card glass-panel"><div class="day-result-scroll">
<h1>123日目の結果</h1>
<div class="day-result-sections">
<section class="day-result-section"><h2>今日の作業</h2><div class="result-list"><div><span>採掘した原石</span><strong>ガーネット3個</strong></div><div><span>研磨したルース</span><strong>アメシスト・オーバル1個</strong></div><div><span>制作</span><strong>1点</strong></div></div></section>
<section class="day-result-section"><h2>販売・店舗</h2><div class="result-list"><div><span>原石売却</span><strong>2個</strong></div><div><span>ルース売却</span><strong>1個</strong></div><div><span>ジュエリー販売</span><strong>1点</strong></div><div><span>来店人数</span><strong>5人</strong></div></div></section>
<section class="day-result-section"><h2>スタッフ</h2><div class="result-list"><div class="day-result-store-staff"><span>店舗スタッフ</span><strong class="day-result-staff-list"><span class="day-result-staff-entry">山田｜店舗1｜販売力Lv.2 一人前｜勤務15日</span><span class="day-result-staff-entry">佐藤｜店舗2｜販売力Lv.1 見習い｜勤務5日</span></strong></div><div><span>職人スタッフ</span><strong>制作力Lv.2｜実働30日｜自動制作1点｜日当10,000円</strong></div></div></section>
<section class="day-result-section"><h2>今日の収支</h2><div class="result-list"><div><span>売上</span><strong>50,000円</strong></div><div><span>支出</span><strong>12,000円</strong></div><div class="day-result-balance"><span>収支</span><strong class="positive">＋38,000円</strong></div></div></section>
<section class="day-result-section day-result-meal-section"><h2>食事</h2><p class="day-result-meal-value"><strong>ラーメン</strong></p></section>
</div><p class="goodnight">お疲れ様でした<br>おやすみなさい...</p><div class="day-result-actions"><button>次の日へ</button></div>
</div></section></main></body></html>'''

viewports = [(280, 568), (320, 568), (360, 740), (390, 844), (430, 932), (844, 390)]
failures=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844})
    page.set_content(html)
    for width,height in viewports:
        page.set_viewport_size({'width':width,'height':height})
        data=page.evaluate('''() => {
          const card=document.querySelector('.sleep-card').getBoundingClientRect();
          const sections=[...document.querySelectorAll('.day-result-section')];
          const headings=sections.map((s)=>s.querySelector('h2')?.textContent.trim());
          const overflows=sections.map((s)=>{const r=s.getBoundingClientRect(); return {left:r.left,right:r.right,scrollWidth:s.scrollWidth,clientWidth:s.clientWidth};});
          const meal=sections.at(-1)?.querySelector('h2')?.textContent.trim();
          const staff=[...document.querySelectorAll('.day-result-staff-entry')].map((e)=>e.getBoundingClientRect());
          return {cardLeft:card.left,cardRight:card.right,headings,meal,overflows,staff:staff.map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right})),scrollable:document.querySelector('.day-result-scroll').scrollHeight>=document.querySelector('.day-result-scroll').clientHeight};
        }''')
        if data['headings'] != headings: failures.append((width,height,'区分順',data))
        if data['meal'] != '食事': failures.append((width,height,'食事が最後ではない',data))
        for info in data['overflows']:
            if info['left'] < data['cardLeft']-1 or info['right'] > data['cardRight']+1 or info['scrollWidth'] > info['clientWidth']+1:
                failures.append((width,height,'横はみ出し',info))
        for i in range(1,len(data['staff'])):
            if data['staff'][i]['top'] <= data['staff'][i-1]['bottom']-0.5:
                failures.append((width,height,'スタッフ行重なり',data['staff']))
    browser.close()

if failures:
    for f in failures[:20]: print('NG',f)
    raise SystemExit(f'1日の結果レイアウト検査に{len(failures)}件の失敗があります')
print(f'v0.10.496 1日の結果整理検査: OK（食事最下部・ケース報告なし・{len(viewports)}画面サイズ）')
