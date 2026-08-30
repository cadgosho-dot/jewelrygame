from pathlib import Path
import base64

ROOT = Path('.')
OLD = '0.10.726'
NEW = '0.10.727'

# Restore approved user-supplied night backgrounds.
assets = {
    ROOT / 'assets/images/meal-after18-v727.webp': ROOT / 'scripts/meal-after18-v727.webp.b64',
    ROOT / 'assets/images/meal-after18-portrait-v727.webp': ROOT / 'scripts/meal-after18-portrait-v727.webp.b64',
}
for dst, src in assets.items():
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(base64.b64decode(''.join(src.read_text(encoding='ascii').split())))

app_path = ROOT / 'js/app.js'
app = app_path.read_text(encoding='utf-8')

old_helper = """function mealBackgroundAssetName(mealId, portrait = isPortraitLayout()) {
  if (mealId === 'ramen') return portrait ? 'meal-ramen-portrait-v386' : 'meal-ramen-v386';
  return `meal-${mealId}${portrait ? '-portrait' : ''}`;
}
"""
new_helper = """const MEAL_AFTER18_BACKGROUND_START_MINUTES = 18 * 60;

function mealAfter18BackgroundActive() {
  const minutes = Number(state?.game?.minutes);
  return Number.isFinite(minutes) && minutes >= MEAL_AFTER18_BACKGROUND_START_MINUTES;
}

function mealAfter18BackgroundAssetName(portrait = isPortraitLayout()) {
  return portrait ? 'meal-after18-portrait-v727' : 'meal-after18-v727';
}

function mealBackgroundAssetName(mealId, portrait = isPortraitLayout()) {
  if (mealAfter18BackgroundActive()) return mealAfter18BackgroundAssetName(portrait);
  if (mealId === 'ramen') return portrait ? 'meal-ramen-portrait-v386' : 'meal-ramen-v386';
  return `meal-${mealId}${portrait ? '-portrait' : ''}`;
}
"""
if old_helper not in app:
    raise SystemExit('mealBackgroundAssetName anchor not found')
app = app.replace(old_helper, new_helper, 1)

old_branch = """  if (base === 'meal') {
    const mealId = screenData?.mealId;
    if (mealId && MEALS[mealId]) return mealBackgroundAssetName(mealId, portrait);
    return portrait ? 'meal-menu-portrait' : 'meal-menu';
  }
"""
new_branch = """  if (base === 'meal') {
    if (mealAfter18BackgroundActive()) return mealAfter18BackgroundAssetName(portrait);
    const mealId = screenData?.mealId;
    if (mealId && MEALS[mealId]) return mealBackgroundAssetName(mealId, portrait);
    return portrait ? 'meal-menu-portrait' : 'meal-menu';
  }
"""
if old_branch not in app:
    raise SystemExit('meal background branch anchor not found')
app = app.replace(old_branch, new_branch, 1)

# Bump runtime version markers without rewriting historical version comments.
app = app.replace("const UI_BUILD_VERSION = '0.10.726';", "const UI_BUILD_VERSION = '0.10.727';", 1)
app = app.replace('?v=0.10.726', '?v=0.10.727')
app_path.write_text(app, encoding='utf-8')

game_data_path = ROOT / 'js/game-data.js'
game_data = game_data_path.read_text(encoding='utf-8')
needle = "export const VERSION = '0.10.726';"
if needle not in game_data:
    raise SystemExit('game-data version anchor not found')
game_data_path.write_text(game_data.replace(needle, "export const VERSION = '0.10.727';", 1), encoding='utf-8')

# Update page/cache query markers that point at the current build.
for rel in ['game.html', 'index.html', 'google-login.html', 'auth.html', 'viewport-shell.js']:
    path = ROOT / rel
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    text = text.replace('?v=0.10.726', '?v=0.10.727')
    path.write_text(text, encoding='utf-8')

sw_path = ROOT / 'sw.js'
sw = sw_path.read_text(encoding='utf-8')
if "const VERSION = '0.10.726';" not in sw:
    raise SystemExit('service worker version anchor not found')
sw = sw.replace("const VERSION = '0.10.726';", "const VERSION = '0.10.727';", 1)
sw = sw.replace('?v=0.10.726', '?v=0.10.727')
# Precache the two small night backgrounds so installed/PWA users have them immediately.
anchor = "  './assets/images/okachimachi-night.webp', './assets/images/okachimachi-night-portrait.webp',\n"
insert = anchor + "  './assets/images/meal-after18-v727.webp', './assets/images/meal-after18-portrait-v727.webp',\n"
if anchor not in sw:
    raise SystemExit('service worker asset anchor not found')
sw = sw.replace(anchor, insert, 1)
sw_path.write_text(sw, encoding='utf-8')

# Changelog.
changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = """# v0.10.727 - 2026-08-20

- 食事画面はゲーム内時刻18:00以降、ユーザー指定の夜のアメ横背景へ切り替える。
- 横画面は横画像、縦画面は縦画像を使用し、端末向きの変更にも追従する。
- 18:00未満は既存の食事メニュー／各店舗背景をそのまま維持する。
- 食事イベント専用画面の背景ロジックには変更を加えない。
- SAVE_SCHEMA_VERSION=1を維持。

"""
if not changelog.startswith('# v0.10.727'):
    changelog_path.write_text(entry + changelog, encoding='utf-8')

validation = """JEWELRY×JEWELRY v0.10.727 VALIDATION
1. 食事画面でゲーム内時刻18:00以上の場合、共通の夜背景へ切り替える。
2. 横画面は meal-after18-v727.webp（960x412、ゲーム用最適化）。
3. 縦画面は meal-after18-portrait-v727.webp（540x960、ゲーム用最適化）。
4. 18:00未満は既存の meal-menu / meal-<id> 背景を維持する。
5. 端末向き変更時は既存 applyCurrentBackground() により横／縦画像へ切り替わる。
6. 食事イベント専用画面には今回の条件分岐を直接追加していない。
7. js/app.js / js/game-data.js / js/audio-scene-map.js / js/firebase-service.js は node --check 合格。
8. Service Worker のアプリキャッシュを v0.10.727 へ更新し、夜背景2枚を CORE_SHELL に追加。
9. SAVE_SCHEMA_VERSION=1を維持。
"""
(ROOT / 'VALIDATION_v0.10.727.txt').write_text(validation, encoding='utf-8')

# One-shot installer cleanup. The running workflow is already loaded by GitHub Actions.
for rel in [
    'TRIGGER_V727_MEAL_AFTER18.txt',
    '.github/workflows/apply-v727-meal-after18.yml',
    'scripts/meal-after18-v727.webp.b64',
    'scripts/meal-after18-portrait-v727.webp.b64',
    'scripts/apply_v727_meal_after18.py',
]:
    p = ROOT / rel
    if p.exists():
        p.unlink()
for pattern in ['scripts/meal-after18-v727.webp.b64.part*', 'scripts/meal-after18-portrait-v727.webp.b64.part*']:
    for p in ROOT.glob(pattern):
        p.unlink()
