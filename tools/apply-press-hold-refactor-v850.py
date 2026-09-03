#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label} expected once, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


app = ROOT / 'js/app.js'
replace_once(
    app,
    "import { createLazyModuleManager } from './runtime/lazy-modules.js?v=0.10.849';\n",
    "import { createLazyModuleManager } from './runtime/lazy-modules.js?v=0.10.849';\nimport { createPressHoldController } from './ui/press-hold-controller.js?v=0.10.849';\n",
    'press-hold import',
)
replace_once(
    app,
    """const metalTradeDraft = { buy: {}, sell: {} };\nlet metalQuantityHoldTimeout = null;\nlet metalQuantityHoldInterval = null;\nlet metalQuantityHoldButton = null;\nlet metalQuantityHoldTriggered = false;\nconst loosePurchaseDraft = {};\n""",
    """const metalTradeDraft = { buy: {}, sell: {} };\nconst metalQuantityPressHold = createPressHoldController({\n  onTap(button) {\n    adjustMetalTradeQuantity(button.dataset.mode, button.dataset.id, button.dataset.delta);\n  },\n  onLongPress(button) {\n    adjustMetalTradeQuantityLongPress(button);\n  },\n});\nconst loosePurchaseDraft = {};\n""",
    'metal hold state',
)
text = app.read_text(encoding='utf-8')
start = text.find('function clearMetalQuantityHold() {')
end = text.find('function loosePurchaseDraftKey', start)
if start < 0 or end < 0:
    raise SystemExit('metal hold functions boundary not found')
text = text[:start] + text[end:]
text = text.replace('    startMetalQuantityHold(metalButton);', '    metalQuantityPressHold.start(metalButton);', 1)
text = text.replace(
    "  const metalButton = event.target.closest('[data-action=\"metal-qty-step\"]') || metalQuantityHoldButton;\n  if (metalButton) finishMetalQuantityHold(metalButton);",
    "  const metalButton = event.target.closest('[data-action=\"metal-qty-step\"]') || metalQuantityPressHold.activeButton();\n  if (metalButton) metalQuantityPressHold.finish(metalButton);",
    1,
)
for _ in range(2):
    old = '  clearMetalQuantityHold();\n  metalQuantityHoldTriggered = false;'
    if old not in text:
        raise SystemExit('metal cancel boundary not found')
    text = text.replace(old, '  metalQuantityPressHold.cancel();', 1)
old = """    case 'metal-qty-step':\n      if (button.dataset.skipNextClick === 'true') {\n        delete button.dataset.skipNextClick;\n        break;\n      }\n      adjustMetalTradeQuantity(button.dataset.mode, button.dataset.id, button.dataset.delta);\n      break;\n"""
new = """    case 'metal-qty-step':\n      metalQuantityPressHold.handleClick(button);\n      break;\n"""
if text.count(old) != 1:
    raise SystemExit(f'metal click case expected once, found {text.count(old)}')
text = text.replace(old, new, 1)
app.write_text(text, encoding='utf-8')

sw = ROOT / 'sw.js'
replace_once(
    sw,
    "'./js/app.js?v=0.10.849', './js/runtime/lazy-modules.js?v=0.10.849', './js/audio.js?v=0.10.849'",
    "'./js/app.js?v=0.10.849', './js/runtime/lazy-modules.js?v=0.10.849', './js/ui/press-hold-controller.js?v=0.10.849', './js/audio.js?v=0.10.849'",
    'press-hold precache',
)

version_sync = ROOT / 'scripts/version-sync.py'
replace_once(
    version_sync,
    "    Rule('sw.js', 'lazy-modules.js precache key', qparam(r'\\./js/runtime/lazy-modules\\.js'), keep_prefix),\n",
    "    Rule('sw.js', 'lazy-modules.js precache key', qparam(r'\\./js/runtime/lazy-modules\\.js'), keep_prefix),\n    Rule('sw.js', 'press-hold-controller.js precache key', qparam(r'\\./js/ui/press-hold-controller\\.js'), keep_prefix),\n",
    'version sync SW rule',
)
replace_once(
    version_sync,
    "    Rule('js/app.js', 'lazy-modules.js import key', qparam(r'\\./runtime/lazy-modules\\.js'), keep_prefix),\n",
    "    Rule('js/app.js', 'lazy-modules.js import key', qparam(r'\\./runtime/lazy-modules\\.js'), keep_prefix),\n    Rule('js/app.js', 'press-hold-controller.js import key', qparam(r'\\./ui/press-hold-controller\\.js'), keep_prefix),\n",
    'version sync app rule',
)

check_current = ROOT / 'scripts/check-current.py'
replace_once(
    check_current,
    "    ('遅延ロード管理', [sys.executable, str(ROOT / 'scripts/check-lazy-module-loading.py')]),\n",
    "    ('遅延ロード管理', [sys.executable, str(ROOT / 'scripts/check-lazy-module-loading.py')]),\n    ('数量長押し管理', [sys.executable, str(ROOT / 'scripts/check-press-hold-controller.py')]),\n",
    'check-current press-hold check',
)

changelog = ROOT / 'CHANGELOG.md'
replace_once(
    changelog,
    '## v0.10.849\n',
    """## v0.10.850\n- 地金の数量▲▼ボタンだけ、タップ／長押しのライフサイクルを `js/ui/press-hold-controller.js` へ分離。\n- 従来の長押し開始320ms、65ms間隔の連続増減、100以上で10刻み、長押し後の次クリック抑止、pointercancel／画面blur時の解除を維持。\n- ルース、ディスプレイケース、販売価格の数量長押し処理は今回変更せず、1領域だけで分離境界を検証。\n- 専用のNode単体検査と静的整合検査を追加し、`check-current.py` の総合監査対象へ登録。セーブ形式、金額計算、在庫、日付、イベントstageには変更なし。\n\n## v0.10.849\n""",
    'changelog v0.10.850 section',
)

print('BOOTSTRAP REFACTOR PATCH: PASS')
