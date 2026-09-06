#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-staff-operations-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase25-sync-v010914.yml'
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


candidates = block_body('function workshopStaffCraftCandidates(maxEffectiveMinutes) {')
quality = block_body('function workshopStaffQualityRoll(definition = workshopStaffDefinition()) {')
craft = block_body('function workshopStaffCraftOne(maxEffectiveMinutes, definition = workshopStaffDefinition()) {')
hire_workshop = block_body("case 'hire-workshop-staff': {")
hire_employee = block_body("case 'hire-employee': {")
employee_toggle = block_body("if (target.matches('[data-action=\"employee-working\"]')) {")
workshop_toggle = block_body("if (target.matches('[data-action=\"workshop-staff-working\"]')) {")

checks = [
    ('workshopStaffCraftCandidates definition exists once', APP.count('function workshopStaffCraftCandidates(maxEffectiveMinutes) {') == 1),
    ('workshopStaffQualityRoll definition exists once', APP.count('function workshopStaffQualityRoll(definition = workshopStaffDefinition()) {') == 1),
    ('workshopStaffCraftOne definition exists once', APP.count('function workshopStaffCraftOne(maxEffectiveMinutes, definition = workshopStaffDefinition()) {') == 1),
    ('workshop staff hire case exists once', APP.count("case 'hire-workshop-staff': {") == 1),
    ('store employee hire case exists once', APP.count("case 'hire-employee': {") == 1),
    ('employee working change block exists once', APP.count("if (target.matches('[data-action=\"employee-working\"]')) {") == 1),
    ('workshop staff working change block exists once', APP.count("if (target.matches('[data-action=\"workshop-staff-working\"]')) {") == 1),

    ('candidate minute normalization retained', 'const maxMinutes = Math.max(0, Number(maxEffectiveMinutes) || 0);' in candidates),
    ('candidate 120 minute/workshop/bench guard retained', "if (maxMinutes < 120 || !workshopOperating() || !toolUsable('jewelryBench')) return [];" in candidates),
    ('candidate storage count retained', "state.inventory.jewelry.filter((item) => item.status !== 'sold').length" in candidates),
    ('candidate storage capacity guard retained', 'if (storedCount >= state.inventory.capacity) return [];' in candidates),
    ('candidate item/design/finish/metal sources retained', all(token in candidates for token in ('Object.keys(ITEMS)', 'Object.keys(DESIGNS)', 'Object.keys(FINISHES)', 'Object.keys(METALS)'))),
    ('candidate loose variant enumeration retained', 'for (const gemId of Object.keys(GEMS))' in candidates and 'for (const shapeId of looseShapeIdsForGem(gemId))' in candidates),
    ('candidate loose availability retained', 'if (looseAvailableQuantity(gemId, shapeId) > 0)' in candidates),
    ('candidate production hours retained', 'const hours = productionHours({ item, design, finish });' in candidates),
    ('candidate effective minute guard retained', 'if (hours * 60 > maxMinutes + 1e-9) continue;' in candidates),
    ('plain candidate draft retained', "const plainDraft = { orderId: null, item, useLoose: false, gem: 'amethyst', looseShape: 'round', metal, design, finish };" in candidates),
    ('plain material sufficiency retained', 'if (plainRequirements.enoughMetal) plainCandidates.push' in candidates),
    ('loose candidate draft retained', 'const looseDraft = { orderId: null, item, useLoose: true, gem: variant.gemId, looseShape: variant.shapeId, metal, design, finish };' in candidates),
    ('loose material sufficiency retained', 'looseRequirements.enoughMetal && looseRequirements.enoughLoose' in candidates),
    ('70 percent loose preference retained', 'const preferLoose = Math.random() < 0.7;' in candidates),
    ('candidate preference branch retained', 'candidates.push(...(preferLoose ? looseCandidates : plainCandidates));' in candidates),
    ('single-side candidate fallback retained', 'else candidates.push(...looseCandidates, ...plainCandidates);' in candidates),

    ('quality premium clamp retained', 'const premiumChance = Math.max(0, Math.min(1, Number(definition?.premiumChance) || 0));' in quality),
    ('quality good clamp retained', 'const goodChance = Math.max(0, Math.min(1 - premiumChance, Number(definition?.goodChance) || 0));' in quality),
    ('quality single random roll retained', 'const roll = Math.random();' in quality),
    ('quality premium result retained', "if (roll < premiumChance) return 'premium';" in quality),
    ('quality good result retained', "if (roll < premiumChance + goodChance) return 'good';" in quality),
    ('quality standard result retained', "return 'standard';" in quality),

    ('craft candidate lookup retained', 'const candidates = workshopStaffCraftCandidates(maxEffectiveMinutes);' in craft),
    ('craft empty candidate guard retained', 'if (!candidates.length) return null;' in craft),
    ('craft random selection retained', 'const selected = randomFrom(candidates);' in craft),
    ('craft null selection guard retained', 'if (!selected) return null;' in craft),
    ('craft loose consumption retained', 'adjustLooseInventory(draft.gem, draft.looseShape, -requirements.requiredLooseQuantity)' in craft),
    ('craft metal consumption retained', 'state.inventory.metals[draft.metal] = roundedMetalWeight(requirements.ownedMetalWeight - requirements.requiredMetalWeight);' in craft),
    ('craft quality roll retained', 'const quality = workshopStaffQualityRoll(definition);' in craft),
    ('craft staff artisan level formula retained', 'Math.max(1, Math.min(20, 2 + (Math.max(1, Number(definition?.level) || 1) * 3)))' in craft),
    ('craft production profile retained', 'craftProductionProfile(draft, { artisanLevel: staffArtisanLevel })' in craft),
    ('craft jewelry id retained', 'id: uid(),' in craft),
    ('craft jewelry name retained', 'name: itemName(draft),' in craft),
    ('craft jewelry quality retained', 'quality,' in craft),
    ('craft production cost retained', 'cost: productionCost(draft),' in craft),
    ('craft recommended price retained', 'recommendedPrice: craftsmanshipRecommendedPrice(draft, quality, craftsmanship),' in craft),
    ('craft craftsmanship snapshot retained', '...craftsmanshipSnapshot(craftsmanship),' in craft),
    ('craft xp zero retained', 'xp: 0,' in craft),
    ('craft stored status retained', "status: 'stored'," in craft),
    ('craft created day retained', 'createdDay: state.game.day,' in craft),
    ('craft madeBy marker retained', "madeBy: 'workshopStaff'," in craft),
    ('craft jewelry inventory append retained', 'state.inventory.jewelry.push(jewelry);' in craft),
    ('craft daily crafted append retained', 'state.daily.crafted.push(jewelry.id);' in craft),
    ('craft daily workshop staff summary retained', 'state.daily.workshopStaffCrafted.push(summary);' in craft),
    ('craft staff summary retained', 'staff.craftedToday.push(summary);' in craft),
    ('craft staff summary cap retained', 'staff.craftedToday = staff.craftedToday.slice(-20);' in craft),
    ('craft tool failure check retained', 'const brokenToolName = checkWorkshopToolFailure();' in craft),
    ('craft tool failure notification retained', "'職人スタッフの制作後に故障しました。修理が完了するまで自動制作は止まります。'" in craft),
    ('craft return retained', 'return { jewelry, hours, brokenToolName };' in craft),
    ('craft has no direct save/time/money mutation', all(token not in craft for token in ('saveGame(', 'spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('workshop hire holiday guard retained', "if (workshopStaffHoliday(gameDate())) { showToast('土日祝日は職人スタッフを設定できません。', 'error'); break; }" in hire_workshop),
    ('workshop hire unlock guard retained', "if (!unlock.unlocked) { showToast('職人スタッフの解放条件を満たしていません。', 'error'); break; }" in hire_workshop),
    ('workshop hire staff state lookup retained', 'const staff = workshopStaffState();' in hire_workshop),
    ('workshop hire hired flag retained', 'staff.hired = true;' in hire_workshop),
    ('workshop hire ever-hired flag retained', 'staff.everHired = true;' in hire_workshop),
    ('workshop hire working flag retained', 'staff.working = true;' in hire_workshop),
    ('workshop hire work days reset retained', 'staff.workDays = 0;' in hire_workshop),
    ('workshop hire minute bank reset retained', 'staff.workMinutesBank = 0;' in hire_workshop),
    ('workshop hire worked minutes reset retained', 'staff.workedMinutesToday = 0;' in hire_workshop),
    ('workshop hire crafted today reset retained', 'staff.craftedToday = [];' in hire_workshop),
    ('workshop hire unpaid wage reset retained', 'staff.wageUnpaid = 0;' in hire_workshop),
    ('workshop hire save/toast/render retained', all(token in hire_workshop for token in ('saveGame();', "showToast('職人スタッフを雇いました。');", 'render();'))),
    ('workshop hire has no direct time/money mutation', all(token not in hire_workshop for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('employee hire branch lookup retained', 'const branch = currentStoreBranch();' in hire_employee),
    ('employee hire availability guard retained', "if (!branch || !storeEmployeeAvailable(branch)) { showToast('この店舗では店舗スタッフを雇えません。', 'error'); break; }" in hire_employee),
    ('employee hire employee lookup retained', 'const employee = storeBranchEmployee(branch);' in hire_employee),
    ('employee hire hired flag retained', 'employee.hired = true;' in hire_employee),
    ('employee hire work days reset retained', 'employee.workDays = 0;' in hire_employee),
    ('employee hire working flag retained', 'employee.working = true;' in hire_employee),
    ('employee hire unpaid wage reset retained', 'employee.wageUnpaid = 0;' in hire_employee),
    ('employee hire recruitment remains false retained', 'state.facilities.recruitment = false;' in hire_employee),
    ('employee hire save retained', 'saveGame();' in hire_employee),
    ('employee hire branch toast retained', 'storeBranchDisplayName(branch)' in hire_employee and 'employee.name' in hire_employee),
    ('employee hire render retained', 'render();' in hire_employee),
    ('employee hire has no direct time/money mutation', all(token not in hire_employee for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('employee working current branch lookup retained', 'const branch = currentStoreBranch();' in employee_toggle),
    ('employee working mutation retained', 'if (branch) storeBranchEmployee(branch).working = target.checked;' in employee_toggle),
    ('employee working save retained', 'saveGame();' in employee_toggle),
    ('employee working render retained', 'render();' in employee_toggle),
    ('employee working return retained', 'return;' in employee_toggle),
    ('workshop working holiday rollback retained', 'target.checked = workshopStaffState().working;' in workshop_toggle),
    ('workshop working holiday toast retained', "showToast('土日祝日は職人スタッフを設定できません。', 'error');" in workshop_toggle),
    ('workshop working mutation retained', 'workshopStaffState().working = target.checked;' in workshop_toggle),
    ('workshop working save retained', 'saveGame();' in workshop_toggle),
    ('workshop working render retained', 'render();' in workshop_toggle),
    ('working toggles have no direct time/money mutation', all(token not in employee_toggle + workshop_toggle for token in ('spendHours(', 'spendMinutes(', 'advanceTime(', 'state.game.money +=', 'state.game.money -='))),

    ('workshop staff hire UI retained', 'data-action="hire-workshop-staff"' in APP),
    ('store employee hire UI retained', 'data-action="hire-employee"' in APP),
    ('workshop staff working UI retained', 'data-action="workshop-staff-working"' in APP),
    ('store employee working UI retained', 'data-action="employee-working"' in APP),

    ('dynamic harness extracts candidates function', "extractFunction('workshopStaffCraftCandidates')" in TEST),
    ('dynamic harness extracts quality function', "extractFunction('workshopStaffQualityRoll')" in TEST),
    ('dynamic harness extracts craft function', "extractFunction('workshopStaffCraftOne')" in TEST),
    ('dynamic harness extracts workshop hire case', "extractCase('hire-workshop-staff')" in TEST),
    ('dynamic harness extracts employee hire case', "extractCase('hire-employee')" in TEST),
    ('workshop hire success regression retained', 'testWorkshopStaffHireSuccess' in TEST),
    ('workshop hire guard regression retained', 'testWorkshopStaffHireGuards' in TEST),
    ('employee hire success regression retained', 'testStoreEmployeeHireSuccess' in TEST),
    ('employee hire guard regression retained', 'testStoreEmployeeHireGuard' in TEST),
    ('employee working toggle regression retained', 'testStoreEmployeeWorkingToggle' in TEST),
    ('workshop working toggle regression retained', 'testWorkshopStaffWorkingToggle' in TEST),
    ('candidate guard regression retained', 'testWorkshopStaffCraftCandidateGuards' in TEST),
    ('candidate preference regression retained', 'testWorkshopStaffCraftCandidatePreference' in TEST),
    ('quality roll regression retained', 'testWorkshopStaffQualityRoll' in TEST),
    ('craft success regression retained', 'testWorkshopStaffCraftSuccess' in TEST),
    ('craft loose consumption regression retained', 'testWorkshopStaffCraftConsumesLoose' in TEST),
    ('craft no-candidate regression retained', 'testWorkshopStaffCraftNoCandidateRoutes' in TEST),
    ('current audit registration or sync registration', 'check-staff-operations-regression.py' in CURRENT or 'check-staff-operations-regression.py' in SYNC_TEXT),
]

failed = []
for label, ok in checks:
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)
if failed:
    raise SystemExit('STAFF OPERATIONS PROTECTION: FAIL')

proc = subprocess.run(['node', str(ROOT / 'tools/test-staff-operations-regression.mjs')], cwd=ROOT, text=True)
if proc.returncode:
    raise SystemExit(proc.returncode)
print('スタッフ採用・配置切替・職人スタッフ自動制作の候補選択/品質抽選/材料消費/完成品生成/日次記録/工具故障通知を、現在の挙動のまま固定しました。')
print('STAFF OPERATIONS PROTECTION: PASS')
