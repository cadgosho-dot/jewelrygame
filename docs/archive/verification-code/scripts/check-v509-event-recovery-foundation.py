from pathlib import Path

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
checks = {
    'version game-data': "export const VERSION = '0.10.514';" in (root / 'js/game-data.js').read_text(encoding='utf-8'),
    'version sw': "const VERSION = '0.10.514';" in (root / 'sw.js').read_text(encoding='utf-8'),
    'version app imports': "daily-gems.js?v=0.10.514" in app and "kaitenzushi-embedded.js?v=0.10.514" in app,
    'emergency settlement hook': 'function runEventEmergencySettlement(key, eventState)' in app,
    'recovery policy': 'const EVENT_EMERGENCY_POLICY' in app,
    'manual recovery record': 'lastManualEventRecoveryV509' in app,
    'normal sushi separated': "kaitenzushi: { eventKey: '', fallback: 'main', conditionalEventKey: 'sushiChefEvent' }" in app,
    'conditional sushi resolution': "candidate?.active && EVENT_ACTIVE_STAGE_MAP[conditionalKey]?.has(stage)" in app,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('FAILED: ' + ', '.join(failed))
print('v0.10.514 event recovery foundation: OK')
