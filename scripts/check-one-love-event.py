#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
AUDIO = (ROOT / 'js/audio-scene-map.js').read_text(encoding='utf-8')
CHECKS = {
    'event chance is 25 percent': 'const ONE_LOVE_METAL_EVENT_CHANCE = 0.25;' in APP,
    'first eligible day is 181': 'const ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY = 181;' in APP,
    'cooldown restarts at 181 days': 'const ONE_LOVE_METAL_EVENT_COOLDOWN_DAYS = 181;' in APP and 'eventState.lastTriggeredDay + ONE_LOVE_METAL_EVENT_COOLDOWN_DAYS' in APP,
    'discount lasts exactly three days': 'const ONE_LOVE_METAL_EVENT_DISCOUNT_DAYS = 3;' in APP and 'dayOffset < 1 || dayOffset > ONE_LOVE_METAL_EVENT_DISCOUNT_DAYS' in APP,
    'discount rate is 80 percent': 'const ONE_LOVE_METAL_EVENT_DISCOUNT_RATE = 0.8;' in APP,
    'event-day purchase prices are captured': "normalMetalTradePricePerGram('buy', id)" in APP and 'basePurchasePerGramByMetalId = capturedPrices' in APP,
    'buy deal uses captured price': 'basePrice * ONE_LOVE_METAL_EVENT_DISCOUNT_RATE' in APP,
    'sell explicitly stays normal': "if (mode === 'sell') return normalPrice;" in APP,
    'metal display and buying share trade-price function': "metalTradePricePerGram('buy', id)" in APP and 'const unitPrice = metalTradePricePerGram(mode, id);' in APP,
    'one check per visit day': 'markVisitEventCheckOncePerDay(eventState)' in APP,
    'event has five dialogue stages': "new Set(['idle', 'intro1', 'intro2', 'intro3', 'intro4', 'intro5', 'completed'])" in APP,
    'ONE LOVE name rendered': '<small>ONE LOVE</small>' in APP,
    'first line preserved': 'yeah man、、、○○○♪、、、、' in APP,
    'three-day warning preserved': '明日から3日間の間、、、地金の相場が下がる' in APP,
    'Bless up preserved': 'それじゃな、、、Bless up、、、' in APP,
    'transparent dialogue background': '.one-love-metal-event-screen .one-love-dialogue-button' in APP and 'background: transparent !important;' in APP,
    'portrait character is 88 percent': 'transform: scale(.88) !important;' in APP,
    'existing select sfx only': "playSfx('select'" in APP and 'one-love' not in '\n'.join(line for line in APP.splitlines() if 'playSfx(' in line and 'one-love' in line.lower()),
    'existing workshop audio scene': "oneLoveMetalEvent: 'workshop'" in AUDIO,
    'existing workshop BGM retained': "bgm: `${AUDIO_DIR}/bgm-workshop.ogg`" in AUDIO,
    'existing workshop ambient retained': "url: `${AUDIO_DIR}/amb-workshop.ogg`" in AUDIO,
    'workshop background mapping exists': "oneLoveMetalEvent: 'workshop'" in APP,
    'render map exists': 'oneLoveMetalEvent: renderOneLoveMetalEvent' in APP,
    'action route exists': "case 'one-love-metal-event-next':" in APP,
    'workshop entry trigger exists': 'maybeStartOneLoveMetalEvent()' in APP,
    'transparent PNG reference exists': './assets/images/events/one-love.png?v=${VERSION}' in APP,
    'transparent PNG file exists': (ROOT / 'assets/images/events/one-love.png').is_file(),
    'no new ONE LOVE audio asset names': not any(x in APP + AUDIO for x in ['bgm-one-love', 'amb-one-love', 'sfx-one-love']),
}
failed = [name for name, ok in CHECKS.items() if not ok]
for name, ok in CHECKS.items():
    print(('PASS' if ok else 'FAIL') + ': ' + name)
if failed:
    print(f'ONE LOVE EVENT CHECK: FAIL ({len(failed)}/{len(CHECKS)})')
    sys.exit(1)
print(f'ONE LOVE EVENT CHECK: PASS ({len(CHECKS)}/{len(CHECKS)})')
