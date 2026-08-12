from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
html = (root / 'game.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')
game_data = (root / 'js/game-data.js').read_text(encoding='utf-8')


def require(label, condition):
    if not condition:
        print('FAIL', label)
        sys.exit(1)
    print('PASS', label)


def ordered(label, haystack, needles, start=0):
    pos = start
    for needle in needles:
        idx = haystack.find(needle, pos)
        if idx < 0:
            print('FAIL', label, 'missing/order:', needle)
            sys.exit(1)
        pos = idx + len(needle)
    print('PASS', label)

require('HTML probe uses CSP nonce', 'nonce="jxj-kaitenzushi"' in html and "'nonce-jxj-kaitenzushi'" in html)
require('HTML probe precedes hosting origin guard', html.find('__JXJ_BOOT_DIAGNOSTICS') < html.find('hosting-origin-guard.js'))
require('HTML/CSS/app cache version 0.10.669', 'styles.css?v=0.10.669' in html and 'app.js?v=0.10.669' in html)
require('game-data VERSION 0.10.669', "VERSION = '0.10.669'" in game_data)
require('app UI_BUILD_VERSION 0.10.669', "UI_BUILD_VERSION = '0.10.669'" in app)
require('service worker VERSION 0.10.669', "VERSION = '0.10.669'" in sw)
require('diagnostic storage key present', "STARTUP_DIAGNOSTICS_STORAGE_KEY = 'jxj-startup-diagnostics-v1'" in app)
require('settings diagnostic panel present', 'renderStartupDiagnosticsPanel()' in app and '診断結果をコピー' in app)
require('resource timing diagnostics present', "performance.getEntriesByType?.('resource')" in app)
require('navigation timing diagnostics present', "performance.getEntriesByType?.('navigation')" in app)
require('device/network diagnostics present', 'hardwareConcurrency' in app and 'navigator.deviceMemory' in app and 'effectiveType' in app)
require('startup audio release marker present', "startup_audio_released: '起動時音声の解放'" in app)
require('early title marker present', "title_rendered: '先行タイトル描画'" in app)
require('save-ready marker present', "startup_save_ready: 'スタート有効化（セーブ確認完了）'" in app)

boot = app.find('async function boot()')
require('boot function found', boot >= 0)
ordered('early title precedes Firebase initialization', app, [
    "screen = 'title';",
    'render();',
    "startupMark('title_rendered', 'early-shell')",
    "startupMark('firebase_init_started')",
    'await initializeFirebase();',
    "startupMark('firebase_init_finished')",
], boot)
ordered('signed-in cloud read remains measured', app, [
    "startupMark('cloud_load_started')",
    "startupMark('session_claim_started')",
    'void claimSession(user.uid, sessionId)',
    'cloudSave = await loadState(user.uid);',
    "startupMark('cloud_load_finished')",
    'const preferredAtBoot = preferredSavedState();',
    "startupMark('preferred_save_selected'",
], boot)
ordered('save-ready title occurs after cloud comparison', app, [
    "startupMark('cloud_load_finished')",
    "startupMark('preferred_save_selected'",
    'startupSaveReady = true;',
    "screen = 'title';",
    'render();',
    "startupMark('startup_save_ready'",
], boot)

click = app.find("case 'start':")
require('start action found', click >= 0)
ordered('start gate and start-to-main measurement order', app, [
    'if (!startupSaveReady)',
    "startupMark('start_button_clicked')",
    "startupMark('start_load_game_started')",
    'state = loadGame();',
    "startupMark('start_load_game_finished')",
    "startupMark('start_autopilot_started')",
    'await processAutopilotIfDue({ renderAfter: false, showNotice: false });',
    "startupMark('start_autopilot_finished')",
    "setScreen(state.playerName ? 'main' : 'nameSetup', {}, false);",
    "startupMark(state.playerName ? 'main_rendered' : 'name_setup_rendered')",
    'releaseStartupAudioAfterGameEntry();',
], click)

sw_block = app.find("if ('serviceWorker' in navigator)")
ordered('Service Worker update has minimum-delay then idle scheduling', app, [
    "navigator.serviceWorker.register('./sw.js')",
    'const runUpdateCheck = () => registration.update()',
    'window.setTimeout(() => {',
    'requestIdleCallback(runUpdateCheck, { timeout: 10000 })',
    '}, 10000);',
], sw_block)

markers = [
    'app_module_started', 'boot_started', 'firebase_init_started', 'firebase_init_finished',
    'auth_callback_started', 'cloud_load_started', 'cloud_load_finished', 'session_claim_started',
    'session_claim_finished', 'title_rendered', 'startup_save_ready', 'start_button_clicked',
    'start_load_game_started', 'start_load_game_finished', 'start_autopilot_started',
    'start_autopilot_finished', 'main_rendered', 'startup_audio_released'
]
for marker in markers:
    require(f'marker {marker}', marker in app)

print('STARTUP DIAGNOSTICS AUDIT: PASS')
