#!/usr/bin/env python3
"""JEWELRY×JEWELRYの更新・引き継ぎ前に実行する回帰防止チェック。"""

from __future__ import annotations

import json
import re
import subprocess
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


def require_rgba_png(relative: str) -> None:
    path = ROOT / relative
    if not path.is_file():
        errors.append(f"必須PNGがありません: {relative}")
        return
    try:
        data = path.read_bytes()[:26]
        if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 26 or data[25] not in (4, 6):
            errors.append(f"透過PNGではありません: {relative}")
    except Exception as exc:
        errors.append(f"PNG確認失敗: {relative}: {exc}")


def require_marker(text: str, marker: str, label: str) -> None:
    if marker not in text:
        errors.append(f"回帰の可能性: {label} の基準記述がありません")


game_data = read_text("js/game-data.js")
sw = read_text("sw.js")
index_html = read_text("index.html")
game_html = read_text("game.html")
app = read_text("js/app.js")
css = read_text("styles.css")
viewport_shell = read_text("viewport-shell.js")

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

# 携帯端末の共通表示基準
require_marker(viewport_shell, "function viewportProfile", "外側画面の端末プロファイル")
require_marker(app, "function applyDeviceViewportProfile", "ゲーム側の端末プロファイル")
require_marker(css, "/* v0.10.383 携帯端末の表示基準を統一 */", "携帯端末の共通表示CSS")
require_marker(css, "grid-template-columns:repeat(4,minmax(0,1fr))", "縦画面の下部メニュー4列")
require_marker(css, "grid-template-columns:repeat(8,minmax(0,1fr))", "横画面の下部メニュー8列")
require_marker(css, "--jwj-event-dialogue-space", "キャラクターと会話枠の共通領域")

# 縦画面背景とイベント人物位置
require_marker(app, "return 'panorama';", "縦画面の補助パノラマ背景")
require_marker(app, "main-menu-portrait", "メイン画面の縦画像")
require_marker(app, "okachimachi-portrait", "御徒町の縦画像")
require_marker(app, "loose-shop-v385", "ルース屋の新ファイル名背景")
require_marker(app, "loose-shop-portrait-v385", "ルース屋縦画面の新ファイル名背景")
require_marker(app, "display-shop-v380", "ディスプレイ屋の新ファイル名背景")
require_marker(app, "display-shop-portrait-v380", "ディスプレイ屋縦画面の新ファイル名背景")
require_marker(app, "/-portrait(?:-v\\d+)?$/", "バージョン付き縦画面背景の全面表示判定")
require_marker(app, "meal-ramen-v386", "ラーメン屋の新ファイル名背景")
require_marker(app, "meal-ramen-portrait-v386", "ラーメン屋縦画面の新ファイル名背景")
require_marker(app, "STANDARD_PORTRAIT_BACKGROUND_BASES", "主要画面の縦背景切替一覧")
require_marker(app, "today-gem-portrait", "今日の宝石の縦画面背景切替")
require_marker(app, "craft-portrait", "ジュエリー作成の縦画面背景切替")
for portrait_marker, label in [
    ("'mining'", "採掘"),
    ("'workshop'", "工房"),
    ("'glab'", "g-Lab."),
    ("'store'", "店舗"),
    ("'sleep'", "寝る"),
    ("'metalshop'", "地金屋"),
    ("meal-menu-portrait", "食事メニュー"),
    ("jewelry-shop-portrait", "ジュエリーショップ"),
    ("space-portrait", "宇宙"),
]:
    require_marker(app, portrait_marker, f"{label}の縦画面背景切替")
require_marker(css, 'body[data-background-layout="panorama"] #background-layer::after', "縦画面パノラマ表示")
# 横画面クイズ王の表示（幅760px以下を含む）
require_marker(css, '/* v0.10.382 横画面クイズ王の表示を全幅で固定 */', "横画面クイズ王の全幅対応")
quiz_landscape_policy = css.split('/* v0.10.382 横画面クイズ王の表示を全幅で固定 */', 1)[-1]
require_marker(quiz_landscape_policy, '@media (orientation:landscape)', "画面幅に依存しない横画面クイズレイアウト")
require_marker(quiz_landscape_policy, 'grid-template-columns:minmax(150px,40%) minmax(0,60%)', "横画面の人物・問題左右分割")
require_marker(quiz_landscape_policy, 'min-width:150px!important', "クイズ王の最低表示幅")
require_marker(quiz_landscape_policy, 'visibility:visible!important', "横画面クイズ王の可視性固定")
require_marker(quiz_landscape_policy, '@media (orientation:landscape) and (max-height:430px)', "低い横画面の縮小対応")
for screen in [
    "westernUnionEvent",
    "okachimachiQuiz",
    "sushiChefEvent",
    "cyclopsEvent",
    "ganeshaTuskEvent",
    "childhoodFriendEvent",
    "touristWoodSwordEvent",
    "diamondPolishingLapEvent",
    "alienAbductionEvent",
    "storeTheftEvent",
]:
    require_marker(css, f'body[data-screen="{screen}"]', f"{screen} の人物位置または画面調整")
# メイン画面の上部バー表示と、特別イベント中の非表示
require_marker(app, "function mainStatusHeader()", "メイン画面用上部バー生成")
if app.count("${mainStatusHeader()}") < 2:
    errors.append("回帰の可能性: 通常メイン画面と宇宙滞在中メイン画面の両方に上部バーがありません")
require_marker(css, '/* v0.10.381 メイン上部バー復旧・特別イベント中は必ず非表示 */', "上部バー表示方針")
header_policy = css.split('/* v0.10.381 メイン上部バー復旧・特別イベント中は必ず非表示 */', 1)[-1]
require_marker(header_policy, 'body[data-screen="main"] .game-header', "メイン画面の上部バー表示")
require_marker(header_policy, 'display:grid!important', "メイン画面の上部バー表示固定")
require_marker(header_policy, 'display:none!important', "特別イベント中の上部バー非表示固定")
for event_screen in [
    "westernUnionEvent",
    "miningPazupanEvent",
    "mermaidEvent",
    "sushiChefEvent",
    "cyclopsEvent",
    "ganeshaTuskEvent",
    "childhoodFriendEvent",
    "touristWoodSwordEvent",
    "diamondPolishingLapEvent",
    "alienAbductionEvent",
    "alienReturnEvent",
    "okachimachiQuiz",
    "robberyReport",
    "storeTheftEvent",
]:
    require_marker(header_policy, f'[data-screen="{event_screen}"]', f"{event_screen} 中の上部バー非表示")

# ルース屋の背景・文字枠
require_marker(css, 'body[data-screen="looseShop"]', "ルース屋専用表示")
require_marker(css, "background:transparent!important", "ルース屋の黒背景除去")

# ガネーシャの牙イベント
require_marker(app, "const GANESHA_TUSK_EVENT_CHANCE = 1 / 90", "ガネーシャイベント発生率1/90")
require_marker(app, "maybeStartGaneshaTuskEvent", "インド料理のガネーシャイベント判定")
require_marker(app, "function hasUnpolishedGaneshaTusk()", "ガネーシャの牙所持判定")
require_marker(app, "if (hasUnpolishedGaneshaTusk()) return false;", "未研磨の牙所持中のイベント停止")
diamond_call = "if (mealId === 'indian' && !skipEventCheck && maybeStartDiamondPolishingLapEvent()) return;"
ganesha_call = "if (mealId === 'indian' && !skipEventCheck && maybeStartGaneshaTuskEvent()) return;"
require_marker(app, diamond_call, "ダイヤモンド研磨盤イベント判定")
require_marker(app, ganesha_call, "ガネーシャイベント判定順")
if diamond_call in app and ganesha_call in app and app.index(diamond_call) > app.index(ganesha_call):
    errors.append("回帰の可能性: ダイヤモンド研磨盤イベントがガネーシャイベントより後に判定されています")
require_marker(app, "receiveGaneshaTusk", "ガネーシャの牙の受取処理")
require_marker(game_data, "ivory: { id: 'ivory'", "象牙の宝石データ")
require_marker(game_data, "ganeshaTuskEvent", "ガネーシャイベントのセーブ状態")
require_marker(app, "roundCabochon: './assets/images/loose/ivory/round-cabochon.png'", "象牙ラウンドカボション")
require_marker(app, "ovalCabochon: './assets/images/loose/ivory/oval-cabochon.png'", "象牙オーバルカボション")
require_file("assets/audio/sfx-ganesha-appear.ogg")
require_file("assets/audio/sfx-ganesha-gift.ogg")
for transparent_asset in [
    "assets/images/events/ganesha.png",
    "assets/images/events/ganesha-tusk.png",
    "assets/images/gems/ivory.png",
    "assets/images/events/ivory-loose.png",
    "assets/images/loose/ivory/round-cabochon.png",
    "assets/images/loose/ivory/oval-cabochon.png",
]:
    require_rgba_png(transparent_asset)

# 幼なじみとの再会イベント
require_marker(app, "const CHILDHOOD_FRIEND_FIRST_TRIGGER_MIN = 330", "幼なじみイベント初回最短日")
require_marker(app, "const CHILDHOOD_FRIEND_FIRST_TRIGGER_MAX = 420", "幼なじみイベント初回最長日")
require_marker(app, "const CHILDHOOD_FRIEND_REPEAT_TRIGGER_MIN = 620", "幼なじみイベント再発最短日")
require_marker(app, "const CHILDHOOD_FRIEND_REPEAT_TRIGGER_MAX = 840", "幼なじみイベント再発最長日")
require_marker(app, "maybeStartChildhoodFriendEvent", "ラーメン選択時の幼なじみイベント判定")
require_marker(app, "startChildhoodFriendMeal", "幼なじみイベントの通常ラーメン食事処理")
require_marker(app, "advanceChildhoodFriendEvent", "幼なじみイベントの会話進行")
require_marker(app, "（カウンターの男、知ってるかもしれない、）", "幼なじみイベント1段階目の会話")
require_marker(app, "（子供の頃よく遊んでた、思い出した、、野球中継に夢中でこちらに気づいてないようだ）", "幼なじみイベント2段階目の会話")
require_marker(app, "「おっちゃん、ラーメンひとつ、、」", "幼なじみイベント3段階目の会話")
require_marker(app, "すぐに食べ終えて、店を後にした、、", "幼なじみイベント食後メッセージ")
require_marker(game_data, "childhoodFriendEvent", "幼なじみイベントのセーブ状態")
require_marker(css, "/* v0.10.387 幼なじみとの再会イベント */", "幼なじみイベント表示CSS")
require_marker(sw, "meal-ramen-reunion-v387.webp", "幼なじみイベント横背景のプリキャッシュ")
require_marker(sw, "meal-ramen-reunion-portrait-v387.webp", "幼なじみイベント縦背景のプリキャッシュ")
require_file("assets/images/meal-ramen-reunion-v387.webp")
require_file("assets/images/meal-ramen-reunion-portrait-v387.webp")



# 店舗の盗難老婆イベント
require_marker(app, "const STORE_THEFT_EVENT_CHANCE = 1 / 90", "盗難老婆イベント発生率1/90")
require_marker(app, "maybeStartStoreTheftEvent", "店舗入店時の盗難老婆イベント判定")
require_marker(app, "robberyItemsInBranch(branch)", "店頭完成品がある場合のみ発生")
require_marker(app, "store-theft-event-choice", "盗難老婆イベントのはい・いいえ分岐")
require_marker(app, "continueStoreTheftDisappearanceSequence", "老婆退場後の静寂・盗難演出")
require_marker(app, "duckCurrentAmbient({ factor: 0.03", "老婆退場時の店内音低下")
require_marker(app, "duckCurrentAmbient({ factor: 0, duration: 2500 })", "盗難前の無音演出")
require_marker(app, "applyStoreTheftEventLoss", "店頭完成品1点の盗難処理")
require_marker(game_data, "storeTheftEvent", "盗難老婆イベントのセーブ状態")
require_marker(css, "/* v0.10.396 盗難老婆イベントの不気味な退場演出 */", "盗難老婆イベントの退場CSS")
require_marker(sw, "store-thief-old-woman.png", "盗難老婆画像のプリキャッシュ")
require_marker(sw, "sfx-old-lady-appear.wav", "老婆登場音のプリキャッシュ")
require_marker(sw, "sfx-shoplift-steal.wav", "盗難発覚音のプリキャッシュ")
require_rgba_png("assets/images/events/store-thief-old-woman.png")
require_file("assets/audio/sfx-old-lady-appear.wav")
require_file("assets/audio/sfx-shoplift-steal.wav")

# 1日の行動時間と食事時間（v0.10.450）
require_marker(game_data, "export const DAY_END_MINUTES = 22 * 60", "1日の行動終了22:00")
require_marker(game_data, "export const MEAL_DURATION_MINUTES = 60", "食事時間1時間")
require_marker(app, "function canSpendMealTime()", "食事時間の事前判定")
require_marker(app, "function spendMealTime()", "食事時間の共通消費処理")
require_marker(app, "if (!canSpendMealTime()) return showToast(mealTimeUnavailableMessage(), 'error');", "食事開始前の残り時間確認")
require_marker(app, "if (plates > 0) spendMealTime();", "回転寿司の1時間経過")
require_marker(app, "spendMealTime();\n    state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery);", "通常食事とイベント食事の1時間経過")
require_marker(app, "if (!canSpendMinutes(MEAL_DURATION_MINUTES + actionMinutes)) return false;", "自動操縦の食事時間込み行動判定")
require_marker(app, "食事には1時間かかります。", "食事画面の所要時間案内")
require_marker(app, "actionLimit: '22:00まで'", "AI相談用の行動終了時刻")
if "21:00を超える行動" in app or "actionLimit: '21:00まで'" in app:
    errors.append("回帰の可能性: 現行ルールに21:00行動終了の表記が残っています")

# 現在の重要な数値仕様
require_marker(game_data, "STORE_MONTHLY_RENTS = Object.freeze({ 1: 150000, 2: 400000, 3: 700000 })", "店舗家賃")
require_marker(app, "let chance = 0.19 + visitors * 0.055", "店頭自動販売の基本確率19％")
require_marker(app, "const EMPLOYEE_DAILY_WAGE = 18000", "アルバイトの日給18,000円")
require_marker(app, "const salary = EMPLOYEE_DAILY_WAGE;", "アルバイト給与の実支払い計算")
require_marker(app, "給与${yen(EMPLOYEE_DAILY_WAGE)}", "雇用後の給与表示")
require_marker(app, "給与：配置日ごとに${yen(EMPLOYEE_DAILY_WAGE)}", "雇用前の給与表示")

# 通常接客のお客様10人と来店頻度
customer_block = re.search(r"export const CUSTOMERS = \{(.*?)\n\};", game_data, re.S)
if not customer_block:
    errors.append("通常接客のお客様データを確認できません")
else:
    customer_ids = re.findall(r"^  ([A-Za-z0-9_]+): \{\n    id: '\1'", customer_block.group(1), re.M)
    if len(customer_ids) != 10 or len(set(customer_ids)) != 10:
        errors.append(f"通常接客のお客様が10人ではありません: {len(customer_ids)}人")
require_marker(game_data, "customers: Object.fromEntries(Object.keys(CUSTOMERS)", "10人分の初期セーブ状態生成")
require_marker(app, "const CUSTOMER_FIRST_VISIT_CHANCE = 0.38", "最初のお客様の来店頻度")
require_marker(app, "const CUSTOMER_REGULAR_VISIT_CHANCE = 0.18", "通常来店頻度18％")
require_marker(app, "const CUSTOMER_REPEAT_COOLDOWN_DAYS = 3", "再来店まで3日の間隔")
require_marker(app, "const customerId = randomFrom(eligibleCustomers);", "10人からのランダム来店選択")
require_marker(app, "if (Object.values(state.customers).some((customer) => customer.visiting)) return;", "同時来店を最大1人に制限")
if "state.customers.misaki.met && !state.customers.kenta.met" in app:
    errors.append("回帰の可能性: 来店順が美咲→健太に固定されたままです")

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
    "assets/images/meal-ramen-reunion-v387.webp",
    "assets/images/meal-ramen-reunion-portrait-v387.webp",
    "assets/images/main-portrait.webp",
    "assets/images/okachimachi-portrait.webp",
    "assets/images/display-shop-portrait-v380.webp",
    "assets/images/display-shop-v380.webp",
    "assets/images/loose-shop-v385.webp",
    "assets/images/loose-shop-portrait-v385.webp",
    "assets/images/meal-ramen-v386.webp",
    "assets/images/meal-ramen-portrait-v386.webp",
    "assets/images/mining-portrait.webp",
    "assets/images/workshop-portrait.webp",
    "assets/images/craft-portrait.webp",
    "assets/images/today-gem-portrait.webp",
    "assets/images/glab-portrait.webp",
    "assets/images/store-portrait.webp",
    "assets/images/sleep-portrait.webp",
    "assets/images/meal-menu-portrait.webp",
    "assets/images/meal-convenience-portrait.webp",
    "assets/images/meal-chinese-portrait.webp",
    "assets/images/meal-korean-portrait.webp",
    "assets/images/meal-indian-portrait.webp",
    "assets/images/meal-kebab-portrait.webp",
    "assets/images/meal-soba-portrait.webp",
    "assets/images/meal-hamburger-portrait.webp",
    "assets/images/metalshop-portrait.webp",
    "assets/images/jewelry-shop-portrait.webp",
    "assets/images/space-portrait.webp",
    "assets/images/quiz/quiz-king-normal.png",
    "assets/images/quiz/quiz-king-player-correct.png",
    "assets/images/quiz/quiz-king-player-incorrect.png",
    "assets/images/real-estate-portrait.webp",
    "assets/images/events/western-union-messenger.png",
    "assets/images/events/mermaid.png",
    "assets/images/events/sushi-chef.png",
    "assets/images/events/cyclops.png",
    "assets/images/events/ganesha.png",
    "assets/images/events/ganesha-tusk.png",
    "assets/images/events/ivory-loose.png",
    "assets/images/gems/ivory.png",
    "assets/images/loose/ivory/round-cabochon.png",
    "assets/images/loose/ivory/oval-cabochon.png",
    "assets/images/events/pazupan-miner.png",
    "assets/images/events/indian-restaurant-manager.png",
    "assets/images/events/tourist.png",
    "assets/images/events/alien.png",
    "assets/images/events/store-thief-old-woman.png",
]:
    require_file(asset)

phone_check = subprocess.run(
    [sys.executable, str(ROOT / "scripts/check_phone_layout_baseline.py")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if phone_check.returncode != 0:
    errors.append("携帯表示基準チェックに失敗しました: " + (phone_check.stdout + phone_check.stderr).strip())

audio_check = subprocess.run(
    ["node", str(ROOT / "tools/validate-audio-scenes.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if audio_check.returncode != 0:
    errors.append("BGM・環境音割り当てチェックに失敗しました: " + (audio_check.stdout + audio_check.stderr).strip())

audio_transition_check = subprocess.run(
    ["node", str(ROOT / "tools/test-audio-transitions.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if audio_transition_check.returncode != 0:
    errors.append("BGM・環境音の画面遷移チェックに失敗しました: " + (audio_transition_check.stdout + audio_transition_check.stderr).strip())

staff_check = subprocess.run(
    ["node", str(ROOT / "tools/validate-store-staff.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if staff_check.returncode != 0:
    errors.append("店舗スタッフ仕様チェックに失敗しました: " + (staff_check.stdout + staff_check.stderr).strip())

staff_growth_test = subprocess.run(
    ["node", str(ROOT / "tools/test-store-staff-growth.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
)
if staff_growth_test.returncode != 0:
    errors.append("店舗スタッフ成長境界テストに失敗しました: " + (staff_growth_test.stdout + staff_growth_test.stderr).strip())

store_showcase_return_check = subprocess.run(
    ["node", str(ROOT / "tools/validate-store-showcase-return.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if store_showcase_return_check.returncode != 0:
    errors.append("店舗ショーケース位置維持チェックに失敗しました: " + (store_showcase_return_check.stdout + store_showcase_return_check.stderr).strip())

store_customer_indicator_check = subprocess.run(
    ["node", str(ROOT / "tools/validate-store-customer-indicator.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if store_customer_indicator_check.returncode != 0:
    errors.append("店舗来店赤丸・接客ボタン順チェックに失敗しました: " + (store_customer_indicator_check.stdout + store_customer_indicator_check.stderr).strip())

polishing_result_check = subprocess.run(
    ["node", str(ROOT / "tools/validate-polishing-result-modal.mjs")],
    cwd=ROOT,
    capture_output=True,
    text=True,
    encoding="utf-8",
)
if polishing_result_check.returncode != 0:
    errors.append("原石研磨完了画面チェックに失敗しました: " + (polishing_result_check.stdout + polishing_result_check.stderr).strip())

if errors:
    print("回帰防止チェック: NG")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

version = next(iter(versions.values()), "不明")
print(f"回帰防止チェック: OK（v{version}）")
print("365日の宝石、200問クイズ、携帯共通表示、主要22画面の縦背景、イベント人物位置、横画面クイズ王、メイン上部バー、イベント中の上部バー非表示、ルース屋、家賃、販売確率、ガネーシャの牙イベント、ラーメン屋背景、幼なじみとの再会イベント、盗難老婆イベント、お客様10人と来店頻度、BGM・環境音の全画面割り当て、店舗スタッフの勤務日数成長・担当制廃止・制作非連動、ショーケース陳列後の位置維持、店舗スタッフボタン配置、来店店舗の赤丸表示、接客ボタン順、原石研磨完了画面の簡略表示と画像タップ復帰を確認しました。")
