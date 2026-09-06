#!/usr/bin/env python3
"""Protect current gift inventory remove/add/restore behavior without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-gift-inventory-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase32-sync-v010921.yml'


def section(name):
    matches = list(re.finditer(r'^function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^function |^async function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


remove = section('removeGiftFromGameState')
add = section('addGiftToGameState')
restore = section('restoreGiftToGameState')

checks = {
    'gift inventory functions exist once': all(APP.count(f'function {name}(') == 1 for name in [
        'removeGiftFromGameState', 'addGiftToGameState', 'restoreGiftToGameState'
    ]),
    'remove requires inventory and normalizes quantity': all(token in remove for token in [
        "if (!inventory) throw new Error('在庫データを確認できません。');",
        "const quantity = payload.type === 'metal' ? giftRoundedWeight(payload.quantity) : Math.max(1, Math.floor(Number(payload.quantity) || 1));",
    ]),
    'remove rough loose item stock guards and deductions retained': all(token in remove for token in [
        "if (current < quantity) throw new Error('原石の所持数が足りません。');",
        'inventory.rough[payload.id] = current - quantity;',
        "if (current < quantity) throw new Error('ルースの所持数が足りません。');",
        'inventory.loose[payload.id][payload.shapeId] = current - quantity;',
        "if (current < quantity) throw new Error('アイテムの所持数が足りません。');",
        'inventory.items[payload.id] = current - quantity;',
    ]),
    'remove metal weight guard and rounded deduction retained': all(token in remove for token in [
        "if (quantity < 0.1 || current + 0.0001 < quantity) throw new Error('地金の所持重量が足りません。');",
        'inventory.metals[payload.id] = giftRoundedWeight(current - quantity);',
    ]),
    'remove jewelry only accepts stored item and removes it': all(token in remove for token in [
        "findIndex((item) => item.id === payload.id && item.status === 'stored')",
        "if (index < 0) throw new Error('この完成品は現在プレゼントにできません。');",
        'inventory.jewelry.splice(index, 1);',
    ]),
    'remove writes pending outbox and bounds it to 50': all(token in remove for token in [
        "gifts.outbox.unshift(giftOutboxEntry(code, payload, 'pending'));",
        'gifts.outbox = gifts.outbox.slice(0, 50);',
    ]),
    'add rough loose and item increments retained': all(token in add for token in [
        'inventory.rough[payload.id] = Math.max(0, Math.floor(Number(inventory.rough?.[payload.id]) || 0)) + quantity;',
        'inventory.loose[payload.id] = inventory.loose[payload.id] || {};',
        'inventory.loose[payload.id][payload.shapeId] = Math.max(0, Math.floor(Number(inventory.loose[payload.id][payload.shapeId]) || 0)) + quantity;',
        'inventory.items[payload.id] = Math.max(0, Math.floor(Number(inventory.items?.[payload.id]) || 0)) + quantity;',
    ]),
    'add metal capacity guard and rounded increment retained': all(token in add for token in [
        'const capacity = Math.max(0.1, Number(inventory.metalCapacity?.[payload.id]) || Number(METALS[payload.id].storageLimit) || 1);',
        'if (current + quantity > capacity + 0.0001)',
        'inventory.metals[payload.id] = giftRoundedWeight(current + quantity);',
    ]),
    'add jewelry capacity identity reset and duplicate guard retained': all(token in add for token in [
        "const used = (inventory.jewelry || []).filter((item) => item.status !== 'sold').length;",
        'const capacity = finishedJewelryCapacity(gameState);',
        "if (used >= capacity) throw new Error('完成品の保管場所に空きがありません。');",
        "item.id = `gift-${String(code).replace(/[^A-Z0-9]/gi, '').toLowerCase()}`;",
        "item.status = 'stored';",
        'item.receivedGiftCode = code;',
        'delete item.displayBranchNumber;',
        'delete item.orderId;',
        "if ((inventory.jewelry || []).some((entry) => entry.id === item.id)) throw new Error('このプレゼントはすでに在庫へ追加されています。');",
        'inventory.jewelry.push(item);',
    ]),
    'add records bounded inbox and received notification': all(token in add for token in [
        'gifts.inbox.unshift({ code, ...summary, receivedAt: new Date().toISOString() });',
        'gifts.inbox = gifts.inbox.slice(0, 50);',
        "title: 'プレゼントを受け取りました',",
        'unread: true,',
    ]),
    'restore returns quantity inventory across ordinary categories': all(token in restore for token in [
        "if (payload.type === 'rough') inventory.rough[payload.id] = Math.max(0, Math.floor(Number(inventory.rough?.[payload.id]) || 0)) + quantity;",
        'inventory.loose[payload.id] = inventory.loose[payload.id] || {};',
        "} else if (payload.type === 'item') inventory.items[payload.id] = Math.max(0, Math.floor(Number(inventory.items?.[payload.id]) || 0)) + quantity;",
        "else if (payload.type === 'metal') inventory.metals[payload.id] = giftRoundedWeight(Number(inventory.metals?.[payload.id]) + quantity);",
    ]),
    'restore jewelry returns to storage without duplication': all(token in restore for token in [
        "item.status = 'stored';",
        'delete item.displayBranchNumber;',
        'delete item.orderId;',
        'if (!(inventory.jewelry || []).some((entry) => entry.id === item.id)) inventory.jewelry.push(item);',
    ]),
    'restore marks matching outbox cancelled and records notification': all(token in restore for token in [
        'const entry = gifts.outbox.find((item) => item.code === code);',
        "if (entry) entry.status = 'cancelled';",
        "title: 'プレゼントを取り消しました',",
        'unread: true,',
    ]),
    'test executes current production functions': "names.map(extractFunction).join('\\n')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-gift-inventory-regression.py' in CURRENT or (SYNC.is_file() and 'check-gift-inventory-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testRemoveGiftInventoryAcrossCategories',
    'testRemoveGiftGuardsAndOutboxBound',
    'testAddGiftInventoryAcrossCategories',
    'testAddJewelryNormalizesIdentityAndRejectsDuplicateOrCapacity',
    'testAddMetalCapacityGuard',
    'testRestoreGiftReturnsInventoryAndMarksCancelled',
    'testRestoreJewelryIsIdempotentByOriginalId',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('GIFT INVENTORY PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-gift-inventory-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('GIFT INVENTORY PROTECTION: PASS')
