from pathlib import Path

APP = Path('js/app.js')
GAME_DATA = Path('js/game-data.js')
TARGETS = [Path('game.html'), Path('index.html'), Path('auth.html'), Path('sw.js')]

app = APP.read_text(encoding='utf-8')
if "recoverInterruptedOyatsuIceMeal" not in app:
    old = """function resumeOyatsuDaisukiEvent() {\n  const e = oyatsuDaisukiEventState();\n  if (!e.active) return false;\n  if (e.stage === 'shop') setScreen('tropicalFishShop', { fromOyatsu: true }, false);\n  else if (e.stage === 'iceEating') setScreen('meal', { mealId: 'ice', eating: true }, false);\n  else setScreen('oyatsuDaisukiEvent', {}, false);\n  return true;\n}\n"""
    new = """function recoverInterruptedOyatsuIceMeal() {\n  const e = oyatsuDaisukiEventState();\n  if (!e.active || e.stage !== 'iceEating' || mealTransitioning) return false;\n  // v0.10.733: 「おやつ大好き」アイスルートの食事演出中に再読込・復帰が入ると、\n  // 食事完了Promiseだけが失われて iceEating が永続するため、支払い・時間・空腹を再処理せず\n  // 御徒町へ戻るフェードから安全に再開する。\n  e.stage = 'iceFade';\n  saveGame();\n  setScreen('oyatsuDaisukiEvent', {}, false);\n  return true;\n}\n\nfunction resumeOyatsuDaisukiEvent() {\n  const e = oyatsuDaisukiEventState();\n  if (!e.active) return false;\n  if (e.stage === 'shop') setScreen('tropicalFishShop', { fromOyatsu: true }, false);\n  else if (e.stage === 'iceEating') {\n    if (!recoverInterruptedOyatsuIceMeal()) setScreen('meal', { mealId: 'ice', eating: true }, false);\n  } else setScreen('oyatsuDaisukiEvent', {}, false);\n  return true;\n}\n"""
    if old not in app:
        raise SystemExit('resumeOyatsuDaisukiEvent target not found')
    app = app.replace(old, new, 1)

    old = """function renderMeal() {\n  const current = hungerLevel();\n  const eating = Boolean(screenData?.eating && MEALS[screenData?.mealId]);\n  if (eating) {\n"""
    new = """function renderMeal() {\n  const current = hungerLevel();\n  const eating = Boolean(screenData?.eating && MEALS[screenData?.mealId]);\n  if (eating && screenData?.mealId === 'ice' && !mealTransitioning) {\n    const oyatsuEvent = oyatsuDaisukiEventState();\n    if (oyatsuEvent.active && oyatsuEvent.stage === 'iceEating') {\n      // v0.10.733: 既に「もぐもぐ…」画面で止まっているセーブも、最新版読込だけで復旧する。\n      queueMicrotask(() => {\n        if (screen === 'meal' && screenData?.eating === true && screenData?.mealId === 'ice') {\n          recoverInterruptedOyatsuIceMeal();\n        }\n      });\n    }\n  }\n  if (eating) {\n"""
    if old not in app:
        raise SystemExit('renderMeal target not found')
    app = app.replace(old, new, 1)

app = app.replace("const UI_BUILD_VERSION = '0.10.728';", "const UI_BUILD_VERSION = '0.10.733';", 1)
app = app.replace("./audio.js?v=0.10.728", "./audio.js?v=0.10.733", 1)
app = app.replace("./audio-scene-map.js?v=0.10.728", "./audio-scene-map.js?v=0.10.733", 1)
app = app.replace("./firebase-service.js?v=0.10.728", "./firebase-service.js?v=0.10.733", 1)
APP.write_text(app, encoding='utf-8')

game_data = GAME_DATA.read_text(encoding='utf-8')
if "export const VERSION = '0.10.732';" in game_data:
    game_data = game_data.replace('v0.10.732', 'v0.10.733').replace("export const VERSION = '0.10.732';", "export const VERSION = '0.10.733';")
GAME_DATA.write_text(game_data, encoding='utf-8')

for path in TARGETS:
    text = path.read_text(encoding='utf-8')
    text = text.replace('0.10.732', '0.10.733').replace('0.10.731', '0.10.733')
    path.write_text(text, encoding='utf-8')

assert "recoverInterruptedOyatsuIceMeal" in APP.read_text(encoding='utf-8')
assert "export const VERSION = '0.10.733';" in GAME_DATA.read_text(encoding='utf-8')
print('v0.10.733 patch prepared')
