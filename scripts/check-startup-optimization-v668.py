from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
audio = (root / 'js/audio.js').read_text(encoding='utf-8')
html = (root / 'game.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')
gd = (root / 'js/game-data.js').read_text(encoding='utf-8')

checks = []
def ck(label, cond): checks.append((label, bool(cond)))

ck('version app', "UI_BUILD_VERSION = '0.10.668'" in app)
ck('version game-data', "VERSION = '0.10.668'" in gd)
ck('version sw', "const VERSION = '0.10.668'" in sw)
ck('game html asset query', 'styles.css?v=0.10.668' in html and 'app.js?v=0.10.668' in html)
ck('app module queries', all(x in app for x in [
    "./audio.js?v=0.10.668", "./audio-scene-map.js?v=0.10.668",
    "./daily-gems-index.js?v=0.10.668", "./firebase-service.js?v=0.10.668"
]))

for origin in ['https://www.gstatic.com', 'https://identitytoolkit.googleapis.com', 'https://firestore.googleapis.com']:
    ck(f'preconnect {origin}', f'<link rel="preconnect" href="{origin}" crossorigin>' in html)

ck('startup audio hold state', 'let startupAudioHeld = true;' in audio)
ck('startup audio blocks loop start', 'if (startupAudioHeld || !currentKey || suspended) return;' in audio)
ck('startup audio blocks weather ambient restart', 'if (startupAudioHeld || !key || currentKey !== key || suspended) return;' in audio)
ck('startup audio release exported', 'export function releaseStartupAudioHold()' in audio)
ck('app imports startup audio release', 'releaseStartupAudioHold' in app.split('\n', 20)[8])
ck('start path releases audio after entry', "releaseStartupAudioAfterGameEntry();" in app[app.find("case 'start':"):app.find("case 'confirm-player-name':")])
ck('auth entry releases audio', 'async function enterGameAfterLogin()' in app and app[app.find('async function enterGameAfterLogin()'):app.find("window.addEventListener('beforeunload'")].count('releaseStartupAudioAfterGameEntry();') >= 3)
ck('direct-return boot paths release audio', app[app.find('async function boot()'):app.find('syncDeviceViewportProfile();\nboot();')].count('releaseStartupAudioAfterGameEntry();') >= 4)

sw_block = app[app.find("if ('serviceWorker' in navigator)"):app.find('async function boot()')]
ck('SW update still registered', "navigator.serviceWorker.register('./sw.js')" in sw_block)
ck('SW update has guaranteed 10s minimum delay', '}, 10000);' in sw_block and 'requestIdleCallback(runUpdateCheck, { timeout: 10000 })' in sw_block)
ck('SW update no immediate idle callback', "requestIdleCallback(runUpdateCheck, { timeout: 8000 })" not in sw_block)

boot = app[app.find('async function boot()'):app.find('syncDeviceViewportProfile();\nboot();')]
ck('cloud save read remains awaited', 'cloudSave = await loadState(user.uid);' in boot)
ck('session claim remains background', 'void claimSession(user.uid, sessionId)' in boot)
ck('startup local->cloud sync remains background queued', 'saveQueue = saveQueue' in boot and '.then(() => saveState(user.uid, bootSyncSnapshot))' in boot)

failed = [label for label, ok in checks if not ok]
for label, ok in checks:
    print(('PASS' if ok else 'FAIL'), label)
if failed:
    sys.exit(1)
