from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
css = (root / 'styles.css').read_text(encoding='utf-8')
viewports = [(320, 568), (390, 844), (430, 932), (844, 390)]

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head>
<body data-screen="dayResult">
<main class="day-result-screen">
  <section class="sleep-card glass-panel">
    <div class="day-result-scroll">
      <h1>186日目の結果</h1>
      <div class="result-list">
        <div class="day-result-store-staff">
          <span>店舗スタッフ</span>
          <strong class="day-result-staff-list">
            <span class="day-result-staff-entry">山田（店舗1・販売力Lv.2 一人前・勤務15日）</span>
            <span class="day-result-staff-entry">佐藤（店舗2・販売力Lv.1 見習い・勤務5日）</span>
            <span class="day-result-staff-entry">鈴木（店舗3・販売力Lv.3 ベテラン・勤務30日・成長）</span>
          </strong>
        </div>
      </div>
    </div>
  </section>
</main>
</body></html>'''

failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_content(html)
    for width, height in viewports:
        page.set_viewport_size({'width': width, 'height': height})
        result = page.evaluate('''() => {
          const entries = [...document.querySelectorAll('.day-result-staff-entry')];
          const rects = entries.map((el) => el.getBoundingClientRect());
          const list = document.querySelector('.day-result-staff-list').getBoundingClientRect();
          return {
            count: entries.length,
            tops: rects.map((r) => r.top),
            bottoms: rects.map((r) => r.bottom),
            lefts: rects.map((r) => r.left),
            rights: rects.map((r) => r.right),
            listLeft: list.left,
            listRight: list.right,
            display: getComputedStyle(document.querySelector('.day-result-staff-list')).display,
          };
        }''')
        if result['count'] != 3:
            failures.append((width, height, 'スタッフ数', result))
            continue
        if result['display'] != 'grid':
            failures.append((width, height, '縦一覧ではない', result))
        for i in range(1, 3):
            if result['tops'][i] <= result['bottoms'][i - 1] - 0.5:
                failures.append((width, height, f'{i+1}人目が前行と重なる', result))
        for left, right in zip(result['lefts'], result['rights']):
            if left < result['listLeft'] - 0.5 or right > result['listRight'] + 0.5:
                failures.append((width, height, '表示幅からはみ出す', result))
    browser.close()

if failures:
    for failure in failures[:20]:
        print('NG', failure)
    raise SystemExit(f'店舗スタッフ改行表示検査に{len(failures)}件の失敗があります')

print(f'v0.10.494 1日の結果・店舗スタッフ改行表示検査: OK（スタッフ3人 × {len(viewports)}画面サイズ）')
