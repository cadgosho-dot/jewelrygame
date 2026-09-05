#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-workshop-tool-trade-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase15-sync-v010904.yml'
SYNC_TEXT = SYNC.read_text(encoding='utf-8') if SYNC.exists() else ''


def function_body(signature):
    start = APP.find(signature)
    if start < 0:
        return ''
    end = APP.find('\nfunction ', start + 1)
    return APP[start:end if end >= 0 else len(APP)]


buy = function_body('function buyWorkshopTool(toolId) {')
repair = function_body('function repairWorkshopTool(toolId) {')
repair_price = function_body('function workshopToolRepairPrice(toolId) {')
record = function_body('function createWorkshopToolRecord(toolId, acquiredDay = state.game.day) {')

checks = [
    ('buyWorkshopTool definition exists once', APP.count('function buyWorkshopTool(toolId) {') == 1),
    ('repairWorkshopTool definition exists once', APP.count('function repairWorkshopTool(toolId) {') == 1),
    ('repair price helper exists once', APP.count('function workshopToolRepairPrice(toolId) {') == 1),
    ('tool record helper exists once', APP.count('function createWorkshopToolRecord(toolId, acquiredDay = state.game.day) {') == 1),

    ('buy tool lookup retained', 'const tool = WORKSHOP_TOOLS[toolId];' in buy),
    ('buy unlock guard retained', '!tool || !workshopToolUnlocked(tool)' in buy and '現在は購入できません。' in buy),
    ('buy ownership guard retained', 'toolOwned(toolId)' in buy and 'すでに所持しています。' in buy),
    ('buy money guard retained', 'state.game.money < tool.price' in buy and '購入する所持金が足りません。' in buy),
    ('buy one hour guard retained', '!canSpendHours(1)' in buy and '今日は購入手続きをする時間がありません。' in buy),
    ('buy money deduction retained', 'state.game.money -= tool.price;' in buy),
    ('buy money feedback retained', 'startMoneyFeedback(-tool.price);' in buy),
    ('buy one hour cost retained', 'spendHours(1);' in buy),
    ('buy creates workshop tool record', 'state.tools.items[toolId] = createWorkshopToolRecord(toolId);' in buy),
    ('buy legacy flags retained', 'syncLegacyToolFlags();' in buy),
    ('buy finance retained', 'addFinance(`g-Lab.で${tool.name}を購入`, 0, tool.price);' in buy),
    ('jewelry bench notification retained', "if (toolId === 'jewelryBench') addNotification('彫金机を購入しました', '工房でジュエリーを制作できるようになりました。');" in buy),
    ('polishing machine notification retained', "if (toolId === 'polishingMachine') addNotification('宝石研磨用平面研磨機を購入しました', '工房で原石をルースへ研磨できるようになりました。');" in buy),
    ('buy save retained', 'saveGame();' in buy),
    ('buy completion toast retained', "showToast(`${tool.name}を購入しました。`, 'info', false);" in buy),
    ('buy render retained', 'render();' in buy),

    ('repair tool lookup retained', 'const tool = WORKSHOP_TOOLS[toolId];' in repair),
    ('repair record lookup retained', 'const record = workshopToolRecord(toolId);' in repair),
    ('repairability/unusable guard retained', "!tool?.repairable || !record || record.status !== 'unusable'" in repair and '修理を依頼できる状態ではありません。' in repair),
    ('repair price call retained', 'const price = workshopToolRepairPrice(toolId);' in repair),
    ('repair money guard retained', 'state.game.money < price' in repair and '修理費が足りません。' in repair),
    ('repair one hour guard retained', '!canSpendHours(1)' in repair and '今日は修理を依頼する時間がありません。' in repair),
    ('repair money deduction retained', 'state.game.money -= price;' in repair),
    ('repair money feedback retained', 'startMoneyFeedback(-price);' in repair),
    ('repair one hour cost retained', 'spendHours(1);' in repair),
    ('repair status retained', "record.status = 'repairing';" in repair),
    ('repair seven day completion retained', 'record.repairCompleteDay = state.game.day + 7;' in repair),
    ('repair failure schedule cleared', 'record.failureDueDay = null;' in repair),
    ('repair finance retained', 'addFinance(`g-Lab.へ${tool.name}の修理を依頼`, 0, price);' in repair),
    ('repair completion notification retained', 'gameDateLabel(record.repairCompleteDay)' in repair and 'に修理が完了する予定です。' in repair),
    ('repair save retained', 'saveGame();' in repair),
    ('repair completion toast retained', "showToast(`${tool.name}を修理へ出しました。`, 'info', false);" in repair),
    ('repair render retained', 'render();' in repair),

    ('repair price 60 percent rule retained', 'Math.round((price * 0.60) / 1000) * 1000' in repair_price),
    ('repair price minimum retained', 'Math.max(1000,' in repair_price),
    ('tool record available status retained', "status: 'available'" in record),
    ('tool record acquired day retained', 'acquiredDay: Math.max(1, Number(acquiredDay) || state.game.day)' in record),
    ('tool record failure due day retained', 'failureDueDay: workshopToolFailureDueDay(toolId, acquiredDay)' in record),
    ('tool record repair completion reset retained', 'repairCompleteDay: null' in record),

    ('dynamic harness extracts buy function', "'buyWorkshopTool'" in TEST),
    ('dynamic harness extracts repair function', "'repairWorkshopTool'" in TEST),
    ('successful purchase regression case', 'testSuccessfulWorkshopToolPurchase' in TEST),
    ('special purchase notification regression case', 'testPolishingMachinePurchaseNotification' in TEST),
    ('purchase guard regression case', 'testWorkshopToolPurchaseGuardRails' in TEST),
    ('repair price regression case', 'testWorkshopToolRepairPriceRule' in TEST),
    ('successful repair regression case', 'testSuccessfulWorkshopToolRepair' in TEST),
    ('repair guard regression case', 'testWorkshopToolRepairGuardRails' in TEST),
    ('current audit registration or sync registration', 'check-workshop-tool-trade-regression.py' in CURRENT or 'check-workshop-tool-trade-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('WORKSHOP TOOL TRADE PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-workshop-tool-trade-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('buyWorkshopTool()/repairWorkshopTool() の購入条件・工具状態・修理費・7日修理・所持金・時間・収支・通知・保存・主要ガードを固定しました。')
print('WORKSHOP TOOL TRADE PROTECTION: PASS')
