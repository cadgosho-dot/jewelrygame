#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-order-cancel-remake-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase24-sync-v010913.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    brace = APP.find('{', start)
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


confirm = function_body('function confirmCancelOrder(orderId) {')
cancel = function_body('function cancelOrder(orderId) {')
remake = function_body('function remakeOrderFromCompletion(orderId, jewelryId) {')

checks = [
    ('confirmCancelOrder definition exists once', APP.count('function confirmCancelOrder(orderId) {') == 1),
    ('cancelOrder definition exists once', APP.count('function cancelOrder(orderId) {') == 1),
    ('remakeOrderFromCompletion definition exists once', APP.count('function remakeOrderFromCompletion(orderId, jewelryId) {') == 1),

    ('confirm order lookup retained', "state.orders.find((entry) => entry.id === orderId)" in confirm),
    ('confirm active-status guard retained', "!['受注', '完成'].includes(order.status)" in confirm),
    ('confirm invalid toast retained', "showToast('キャンセルできる注文がありません。', 'error')" in confirm),
    ('confirm modal title retained', "title: 'この注文をキャンセルしますか？'" in confirm),
    ('confirm modal rating/body retained', "店舗評価が2下がります。制作済みの商品は通常在庫へ戻ります。" in confirm),
    ('confirm modal danger retained', 'danger: true' in confirm),
    ('confirm action route retained', 'action: `cancel-order:${orderId}`' in confirm),
    ('confirm has no save/time/money mutation', all(token not in confirm for token in ('saveGame(', 'spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('cancel order lookup retained', "state.orders.find((entry) => entry.id === orderId)" in cancel),
    ('cancel active-status guard retained', "!['受注', '完成'].includes(order.status)" in cancel),
    ('cancel invalid route closes modal retained', 'return closeModal();' in cancel),
    ('cancel completed jewelry lookup retained', "state.inventory.jewelry.find((entry) => entry.id === order.jewelryId)" in cancel),
    ('cancel returns existing jewelry to storage retained', "if (item) item.status = 'stored';" in cancel),
    ('cancel status retained', "order.status = '取消';" in cancel),
    ('cancel closed day retained', 'order.closedDay = state.game.day;' in cancel),
    ('cancelled day retained', 'order.cancelledDay = state.game.day;' in cancel),
    ('cancel rating penalty -2 retained', 'addStoreProgress({ branchNumber: order.branchNumber, rating: -2 });' in cancel),
    ('cancel close modal retained', 'closeModal();' in cancel),
    ('cancel save retained', 'saveGame();' in cancel),
    ('cancel completion toast retained', "showToast('注文をキャンセルしました。', 'info', false);" in cancel),
    ('cancel render retained', 'render();' in cancel),
    ('cancel keeps jewelryId instead of clearing it', 'order.jewelryId = null' not in cancel),
    ('cancel has no direct time/money mutation', all(token not in cancel for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('remake order lookup retained', "state.orders.find((entry) => entry.id === orderId)" in remake),
    ('remake jewelry lookup retained', "state.inventory.jewelry.find((entry) => entry.id === jewelryId)" in remake),
    ('remake identity/status compound guard retained', "!order || !item || order.status !== '完成' || order.jewelryId !== item.id || item.status !== 'order'" in remake),
    ('remake missing-item toast retained', "showToast('作り直せる注文品が見つかりません。', 'error')" in remake),
    ('remake default draft retained', 'const nextDraft = defaultDraft(order.id);' in remake),
    ('remake production hours retained', 'const hours = productionHours(nextDraft);' in remake),
    ('remake material requirements retained', 'const requirements = materialRequirementsFor(nextDraft);' in remake),
    ('remake workshop guard retained', "if (!workshopOperating()) return showToast('工房は作業停止中です。', 'error');" in remake),
    ('remake jewelry bench guard retained', "if (!toolUsable('jewelryBench')) return showToast('注文品の制作には使用可能な彫金机が必要です。', 'error');" in remake),
    ('remake time guard retained', "if (!canSpendHours(hours)) return showToast('今日は注文品を作り直す時間がありません。', 'error');" in remake),
    ('remake material guard retained', "if (!requirements.enoughLoose || !requirements.enoughMetal) return showToast('作り直しに必要な材料が足りません。', 'error');" in remake),
    ('remake capacity counts all non-sold jewelry retained', "state.inventory.jewelry.filter((entry) => entry.status !== 'sold').length >= state.inventory.capacity" in remake),
    ('remake capacity toast retained', "showToast('完成品の保管場所に空きがありません。', 'error')" in remake),
    ('remake old completion returns to storage retained', "item.status = 'stored';" in remake),
    ('remake order returns to accepted retained', "order.status = '受注';" in remake),
    ('remake order jewelry link cleared retained', 'order.jewelryId = null;' in remake),
    ('remake completion screen id cleared retained', 'completionId = null;' in remake),
    ('remake craft draft replacement retained', 'craftDraft = nextDraft;' in remake),
    ('remake delegates to craft retained', 'craft();' in remake),
    ('remake reset sequence occurs before craft', remake.find("item.status = 'stored';") < remake.find("order.status = '受注';") < remake.find('order.jewelryId = null;') < remake.find('completionId = null;') < remake.find('craftDraft = nextDraft;') < remake.find('craft();')),
    ('remake has no direct save/render/time/money mutation', all(token not in remake for token in ('saveGame(', 'render(', 'spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('cancel confirmation button route retained', "data-action=\"confirm-cancel-order\"" in APP),
    ('cancel action prefix route retained', "if (action?.startsWith('cancel-order:')) { cancelOrder(action.split(':')[1]); return; }" in APP),
    ('confirm cancel switch route retained', "case 'confirm-cancel-order': confirmCancelOrder(button.dataset.id); break;" in APP),
    ('remake completion button retained', 'data-action="remake-order-completion"' in APP),
    ('remake switch route retained', "case 'remake-order-completion': remakeOrderFromCompletion(button.dataset.id, button.dataset.jewelry); break;" in APP),

    ('dynamic harness extracts confirm function', "extractFunction('confirmCancelOrder')" in TEST),
    ('dynamic harness extracts cancel function', "extractFunction('cancelOrder')" in TEST),
    ('dynamic harness extracts remake function', "extractFunction('remakeOrderFromCompletion')" in TEST),
    ('confirmation modal regression case retained', 'testCancelConfirmationModal' in TEST),
    ('accepted-order cancellation regression case retained', 'testCancelAcceptedOrder' in TEST),
    ('completed-order cancellation regression case retained', 'testCancelCompletedOrderReturnsJewelryToStorage' in TEST),
    ('invalid cancellation regression case retained', 'testCancelInvalidStateOnlyClosesModal' in TEST),
    ('successful remake regression case retained', 'testSuccessfulRemakeResetsOldCompletionAndDelegatesToCraft' in TEST),
    ('remake identity guards regression case retained', 'testRemakeIdentityGuard' in TEST),
    ('remake operational guards regression case retained', 'testRemakeOperationalGuards' in TEST),
    ('current audit registration or sync registration', 'check-order-cancel-remake-regression.py' in CURRENT or 'check-order-cancel-remake-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('ORDER CANCEL/REMAKE PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-order-cancel-remake-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('注文キャンセル確認・評価-2・完成品通常在庫戻し・取消日/終了日・保存、作り直しの注文/完成品対応確認・工房/彫金机/時間/材料/容量ガード・旧完成品在庫化・受注状態復帰・craft()委譲を固定しました。')
print('ORDER CANCEL/REMAKE PROTECTION: PASS')
