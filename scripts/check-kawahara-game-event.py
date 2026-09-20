#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
EVENT = (ROOT / 'js/events/kawahara-game-event.js').read_text(encoding='utf-8')
AUDIO = (ROOT / 'js/audio-scene-map.js').read_text(encoding='utf-8')

checks = {
    'event module import': "from './events/kawahara-game-event.js?v=" in APP,
    'g-Lab trigger wiring': 'kawaharaGameEventController.maybeStart()' in APP,
    'event resume wiring': 'kawaharaGameEventController.resume()' in APP,
    'renderer wiring': 'kawaharaGameEvent: kawaharaGameEventController.renderScreen' in APP,
    'tap action wiring': "case 'kawahara-game-event-next': kawaharaGameEventController.advance();" in APP,
    '300 day eligibility': 'KAWAHARA_GAME_EVENT_FIRST_ELIGIBLE_DAY = 300' in EVENT,
    '5 percent chance': 'KAWAHARA_GAME_EVENT_CHANCE = 0.05' in EVENT,
    'one-time guard': 'eventState.completed || eventState.totalTriggered > 0' in EVENT,
    'no opening sfx': "playSfx?.('select'" in EVENT and 'maybeStart()' in EVENT,
    'registered line 1': 'いらっしゃいませ、、、、、' in EVENT,
    'registered line 6': 'いつもありがとうございます、、、、' in EVENT,
    'g-Lab audio mapping': "kawaharaGameEvent: 'glab'" in AUDIO,
    'approved normal UI classes': 'visit-character-event kawahara-game-event' in EVENT and 'event-dialogue-card visit-event-dialogue glass-panel' in EVENT,
    'transparent PNG asset': "assets/images/events/kawahara-game-event.png" in EVENT,
}

failed = [name for name, ok in checks.items() if not ok]
if failed:
    print('KAWAHARA GAME EVENT CHECK: FAIL')
    for name in failed:
        print(f'- {name}')
    sys.exit(1)

# Opening must not play an event-specific SFX. The only playSfx call is inside advance().
maybe_start = EVENT.split('function maybeStart()', 1)[1].split('function advance()', 1)[0]
if 'playSfx' in maybe_start:
    print('KAWAHARA GAME EVENT CHECK: FAIL')
    print('- opening SFX must remain disabled')
    sys.exit(1)

print('KAWAHARA GAME EVENT CHECK: PASS')
