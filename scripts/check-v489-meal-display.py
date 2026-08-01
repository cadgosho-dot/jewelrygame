#!/usr/bin/env python3
"""食事中画面で料理全体と「もぐもぐもぐ...」が携帯縦横サイズに収まるか確認する。"""

from __future__ import annotations

import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
FOOD_DIR = ROOT / "assets/images/foods"
FOODS = [
    "convenience.png", "soba.png", "ramen.png", "hamburger.png",
    "indian.png", "korean.png", "chinese.png", "kebab.png",
]
VIEWPORTS = [
    (320, 568), (360, 640), (375, 667), (390, 844), (412, 915), (430, 932),
    (568, 320), (640, 360), (667, 375), (740, 360), (760, 400), (844, 390), (915, 412), (932, 430),
]


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def content_bounds(width: int, height: int) -> tuple[float, float]:
    portrait = height >= width
    axis = width if portrait else height
    scale = clamp(axis / 390, .84, 1.08)
    if portrait:
        header = clamp(78 * scale, 68, 86)
        menu = clamp(116 * scale, 104, 126)
    else:
        header = clamp(58 * scale, 50, 64)
        menu = clamp(58 * scale, 50, 64)
    return header, menu


def image_data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


failures: list[str] = []
case_count = 0

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    for food in FOODS:
        source = image_data_uri(FOOD_DIR / food)
        for width, height in VIEWPORTS:
            case_count += 1
            portrait = height >= width
            orientation = "portrait" if portrait else "landscape"
            header, menu = content_bounds(width, height)
            html = f'''<!doctype html>
<html data-device-class="phone" data-orientation="{orientation}"><head><meta charset="utf-8"><style>{CSS}</style>
<style>
html,body{{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important}}
#app,.screen-shell{{position:relative!important;width:100%!important;height:100%!important;min-height:0!important;box-sizing:border-box!important}}
.game-header,.bottom-nav{{display:none!important}}
.screen-content{{position:absolute!important;left:0!important;right:0!important;top:{header:.3f}px!important;bottom:{menu:.3f}px!important;width:auto!important;height:auto!important;min-height:0!important;padding:0!important;overflow:hidden!important;display:grid!important;place-items:center!important;box-sizing:border-box!important}}
</style></head>
<body data-screen="meal"><div id="app"><main class="screen-shell"><section class="screen-content">
<button type="button" class="meal-eating-panel meal-eating-finish-button glass-panel">
<figure class="meal-food-display"><img src="{source}" alt="料理"></figure>
<strong>もぐもぐもぐ...</strong>
</button></section></main></div></body></html>'''
            page.set_viewport_size({"width": width, "height": height})
            page.set_content(html, wait_until="load")
            result = page.evaluate('''() => {
              const panel = document.querySelector('.meal-eating-panel').getBoundingClientRect();
              const content = document.querySelector('.screen-content').getBoundingClientRect();
              const image = document.querySelector('.meal-food-display img');
              const img = image.getBoundingClientRect();
              const text = document.querySelector('.meal-eating-panel > strong').getBoundingClientRect();
              return {
                panel: {left:panel.left, top:panel.top, right:panel.right, bottom:panel.bottom, width:panel.width, height:panel.height},
                content: {left:content.left, top:content.top, right:content.right, bottom:content.bottom, width:content.width, height:content.height},
                img: {left:img.left, top:img.top, right:img.right, bottom:img.bottom, width:img.width, height:img.height},
                text: {left:text.left, top:text.top, right:text.right, bottom:text.bottom, width:text.width, height:text.height},
                natural: {width:image.naturalWidth, height:image.naturalHeight},
                textValue: document.querySelector('.meal-eating-panel > strong').textContent,
                textVisibility: getComputedStyle(document.querySelector('.meal-eating-panel > strong')).visibility,
                textOpacity: Number(getComputedStyle(document.querySelector('.meal-eating-panel > strong')).opacity),
              };
            }''')

            eps = 1.0
            panel = result["panel"]
            content = result["content"]
            img = result["img"]
            text = result["text"]
            natural = result["natural"]
            label = f"{food} {width}x{height}"
            if panel["top"] < content["top"] - eps or panel["bottom"] > content["bottom"] + eps:
                failures.append(f"{label}: 食事枠が表示領域からはみ出しています")
            if img["left"] < panel["left"] - eps or img["right"] > panel["right"] + eps or img["top"] < panel["top"] - eps or img["bottom"] > panel["bottom"] + eps:
                failures.append(f"{label}: 料理画像が枠からはみ出しています")
            if text["top"] < panel["top"] - eps or text["bottom"] > panel["bottom"] + eps:
                failures.append(f"{label}: もぐもぐ文字が枠外です")
            if text["top"] < img["bottom"] - eps:
                failures.append(f"{label}: 料理画像と文字が重なっています")
            if result["textValue"].strip() != "もぐもぐもぐ..." or result["textVisibility"] != "visible" or result["textOpacity"] < .99:
                failures.append(f"{label}: もぐもぐ文字が表示されていません")
            if img["width"] <= 0 or img["height"] <= 0:
                failures.append(f"{label}: 料理画像が表示されていません")
            else:
                natural_ratio = natural["width"] / natural["height"]
                shown_ratio = img["width"] / img["height"]
                if abs(shown_ratio - natural_ratio) / natural_ratio > .012:
                    failures.append(f"{label}: 料理画像の縦横比が崩れています")
            if portrait:
                if img["width"] > 320.5 or img["height"] > 220.5:
                    failures.append(f"{label}: 縦画面の料理画像が上限を超えています ({img['width']:.1f}x{img['height']:.1f})")
            elif height <= 620:
                if img["width"] > 360.5 or img["height"] > 170.5:
                    failures.append(f"{label}: 横画面の料理画像が上限を超えています ({img['width']:.1f}x{img['height']:.1f})")
    page.close()
    browser.close()

if failures:
    print("v0.10.489 食事中表示検査: NG")
    for failure in failures[:40]:
        print("-", failure)
    raise SystemExit(f"{len(failures)}件の失敗があります")

print(f"v0.10.489 食事中表示検査: OK（料理{len(FOODS)}種類 × 携帯縦横{len(VIEWPORTS)}サイズ = {case_count}ケース）")
print("- 料理画像全体を枠内に表示")
print("- 画像の縦横比を維持")
print("- 『もぐもぐもぐ...』を画像の下へ常時表示")
print("- 縦画面最大320×220px、低い横画面最大360×170px")
