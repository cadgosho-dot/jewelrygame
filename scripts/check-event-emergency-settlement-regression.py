#!/usr/bin/env python3
"""Protect emergency settlement for interrupted transient events without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-event-emergency-settlement-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase39-sync-v010928.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


settlement = section('runEventEmergencySettlement')
case_keys = [
    'westernUnionEvent',
    'miningPazupanEvent',
    'mermaidEvent',
    'tattooWomanAmberEvent',
    'kappaJadeEvent',
    'workshopKappaJadeEvent',
    'okachimachiTollEvent',
    'cyclopsEvent',
    'ganeshaTuskEvent',
    'yowamushiRoseQuartzEvent',
    'touristWoodSwordEvent',
    'diamondPolishingLapEvent',
    'clockTowerDonationEvent',
    'mysteryChineseMealEvent',
    'hauntingEvent',
    'cinemaVisitEvent',
    'apprenticeCinemaEvent',
    'okachimachiInvasiveTurtlesEvent',
    'kawaharaKnowledgeEvent',
    'storeTheftEvent',
]

checks = {
    'runEventEmergencySettlement definition exists once': APP.count('function runEventEmergencySettlement(') == 1,
    'invalid key/state guard retained': 'if (!key || !eventState) return false;' in settlement,
    'stage snapshot retained': "const stage = String(eventState.stage || '');" in settlement,
    'changed result accumulator retained': 'let changed = false;' in settlement and 'return changed;' in settlement,
    'all twenty emergency settlement branches retained': all(f"case '{key}':" in settlement for key in case_keys),
    'western union reward stage gate retained': all(token in settlement for token in [
        "['gift', 'explain1', 'explain2', 'explain3'].includes(stage)",
        '!eventState.rewardGranted',
        'grantWesternUnionAntiqueDiamond(eventState);',
    ]),
    'tattoo amber loose reward retained': all(token in settlement for token in [
        "case 'tattooWomanAmberEvent':",
        'adjustLooseInventory(TATTOO_WOMAN_AMBER_EVENT_GEM_ID, TATTOO_WOMAN_AMBER_EVENT_SHAPE_ID, 1);',
        'eventState.rewardGranted = true;',
        "addNotification('琥珀を手に入れました'",
    ]),
    'kappa emergency rough rewards retained': settlement.count("grantEmergencyRough(eventState, 'jade'") >= 3,
    'toll reward-stage list retained': "const rewardStages = ['jadeReward', 'paymentDemand', 'paymentNotice', 'farewell'];" in settlement,
    'toll payment idempotency retained': all(token in settlement for token in [
        '(eventState.rewardGranted || rewardStages.includes(stage)) && !eventState.paymentApplied',
        'state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - OKACHIMACHI_TOLL_EVENT_COST);',
        "addFinance('御徒町の通行費', 0, OKACHIMACHI_TOLL_EVENT_COST);",
        'eventState.paymentApplied = true;',
    ]),
    'item and tool emergency rewards retained': all(token in settlement for token in [
        "grantEmergencyItem(eventState, 'energyDrink'",
        "grantEmergencyItem(eventState, 'bokuto'",
        "toolOwned('diamondPolishingLap')",
        'grantDiamondPolishingLap(eventState);',
    ]),
    'ganesha emergency rough retained': 'grantEmergencyRough(eventState, GANESHA_TUSK_GEM_ID' in settlement,
    'yowamushi loose reward increments once retained': all(token in settlement for token in [
        "case 'yowamushiRoseQuartzEvent':",
        'state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID][YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID] = Math.max(0, Math.floor(Number(state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID][YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID]) || 0)) + 1;',
        "addNotification('ローズクォーツを手に入れました'",
    ]),
    'clock tower donation idempotency retained': all(token in settlement for token in [
        "case 'clockTowerDonationEvent':",
        'if (!eventState.donationApplied) {',
        'state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - 100000);',
        "addFinance('時計台募金', 0, 100000);",
        'eventState.donationApplied = true;',
    ]),
    'mystery meal emergency delegation retained': all(token in settlement for token in [
        "case 'mysteryChineseMealEvent':",
        'settleMysteryChineseMealEmergency(eventState) || changed;',
        "eventState.selectedDish = '';",
    ]),
    'haunting payment idempotency retained': all(token in settlement for token in [
        "case 'hauntingEvent':",
        'if (!eventState.paymentApplied) {',
        'HAUNTING_EVENT_COST',
        "addFinance('お祓い', 0, HAUNTING_EVENT_COST);",
    ]),
    'cinema invitation does not settle before playback retained': "if (stage === 'playing' && !eventState.settled) {" in settlement,
    'cinema settlement cost time finance retained': all(token in settlement for token in [
        'eventState.lastVideo = eventState.selectedVideo;',
        'CINEMA_VISIT_EVENT_COST',
        'spendHours(CINEMA_VISIT_EVENT_HOURS);',
        "addFinance('映画館で映画鑑賞', 0, CINEMA_VISIT_EVENT_COST);",
        "eventState.selectedVideo = '';",
    ]),
    'apprentice cinema stage/idempotency retained': "['playing', 'outro1', 'outro2'].includes(stage) && !eventState.settled" in settlement,
    'apprentice cinema cost time finance retained': all(token in settlement for token in [
        'APPRENTICE_CINEMA_EVENT_COST',
        'spendHours(APPRENTICE_CINEMA_EVENT_HOURS);',
        "addFinance('見習い職人と映画鑑賞', 0, APPRENTICE_CINEMA_EVENT_COST);",
    ]),
    'invasive turtles emergency branch remains no-op': re.search(r"case 'okachimachiInvasiveTurtlesEvent':\s*break;", settlement) is not None,
    'kawahara knowledge recovery retained': all(token in settlement for token in [
        'const kawahara = kawaharaKnowledgeEventState();',
        "['reward', 'farewell'].includes(String(kawahara?.stage || '')) && kawahara.knowledgeId",
        'grantProcessingKnowledge(kawahara.knowledgeId, KAWAHARA_KNOWLEDGE_EVENT_SOURCE);',
    ]),
    'store theft post-acceptance gate retained': all(token in settlement for token in [
        "['intro2', 'intro3', 'farewell', 'pause', 'theftNotice'].includes(stage) && !eventState.theftApplied",
        'applyStoreTheftEventLoss();',
    ]),
    'dynamic test extracts current production function': all(token in TEST for token in [
        "extractFunction('runEventEmergencySettlement')",
        'vm.runInContext(source, ctx',
        'runEventEmergencySettlement(',
    ]),
    'registered in audit or pending formal sync': 'check-event-emergency-settlement-regression.py' in CURRENT or (SYNC.is_file() and 'check-event-emergency-settlement-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testInvalidArgumentsDoNothing',
    'testWesternUnionStageGateAndIdempotency',
    'testTollRewardAndPaymentApplyOnce',
    'testYowamushiRewardAddsOneLooseOnce',
    'testClockTowerDonationAppliesOnce',
    'testCinemaInvitationDoesNotChargeOrSpendTime',
    'testCinemaPlayingSettlesOnce',
    'testApprenticeCinemaSettlementStages',
    'testMysteryMealDelegatesAndClearsSelection',
    'testStoreTheftStageGateAndIdempotency',
    'testKawaharaKnowledgeSettlementUsesNormalizedState',
    'testInvasiveTurtlesEmergencySettlementIsNoOp',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('EVENT EMERGENCY SETTLEMENT PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-event-emergency-settlement-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('EVENT EMERGENCY SETTLEMENT PROTECTION: PASS')
