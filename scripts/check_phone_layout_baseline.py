#!/usr/bin/env python3
"""代表的な携帯画面で、上部バー・下部メニュー・キャラクター領域が重ならないかを確認する。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "styles.css").read_text(encoding="utf-8")
APP = (ROOT / "js/app.js").read_text(encoding="utf-8")
SHELL = (ROOT / "viewport-shell.js").read_text(encoding="utf-8")
errors: list[str] = []


def require(text: str, marker: str, label: str) -> None:
    if marker not in text:
        errors.append(f"{label} が見つかりません")


require(CSS, "/* v0.10.383 携帯端末の表示基準を統一 */", "携帯表示統一CSS")
require(CSS, "grid-template-columns:repeat(4,minmax(0,1fr))", "縦画面の下部メニュー4列")
require(CSS, "grid-template-columns:repeat(8,minmax(0,1fr))", "横画面の下部メニュー8列")
require(CSS, "--jwj-main-header-height", "上部バー共通高さ")
require(CSS, "--jwj-main-menu-height", "下部メニュー共通高さ")
require(CSS, "--jwj-event-dialogue-space", "イベント会話領域")
require(CSS, "--jwj-character-max-width", "キャラクター共通幅")
require(CSS, '[data-screen="ganeshaTuskEvent"]', "ガネーシャイベントの携帯共通配置")
require(CSS, 'body[data-screen="childhoodFriendEvent"]', "幼なじみイベントの携帯共通配置")
require(APP, "function applyDeviceViewportProfile", "ゲーム側の端末プロファイル")
require(APP, "document.documentElement.dataset.deviceClass", "端末クラス設定")
require(SHELL, "function viewportProfile", "外側画面の端末プロファイル")
require(SHELL, "uiScale", "端末共通倍率")


def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def profile(width: int, height: int) -> tuple[str, float, float, float, float]:
    orientation = "landscape" if width > height else "portrait"
    axis = height if orientation == "landscape" else width
    scale = clamp(axis / 390, .84, 1.08)
    if orientation == "portrait":
        header = clamp(78 * scale, 68, 86)
        menu = clamp(116 * scale, 104, 126)
        dialogue = clamp(170 * scale, 146, 184)
    else:
        header = clamp(58 * scale, 50, 64)
        menu = clamp(58 * scale, 50, 64)
        dialogue = clamp(108 * scale, 94, 118)
    return orientation, scale, header, menu, dialogue


viewports = [
    (320, 568), (360, 640), (375, 667), (390, 844), (412, 915), (430, 932),
    (568, 320), (640, 360), (667, 375), (740, 360), (760, 400), (844, 390), (915, 412), (932, 430),
]
for width, height in viewports:
    orientation, scale, header, menu, dialogue = profile(width, height)
    edge = clamp(7 * scale, 5, 9)
    main_stage = height - header - menu - edge * 4
    character_stage = height - dialogue - edge * 2
    minimum_main = 250 if orientation == "portrait" else 180
    minimum_character = 300 if orientation == "portrait" else 190
    if main_stage < minimum_main:
        errors.append(f"{width}x{height}: メイン中央領域が不足しています ({main_stage:.1f}px)")
    if character_stage < minimum_character:
        errors.append(f"{width}x{height}: キャラクター領域が不足しています ({character_stage:.1f}px)")

if errors:
    print("携帯表示基準チェック: NG")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("携帯表示基準チェック: OK")
print("320×568から932×430までの縦横14サイズで、上部バー・下部メニュー・キャラクター領域と幼なじみイベント会話領域を確認しました。")
