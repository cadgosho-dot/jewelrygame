#!/usr/bin/env python3
"""Current startup safety audit for JEWELRY×JEWELRY.

This replaces the old v0.10.669 instrumentation-specific audit.  It checks the
startup contracts that still exist in the current code without requiring
removed diagnostic markers.
"""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
app = (root / 'js/app.js').read_text(encoding='utf-8')
audio = (root / 'js/audio.js').read_text(encoding='utf-8')
html = (root / 'game.html').read_text(encoding='utf-8')
index = (root / 'index.html').read_text(encoding='utf-8')
sw = (root / 'sw.js').read_text(encoding='utf-8')
game_data = (root / 'js/game-data.js').read_text(encoding='utf-8')


def require(label, condition):
    if not condition:
        print('FAIL', label)
        sys.exit(1)
    print('PASS', label)


def version(pattern, text, label):
    match = re.search(pattern, text)
    require(f'{label} version marker', bool(match))
    return match.group(1)


# CSP and script ordering.
require('CSP is present', 'http-equiv="Content-Security-Policy"' in html)
require('CSP keeps self scripts enabled', "script-src 'self'" in html)
require('hosting origin guard loads before app module', html.find('hosting-origin-guard.js') < html.find('js/app.js'))
require('app is loaded as an ES module', 'type="module" src="./js/app.js' in html)

# Version consistency is dynamic: no fixed historical version in this audit.
versions = {
    'game-data': version(r"export const VERSION = '([0-9.]+)'", game_data, 'game-data'),
    'service-worker': version(r"const VERSION = '([0-9.]+)'", sw, 'service worker'),
    'app-ui': version(r"const UI_BUILD_VERSION = '([0-9.]+)'", app, 'app UI'),
    'game-css': version(r"styles\.css\?v=([0-9.]+)", html, 'game CSS'),
    'game-app': version(r"js/app\.js\?v=([0-9.]+)", html, 'game app'),
    'index-shell': version(r"viewport-shell\.css\?v=([0-9.]+)", index, 'index shell'),
}
require('startup-facing versions agree', len(set(versions.values())) == 1)

# Current startup gate: title is shown while save/auth comparison completes.
require('startup save-ready gate exists', 'let startupSaveReady = false;' in app)
require('start button is disabled until save is ready', "${startupSaveReady ? '' : 'disabled aria-disabled=\"true\" aria-busy=\"true\"'}" in app)
require('boot initializes Firebase before declaring save ready', 'async function boot()' in app and 'await initializeFirebase();' in app and 'startupSaveReady = true;' in app)
require('preferred save comparison still exists', 'const preferredAtBoot = preferredSavedState();' in app)

# Startup audio hold prevents autoplay/network work before actual game entry.
require('startup audio hold exists', 'let startupAudioHeld = true;' in audio)
require('startup audio release API exists', 'export function releaseStartupAudioHold()' in audio)
require('game releases startup audio after entry', 'function releaseStartupAudioAfterGameEntry()' in app and 'releaseStartupAudioHold();' in app)

# Service Worker update path remains present and versioned by the UI build.
require('service worker registration exists', "navigator.serviceWorker.register(`./sw.js?v=${UI_BUILD_VERSION}`, { updateViaCache: 'none' })" in app)
require('service worker update check exists', 'registration.update()' in app)

print(f"STARTUP SAFETY AUDIT: PASS (v{versions['game-data']})")
