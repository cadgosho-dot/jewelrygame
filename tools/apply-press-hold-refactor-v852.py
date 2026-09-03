#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js/app.js'
CHANGELOG = ROOT / 'CHANGELOG.md'


def extract_function(text: str, name: str) -> tuple[int, int, str]:
    marker = f'function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'{name}: function not found')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'{name}: opening brace not found')

    depth = 0
    i = brace
    quote: str | None = None
    escaped = False
    line_comment = False
    block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(text) and text[end] in ' \t':
                    end += 1
                if end < len(text) and text[end] == '\r':
                    end += 1
                if end < len(text) and text[end] == '\n':
                    end += 1
                return start, end, text[start:end]
        i += 1
    raise SystemExit(f'{name}: closing brace not found')


def case_region(text: str, action: str) -> tuple[int, int, str]:
    marker = f"    case '{action}':"
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'{action}: click case not found')
    next_case = re.search(r'^    (?:case |default:)', text[start + len(marker):], re.M)
    if not next_case:
        raise SystemExit(f'{action}: next click case boundary not found')
    end = start + len(marker) + next_case.start()
    return start, end, text[start:end]


def adjustment_statement(case_text: str, action: str) -> str:
    lines = []
    for line in case_text.splitlines():
        stripped = line.strip()
        if 'button.dataset.delta' in stripped and stripped.endswith(';'):
            lines.append(stripped)
    if len(lines) != 1:
        raise SystemExit(f'{action}: expected one delta adjustment statement, found {len(lines)}')
    return lines[0]


text = APP.read_text(encoding='utf-8')

# Capture the existing behavior before removing the old lifecycle helpers.
_, _, start_block = extract_function(text, 'startDisplayCaseHold')
long_match = re.search(
    r'displayCaseHoldTriggered\s*=\s*true\s*;\s*([A-Za-z_$][\w$]*)\(button\)\s*;',
    start_block,
)
if not long_match:
    raise SystemExit('display-case long-press adjustment function could not be detected')
long_press_fn = long_match.group(1)
if start_block.count(f'{long_press_fn}(button);') < 2:
    raise SystemExit('display-case first/repeat long-press behavior is not identical; aborting')

_, _, purchase_case = case_region(text, 'display-case-qty-step')
_, _, install_case = case_region(text, 'store-case-install-qty-step')
purchase_statement = adjustment_statement(purchase_case, 'display-case-qty-step')
install_statement = adjustment_statement(install_case, 'store-case-install-qty-step')

# Remove the four old lifecycle state variables regardless of their exact location.
for var in (
    'displayCaseHoldTimeout',
    'displayCaseHoldInterval',
    'displayCaseHoldButton',
    'displayCaseHoldTriggered',
):
    pattern = rf'^let {re.escape(var)}\s*=\s*[^;]+;\r?\n'
    text, count = re.subn(pattern, '', text, count=1, flags=re.M)
    if count != 1:
        raise SystemExit(f'{var}: expected one legacy declaration, found {count}')

# Remove only the display-case clear/start/finish lifecycle functions.
for fn in ('clearDisplayCaseHold', 'startDisplayCaseHold', 'finishDisplayCaseHold'):
    start, end, _ = extract_function(text, fn)
    text = text[:start] + text[end:]

insert_marker = 'let displayCaseInstallDraft = 1;\n'
if text.count(insert_marker) != 1:
    raise SystemExit(f'display-case controller insertion marker count={text.count(insert_marker)}')
controller = f"""let displayCaseInstallDraft = 1;\nconst displayCaseQuantityPressHold = createPressHoldController({{\n  onTap(button) {{\n    if (button.dataset.action === 'display-case-qty-step') {{\n      {purchase_statement}\n      return;\n    }}\n    if (button.dataset.action === 'store-case-install-qty-step') {{\n      {install_statement}\n    }}\n  }},\n  onLongPress(button) {{\n    {long_press_fn}(button);\n  }},\n}});\n"""
text = text.replace(insert_marker, controller, 1)

replacements = [
    ('    startDisplayCaseHold(caseButton);', '    displayCaseQuantityPressHold.start(caseButton);', 1),
    (
        "  const caseButton = event.target.closest('[data-action=\"display-case-qty-step\"], [data-action=\"store-case-install-qty-step\"]') || displayCaseHoldButton;\n  if (caseButton) finishDisplayCaseHold(caseButton);",
        "  const caseButton = event.target.closest('[data-action=\"display-case-qty-step\"], [data-action=\"store-case-install-qty-step\"]') || displayCaseQuantityPressHold.activeButton();\n  if (caseButton) displayCaseQuantityPressHold.finish(caseButton);",
        1,
    ),
]
for old, new, expected in replacements:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'replacement boundary expected {expected}, found {count}: {old[:80]}')
    text = text.replace(old, new, expected)

cancel_old = '  clearDisplayCaseHold();\n  displayCaseHoldTriggered = false;'
if text.count(cancel_old) != 2:
    raise SystemExit(f'display-case cancel boundary expected twice, found {text.count(cancel_old)}')
text = text.replace(cancel_old, '  displayCaseQuantityPressHold.cancel();')

for action in ('display-case-qty-step', 'store-case-install-qty-step'):
    start, end, _ = case_region(text, action)
    replacement = (
        f"    case '{action}':\n"
        '      displayCaseQuantityPressHold.handleClick(button);\n'
        '      break;\n'
    )
    text = text[:start] + replacement + text[end:]

APP.write_text(text, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.851\n'
if changelog.count(marker) != 1:
    raise SystemExit(f'CHANGELOG v0.10.851 marker count={changelog.count(marker)}')
entry = """## v0.10.852\n- ディスプレイケースの購入数量・店舗設置数量の▲▼ボタンだけ、タップ／長押しのライフサイクルを既存の `js/ui/press-hold-controller.js` へ移行。\n- 従来の長押し開始320ms、65ms間隔の連続増減、既存の加速ロジック、長押し後の次クリック抑止、pointercancel／画面blur時の解除を維持。\n- 地金・ルースの共通化済み処理は変更せず、販売価格の長押し処理は今回未変更。\n- 専用の静的整合検査を3領域対応へ更新。セーブ形式、価格計算、在庫、日付、イベントstageには変更なし。\n\n## v0.10.851\n"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')

print('DISPLAY CASE PRESS HOLD REFACTOR: PASS')
print(f'long-press function: {long_press_fn}')
print(f'purchase tap: {purchase_statement}')
print(f'install tap: {install_statement}')
