#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-rent-next-store-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase16-sync-v010905.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


rent = function_body('function rentNextStore() {')

checks = [
    ('rentNextStore definition exists once', APP.count('function rentNextStore() {') == 1),
    ('next branch lookup retained', 'const branchNumber = nextStoreBranchNumber();' in rent),
    ('maximum branch guard retained', 'branchNumber > MAX_STORE_BRANCHES' in rent and '現在契約できる店舗はありません。' in rent),
    ('first store detection retained', 'const firstStore = branchNumber === 1;' in rent),
    ('store name input retained', "document.querySelector('#store-name-input')" in rent),
    ('existing store name retained', "String(state.store.name || '').trim().slice(0, 30)" in rent),
    ('new store name trim/limit retained', "String(input?.value || '').trim().slice(0, 30)" in rent),
    ('empty store name guard retained', "showToast('店舗名を入力してください。', 'error');" in rent and 'input?.focus();' in rent),
    ('lease cost lookup retained', 'const leaseCost = storeLeaseCost(branchNumber);' in rent),
    ('lease money guard retained', 'state.game.money < leaseCost' in rent and '店舗の契約費が足りません。' in rent),
    ('lease money deduction retained', 'state.game.money -= leaseCost;' in rent),
    ('lease money feedback retained', 'startMoneyFeedback(-leaseCost);' in rent),
    ('new store name propagation retained', 'state.store.name = storeName;' in rent and 'contractedStoreBranches().map((branch) => ({ ...branch, name: storeName }))' in rent),
    ('first store branch number retained', 'state.store.branchNumber = 1;' in rent),
    ('first store rented flag retained', 'state.store.rented = true;' in rent),
    ('first store rented day retained', 'state.store.rentedDay = state.game.day;' in rent),
    ('first store showcases reset retained', 'state.store.showcases = [];' in rent and 'state.store.showcaseCount = 0;' in rent),
    ('first store display reset retained', 'state.store.displaySuppliesInstalled = 0;' in rent and 'state.store.casesInstalled = 0;' in rent),
    ('first store progression reset retained', 'state.store.level = 1;' in rent and 'state.store.points = 0;' in rent and 'state.store.rating = 50;' in rent),
    ('branch label retained', 'const branchLabel = storeBranchLabel(branchNumber);' in rent),
    ('existing same-number branch replacement retained', 'contractedStoreBranches().filter((branch) => Number(branch.number) !== branchNumber)' in rent),
    ('branch id/number/label/name retained', 'id: `branch-${branchNumber}`' in rent and 'number: branchNumber' in rent and 'label: branchLabel' in rent and 'name: storeName' in rent),
    ('branch rented day retained', 'rentedDay: state.game.day' in rent),
    ('branch suspended/unpaid defaults retained', 'suspended: false' in rent and 'unpaidRent: 0' in rent),
    ('branch progression defaults retained', 'points: 0' in rent and 'level: 1' in rent and 'peakLevel: 1' in rent and 'paidThroughLevel: 1' in rent),
    ('branch operating defaults retained', 'operatingDays: 0' in rent and 'totalRevenue: 0' in rent and 'serviceSuccesses: 0' in rent and 'openMinutesToday: 0' in rent and 'visitorsToday: 0' in rent),
    ('branch rating/sales defaults retained', 'rating: 50' in rent and 'salesCount: 0' in rent and 'orderDeliveries: 0' in rent),
    ('branch display defaults retained', 'displaySuppliesInstalled: 0' in rent and 'casesInstalled: 0' in rent and 'showcases: []' in rent and 'showcaseCount: 0' in rent),
    ('branch employee defaults retained', 'employee: storeEmployeeDefaults(branchNumber)' in rent),
    ('real estate facility flag retained', 'state.facilities.realEstate = true;' in rent),
    ('finance record retained', 'addFinance(`${storeName} ${branchLabel}を契約`, 0, leaseCost);' in rent),
    ('notification retained', "addNotification('店舗を契約しました', `${branchLabel}が店舗画面から選択できるようになりました。`);" in rent),
    ('save retained', 'saveGame();' in rent),
    ('completion toast retained', "showToast(`${branchLabel}を契約しました。`, 'info', false);" in rent),
    ('real estate route retained', "setScreen('realEstate', {}, false);" in rent),
    ('no time cost retained', 'spendHours(' not in rent and 'spendMinutes(' not in rent and 'advanceTime(' not in rent),
    ('dynamic harness extracts current function', "extractFunction('rentNextStore')" in TEST),
    ('first store regression case', 'testSuccessfulFirstStoreRental' in TEST),
    ('additional store regression case', 'testSuccessfulAdditionalStoreRental' in TEST),
    ('store name normalization regression case', 'testStoreNameNormalization' in TEST),
    ('guard regression case', 'testStoreRentalGuardRails' in TEST),
    ('current audit registration or sync registration', 'check-rent-next-store-regression.py' in CURRENT or 'check-rent-next-store-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('RENT NEXT STORE PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-rent-next-store-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('rentNextStore() の店舗数上限・店舗名・契約費・初回初期化・支店生成・施設解放・収支・通知・保存・画面遷移・時間非消費を固定しました。')
print('RENT NEXT STORE PROTECTION: PASS')
