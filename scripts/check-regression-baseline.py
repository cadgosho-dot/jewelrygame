#!/usr/bin/env python3
"""JEWELRY×JEWELRYの更新・引き継ぎ前に実行する回帰防止チェック。"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def read_text(relative: str) -> str:
    path = ROOT / relative
    if not path.is_file():
        errors.append(f"必須ファイルがありません: {relative}")
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except Exception as exc:  # pragma: no cover - 実行環境向け
        errors.append(f"読み込み失敗: {relative}: {exc}")
        return ""


def require_file(relative: str) -> None:
    if not (ROOT / relative).is_file():
        errors.append(f"必須ファイルがありません: {relative}")


def require_marker(text: str, marker: str, label: str) -> None:
    if marker not in text:
        errors.append(f"回帰の可能性: {label} の基準記述がありません")


game_data = read_text("js/game-data.js")
sw = read_text("sw.js")
index_html = read_text("index.html")
game_html = read_text("game.html")
app = read_text("js/app.js")
css = read_text("styles.css")

# バージョン整合
version_patterns = {
    "js/game-data.js": re.search(r"export const VERSION = '([^']+)'", game_data),
    "sw.js": re.search(r"const VERSION = '([^']+)'", sw),
    "index.html": re.search(r"viewport-shell\.css\?v=([0-9.]+)", index_html),
    "game.html": re.search(r"styles\.css\?v=([0-9.]+)", game_html),
}
versions = {name: match.group(1) for name, match in version_patterns.items() if match}
for name, match in version_patterns.items():
    if not match:
        errors.append(f"バージョンを確認できません: {name}")
if versions and len(set(versions.values())) != 1:
    errors.append("バージョン番号が4か所で一致していません: " + ", ".join(f"{k}={v}" for k, v in versions.items()))

# 縦画面背景とイベント人物位置
require_marker(app, "return 'panorama';", "縦画面の補助パノラマ背景")
require_marker(app, "main-menu-portrait", "メイン画面の縦画像")
require_marker(app, "okachimachi-portrait", "御徒町の縦画像")
require_marker(css, 'body[data-background-layout="panorama"] #background-layer::after', "縦画面パノラマ表示")
for screen in [
    "westernUnionEvent",
    "okachimachiQuiz",
    "sushiChefEvent",
    "cyclopsEvent",
    "touristWoodSwordEvent",
    "diamondPolishingLapEvent",
    "alienAbductionEvent",
]:
    require_marker(css, f'body[data-screen="{screen}"]', f"{screen} の人物位置または画面調整")
require_marker(css, 'body[data-screen="westernUnionEvent"] .game-header', "特別イベント中の上部バー非表示")
require_marker(css, 'body[data-screen="okachimachiQuiz"] .game-header', "クイズ中の上部バー非表示")

# ルース屋の背景・文字枠
require_marker(css, 'body[data-screen="looseShop"]', "ルース屋専用表示")
require_marker(css, "background:transparent!important", "ルース屋の黒背景除去")

# 現在の重要な数値仕様
require_marker(game_data, "STORE_MONTHLY_RENTS = Object.freeze({ 1: 150000, 2: 400000, 3: 700000 })", "店舗家賃")
require_marker(app, "let chance = 0.19 + visitors * 0.055", "店頭自動販売の基本確率19％")

# 365日の宝石・200問クイズ
try:
    daily_gems = json.loads((ROOT / "data/daily-gems-365.json").read_text(encoding="utf-8"))
    if not isinstance(daily_gems, list) or len(daily_gems) != 365:
        errors.append(f"今日の宝石が365件ではありません: {len(daily_gems) if isinstance(daily_gems, list) else '形式不正'}")
    else:
        ids = [str(item.get("id", "")) for item in daily_gems if isinstance(item, dict)]
        names = [str(item.get("name", "")) for item in daily_gems if isinstance(item, dict)]
        if len(ids) != 365 or len(set(ids)) != 365:
            errors.append("今日の宝石IDに不足または重複があります")
        if len(names) != 365 or len(set(names)) != 365:
            errors.append("今日の宝石名に不足または重複があります")
except Exception as exc:
    errors.append(f"今日の宝石データを確認できません: {exc}")

try:
    quiz = json.loads((ROOT / "data/jewelry_okachimachi_quiz_200_game_format.json").read_text(encoding="utf-8"))
    if not isinstance(quiz, list) or len(quiz) != 200:
        errors.append(f"4択クイズが200問ではありません: {len(quiz) if isinstance(quiz, list) else '形式不正'}")
except Exception as exc:
    errors.append(f"4択クイズデータを確認できません: {exc}")

# 修正済み画面で必要な画像
for asset in [
    "assets/images/main-menu-portrait.webp",
    "assets/images/main-portrait.webp",
    "assets/images/okachimachi-portrait.webp",
    "assets/images/display-shop-portrait.webp",
    "assets/images/real-estate-portrait.webp",
    "assets/images/events/western-union-messenger.png",
    "assets/images/events/mermaid.png",
    "assets/images/events/sushi-chef.png",
    "assets/images/events/cyclops.png",
    "assets/images/events/pazupan-miner.png",
    "assets/images/events/indian-restaurant-manager.png",
    "assets/images/events/tourist.png",
    "assets/images/events/alien.png",
]:
    require_file(asset)

if errors:
    print("回帰防止チェック: NG")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

version = next(iter(versions.values()), "不明")
print(f"回帰防止チェック: OK（v{version}）")
print("365日の宝石、200問クイズ、縦画面背景、イベント人物位置、上部バー、ルース屋、家賃、販売確率を確認しました。")
