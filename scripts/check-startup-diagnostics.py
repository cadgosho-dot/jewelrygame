from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
app = (root / 'js' / 'app.js').read_text(encoding='utf-8')
html = (root / 'game.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')
game_data = (root / 'js' / 'game-data.js').read_text(encoding='utf-8')

def require(label, condition):
    if not condition:
        print('FAIL', label)
        sys.exit(1)
    print('PASS', label)

def ordered(label, haystack, needles, start=0):
    pos = start
    found = []
    for needle in needles:
        idx = haystack.find(needle, pos)
        if idx < 0:
            print('FAIL', label, 'missing/order:', needle)
            sys.exit(1)
        found.append(idx)
        pos = idx + len(needle)
    print('PASS', label)
    return found

require('HTML probe uses CSP nonce', 'nonce="jxj-kaitenzushi"' in html and "'nonce-jxj-kaitenzushi'" in html)
require('HTML probe precedes hosting origin guard', html.find('__JXJ_BOOT_DIAGNOSTICS') < html.find('hosting-origin-guard.js'))
require('HTML/CSS/app cache version 0.10.666', 'styles.css?v=0.10.666' in html and 'app.js?v=0.10.666' in html)
require('game-data VERSION 0.10.666', "VERSION = '0.10.666'" in game_data)
require('app UI_BUILD_VERSION 0.10.666', "UI_BUILD_VERSION = '0.10.666'" in app)
require('service worker VERSION 0.10.666', "VERSION = '0.10.666'" in sw)
require('diagnostic storage key present', "STARTUP_DIAGNOSTICS_STORAGE_KEY = 'jxj-startup-diagnostics-v1'" in app)
require('settings diagnostic panel present', 'renderStartupDiagnosticsPanel()' in app and '診断結果をコピー' in app)
require('copy action always allowed even at hunger lock', "'copy-startup-diagnostics'" in app[app.find('const HUNGER_ALLOWED_ACTIONS'):app.find('function eventRecord')])
require('resource timing diagnostics present', "performance.getEntriesByType?.('resource')" in app)
require('navigation timing diagnostics present', "performance.getEntriesByType?.('navigation')" in app)
require('device/network diagnostics present', 'hardwareConcurrency' in app and 'navigator.deviceMemory' in app and 'effectiveType' in app)

boot = app.find('async function boot()')
require('boot function found', boot >= 0)
ordered('Firebase boot order unchanged while instrumented', app, [
    "startupMark('firebase_init_started')",
    'await initializeFirebase();',
    "startupMark('firebase_init_finished')",
    'observeAuth(async (user) =>',
], boot)
ordered('signed-in cloud/session startup remains measured', app, [
    "startupMark('cloud_load_started')",
    "startupMark('session_claim_started')",
    'const sessionClaimPromise = claimSession(user.uid, sessionId)',
    'cloudSave = await loadState(user.uid);',
    "startupMark('cloud_load_finished')",
    'const preferredAtBoot = preferredSavedState();',
    'await sessionClaimPromise;',
], boot)
ordered('title completion is measured after render', app, [
    "screen = 'title';",
    'render();',
    "startupMark('title_rendered')",
    "persistStartupDiagnostics('title')",
], boot)

click = app.find("case 'start':")
require('start action found', click >= 0)
ordered('start-to-main measurement preserves load/autopilot/render order', app, [
    "startupMark('start_button_clicked')",
    "startupMark('start_load_game_started')",
    'state = loadGame();',
    "startupMark('start_load_game_finished')",
    "startupMark('start_autopilot_started')",
    'await processAutopilotIfDue({ renderAfter: false, showNotice: false });',
    "startupMark('start_autopilot_finished')",
    "setScreen(state.playerName ? 'main' : 'nameSetup', {}, false);",
    "startupMark(state.playerName ? 'main_rendered' : 'name_setup_rendered')",
], click)
require('no synchronous diagnostic persistence before start load', "persistStartupDiagnostics('start-clicked')" not in app)

sw_block = app.find("if ('serviceWorker' in navigator)")
ordered('Service Worker update is deferred after registration', app, [
    "navigator.serviceWorker.register('./sw.js')",
    'const runUpdateCheck = () => registration.update()',
    'requestIdleCallback(runUpdateCheck, { timeout: 8000 })',
], sw_block)

markers = [
    'app_module_started', 'boot_started', 'loading_rendered', 'firebase_init_started', 'firebase_init_finished',
    'auth_callback_started', 'cloud_load_started', 'cloud_load_finished', 'session_claim_started',
    'session_claim_finished', 'title_rendered', 'start_button_clicked', 'start_load_game_started',
    'start_load_game_finished', 'start_autopilot_started', 'start_autopilot_finished', 'main_rendered'
]
for marker in markers:
    require(f'marker {marker}', marker in app)

print('STARTUP DIAGNOSTICS AUDIT: PASS')
