#!/usr/bin/env python3
"""Protect current gift create/claim/cancel transaction orchestration without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-gift-transaction-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase33-sync-v010922.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


create = section('createGiftFromDraft')
claim = section('claimGiftPreview')
cancel = section('cancelGift')

checks = {
    'gift transaction functions exist once': all(APP.count(f'function {name}(') == 1 for name in [
        'createGiftFromDraft', 'claimGiftPreview', 'cancelGift'
    ]),
    'create guards busy user row and quantity': all(token in create for token in [
        'if (giftBusy || !currentUser) return;',
        "if (!row) return showToast('渡せるプレゼントがありません。', 'error');",
        "const quantity = giftDraft.category === 'jewelry' ? 1 : (giftDraft.category === 'metal' ? giftRoundedWeight(giftDraft.quantity) : Math.max(1, Math.floor(Number(giftDraft.quantity) || 1)));",
        "if (quantity <= 0 || quantity > row.max + 0.0001) return showToast('数量を確認してください。', 'error');",
        'const payload = { ...structuredClone(row.payload), quantity };',
    ]),
    'create locks and saves before cloud confirmation and transaction': all(token in create for token in [
        'giftBusy = true;',
        'await saveGame();',
        'await confirmGiftCloudSave(currentUser.uid, state.saveRevision);',
        'const result = await createGiftCode(currentUser.uid, state.playerName, payload, removeGiftFromGameState);',
        'persistTransactionalGiftState(result.gameState);',
    ]) and create.index('await saveGame();') < create.index('await confirmGiftCloudSave(currentUser.uid, state.saveRevision);') < create.index('const result = await createGiftCode'),
    'create records successful code and created view': all(token in create for token in [
        'giftLastCreated = { code: result.code, payload };',
        "giftView = 'created';",
    ]),
    'create maps no-save cloud failure and always unlocks': all(token in create for token in [
        "error?.code === 'gift/no-save'",
        "code: 'gift/cloud-save-unavailable'",
        'showToast(giftErrorMessage(displayError), \'error\');',
        'giftBusy = false;',
        "if (screen === 'phone' && phoneTab === 'gift') render();",
    ]),
    'claim guards and saves before cloud transaction': all(token in claim for token in [
        'if (giftBusy || !giftPreview || !currentUser) return;',
        'giftBusy = true;',
        'await saveGame();',
        'const result = await claimGiftCode(currentUser.uid, state.playerName, giftPreview.code, addGiftToGameState);',
        'persistTransactionalGiftState(result.gameState);',
    ]) and claim.index('await saveGame();') < claim.index('const result = await claimGiftCode'),
    'claim records receipt and clears preview input': all(token in claim for token in [
        'giftLastReceived = { code: giftPreview.code, senderName: giftPreview.senderName, payload: structuredClone(giftPreview.payload) };',
        'giftPreview = null;',
        "giftCodeInput = '';",
        "giftView = 'received';",
    ]),
    'claim error is surfaced and busy lock is released': all(token in claim for token in [
        "console.error('プレゼント受取エラー', error);",
        "showToast(giftErrorMessage(error), 'error');",
        'giftBusy = false;',
        "if (screen === 'phone' && phoneTab === 'gift') render();",
    ]),
    'cancel guards and saves before cloud restore transaction': all(token in cancel for token in [
        'if (giftBusy || !currentUser || !code) return;',
        'giftBusy = true;',
        'await saveGame();',
        'const result = await cancelGiftCode(currentUser.uid, code, restoreGiftToGameState);',
        'persistTransactionalGiftState(result.gameState);',
    ]) and cancel.index('await saveGame();') < cancel.index('const result = await cancelGiftCode'),
    'cancel success reports restored inventory': all(token in cancel for token in [
        "showToast('プレゼントを取り消し、在庫へ戻しました。', 'info', false);",
        'giftBusy = false;',
    ]),
    'cancel already-claimed reconciliation retained': all(token in cancel for token in [
        "if (error?.code === 'gift/already-claimed') {",
        'const entry = ensureGiftState().outbox.find((item) => item.code === code);',
        "if (entry) entry.status = 'claimed';",
        'saveGame();',
        "showToast(giftErrorMessage(error), 'error');",
    ]),
    'test executes current production functions': "names.map(extractFunction).join('\\n')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-gift-transaction-regression.py' in CURRENT or (SYNC.is_file() and 'check-gift-transaction-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testCreateGiftPersistsSaveBeforeCloudTransaction',
    'testCreateGiftGuardsInvalidDraftAndQuantity',
    'testCreateGiftMapsNoSaveAndUnlocksBusyState',
    'testClaimGiftPersistsTransactionAndClearsPreview',
    'testClaimGiftFailureKeepsPreviewAndUnlocksBusyState',
    'testCancelGiftPersistsRestoredTransaction',
    'testCancelAlreadyClaimedMarksOutboxAndResaves',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('GIFT TRANSACTION PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-gift-transaction-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('GIFT TRANSACTION PROTECTION: PASS')
