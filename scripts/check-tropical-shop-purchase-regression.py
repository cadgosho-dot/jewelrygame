#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-tropical-shop-purchase-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase19-sync-v010908.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


max_qty = function_body('function tropicalShopMaxQuantity(product) {')
purchase = function_body('function purchaseTropicalShopItem(){')

checks = [
    ('tropicalShopMaxQuantity definition exists once', APP.count('function tropicalShopMaxQuantity(product) {') == 1),
    ('purchaseTropicalShopItem definition exists once', APP.count('function purchaseTropicalShopItem(){') == 1),
    ('max quantity reads aquarium state', 'const aquarium = aquariumState();' in max_qty),
    ('fish category branch retained', "if (product.category === 'fish')" in max_qty),
    ('fish definition and row lookup retained', 'const def = aquariumFishDefinition(product.id), row = aquarium.fish?.[product.id]; if (!def || !row) return 0;' in max_qty),
    ('fish species remaining retained', 'const speciesRemain = Math.max(0, def.speciesMax - row.inTank);' in max_qty),
    ('fish load remaining retained', 'const loadRemain = Math.max(0, AQUARIUM_CONFIG.capacity.fishLoadMax - aquariumFishLoad(aquarium));' in max_qty),
    ('fish capacity formula retained', 'cap = Math.min(speciesRemain, Math.floor(loadRemain / def.loadPoint));' in max_qty),
    ('plant total capacity retained', "product.category === 'plant'" in max_qty and 'AQUARIUM_CONFIG.capacity.plantTotalMax - aquariumPlantTotal(aquarium)' in max_qty),
    ('display family limits retained', "const familyMax = product.family === 'driftwood' ? 3 : 5;" in max_qty),
    ('display family count retained', 'familyMax - tropicalShopFamilyCount(product.family)' in max_qty),
    ('affordability retained', 'const affordable = Math.floor(Math.max(0, Number(state.game.money) || 0) / product.price);' in max_qty),
    ('capacity and affordability min retained', 'return Math.max(0, Math.min(cap, affordable));' in max_qty),
    ('modal guard retained', 'const modal=screenData?.tropicalModal; if(!modal)return;' in purchase),
    ('product lookup and guard retained', 'const product=tropicalShopFindProduct(modal.category,modal.id); if(!product)return;' in purchase),
    ('max quantity recheck retained', 'const max=tropicalShopMaxQuantity(product);' in purchase),
    ('requested quantity clamp retained', 'const qty=Math.max(0,Math.min(max,Math.floor(Number(modal.qty)||0)));' in purchase),
    ('quantity guard retained', "if(qty<1)return showToast('購入できません。','error');" in purchase),
    ('total price retained', 'const total=product.price*qty;' in purchase),
    ('money guard retained', "if(state.game.money<total)return showToast('所持金が足りません。','error');" in purchase),
    ('purchase reads aquarium state', 'const aquarium=aquariumState();' in purchase),
    ('fish inventory branch retained', "if(product.category==='fish')" in purchase and 'row.owned+=qty;row.inTank+=qty;' in purchase),
    ('fish individual synchronization retained', 'ensureAquariumFishIndividuals(aquarium,state.game.day);' in purchase and 'addAquariumFishIndividuals(product.id,qty,aquarium,state.game.day);' in purchase),
    ('fish load refresh retained', 'refreshAquariumLoad(aquarium);' in purchase),
    ('plant inventory branch retained', "else if(product.category==='plant')" in purchase and 'row.owned+=qty;row.inTank+=qty;' in purchase),
    ('plant individual synchronization retained', 'ensureAquariumPlantIndividuals(aquarium,state.game.day);' in purchase and 'addAquariumPlantIndividuals(product.id,qty,aquarium,state.game.day);' in purchase),
    ('display inventory/install branch retained', 'const row=aquarium.displayItems[product.id];row.owned+=qty;row.installed+=qty;' in purchase),
    ('aquarium revision increment retained', 'aquarium.lastSyncRevision+=1;' in purchase),
    ('money deduction retained', 'state.game.money-=total;' in purchase),
    ('finance record retained', 'addFinance(`熱帯魚屋 ${product.name}`,0,total);' in purchase),
    ('fish notification retained', "product.category==='fish'?`${qty}匹を水槽へ入れました。`" in purchase),
    ('plant notification retained', "product.category==='plant'?`${qty}株を水槽へ入れました。`" in purchase),
    ('display notification retained', '`${qty}個を水槽へ設置しました。`' in purchase),
    ('modal cleanup retained', 'delete screenData.tropicalModal;' in purchase),
    ('save retained', 'saveGame();' in purchase),
    ('money feedback retained', 'startMoneyFeedback(-total,1200);' in purchase),
    ('coin sfx retained', "playSfx('coin',{gain:.86});" in purchase),
    ('vibration retained', 'vibrate(28);' in purchase),
    ('render retained', 'render();' in purchase),
    ('no time cost introduced', all(token not in purchase for token in ('spendHours(', 'advanceTime(', 'canSpendHours(', 'canSpendMinutes('))),
    ('dynamic harness extracts max quantity', "extractFunction('tropicalShopMaxQuantity')" in TEST),
    ('dynamic harness extracts purchase', "extractFunction('purchaseTropicalShopItem')" in TEST),
    ('fish max regression case', 'testMaxQuantityProtectsFishCapacityLoadAndAffordability' in TEST),
    ('plant/display max regression case', 'testMaxQuantityProtectsPlantAndDisplayCaps' in TEST),
    ('fish purchase regression case', 'testFishPurchaseProtectsAquariumMoneyAccountingAndFeedback' in TEST),
    ('plant/display purchase regression case', 'testPlantAndDisplayPurchaseBranches' in TEST),
    ('quantity clamp regression case', 'testRequestedQuantityIsClampedToCurrentMaximum' in TEST),
    ('guard regression case', 'testPurchaseGuardRails' in TEST),
    ('current audit registration or sync registration', 'check-tropical-shop-purchase-regression.py' in CURRENT or 'check-tropical-shop-purchase-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('TROPICAL SHOP PURCHASE PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-tropical-shop-purchase-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('熱帯魚屋購入の魚種上限・水槽負荷・水草総数・ディスプレイ同系統上限・所持金・数量再計算・水槽反映・収支・通知・保存を固定しました。')
print('TROPICAL SHOP PURCHASE PROTECTION: PASS')
