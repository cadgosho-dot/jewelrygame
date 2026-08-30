from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
checks = {
    'version app': 'daily-gems.js?v=0.10.514' in app,
    'version game-data': "export const VERSION = '0.10.514';" in (root / 'js/game-data.js').read_text(encoding='utf-8'),
    'version sw': "const VERSION = '0.10.514';" in (root / 'sw.js').read_text(encoding='utf-8'),
    'policy reward': 'guaranteedReward: new Set' in app,
    'policy conditional reward': 'conditionalReward: new Set' in app,
    'policy expense': 'committedExpense: new Set' in app,
    'policy loss': 'conditionalLoss: new Set' in app,
    'western stage guard': "['gift', 'explain1', 'explain2', 'explain3'].includes(stage)" in app,
    'clock idempotency': "case 'clockTowerDonationEvent':" in app and 'if (!eventState.donationApplied)' in app,
    'clock finance': app.count("addFinance('時計台募金', 0, 100000);") >= 2,
    'mystery idempotency': 'if (eventState.mealApplied) return false;' in app,
    'haunting idempotency': "case 'hauntingEvent':" in app and 'if (!eventState.paymentApplied)' in app,
    'cinema stage guard': "if (stage === 'playing' && !eventState.settled)" in app,
    'theft stage guard': "['intro2', 'intro3', 'farewell', 'pause', 'theftNotice'].includes(stage)" in app,
    'settlement before completion': app.index('runEventEmergencySettlement(recoveryEventKey, recoveryEventState);') < app.index('completeTransientEventSafely(recoveryEventKey'),
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('FAILED: ' + ', '.join(failed))
print('v0.10.514 event emergency settlement: OK')
