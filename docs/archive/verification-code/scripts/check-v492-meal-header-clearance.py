#!/usr/bin/env python3
"""食事中の料理枠が上部バーへ潜り込まず、料理と文字が見えることを確認する。"""

from __future__ import annotations

import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
APP = (ROOT / "js/app.js").read_text(encoding="utf-8")
FOOD_DIR = ROOT / "assets/images/foods"
FOODS = [
    "convenience.png", "soba.png", "ramen.png", "hamburger.png",
    "indian.png", "korean.png", "chinese.png", "kebab.png",
]
VIEWPORTS = [
    (320, 568), (360, 640), (375, 667), (390, 844), (412, 915), (430, 932),
    (568, 320), (640, 360), (667, 375), (740, 360), (760, 400), (844, 390), (915, 412), (932, 430),
]


def extract_function(name: str) -> str:
    start = APP.index(f"function {name}(")
    body_start = APP.index("{", start)
    depth = 0
    quote = None
    escaped = False
    for index in range(body_start, len(APP)):
        char = APP[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in ('"', "'", "`"):
            quote = char
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return APP[start:index + 1]
    raise RuntimeError(f"{name}の終端が見つかりません")


FUNCTIONS = "\n".join([
    extract_function("visibleHeaderBottom"),
    extract_function("polishingTopAnchor"),
    extract_function("syncScreenContentTopOffset"),
])


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


failures: list[str] = []
case_count = 0
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    for food in FOODS:
        source = data_uri(FOOD_DIR / food)
        for width, height in VIEWPORTS:
            case_count += 1
            orientation = "portrait" if height >= width else "landscape"
            html = f'''<!doctype html>
<html data-device-class="phone" data-orientation="{orientation}"><head><meta charset="utf-8"><style>{CSS}</style></head>
<body data-screen="meal" data-header-mode="two-bar"><div id="root">
<main class="screen-shell">
<header class="game-header">
  <div class="status-left"><div class="status-top-line"><div class="status-primary-line">
    <span class="header-status-item header-calendar-date">2027年1月16日</span><span class="header-status-item header-weekday weekday-saturday">（土）</span>
    <span class="header-status-item header-day">186日目</span><span class="header-status-item header-weather">☁ 曇り</span><span class="header-time-slot header-time-primary"><span class="game-time-panel">12:00</span></span>
  </div><div class="status-secondary-line"><span class="header-time-slot header-time-secondary"><span class="game-time-panel">12:00</span></span><span class="header-status-item header-player-name">カワハラ</span><span class="header-status-item header-hunger">空腹度 5／7</span></div></div></div>
  <div class="header-money-area"><div class="header-primary-actions"></div><span class="header-money"><span class="header-money-value">¥105,144</span></span></div>
  <div class="header-center"><button class="icon-button">←</button><div class="header-title"><strong>食事</strong></div><div class="header-actions header-secondary-actions"><button class="small-button header-main-button">メイン画面</button></div></div>
</header>
<section class="screen-content meal-eating-screen-content">
<button type="button" class="meal-eating-panel meal-eating-finish-button glass-panel">
  <figure class="meal-food-display"><img src="{source}" alt="料理"></figure><strong>もぐもぐもぐ...</strong>
</button></section></main></div></body></html>'''
            page.set_viewport_size({"width": width, "height": height})
            page.set_content(html, wait_until="load")
            page.add_script_tag(content=f"var screen='meal'; var root=document.getElementById('root');\n{FUNCTIONS}")
            page.evaluate("syncScreenContentTopOffset()")
            page.wait_for_timeout(30)
            page.evaluate("syncScreenContentTopOffset()")
            result = page.evaluate('''() => {
              const header = document.querySelector('.game-header');
              const panel = document.querySelector('.meal-eating-panel');
              const content = document.querySelector('.screen-content');
              const image = document.querySelector('.meal-food-display img');
              const text = document.querySelector('.meal-eating-panel > strong');
              const hBottom = visibleHeaderBottom(header);
              const p = panel.getBoundingClientRect();
              const c = content.getBoundingClientRect();
              const i = image.getBoundingClientRect();
              const t = text.getBoundingClientRect();
              return {
                gap: p.top - hBottom,
                headerBottom: hBottom,
                panel: {top:p.top,bottom:p.bottom,height:p.height},
                content: {top:c.top,bottom:c.bottom,height:c.height,scrollHeight:content.scrollHeight},
                image: {top:i.top,bottom:i.bottom,width:i.width,height:i.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight},
                text: {top:t.top,bottom:t.bottom,width:t.width,height:t.height,value:text.textContent,visibility:getComputedStyle(text).visibility,opacity:Number(getComputedStyle(text).opacity)},
                paddingTop: getComputedStyle(content).paddingTop,
              };
            }''')
            label = f"{food} {width}x{height}"
            if result["gap"] < 7.5:
                failures.append(f"{label}: 料理枠が上部バーへ重なっています（間隔 {result['gap']:.1f}px）")
            if result["image"]["top"] < result["panel"]["top"] - 1 or result["image"]["bottom"] > result["panel"]["bottom"] + 1:
                failures.append(f"{label}: 料理画像が食事枠からはみ出しています")
            if result["text"]["top"] < result["image"]["bottom"] - 1:
                failures.append(f"{label}: 料理画像と『もぐもぐもぐ...』が重なっています")
            if result["text"]["value"].strip() != "もぐもぐもぐ..." or result["text"]["visibility"] != "visible" or result["text"]["opacity"] < .99:
                failures.append(f"{label}: 『もぐもぐもぐ...』が表示されていません")
            if result["image"]["naturalWidth"] <= 0 or result["image"]["naturalHeight"] <= 0 or result["image"]["width"] <= 0 or result["image"]["height"] <= 0:
                failures.append(f"{label}: 料理画像を読み込めません")
            page.evaluate("document.currentScript?.remove()")
    page.close()
    browser.close()

if failures:
    print("v0.10.492 食事画面・上部バー重なり検査: NG")
    for failure in failures[:50]:
        print("-", failure)
    raise SystemExit(f"{len(failures)}件の失敗があります")

print(f"v0.10.492 食事画面・上部バー重なり検査: OK（料理{len(FOODS)}種類 × 携帯縦横{len(VIEWPORTS)}サイズ = {case_count}ケース）")
print("- 料理枠の上端を上部バー下8px以上に固定")
print("- 料理画像全体と『もぐもぐもぐ...』を枠内に表示")
