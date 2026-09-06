#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-phone-item-equipment-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase26-sync-v010915.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def block_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    brace = APP.find('{', start)
    if brace < 0:
        return ''
    depth = 0
    quote = None
    esc = False
    line = False
    block = False
    i = brace
    while i < len(APP):
        c = APP[i]
        n = APP[i + 1] if i + 1 < len(APP) else ''
        if line:
            if c == '\n':
                line = False
            i += 1
            continue
        if block:
            if c == '*' and n == '/':
                block = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == quote:
                quote = None
            i += 1
            continue
        if c == '/' and n == '/':
            line = True
            i += 2
            continue
        if c == '/' and n == '*':
            block = True
            i += 2
            continue
        if c in "'\"`":
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return APP[start:i + 1]
        i += 1
    return ''


use_item = block_body('function usePhoneItem(itemId) {')
toggle_equipment = block_body('function togglePhoneEquipment(equipmentId) {')

checks = [
    ('usePhoneItem definition exists once', APP.count('function usePhoneItem(itemId) {') == 1),
    ('togglePhoneEquipment definition exists once', APP.count('function togglePhoneEquipment(equipmentId) {') == 1),

    ('item definition lookup retained', 'const item = GENERAL_ITEMS[itemId];' in use_item),
    ('item owned quantity lookup retained', 'const owned = Number(state.inventory.items?.[itemId] || 0);' in use_item),
    ('item usability/ownership guard retained', "if (!item || !item.usable || owned <= 0)" in use_item),
    ('item unavailable toast retained', "showToast('使用できるアイテムがありません。', 'error');" in use_item),
    ('before hunger snapshot retained', 'const beforeHunger = hungerLevel();' in use_item),
    ('changed flag retained', 'let changed = false;' in use_item),
    ('positive hunger effect condition retained', 'if (Number(item.effect?.hunger) > 0)' in use_item),
    ('hunger cap at seven retained', 'const after = Math.min(7, beforeHunger + Number(item.effect.hunger));' in use_item),
    ('hunger only changes on improvement retained', 'if (after > beforeHunger)' in use_item),
    ('hunger state mutation retained', 'state.wellbeing.hunger = after;' in use_item),
    ('changed success marker retained', 'changed = true;' in use_item),
    ('no-waste guard retained', 'if (!changed)' in use_item),
    ('no-waste toast retained', "showToast('今はこのアイテムを使う必要がありません。', 'error');" in use_item),
    ('item consumption retained', 'state.inventory.items[itemId] = owned - 1;' in use_item),
    ('item save retained', 'saveGame();' in use_item),
    ('item sfx fallback retained', "playSfx(item.sfx || 'success');" in use_item),
    ('energy drink branch retained', "if (item.id === 'energyDrink')" in use_item),
    ('energy drink delayed success sfx retained', "window.setTimeout(() => playSfx('success', { gain: .72 }), 260);" in use_item),
    ('energy drink vibration retained', 'vibrate([25, 22, 48]);' in use_item),
    ('item feedback retained', "setPhoneItemFeedback(`${item.name}を使いました`, phoneItemEffectText(item, beforeHunger, hungerLevel()), item.symbol || '◆');" in use_item),
    ('item render retained', 'render();' in use_item),
    ('item operation has no direct time/money mutation', all(token not in use_item for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('equipment definition lookup retained', 'const item = EQUIPMENT_ITEMS[equipmentId];' in toggle_equipment),
    ('equipment owned quantity lookup retained', 'const owned = Number(state.inventory.equipment?.[equipmentId] || 0);' in toggle_equipment),
    ('equipment ownership guard retained', 'if (!item || owned <= 0)' in toggle_equipment),
    ('equipment unavailable toast retained', "showToast('その装備品を持っていません。', 'error');" in toggle_equipment),
    ('currently equipped comparison retained', 'const currentlyEquipped = state.inventory.equipped?.[item.slot] === equipmentId;' in toggle_equipment),
    ('equipment slot toggle retained', "state.inventory.equipped[item.slot] = currentlyEquipped ? '' : equipmentId;" in toggle_equipment),
    ('equipment save retained', 'saveGame();' in toggle_equipment),
    ('equipment success sfx retained', "playSfx('success');" in toggle_equipment),
    ('equipment feedback retained', "setPhoneItemFeedback(item.name, currentlyEquipped ? '装備を外しました。' : '装備しました。', item.symbol || '◇');" in toggle_equipment),
    ('equipment render retained', 'render();' in toggle_equipment),
    ('equipment operation has no direct time/money/hunger mutation', all(token not in toggle_equipment for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -=', 'state.wellbeing.hunger'))),

    ('phone item action route retained', "case 'use-phone-item': usePhoneItem(button.dataset.id); break;" in APP),
    ('phone equipment action route retained', "case 'toggle-equipment': togglePhoneEquipment(button.dataset.id); break;" in APP),
    ('phone item UI action retained', 'data-action="use-phone-item"' in APP),
    ('phone equipment UI action retained', 'data-action="toggle-equipment"' in APP),

    ('dynamic harness extracts item function', "extractFunction('usePhoneItem')" in TEST),
    ('dynamic harness extracts equipment function', "extractFunction('togglePhoneEquipment')" in TEST),
    ('item success regression retained', 'testUsePhoneItemSuccess' in TEST),
    ('item hunger cap/no-waste regression retained', 'testUsePhoneItemCapsHungerAndDoesNotWasteAtMax' in TEST),
    ('item guard regression retained', 'testUsePhoneItemGuards' in TEST),
    ('energy drink special regression retained', 'testEnergyDrinkSpecialEffects' in TEST),
    ('equipment equip/unequip regression retained', 'testTogglePhoneEquipmentEquipAndUnequip' in TEST),
    ('equipment same-slot replacement regression retained', 'testTogglePhoneEquipmentReplacesSameSlotAndUsesFallbackSymbol' in TEST),
    ('equipment guard regression retained', 'testTogglePhoneEquipmentGuards' in TEST),
    ('current audit registration or sync registration', 'check-phone-item-equipment-regression.py' in CURRENT or 'check-phone-item-equipment-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(f"{'OK' if ok else 'NG'}: {label}")
    if not ok:
        failed.append(label)

if failed:
    print('\nPHONE ITEM/EQUIPMENT PROTECTION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

result = subprocess.run(
    ['node', str(ROOT / 'tools/test-phone-item-equipment-regression.mjs')],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
if result.stdout:
    print(result.stdout, end='' if result.stdout.endswith('\n') else '\n')
if result.stderr:
    print(result.stderr, end='' if result.stderr.endswith('\n') else '\n', file=sys.stderr)
if result.returncode != 0:
    print('PHONE ITEM/EQUIPMENT PROTECTION: FAIL')
    sys.exit(result.returncode)

print('スマホアイテム使用の空腹度上限・無駄撃ち防止・消費・保存・効果音・フィードバック・エナジードリンク特殊演出と、装備の所持確認・同スロット装備/解除・保存を現在の挙動のまま固定しました。')
print('PHONE ITEM/EQUIPMENT PROTECTION: PASS')
