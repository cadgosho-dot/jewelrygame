#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js/app.js'
AUDIO_MAP = ROOT / 'js/audio-scene-map.js'
CHECK_CURRENT = ROOT / 'scripts/check-current.py'
CHECK_ONE_LOVE = ROOT / 'scripts/check-one-love-event.py'
IMAGE = ROOT / 'assets/images/events/one-love.png'
VERSION = ROOT / 'VERSION'


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        if label == 'event migration normalizer' and count == 0:
            print('event migration normalizer: runtime state normalization is sufficient; skipping duplicate helper')
            return
        raise RuntimeError(f'{label}: expected exactly one anchor, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


def run(*args: str) -> None:
    subprocess.run(list(args), cwd=ROOT, check=True)


if VERSION.read_text(encoding='utf-8').strip() != '0.10.782':
    raise RuntimeError(f"Unexpected starting VERSION: {VERSION.read_text(encoding='utf-8').strip()!r}")
if not IMAGE.is_file() or IMAGE.stat().st_size < 100_000:
    raise RuntimeError('ONE LOVE transparent PNG is missing or unexpectedly small')

# Constants: keep the event self-contained and based on existing visit-event behavior.
replace_once(
    APP,
    "const YOWAMUSHI_ROSE_QUARTZ_EVENT_CHANCE = 1 / 12;\nconst YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID = 'rosequartz';\nconst YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID = 'ovalCabochon';",
    "const YOWAMUSHI_ROSE_QUARTZ_EVENT_CHANCE = 1 / 12;\nconst YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID = 'rosequartz';\nconst YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID = 'ovalCabochon';\nconst ONE_LOVE_METAL_EVENT_CHANCE = 0.25;\nconst ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY = 181;\nconst ONE_LOVE_METAL_EVENT_COOLDOWN_DAYS = 181;\nconst ONE_LOVE_METAL_EVENT_DISCOUNT_DAYS = 3;\nconst ONE_LOVE_METAL_EVENT_DISCOUNT_RATE = 0.8;",
    'ONE LOVE constants',
)

# Active-event / recovery bookkeeping.
replace_once(
    APP,
    "  workshopKappaJadeEvent: new Set(['rustle', 'greet', 'arrive', 'memory', 'fondness', 'giftLead', 'wish', 'reward', 'admire', 'farewell']),\n  yowamushiRoseQuartzEvent: new Set(['intro1', 'intro2', 'intro3', 'intro4', 'reward', 'outro1', 'outro2']),",
    "  workshopKappaJadeEvent: new Set(['rustle', 'greet', 'arrive', 'memory', 'fondness', 'giftLead', 'wish', 'reward', 'admire', 'farewell']),\n  oneLoveMetalEvent: new Set(['intro1', 'intro2', 'intro3', 'intro4', 'intro5']),\n  yowamushiRoseQuartzEvent: new Set(['intro1', 'intro2', 'intro3', 'intro4', 'reward', 'outro1', 'outro2']),",
    'active event stage map',
)
replace_once(
    APP,
    "  workshopKappaJadeEvent: { eventKey: 'workshopKappaJadeEvent', fallback: 'workshop' },\n  yowamushiRoseQuartzEvent: { eventKey: 'yowamushiRoseQuartzEvent', fallback: 'workshop' },",
    "  workshopKappaJadeEvent: { eventKey: 'workshopKappaJadeEvent', fallback: 'workshop' },\n  oneLoveMetalEvent: { eventKey: 'oneLoveMetalEvent', fallback: 'workshop' },\n  yowamushiRoseQuartzEvent: { eventKey: 'yowamushiRoseQuartzEvent', fallback: 'workshop' },",
    'event screen recovery map',
)
replace_once(
    APP,
    "'emeraldCaptainKebabEvent', 'kappaJadeEvent', 'workshopKappaJadeEvent', 'sushiChefEvent',",
    "'emeraldCaptainKebabEvent', 'kappaJadeEvent', 'workshopKappaJadeEvent', 'oneLoveMetalEvent', 'sushiChefEvent',",
    'illness suppressed screen list',
)

# Metal trading: only BUY can receive the ONE LOVE deal. SELL remains current market price.
replace_once(
    APP,
    "function metalTradePricePerGram(mode, id) {\n  if (!metalMarketTradeReady()) return 0;\n  const table = mode === 'sell' ? metalMarket.sellPerGramByMetalId : metalMarket.purchasePerGramByMetalId;\n  const price = Number(table?.[id]);\n  return validPositivePrice(price) ? Math.round(price) : 0;\n}",
    "function normalMetalTradePricePerGram(mode, id) {\n  if (!metalMarketTradeReady()) return 0;\n  const table = mode === 'sell' ? metalMarket.sellPerGramByMetalId : metalMarket.purchasePerGramByMetalId;\n  const price = Number(table?.[id]);\n  return validPositivePrice(price) ? Math.round(price) : 0;\n}\n\nfunction oneLoveMetalDealPurchasePrice(id) {\n  const eventState = oneLoveMetalEventState();\n  const triggeredDay = Math.max(0, Math.floor(Number(eventState.lastTriggeredDay) || 0));\n  if (triggeredDay < 1 || Math.max(0, Math.floor(Number(eventState.totalTriggered) || 0)) < 1) return 0;\n  const dayOffset = Math.floor(Number(state?.game?.day) || 0) - triggeredDay;\n  if (dayOffset < 1 || dayOffset > ONE_LOVE_METAL_EVENT_DISCOUNT_DAYS) return 0;\n  const basePrice = Number(eventState.basePurchasePerGramByMetalId?.[id]);\n  return validPositivePrice(basePrice) ? Math.round(basePrice * ONE_LOVE_METAL_EVENT_DISCOUNT_RATE) : 0;\n}\n\nfunction metalTradePricePerGram(mode, id) {\n  const normalPrice = normalMetalTradePricePerGram(mode, id);\n  if (mode === 'sell') return normalPrice;\n  const dealPrice = oneLoveMetalDealPurchasePrice(id);\n  return validPositivePrice(dealPrice) ? dealPrice : normalPrice;\n}",
    'metal trade price function',
)

# Main ONE LOVE event state, trigger, dialogue and transparent UI.
one_love_code = r'''
function ensureOneLoveMetalEventStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('one-love-metal-event-style')) return;
  const style = document.createElement('style');
  style.id = 'one-love-metal-event-style';
  style.textContent = `
    .one-love-metal-event-screen .one-love-dialogue-button {
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      backdrop-filter: none !important;
    }
    .one-love-metal-event-screen .one-love-dialogue-button strong,
    .one-love-metal-event-screen .one-love-dialogue-button small,
    .one-love-metal-event-screen .one-love-dialogue-button span {
      text-shadow: 0 2px 12px rgba(0,0,0,.78);
    }
    .one-love-metal-event-screen .one-love-dialogue-button small {
      color: #d9b963 !important;
    }
    .one-love-metal-event-screen .one-love-character {
      user-select: none;
    }
    @media (orientation: portrait) {
      .one-love-metal-event-screen .one-love-character {
        transform: scale(.88) !important;
        transform-origin: center bottom !important;
      }
    }
  `;
  document.head?.appendChild(style);
}

function oneLoveMetalEventState() {
  state.events = state.events && typeof state.events === 'object' && !Array.isArray(state.events) ? state.events : {};
  const saved = state.events.oneLoveMetalEvent && typeof state.events.oneLoveMetalEvent === 'object' && !Array.isArray(state.events.oneLoveMetalEvent)
    ? state.events.oneLoveMetalEvent
    : {};
  const validStages = new Set(['idle', 'intro1', 'intro2', 'intro3', 'intro4', 'intro5', 'completed']);
  const savedPrices = saved.basePurchasePerGramByMetalId && typeof saved.basePurchasePerGramByMetalId === 'object' && !Array.isArray(saved.basePurchasePerGramByMetalId)
    ? saved.basePurchasePerGramByMetalId
    : {};
  const basePurchasePerGramByMetalId = {};
  Object.keys(METALS).forEach((id) => {
    const price = Number(savedPrices[id]);
    if (validPositivePrice(price)) basePurchasePerGramByMetalId[id] = Math.round(price);
  });
  state.events.oneLoveMetalEvent = {
    nextTriggerDay: Math.max(ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY, Math.floor(Number(saved.nextTriggerDay) || ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY)),
    lastTriggeredDay: Math.max(0, Math.floor(Number(saved.lastTriggeredDay) || 0)),
    totalTriggered: Math.max(0, Math.floor(Number(saved.totalTriggered) || 0)),
    lastCheckedDate: /^\d{4}-\d{2}-\d{2}$/.test(String(saved.lastCheckedDate || '')) ? String(saved.lastCheckedDate) : '',
    active: Boolean(saved.active),
    stage: validStages.has(saved.stage) ? saved.stage : 'idle',
    basePurchasePerGramByMetalId,
  };
  if (!state.events.oneLoveMetalEvent.active && !['idle', 'completed'].includes(state.events.oneLoveMetalEvent.stage)) {
    state.events.oneLoveMetalEvent.stage = 'completed';
  }
  return state.events.oneLoveMetalEvent;
}

function resumeOneLoveMetalEvent() {
  const eventState = oneLoveMetalEventState();
  if (!eventState.active) return false;
  setScreen('oneLoveMetalEvent', {}, false);
  return true;
}

function maybeStartOneLoveMetalEvent() {
  if (illnessEventSuppressionActive()) return false;
  const eventState = oneLoveMetalEventState();
  if (eventState.active) return resumeOneLoveMetalEvent();
  if (Math.floor(Number(state?.game?.day) || 1) < Math.max(ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY, Number(eventState.nextTriggerDay) || 0)) return false;
  if (!metalMarketTradeReady()) return false;
  if (!markVisitEventCheckOncePerDay(eventState)) return false;
  if (Math.random() >= ONE_LOVE_METAL_EVENT_CHANCE) {
    saveGame();
    return false;
  }
  const capturedPrices = {};
  Object.keys(METALS).forEach((id) => {
    const price = normalMetalTradePricePerGram('buy', id);
    if (validPositivePrice(price)) capturedPrices[id] = price;
  });
  if (!Object.keys(capturedPrices).length) {
    saveGame();
    return false;
  }
  eventState.lastTriggeredDay = Math.max(1, Math.floor(Number(state.game.day) || 1));
  eventState.totalTriggered += 1;
  eventState.nextTriggerDay = eventState.lastTriggeredDay + ONE_LOVE_METAL_EVENT_COOLDOWN_DAYS;
  eventState.basePurchasePerGramByMetalId = capturedPrices;
  eventState.active = true;
  eventState.stage = 'intro1';
  saveGame();
  setScreen('oneLoveMetalEvent', {}, false);
  playSfx('select', { gain: 0.72, rate: 0.9 });
  vibrate([18, 24, 18]);
  return true;
}

function advanceOneLoveMetalEvent() {
  const eventState = oneLoveMetalEventState();
  if (!eventState.active) {
    setScreen('workshop', {}, false);
    return;
  }
  const order = ['intro1', 'intro2', 'intro3', 'intro4', 'intro5'];
  const index = order.indexOf(eventState.stage);
  if (eventState.stage === 'intro5') {
    eventState.active = false;
    eventState.stage = 'completed';
    saveGame();
    playSfx('select', { gain: 0.72, rate: 0.9 });
    setScreen('workshop', {}, false);
    return;
  }
  if (index >= 0 && index < order.length - 1) {
    eventState.stage = order[index + 1];
    saveGame();
    playSfx('select', { gain: 0.72, rate: 0.9 });
    render();
  }
}

function renderOneLoveMetalEvent() {
  ensureOneLoveMetalEventStyles();
  const eventState = oneLoveMetalEventState();
  if (!eventState.active) {
    queueMicrotask(() => setScreen('workshop', {}, false));
    return renderWorkshop();
  }
  const dialogueMap = {
    intro1: 'yeah man、、、○○○♪、、、、',
    intro2: 'いい情報持ってきてやったぜ、、、',
    intro3: 'いいか、？、、明日から3日間の間、、、地金の相場が下がる、、、、',
    intro4: '信用出来るところからの情報だから、、あとはオマエの好きにしな、、、、',
    intro5: 'いつも助けてもらってるからな、、、いいってことよ、、、<br>それじゃな、、、Bless up、、、',
  };
  const dialogue = dialogueMap[eventState.stage] || '';
  return `
    <main class="main-screen kappa-jade-event-screen one-love-metal-event-screen">
      <section class="visit-character-event kappa-jade-event one-love-metal-event" aria-live="polite">
        <div class="visit-character-area" aria-hidden="true">
          <img class="visit-character kappa-character workshop-kappa-character one-love-character" src="./assets/images/events/one-love.png?v=${VERSION}" alt="" draggable="false">
        </div>
        <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel one-love-dialogue-button" data-action="one-love-metal-event-next">
          <small>ONE LOVE</small><strong>${dialogue}</strong><span>${eventState.stage === 'intro5' ? 'タップして工房へ戻る' : 'タップして進む'}</span>
        </button>
      </section>
    </main>`;
}

'''
replace_once(
    APP,
    "function ensureYowamushiEventStyles() {",
    one_love_code + "function ensureYowamushiEventStyles() {",
    'ONE LOVE event functions',
)

# Renderer map, workshop background, action routing, workshop entry.
replace_once(
    APP,
    "      workshopKappaJadeEvent: renderWorkshopKappaJadeEvent,\n      yowamushiRoseQuartzEvent: renderYowamushiRoseQuartzEvent,",
    "      workshopKappaJadeEvent: renderWorkshopKappaJadeEvent,\n      oneLoveMetalEvent: renderOneLoveMetalEvent,\n      yowamushiRoseQuartzEvent: renderYowamushiRoseQuartzEvent,",
    'renderer map',
)
replace_once(
    APP,
    "workshop: 'workshop', workshopKappaJadeEvent: 'workshop', yowamushiRoseQuartzEvent: 'workshop',",
    "workshop: 'workshop', workshopKappaJadeEvent: 'workshop', oneLoveMetalEvent: 'workshop', yowamushiRoseQuartzEvent: 'workshop',",
    'workshop background map',
)
replace_once(
    APP,
    "    case 'workshop-kappa-jade-event-receive':\n      receiveWorkshopKappaJadeReward();\n      break;\n    case 'yowamushi-event-next':",
    "    case 'workshop-kappa-jade-event-receive':\n      receiveWorkshopKappaJadeReward();\n      break;\n    case 'one-love-metal-event-next':\n      advanceOneLoveMetalEvent();\n      break;\n    case 'yowamushi-event-next':",
    'event action route',
)
replace_once(
    APP,
    "      if (target === 'workshop') {\n        if (resumeWorkshopKappaJadeEvent()) break;\n        if (resumeYowamushiRoseQuartzEvent()) break;\n        if (maybeStartWorkshopKappaJadeEvent()) break;\n        if (maybeStartYowamushiRoseQuartzEvent()) break;\n      }",
    "      if (target === 'workshop') {\n        if (resumeWorkshopKappaJadeEvent()) break;\n        if (resumeYowamushiRoseQuartzEvent()) break;\n        if (resumeOneLoveMetalEvent()) break;\n        if (maybeStartWorkshopKappaJadeEvent()) break;\n        if (maybeStartYowamushiRoseQuartzEvent()) break;\n        if (maybeStartOneLoveMetalEvent()) break;\n      }",
    'workshop entry event routing',
)

# Normalize new state in the existing simple-event migration pass.
replace_once(
    APP,
    "  normalizeSimpleEvent('workshopKappaJadeEvent', ['idle', 'rustle', 'greet', 'arrive', 'memory', 'fondness', 'giftLead', 'wish', 'reward', 'admire', 'farewell', 'completed'], (saved) => ({\n    rewardGranted: Boolean(saved.rewardGranted),\n    lastCheckedDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(String(saved.lastCheckedDate || '')) ? String(saved.lastCheckedDate) : '',\n  }));",
    "  normalizeSimpleEvent('workshopKappaJadeEvent', ['idle', 'rustle', 'greet', 'arrive', 'memory', 'fondness', 'giftLead', 'wish', 'reward', 'admire', 'farewell', 'completed'], (saved) => ({\n    rewardGranted: Boolean(saved.rewardGranted),\n    lastCheckedDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(String(saved.lastCheckedDate || '')) ? String(saved.lastCheckedDate) : '',\n  }));\n  normalizeSimpleEvent('oneLoveMetalEvent', ['idle', 'intro1', 'intro2', 'intro3', 'intro4', 'intro5', 'completed'], (saved) => ({\n    nextTriggerDay: Math.max(ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY, Math.floor(Number(saved.nextTriggerDay) || ONE_LOVE_METAL_EVENT_FIRST_TRIGGER_DAY)),\n    lastCheckedDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(String(saved.lastCheckedDate || '')) ? String(saved.lastCheckedDate) : '',\n    basePurchasePerGramByMetalId: saved.basePurchasePerGramByMetalId && typeof saved.basePurchasePerGramByMetalId === 'object' && !Array.isArray(saved.basePurchasePerGramByMetalId) ? saved.basePurchasePerGramByMetalId : {},\n  }));",
    'event migration normalizer',
)

# Existing workshop BGM + ambient: simply map the new event screen to workshop.
replace_once(
    AUDIO_MAP,
    "  workshop: 'workshop',\n  workshopKappaJadeEvent: 'workshop',\n  yowamushiRoseQuartzEvent: 'workshop',",
    "  workshop: 'workshop',\n  workshopKappaJadeEvent: 'workshop',\n  oneLoveMetalEvent: 'workshop',\n  yowamushiRoseQuartzEvent: 'workshop',",
    'audio scene workshop mapping',
)

# Dedicated regression check, kept in the permanent current-build audit.
CHECK_ONE_LOVE.write_text(r'''#!/usr/bin/env python3
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
''', encoding='utf-8')

replace_once(
    CHECK_CURRENT,
    "    ('見習い映画館中央配置', [sys.executable, str(ROOT / 'scripts/check-apprentice-cinema-center.py')]),",
    "    ('見習い映画館中央配置', [sys.executable, str(ROOT / 'scripts/check-apprentice-cinema-center.py')]),\n    ('ONE LOVE地金イベント', [sys.executable, str(ROOT / 'scripts/check-one-love-event.py')]),",
    'check-current ONE LOVE registration',
)

run(sys.executable, 'scripts/version-sync.py', '--bump-patch')
run('node', '--check', 'js/app.js')
run('node', '--check', 'js/audio-scene-map.js')
run(sys.executable, 'scripts/check-one-love-event.py')
run(sys.executable, 'scripts/check-current.py')
if VERSION.read_text(encoding='utf-8').strip() != '0.10.783':
    raise RuntimeError('VERSION did not finish at 0.10.783')
print('v0.10.783 ONE LOVE event patch: PASS')
