from pathlib import Path
import re
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
renderer_match = re.search(r'const renderers = \{([\s\S]*?)\n    \};', app)
if not renderer_match:
    raise SystemExit('renderers一覧を取得できません')
screens = re.findall(r'^\s*([A-Za-z0-9_]+)\s*:', renderer_match.group(1), re.M)
non_main_screens = [screen for screen in screens if screen != 'main']
viewports = [(320, 568), (360, 640), (390, 844), (412, 915), (430, 932)]

if len(screens) < 70 or 'main' not in screens:
    raise SystemExit(f'登録画面一覧が不正です: {len(screens)}')
if "const PORTRAIT_TWO_BAR_EXCLUDED_SCREENS = new Set(['main']);" not in app:
    raise SystemExit('メイン画面だけを除外する判定ではありません')
if "return !PORTRAIT_TWO_BAR_EXCLUDED_SCREENS.has(String(screenName || ''));" not in app:
    raise SystemExit('新規画面を自動対象にする判定ではありません')
if "if (usesPortraitTwoBarHeader(screen)) document.body.dataset.headerMode = 'two-bar';" not in app:
    raise SystemExit('全画面共通の2段ヘッダー切替がありません')

html = '''<!doctype html>
<html data-device-class="phone" data-orientation="portrait">
<head><meta charset="utf-8"></head>
<body data-screen="workshop" data-header-mode="two-bar">
<div id="app">
  <main class="screen-shell">
    <header class="game-header">
      <div class="status-left">
        <div class="status-top-line">
          <div class="status-primary-line">
            <span class="header-status-item header-calendar-date">2026年7月31日</span>
            <span class="header-status-item header-weekday">（金）</span>
            <span class="header-status-item header-day">100日目</span>
            <span class="header-status-item header-weather">☀ 晴れ</span>
            <span class="header-time-slot header-time-primary"><span class="header-status-item header-time game-time-panel">12:00</span></span>
          </div>
          <div class="status-secondary-line">
            <span class="header-time-slot header-time-secondary"><span class="header-status-item header-time game-time-panel">12:00</span></span>
            <span class="header-status-item header-player-name">テストプレイヤー</span>
            <span class="header-status-item header-hunger">空腹度 7／7</span>
          </div>
        </div>
      </div>
      <div class="header-money-area">
        <div class="header-primary-actions"><button class="small-button header-main-button">メイン画面</button></div>
        <span class="header-money"><span class="header-money-value">123,456円</span></span>
      </div>
      <div class="header-center">
        <button class="icon-button" data-action="back">←</button>
        <div class="header-title"><strong>工房</strong></div>
        <div class="header-actions header-secondary-actions">
          <button class="icon-button header-help-button">?</button>
          <button class="small-button header-main-button">メイン画面</button>
        </div>
      </div>
    </header>
    <section class="screen-content"><div class="test-first">本文先頭</div><div style="height:1000px"></div></section>
  </main>
</div>
</body></html>'''

failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_content(html)
    page.add_style_tag(path=str(root / 'styles.css'))
    page.add_style_tag(content='''
      html,body{margin:0;width:100%;height:100%;overflow:hidden}
      #app,.screen-shell{position:relative;width:100%;height:100%}
      .screen-content{box-sizing:border-box;overflow:auto}
      .test-first{height:36px;margin:0!important}
    ''')

    for width, height in viewports:
        page.set_viewport_size({'width': width, 'height': height})
        result = page.evaluate('''() => {
          document.documentElement.dataset.deviceClass = 'phone';
          document.documentElement.dataset.orientation = 'portrait';
          document.body.dataset.screen = 'workshop';
          document.body.dataset.headerMode = 'two-bar';
          const header = document.querySelector('.game-header');
          const status = document.querySelector('.status-left');
          const center = document.querySelector('.header-center');
          const secondary = document.querySelector('.header-secondary-actions');
          const headerRect = header.getBoundingClientRect();
          const statusRect = status.getBoundingClientRect();
          const centerRect = center.getBoundingClientRect();
          const before = getComputedStyle(header, '::before');
          const after = getComputedStyle(header, '::after');
          return {
            headerHeight: headerRect.height,
            statusBottom: statusRect.bottom,
            centerTop: centerRect.top,
            beforeContent: before.content,
            afterContent: after.content,
            beforeHeight: parseFloat(before.height || '0'),
            afterHeight: parseFloat(after.height || '0'),
            secondaryDisplay: getComputedStyle(secondary).display,
          };
        }''')
        if result['headerHeight'] < 126:
            failures.append((width, height, 'header-height', result))
        if result['centerTop'] < result['statusBottom'] - 1:
            failures.append((width, height, 'rows-overlap', result))
        if result['beforeContent'] in ('none', 'normal') or result['afterContent'] in ('none', 'normal'):
            failures.append((width, height, 'bar-background-missing', result))
        if result['beforeHeight'] <= 0 or result['afterHeight'] <= 0:
            failures.append((width, height, 'bar-height-missing', result))
        if result['secondaryDisplay'] == 'none':
            failures.append((width, height, 'action-controls-hidden', result))

    main_result = page.evaluate('''() => {
      document.body.dataset.screen = 'main';
      delete document.body.dataset.headerMode;
      const header = document.querySelector('.game-header');
      return {
        headerMode: document.body.dataset.headerMode || '',
        beforeContent: getComputedStyle(header, '::before').content,
        afterContent: getComputedStyle(header, '::after').content,
      };
    }''')
    if main_result['headerMode']:
        failures.append(('main', 'header-mode-not-cleared', main_result))
    if main_result['beforeContent'] not in ('none', 'normal') or main_result['afterContent'] not in ('none', 'normal'):
        failures.append(('main', 'two-bar-background-remained', main_result))

    page.set_viewport_size({'width': 844, 'height': 390})
    landscape = page.evaluate('''() => {
      document.documentElement.dataset.orientation = 'landscape';
      document.body.dataset.screen = 'workshop';
      document.body.dataset.headerMode = 'two-bar';
      const header = document.querySelector('.game-header');
      return {
        beforeContent: getComputedStyle(header, '::before').content,
        afterContent: getComputedStyle(header, '::after').content,
        secondaryDisplay: getComputedStyle(document.querySelector('.header-secondary-actions')).display,
        primaryDisplay: getComputedStyle(document.querySelector('.header-primary-actions')).display,
      };
    }''')
    if landscape['beforeContent'] not in ('none', 'normal') or landscape['afterContent'] not in ('none', 'normal'):
        failures.append(('landscape', 'separate-background-remained', landscape))
    if landscape['secondaryDisplay'] != 'none' or landscape['primaryDisplay'] == 'none':
        failures.append(('landscape', 'controls-changed', landscape))

    browser.close()

if failures:
    for failure in failures:
        print('NG', failure)
    raise SystemExit(f'全画面2段ヘッダー共通検査に{len(failures)}件の失敗があります')

print(f'全画面共通2段モード判定: OK（登録{len(screens)}画面、メイン以外{len(non_main_screens)}画面を自動対象）')
print(f'2段バー共通レイアウト: OK（縦端末{len(viewports)}サイズ）')
print('メイン画面と横画面は従来表示を維持しています。')
