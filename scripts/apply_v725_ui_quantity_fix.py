from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8', newline='\n')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


# js/app.js ---------------------------------------------------------------
app_path = 'js/app.js'
app = read(app_path)

app = replace_once(
    app,
    "const desiredGap = screen === 'polishing' ? 16 : (screen === 'meal' ? 14 : 8);",
    "const desiredGap = screen === 'polishing' ? 16 : (screen === 'meal' ? 14 : (['store', 'inventory', 'showcaseSelect', 'showcaseDetail'].includes(screen) ? 36 : (screen === 'completion' ? 20 : 8)));",
    'screen top gap',
)

helper_anchor = "function adjustMetalTradeQuantity(mode, id, delta) {\n"
helper = """function longPressQuantityDelta(current, delta) {\n  const direction = Number(delta) < 0 ? -1 : 1;\n  const value = Math.max(0, Math.floor(Number(current) || 0));\n  const step = value >= 100 ? 10 : 1;\n  return direction * step;\n}\n\nfunction adjustMetalTradeQuantityLongPress(button) {\n  const mode = button?.dataset?.mode || 'buy';\n  const id = button?.dataset?.id || '';\n  adjustMetalTradeQuantity(mode, id, longPressQuantityDelta(metalTradeQuantity(mode, id), button?.dataset?.delta));\n}\n\nfunction adjustLoosePurchaseQuantityLongPress(button) {\n  const id = button?.dataset?.id || '';\n  const shape = normalizeLooseShape(id, button?.dataset?.shape);\n  adjustLoosePurchaseQuantity(id, shape, longPressQuantityDelta(loosePurchaseQuantity(id, shape), button?.dataset?.delta));\n}\n\nfunction adjustDisplayCaseQuantityLongPress(button) {\n  const installing = button?.dataset?.action === 'store-case-install-qty-step';\n  const current = installing ? displayCaseInstallQuantity() : displayCasePurchaseQuantity();\n  const delta = longPressQuantityDelta(current, button?.dataset?.delta);\n  if (installing) adjustDisplayCaseInstallQuantity(delta);\n  else adjustDisplayCasePurchaseQuantity(delta);\n}\n\nfunction changeTropicalShopQuantityLongPress(delta) {\n  const current = Math.max(0, Math.floor(Number(screenData?.tropicalModal?.qty) || 0));\n  changeTropicalShopQuantity(longPressQuantityDelta(current, delta));\n}\n\n"""
app = replace_once(app, helper_anchor, helper + helper_anchor, 'quantity helper insertion')

old_metal = """  metalQuantityHoldTimeout = window.setTimeout(() => {\n    metalQuantityHoldTriggered = true;\n    adjustMetalTradeQuantity(button.dataset.mode, button.dataset.id, button.dataset.delta);\n    metalQuantityHoldInterval = window.setInterval(() => {\n      adjustMetalTradeQuantity(button.dataset.mode, button.dataset.id, button.dataset.delta);\n    }, 110);\n  }, 420);"""
new_metal = """  metalQuantityHoldTimeout = window.setTimeout(() => {\n    metalQuantityHoldTriggered = true;\n    adjustMetalTradeQuantityLongPress(button);\n    metalQuantityHoldInterval = window.setInterval(() => {\n      adjustMetalTradeQuantityLongPress(button);\n    }, 65);\n  }, 320);"""
app = replace_once(app, old_metal, new_metal, 'metal long hold')

old_loose = """  looseQuantityHoldTimeout = window.setTimeout(() => {\n    looseQuantityHoldTriggered = true;\n    adjustLoosePurchaseQuantity(button.dataset.id, button.dataset.shape, button.dataset.delta);\n    looseQuantityHoldInterval = window.setInterval(() => {\n      adjustLoosePurchaseQuantity(button.dataset.id, button.dataset.shape, button.dataset.delta);\n    }, 110);\n  }, 420);"""
new_loose = """  looseQuantityHoldTimeout = window.setTimeout(() => {\n    looseQuantityHoldTriggered = true;\n    adjustLoosePurchaseQuantityLongPress(button);\n    looseQuantityHoldInterval = window.setInterval(() => {\n      adjustLoosePurchaseQuantityLongPress(button);\n    }, 65);\n  }, 320);"""
app = replace_once(app, old_loose, new_loose, 'loose long hold')

old_case = """  displayCaseHoldTimeout = window.setTimeout(() => {\n    displayCaseHoldTriggered = true;\n    adjustDisplayCaseQuantityFromButton(button);\n    displayCaseHoldInterval = window.setInterval(() => {\n      adjustDisplayCaseQuantityFromButton(button);\n    }, 110);\n  }, 420);"""
new_case = """  displayCaseHoldTimeout = window.setTimeout(() => {\n    displayCaseHoldTriggered = true;\n    adjustDisplayCaseQuantityLongPress(button);\n    displayCaseHoldInterval = window.setInterval(() => {\n      adjustDisplayCaseQuantityLongPress(button);\n    }, 65);\n  }, 320);"""
app = replace_once(app, old_case, new_case, 'display case long hold')

old_tropical = """  tropicalShopQuantityHoldTimer = window.setTimeout(() => {\n    tropicalShopQuantityHoldTriggered = true;\n    changeTropicalShopQuantity(delta);\n    tropicalShopQuantityHoldInterval = window.setInterval(() => changeTropicalShopQuantity(delta), 95);\n  }, 360);"""
new_tropical = """  tropicalShopQuantityHoldTimer = window.setTimeout(() => {\n    tropicalShopQuantityHoldTriggered = true;\n    changeTropicalShopQuantityLongPress(delta);\n    tropicalShopQuantityHoldInterval = window.setInterval(() => changeTropicalShopQuantityLongPress(delta), 65);\n  }, 320);"""
app = replace_once(app, old_tropical, new_tropical, 'tropical long hold')

write(app_path, app)

# Portrait completion artwork + store content spacing ---------------------
styles_path = 'styles.css'
styles = read(styles_path)
styles += """\n\n/* v0.10.725: portrait completion/store safe spacing */\n@media (orientation:portrait) and (max-width:820px){\n  body[data-screen=\"completion\"] .result-card>.completion-jewelry-preview{\n    height:374px!important;\n    min-height:374px!important;\n    padding-top:116px!important;\n  }\n  body[data-screen=\"store\"] .store-panel,\n  body[data-screen=\"inventory\"] .wide-panel,\n  body[data-screen=\"showcaseSelect\"] .showcase-selection-panel,\n  body[data-screen=\"showcaseDetail\"] .showcase-detail-panel{\n    margin-top:28px!important;\n  }\n}\n"""
write(styles_path, styles)

game_path = 'game.html'
game = read(game_path)
old_inline = """        height: 330px !important;\n        min-height: 330px !important;\n        margin-top: 0 !important;\n        padding: 72px 0 0 !important;"""
new_inline = """        height: 374px !important;\n        min-height: 374px !important;\n        margin-top: 0 !important;\n        padding: 116px 0 0 !important;"""
game = replace_once(game, old_inline, new_inline, 'completion inline portrait spacing')
write(game_path, game)

# Version bump ------------------------------------------------------------
for path in ['index.html', 'game.html', 'auth.html', 'js/app.js', 'js/game-data.js', 'js/firebase-service.js', 'sw.js']:
    text = read(path)
    if '0.10.724' in text:
        text = text.replace('0.10.724', '0.10.725')
        write(path, text)

# Notes / validation ------------------------------------------------------
changelog = read('CHANGELOG.md')
entry = """# v0.10.725 - 2026-08-20\n\n- 縦画面の完成画面で完成品画像をさらに下げ、上部バーとの重なり・上切れを防止。\n- 縦画面の店舗／完成品一覧／ショーケース選択・詳細を上部バーからさらに離す。\n- 購入数量の▲▼長押しを高速化。100以上は10ずつ増減する。\n- 通常タップは従来どおり1ずつ。\n- SAVE_SCHEMA_VERSION=1を維持。\n\n"""
if not changelog.lstrip().startswith('# v0.10.725'):
    write('CHANGELOG.md', entry + changelog.lstrip('\n'))

validation = """JEWELRY×JEWELRY v0.10.725 VALIDATION\n1. 縦画面の完成画面でリング・ペンダント・ピアスの上端が第2上部バーに被らない。\n2. 縦画面の店舗ショーケース、完成品一覧、陳列商品選択、商品詳細の先頭が上部バーに被らない。\n3. 購入数量▲▼の通常タップは1ずつ変化。\n4. 長押しは320ms後に開始し、65ms間隔で連続変化。\n5. 数量100以上では長押し1回ごとに10ずつ増減。\n6. 地金、ルース、ケース、熱帯魚屋の数量長押しに同ルールを適用。\n7. js/app.js / js/game-data.js / js/firebase-service.js は node --check 合格。\n8. HTML / Service Worker / import query は v0.10.725。\n9. SAVE_SCHEMA_VERSION=1を維持。\n"""
write('VALIDATION_v0.10.725.txt', validation)

# One-shot files are removed by the workflow after successful application.
workflow = ROOT / '.github/workflows/apply-v725.yml'
if workflow.exists():
    workflow.unlink()
try:
    Path(__file__).unlink()
except OSError:
    pass

print('v0.10.725 applied')
