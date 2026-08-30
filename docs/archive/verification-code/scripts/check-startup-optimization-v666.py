from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
app=(root/'js/app.js').read_text(encoding='utf-8')
fb=(root/'js/firebase-service.js').read_text(encoding='utf-8')
sw=(root/'sw.js').read_text(encoding='utf-8')
checks=[]
def ck(label, cond):
    checks.append((label,bool(cond)))
ck('version app', "UI_BUILD_VERSION = '0.10.666'" in app)
ck('version sw', "const VERSION = '0.10.666'" in sw)
ck('auth resolver disabled at init', 'popupRedirectResolver: undefined' in fb)
ck('google delete reauth supplies resolver', 'reauthenticateWithPopup(user, provider, browserPopupRedirectResolver)' in fb)
ck('cloud load starts', "startupMark('cloud_load_started')" in app)
ck('session starts before cloud await', app.find("startupMark('session_claim_started')") < app.find('cloudSave = await loadState(user.uid)'))
boot=app[app.find('async function boot()'):app.find('syncDeviceViewportProfile();\nboot();')]
ck('no boot metal market fetch', "loadMetalMarket().then" not in boot)
ck('supplier lazy metal load retained', "if (target === 'supplier' || target === 'supplierMetals'" in app and 'loadMetalMarket().then' in app)
ck('SW update deferred', 'requestIdleCallback(runUpdateCheck' in app and 'setTimeout(runUpdateCheck, 6000)' in app)
for asset in ['cinema-apprentice.png','emerald-captain.png','glab-kawahara.png','okachimachi-invasive-turtles.png','ridley-okazaki.png','jewelry_quiz_50_verified_2026-08-10.json']:
    ck(f'not precached: {asset}', asset not in sw[sw.find('const CORE_SHELL'):sw.find('];',sw.find('const CORE_SHELL'))])
ck('night backgrounds remain precached', 'okachimachi-night.webp' in sw and 'okachimachi-night-portrait.webp' in sw)
failed=[l for l,ok in checks if not ok]
for l,ok in checks: print(('PASS' if ok else 'FAIL'), l)
if failed: sys.exit(1)
