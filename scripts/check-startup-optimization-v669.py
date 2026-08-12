from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
html = (root / 'game.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')
gd = (root / 'js/game-data.js').read_text(encoding='utf-8')

checks = []
def ck(label, cond): checks.append((label, bool(cond)))

ck('version app', "UI_BUILD_VERSION = '0.10.669'" in app)
ck('version game-data', "VERSION = '0.10.669'" in gd)
ck('version sw', "const VERSION = '0.10.669'" in sw)
ck('game html asset query', 'styles.css?v=0.10.669' in html and 'app.js?v=0.10.669' in html)
ck('app module queries', all(x in app for x in [
    './audio.js?v=0.10.669', './audio-scene-map.js?v=0.10.669',
    './daily-gems-index.js?v=0.10.669', './firebase-service.js?v=0.10.669'
]))

ck('startup save gate state exists', 'let startupSaveReady = false;' in app)
ck('title has save-check label', "'セーブ確認中…'" in app)
ck('title start button disabled before ready', "startupSaveReady ? '' : 'disabled aria-disabled=\"true\" aria-busy=\"true\"'" in app)
ck('start action has second guard', "if (!startupSaveReady)" in app[app.find("case 'start':"):app.find("case 'confirm-player-name':")])

boot_start = app.find('async function boot()')
boot_end = app.find('syncDeviceViewportProfile();\nboot();')
boot = app[boot_start:boot_end]
idx_title_screen = boot.find("screen = 'title';")
idx_title_mark = boot.find("startupMark('title_rendered', 'early-shell')")
idx_firebase = boot.find("startupMark('firebase_init_started')")
ck('title shell selected before Firebase', 0 <= idx_title_screen < idx_firebase)
ck('title shell marked before Firebase', 0 <= idx_title_mark < idx_firebase)
ck('signed-in path keeps title instead of loading screen', "Keep the already-visible title shell" in boot and "startupMark('signed_in_loading_rendered')" not in boot)
ck('cloud save still awaited before gate opens', 'cloudSave = await loadState(user.uid);' in boot)
ck('preferred local/cloud selection retained', 'const preferredAtBoot = preferredSavedState();' in boot)
ck('session claim remains background', 'void claimSession(user.uid, sessionId)' in boot)
ck('background local cloud sync retained', 'saveQueue = saveQueue' in boot and '.then(() => saveState(user.uid, bootSyncSnapshot))' in boot)
idx_ready_state = boot.find('startupSaveReady = true;')
idx_cloud_finished = boot.find("startupMark('cloud_load_finished')")
idx_preferred = boot.find("startupMark('preferred_save_selected'")
ck('gate opens only after cloud load', idx_ready_state > idx_cloud_finished >= 0)
ck('gate opens only after local/cloud comparison', idx_ready_state > idx_preferred >= 0)
ck('normal title rerender enables start', "startupMark('startup_save_ready', preferredAtBoot.source || 'none');" in boot)

ck('diagnostics expose early title', "title_rendered: '先行タイトル描画'" in app)
ck('diagnostics expose save ready', "startup_save_ready: 'スタート有効化（セーブ確認完了）'" in app)
ck('diagnostics resource cutoff includes save ready', 'startupDiagnostics.markers.startup_save_ready' in app[:20000])
ck('diagnostics reports html to save ready', 'HTML計測開始→スタート有効化' in app)

# v0.10.668 low-risk optimizations must stay intact.
for origin in ['https://www.gstatic.com', 'https://identitytoolkit.googleapis.com', 'https://firestore.googleapis.com']:
    ck(f'preconnect retained {origin}', f'<link rel="preconnect" href="{origin}" crossorigin>' in html)
sw_block = app[app.find("if ('serviceWorker' in navigator)"):app.find('async function boot()')]
ck('SW update remains delayed', 'requestIdleCallback(runUpdateCheck, { timeout: 10000 })' in sw_block and '}, 10000);' in sw_block)
ck('startup audio hold release retained', 'releaseStartupAudioAfterGameEntry();' in app)

failed = [label for label, ok in checks if not ok]
for label, ok in checks:
    print(('PASS' if ok else 'FAIL'), label)
if failed:
    sys.exit(1)
