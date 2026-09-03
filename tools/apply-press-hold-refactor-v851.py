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
    """const loosePurchaseDraft = {};\nlet looseQuantityHoldTimeout = null;\nlet looseQuantityHoldInterval = null;\nlet looseQuantityHoldButton = null;\nlet looseQuantityHoldTriggered = false;\nlet displayCasePurchaseDraft = 1;\n""",
    """const loosePurchaseDraft = {};\nconst looseQuantityPressHold = createPressHoldController({\n  onTap(button) {\n    adjustLoosePurchaseQuantity(button.dataset.id, button.dataset.shape, button.dataset.delta);\n  },\n  onLongPress(button) {\n    adjustLoosePurchaseQuantityLongPress(button);\n  },\n});\nlet displayCasePurchaseDraft = 1;\n""",
    'loose hold state',
)

text = app.read_text(encoding='utf-8')
start = text.find('function clearLooseQuantityHold() {')
end = text.find('function displayCasePurchaseMaximum()', start)
if start < 0 or end < 0:
    raise SystemExit('loose hold functions boundary not found')
text = text[:start] + text[end:]

replacements = [
    (
        '    startLooseQuantityHold(looseButton);',
        '    looseQuantityPressHold.start(looseButton);',
        'loose pointerdown',
    ),
    (
        "  const looseButton = event.target.closest('[data-action=\"loose-qty-step\"]') || looseQuantityHoldButton;\n  if (looseButton) finishLooseQuantityHold(looseButton);",
        "  const looseButton = event.target.closest('[data-action=\"loose-qty-step\"]') || looseQuantityPressHold.activeButton();\n  if (looseButton) looseQuantityPressHold.finish(looseButton);",
        'loose pointerup',
    ),
]
for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'app.js: {label} expected once, found {count}')
    text = text.replace(old, new, 1)

old_cancel = '  clearLooseQuantityHold();\n  looseQuantityHoldTriggered = false;'
if text.count(old_cancel) != 2:
    raise SystemExit(f'app.js: loose cancel expected twice, found {text.count(old_cancel)}')
text = text.replace(old_cancel, '  looseQuantityPressHold.cancel();', 2)

old_click = """    case 'loose-qty-step':\n      if (button.dataset.skipNextClick === 'true') {\n        delete button.dataset.skipNextClick;\n        break;\n      }\n      adjustLoosePurchaseQuantity(button.dataset.id, button.dataset.shape, button.dataset.delta);\n      break;\n"""
new_click = """    case 'loose-qty-step':\n      looseQuantityPressHold.handleClick(button);\n      break;\n"""
if text.count(old_click) != 1:
    raise SystemExit(f'app.js: loose click case expected once, found {text.count(old_click)}')
text = text.replace(old_click, new_click, 1)
app.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
replace_once(
    changelog,
    '## v0.10.850\n',
    """## v0.10.851\n- 数量操作の第3段階として、ルース購入の▲▼ボタンを既存の `js/ui/press-hold-controller.js` へ移行。\n- 短押し1回、長押し開始320ms、65ms間隔の連続増減、100以上で10刻み、長押し後の次クリック抑止、pointercancel／画面blur時の解除を維持。\n- 地金に続く2領域目だけを分離し、ディスプレイケースと販売価格の長押し処理は今回変更なし。\n- 長押し統合検査を地金＋ルースの2領域へ拡張し、残る2領域が未変更であることも自動確認。セーブ形式、価格計算、在庫、日付、イベントstageには変更なし。\n\n## v0.10.850\n""",
    'changelog v0.10.851 section',
)

print('V0.10.851 LOOSE PRESS-HOLD PATCH: PASS')
