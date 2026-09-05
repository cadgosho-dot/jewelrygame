#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-store-display-management-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase23-sync-v010912.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


def action_block(marker, next_marker):
    start = APP.find(marker)
    if start < 0:
        return ''
    end = APP.find(next_marker, start + len(marker))
    return APP[start:end if end >= 0 else len(APP)]


normalize_price = function_body('function normalizeSellingPrice(value, fallback = 1000) {')
max_showcases = function_body('function storeMaximumShowcases(branch = currentStoreBranch()) {')
branch_showcases = function_body('function branchShowcases(branch = currentStoreBranch()) {')
max_supplies = function_body('function storeMaximumDisplaySupplies(branch = currentStoreBranch()) {')
mirror = function_body('function mirrorCurrentStoreDisplay(branch = currentStoreBranch()) {')
empty_position = function_body('function findEmptyShowcasePosition(branch = currentStoreBranch()) {')
location = function_body('function showcaseLocationForJewelry(itemId, branch = null) {')
case_max = function_body('function displayCaseInstallMaximum(branch = currentStoreBranch()) {')
case_quantity = function_body('function displayCaseInstallQuantity(branch = currentStoreBranch()) {')
showcase_price = function_body('function showcaseSellingPrice(slot, item) {')
adjust_price = function_body('function adjustShowcaseSellingPrice(button) {')
place_item = function_body('function placeItem(itemId) {')
place_slot = function_body('function placeItemInShowcaseSlot(itemId, branchId, showcaseIndex, slotIndex) {')
remove_item = function_body("function removeShowcase(showcaseIndex, slotIndex, branchId = '') {")
move_item = function_body('function moveShowcaseItem(itemId, targetBranchNumber) {')
install = function_body('function installDisplayProduct(productId) {')
price_confirm = action_block("case 'selling-price-confirm': {", "case 'remove-showcase':")

signatures = [
    'function normalizeSellingPrice(value, fallback = 1000) {',
    'function storeMaximumShowcases(branch = currentStoreBranch()) {',
    'function branchShowcases(branch = currentStoreBranch()) {',
    'function installedShowcaseCount(branch = currentStoreBranch()) {',
    'function storeMaximumDisplaySupplies(branch = currentStoreBranch()) {',
    'function storeDisplaySuppliesInstalled(branch = currentStoreBranch()) {',
    'function mirrorCurrentStoreDisplay(branch = currentStoreBranch()) {',
    'function findEmptyShowcasePosition(branch = currentStoreBranch()) {',
    'function showcaseLocationForJewelry(itemId, branch = null) {',
    'function displayCaseInstallMaximum(branch = currentStoreBranch()) {',
    'function setDisplayCaseInstallQuantity(value, branch = currentStoreBranch()) {',
    'function displayCaseInstallQuantity(branch = currentStoreBranch()) {',
    'function showcaseSellingPrice(slot, item) {',
    'function adjustShowcaseSellingPrice(button) {',
    'function placeItem(itemId) {',
    'function placeItemInShowcaseSlot(itemId, branchId, showcaseIndex, slotIndex) {',
    "function removeShowcase(showcaseIndex, slotIndex, branchId = '') {",
    'function moveShowcaseItem(itemId, targetBranchNumber) {',
    'function installDisplayProduct(productId) {',
]

checks = [(f'definition exists once: {sig.split("(")[0].replace("function ", "")}', APP.count(sig) == 1) for sig in signatures]
checks += [
    ('selling price minimum 1000 retained', 'Math.max(1000, Math.round(Number.isFinite(resolved) ? resolved : 1000))' in normalize_price),
    ('first store showcase limit retained', 'state?.store?.expanded ? 3 : 1' in max_showcases),
    ('additional store showcase limit retained', 'Number(branch?.number) >= 2) return 3' in max_showcases),
    ('branch showcase array initialization retained', 'if (!Array.isArray(branch.showcases)) branch.showcases = [];' in branch_showcases),
    ('display supplies maximum equals showcase count', 'return installedShowcaseCount(branch);' in max_supplies),
    ('display mirror supplies retained', 'state.store.displaySuppliesInstalled = storeDisplaySuppliesInstalled(branch);' in mirror),
    ('display mirror cases retained', 'state.store.casesInstalled = storeCaseRemaining(branch);' in mirror),
    ('display mirror showcases retained', 'state.store.showcases = branchShowcases(branch);' in mirror),
    ('display mirror showcase count retained', 'state.store.showcaseCount = state.store.showcases.length;' in mirror),
    ('empty showcase slot search retained', 'const slotIndex = (showcase?.slots || []).findIndex((slot) => !slot);' in empty_position),
    ('showcase location keeps jewelry id lookup', 'findIndex((entry) => entry?.jewelryId === itemId)' in location),
    ('case install owned count retained', 'Math.max(0, Math.floor(Number(inventory.case) || 0))' in case_max),
    ('case install remaining capacity retained', 'storeMaximumCases() - storeCaseRemaining(branch)' in case_max),
    ('case install max min owned/capacity retained', 'Math.min(owned, remainingCapacity)' in case_max),
    ('case install quantity defaults to one when available', 'maximum > 0 ? Math.max(1, initial) : 0' in case_quantity),
    ('showcase selling price fallback retained', 'normalizeSellingPrice(slot?.sellingPrice, item?.recommendedPrice || 1000)' in showcase_price),
    ('selling price adjust screen guard retained', "screen !== 'showcaseDetail'" in adjust_price),
    ('selling price adjust step retained', 'Number(button.dataset.delta) < 0 ? -1000 : 1000' in adjust_price),
    ('selling price floor retained during adjust', 'Math.max(1000, currentPrice + delta)' in adjust_price),
    ('selling price adjustment remains draft-only', 'screenData.pendingSellingPrice = normalizeSellingPrice(nextPrice' in adjust_price and 'slot.sellingPrice =' not in adjust_price),
    ('selling price preview fallback render retained', 'if (!updateShowcaseDetailPricePreview(screenData.pendingSellingPrice, savedPrice, item)) render();' in adjust_price),
    ('place item rented guard retained', 'if (!state.store.rented)' in place_item),
    ('place item stored status guard retained', "item.status !== 'stored'" in place_item),
    ('place item showcase availability retained', '!installedShowcaseCount(branch)' in place_item),
    ('place item empty slot lookup retained', 'const position = findEmptyShowcasePosition(branch);' in place_item),
    ('place item recommended price retained', 'sellingPrice: normalizeSellingPrice(item.recommendedPrice)' in place_item),
    ('place item displayed status retained', "item.status = 'displayed';" in place_item),
    ('place item display branch retained', 'item.displayBranchNumber = branch.number;' in place_item),
    ('place item display mirror/save retained', 'mirrorCurrentStoreDisplay(branch);' in place_item and 'saveGame();' in place_item),
    ('exact slot validates showcase retained', "showToast('陳列先のショーケースが見つかりません。', 'error')" in place_slot),
    ('exact slot occupied guard retained', 'if (showcase.slots[slotNumber])' in place_slot),
    ('exact slot stores recommended price retained', 'showcase.slots[slotNumber] = { jewelryId: item.id, sellingPrice: normalizeSellingPrice(item.recommendedPrice) };' in place_slot),
    ('remove item restores stored status retained', "item.status = 'stored';" in remove_item),
    ('remove item clears display branch retained', 'delete item.displayBranchNumber;' in remove_item),
    ('remove item clears slot retained', 'showcases[showcaseIndex].slots[slotIndex] = null;' in remove_item),
    ('remove item saves retained', 'saveGame();' in remove_item),
    ('move item source lookup retained', 'const source = showcaseLocationForJewelry(itemId);' in move_item),
    ('move item target branch lookup retained', 'const targetBranch = storeBranchByNumber(targetBranchNumber);' in move_item),
    ('move item same branch guard retained', 'Number(source.branch?.number) === Number(targetBranch.number)' in move_item),
    ('move item target showcase guard retained', '!installedShowcaseCount(targetBranch)' in move_item),
    ('move item free target lookup retained', 'const target = findEmptyShowcasePosition(targetBranch);' in move_item),
    ('move item preserves slot object retained', 'const savedSlot = { ...source.slot };' in move_item),
    ('move item clears source retained', 'source.branch.showcases[source.showcaseIndex].slots[source.slotIndex] = null;' in move_item),
    ('move item stores saved slot retained', 'branchShowcases(targetBranch)[target.showcaseIndex].slots[target.slotIndex] = savedSlot;' in move_item),
    ('move item display branch update retained', 'item.displayBranchNumber = targetBranch.number;' in move_item),
    ('move item save/modal/render retained', all(token in move_item for token in ('saveGame();', 'closeModal();', 'render();'))),
    ('install captures scroll retained', 'const storeScrollSnapshot = captureStoreScrollSnapshot();' in install),
    ('install rented guard retained', "if (!state.store.rented) return showToast('店舗を契約してから設置できます。', 'error');" in install),
    ('install owned guard retained', "if (!product || owned <= 0) return showToast('設置できる商品を所持していません。', 'error');" in install),
    ('case install quantity retained', "productId === 'case' ? displayCaseInstallQuantity(branch) : 1" in install),
    ('showcase install maximum retained', 'installedShowcaseCount(branch) >= storeMaximumShowcases(branch)' in install),
    ('showcase installs five slots retained', 'slots: [null, null, null, null, null]' in install),
    ('showcase capacity sync retained', 'syncFinishedJewelryCapacity();' in install),
    ('display supplies require showcase retained', "if (maximum < 1) return showToast('先にショーケースを設置してください。', 'error');" in install),
    ('display supplies capped by showcases retained', 'storeDisplaySuppliesInstalled(branch) >= maximum' in install),
    ('case install max helper retained', 'const maximum = displayCaseInstallMaximum(branch);' in install),
    ('case installed count mutation retained', 'branch.casesInstalled = storeCaseRemaining(branch) + installQuantity;' in install),
    ('installed inventory deduction retained', 'state.store.displayInventory[productId] = owned - installQuantity;' in install),
    ('install display mirror retained', 'mirrorCurrentStoreDisplay(branch);' in install),
    ('install store level sync retained', 'syncStoreLevel(branch);' in install),
    ('install save retained', 'saveGame();' in install),
    ('case draft reset retained', "if (productId === 'case') displayCaseInstallDraft = 1;" in install),
    ('install render retained', 'render();' in install),
    ('install scroll restore retained', 'restoreStoreScrollSnapshot(storeScrollSnapshot);' in install),
    ('install no time/money cost retained', all(token not in install for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),
    ('place/remove/move no time or money cost retained', all(token not in (place_item + place_slot + remove_item + move_item) for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),
    ('selling price confirm route retained', "case 'selling-price-confirm': {" in price_confirm),
    ('selling price confirm slot lookup retained', 'branchShowcases(branch)?.[showcaseIndex]?.slots?.[slotIndex]' in price_confirm),
    ('selling price confirm normalization retained', 'const decidedPrice = normalizeSellingPrice(' in price_confirm),
    ('selling price confirm no-op retained', 'if (decidedPrice === currentPrice) break;' in price_confirm),
    ('selling price confirm commits slot retained', 'slot.sellingPrice = decidedPrice;' in price_confirm),
    ('selling price confirm pending sync retained', 'screenData.pendingSellingPrice = decidedPrice;' in price_confirm),
    ('selling price confirm mirror/save retained', 'mirrorCurrentStoreDisplay(branch);' in price_confirm and 'saveGame();' in price_confirm),
    ('selling price confirm preview retained', 'updateShowcaseDetailPricePreview(decidedPrice, decidedPrice, item)' in price_confirm),
    ('install action route retained', "case 'install-display-product': installDisplayProduct(button.dataset.id); break;" in APP),
    ('place slot action route retained', "case 'place-item-in-slot': placeItemInShowcaseSlot(" in APP),
    ('remove action route retained', "case 'remove-showcase': removeShowcase(" in APP),
    ('move action route retained', "case 'confirm-move-showcase-item': moveShowcaseItem(" in APP),
    ('selling price step route retained', "case 'selling-price-step': {" in APP and 'sellingPricePressHold.handleClick(button);' in APP),
    ('dynamic harness extracts install', "extractFunction('installDisplayProduct')" in TEST),
    ('dynamic harness extracts place item', "extractFunction('placeItem')" in TEST),
    ('dynamic harness extracts exact slot', "extractFunction('placeItemInShowcaseSlot')" in TEST),
    ('dynamic harness extracts remove', "extractFunction('removeShowcase')" in TEST),
    ('dynamic harness extracts move', "extractFunction('moveShowcaseItem')" in TEST),
    ('dynamic harness extracts price adjust', "extractFunction('adjustShowcaseSellingPrice')" in TEST),
    ('dynamic harness extracts inline price confirm', 'extractSellingPriceConfirmBody' in TEST),
    ('showcase installation regression case', 'testShowcaseInstallationAndLimits' in TEST),
    ('display supplies regression case', 'testDisplaySuppliesInstallationAndGuards' in TEST),
    ('case multi install regression case', 'testCaseMultiInstallAndMaximum' in TEST),
    ('place item regression case', 'testPlaceItemUsesFirstEmptyShowcaseSlot' in TEST),
    ('exact slot regression case', 'testPlaceItemInExactSlotAndOccupiedGuard' in TEST),
    ('remove regression case', 'testRemoveShowcaseReturnsJewelryToStorage' in TEST),
    ('move regression case', 'testMoveShowcaseItemPreservesSellingPrice' in TEST),
    ('price draft regression case', 'testSellingPriceAdjustmentIsDraftOnlyAndFloored' in TEST),
    ('price confirm regression case', 'testSellingPriceConfirmCommitsPendingPrice' in TEST),
    ('basic guard regression case', 'testInstallationBasicGuards' in TEST),
    ('current audit registration or sync registration', 'check-store-display-management-regression.py' in CURRENT or 'check-store-display-management-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('STORE DISPLAY MANAGEMENT PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-store-display-management-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('店舗設備設置・ショーケース陳列/解除/店舗間移動・ケース数量・ディスプレイ用品・販売価格調整/確定・表示同期・保存・時間/費用非消費を固定しました。')
print('STORE DISPLAY MANAGEMENT PROTECTION: PASS')
