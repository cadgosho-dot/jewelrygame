import { suspendAudio, resumeAudio, playSfx, vibrate } from './audio.js?v=0.10.940';

const OVERLAY_ID = 'jxj-wolf-mother-butler-overlay';
const STYLE_ID = 'jxj-wolf-mother-butler-style';
const ACTIVE_KEY = 'jxj-wolf-mother-butler-active-v1';
const WOLF_BOY_MEMORY_KEY = 'wolfBoyRingEvent';
const WOLF_MEMORY_KEY = 'wolfMotherVisitEvent';
const BUTLER_MEMORY_KEY = 'sheepButlerVisitEvent';
const WOLF_IMAGE = './assets/images/events/wolf-mother.png';
const BUTLER_IMAGE = './assets/images/events/sheep-butler.png';
const K18_IMAGE = './assets/images/metals/k18yg.png';
const VIDEO_URL = './assets/videos/events/wolf-mother-butler-event.mp4';
const BGM_URL = './assets/audio/events/teeth_behind_the_glass.ogg';
const STORE_BG_LANDSCAPE = './assets/images/store.webp';
const STORE_BG_PORTRAIT = './assets/images/store-portrait.webp';
const DAYS_AFTER_WOLF_BOY = 7;
const TRIGGER_CHANCE = 0.30;
const REWARD_METAL_KEY = 'gold';
const REWARD_AMOUNT = 20;

const STEPS = Object.freeze([
  { stage:'dialogue1', speaker:'執事', image:BUTLER_IMAGE, text:'失礼いたします、、こちらで先日、坊ちゃまが指輪を作っていただいたと聞きまして、、、狼のマスクをした羊の子供です、、、' },
  { stage:'dialogue2', speaker:'狼', image:WOLF_IMAGE, text:'おまえが、あの指輪を作った職人か？、、、' },
  { stage:'dialogue3', speaker:'執事', image:BUTLER_IMAGE, text:'坊ちゃまが、大変お世話になったようでございます、、、' },
  { stage:'dialogue4', speaker:'執事', image:BUTLER_IMAGE, text:'奥様は、たいそう喜んでおられました、、、、ありがとうございました、、、' },
  { stage:'dialogue5', speaker:'狼', image:WOLF_IMAGE, text:'黙れ、、、' },
  { stage:'dialogue6', speaker:'狼', image:WOLF_IMAGE, text:'今日はどの程度の店か見に来ただけだ、、、、\nあと、、、まだ支払いも済ませていないようだな、、、あの恥知らずが、、、、' },
  { stage:'dialogue7', speaker:'執事', image:BUTLER_IMAGE, text:'こちらをお収めください、、、、' },
  { stage:'reward', type:'reward' },
  { stage:'dialogue8', speaker:'狼', image:WOLF_IMAGE, text:'今後私の身につけるものは全てこの店に任せる、、、また来る、、、、' },
  { stage:'dialogue9', speaker:'執事', image:BUTLER_IMAGE, text:'それでは、失礼致します、、、' },
]);
const VALID_STAGES = new Set(['movie', ...STEPS.map((step) => step.stage)]);

let running = false;
let stage = 'movie';
let rewardGranted = false;
let overlay = null;
let videoEl = null;
let eventBgm = null;
let previousBodyScreen = '';
let observerScreen = String(document.body?.dataset?.screen || '');
let storeCheckSerial = 0;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[char]));
}

function safeLocalStorage() {
  try { return window.localStorage; } catch (_) { return null; }
}

function readResumeState() {
  try {
    const saved = JSON.parse(safeLocalStorage()?.getItem(ACTIVE_KEY) || 'null');
    if (!saved?.active || !VALID_STAGES.has(saved.stage)) return null;
    return { stage:saved.stage, rewardGranted:Boolean(saved.rewardGranted) };
  } catch (_) {
    return null;
  }
}

function writeResumeState() {
  try {
    safeLocalStorage()?.setItem(ACTIVE_KEY, JSON.stringify({
      active:true,
      stage,
      rewardGranted,
      updatedAt:Date.now(),
    }));
  } catch (_) {}
}

function clearResumeState() {
  try { safeLocalStorage()?.removeItem(ACTIVE_KEY); } catch (_) {}
}

function snapshot() {
  try { return globalThis.__JXJ_MEMORIES_STATE__?.() || null; } catch (_) { return null; }
}

// The public memories snapshot is intentionally cloned. For this one event reward,
// borrow the references used to build that clone for one synchronous call only,
// then restore structuredClone immediately. No shared UI or ordinary inventory path is changed.
function liveEventStateParts() {
  const snapshotFn = globalThis.__JXJ_MEMORIES_STATE__;
  const originalClone = globalThis.structuredClone;
  if (typeof snapshotFn !== 'function' || typeof originalClone !== 'function') return null;
  let captured = null;
  try {
    globalThis.structuredClone = (value, options) => {
      captured = value;
      return originalClone(value, options);
    };
    snapshotFn();
  } catch (_) {
    captured = null;
  } finally {
    globalThis.structuredClone = originalClone;
  }
  return captured && typeof captured === 'object' ? captured : null;
}

function memoryEntry(stateSnapshot, key) {
  const characters = Array.isArray(stateSnapshot?.memories?.characters) ? stateSnapshot.memories.characters : [];
  return characters.find((entry) => {
    const entryKey = String(entry?.key || '');
    return entryKey === key || entryKey.startsWith(`${key}::`);
  }) || null;
}

function memoryAlreadySeen(stateSnapshot, key) {
  return Boolean(memoryEntry(stateSnapshot, key));
}

function wolfBoyFirstSeenDay(stateSnapshot) {
  const entry = memoryEntry(stateSnapshot, WOLF_BOY_MEMORY_KEY);
  const day = Math.floor(Number(entry?.firstSeenDay) || 0);
  return day > 0 ? day : 0;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:14000;overflow:hidden;background:#090603;color:#eef3f4;isolation:isolate;touch-action:manipulation}
#${OVERLAY_ID} *{box-sizing:border-box}
#${OVERLAY_ID} .wolf-mother-store-bg{position:absolute;inset:0;z-index:0;background:#090603 url("${STORE_BG_LANDSCAPE}") center/contain no-repeat}
#${OVERLAY_ID} .wolf-mother-store-shade{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.04) 45%,rgba(0,0,0,.38));pointer-events:none}
#${OVERLAY_ID} .wolf-mother-event-content{position:absolute;inset:0;z-index:2;overflow:hidden}
body[data-screen="workshopKappaJadeEvent"] #${OVERLAY_ID} .visit-event-dialogue.speaker-wolf>small{color:#ff6c63!important}
body[data-screen="workshopKappaJadeEvent"] #${OVERLAY_ID} .visit-event-dialogue.speaker-butler>small{color:#eadcc8!important}
body[data-screen="workshopKappaJadeEvent"] #${OVERLAY_ID} .kappa-jade-reward-button img.wolf-mother-k18-image{object-fit:contain!important}
#${OVERLAY_ID} .wolf-mother-movie{position:absolute;inset:0;z-index:3;background:#000}
#${OVERLAY_ID} .wolf-mother-movie video{display:block;width:100%;height:100%;object-fit:contain;background:#000}
#${OVERLAY_ID} .event-movie-skip{z-index:6}
@media (orientation:portrait){#${OVERLAY_ID} .wolf-mother-store-bg{background-image:url("${STORE_BG_PORTRAIT}")}}
`;
  document.head.appendChild(style);
}

function eventEndButton() {
  return '<button type="button" class="event-safety-recovery" data-wmb-action="end" aria-label="イベントを終了して店舗へ戻る" title="イベントを終了">イベント終了</button>';
}

function backgroundMarkup(content) {
  return `<div class="wolf-mother-store-bg" aria-hidden="true"></div><div class="wolf-mother-store-shade" aria-hidden="true"></div><div class="wolf-mother-event-content">${content}</div>`;
}

function dialogueMarkup(step) {
  const speakerClass = step.speaker === '狼' ? 'speaker-wolf' : 'speaker-butler';
  const text = esc(step.text).replace(/\n/g, '<br>');
  return backgroundMarkup(`<main class="main-screen kappa-jade-event-screen">
    <section class="visit-character-event kappa-jade-event" aria-live="polite">
      <div class="visit-character-area" aria-hidden="true"><img class="visit-character kappa-character workshop-kappa-character" src="${step.image}" alt="" draggable="false"></div>
      <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel ${speakerClass}" data-wmb-action="next"><small>${step.speaker}</small><strong>${text}</strong><span>タップして進む</span></button>
    </section>
  </main>${eventEndButton()}`);
}

function rewardMarkup() {
  return backgroundMarkup(`<main class="main-screen kappa-jade-event-screen">
    <section class="visit-character-event kappa-jade-event is-reward" aria-live="polite">
      <button type="button" class="kappa-jade-reward-button" data-wmb-action="receiveReward" aria-label="K18 20gを受け取る">
        <span class="special-item-glow kappa-jade-glow" aria-hidden="true"></span>
        <img class="wolf-mother-k18-image" src="${K18_IMAGE}" alt="K18地金" draggable="false">
        <strong>K18　20g</strong><small>タップして受け取る</small>
      </button>
    </section>
  </main>${eventEndButton()}`);
}

function movieMarkup() {
  return `<main class="gray-hood-aquarium-video-screen wolf-mother-movie"><section class="gray-hood-aquarium-video-stage">
    <button type="button" class="event-movie-skip" data-wmb-action="skipMovie">MOVIEスキップ</button>
    <video data-wmb-video autoplay playsinline preload="auto" src="${VIDEO_URL}"></video>
    ${eventEndButton()}
  </section></main>`;
}

function ensureEventBgm() {
  if (eventBgm) return eventBgm;
  eventBgm = new Audio(BGM_URL);
  eventBgm.preload = 'auto';
  eventBgm.loop = true;
  eventBgm.volume = 0.72;
  return eventBgm;
}

function startEventBgm() {
  try {
    const audio = ensureEventBgm();
    audio.pause();
    audio.currentTime = 0;
    const promise = audio.play();
    promise?.catch?.(() => {});
  } catch (_) {}
}

function stopEventBgm() {
  try {
    eventBgm?.pause();
    if (eventBgm) eventBgm.currentTime = 0;
  } catch (_) {}
}

function setBodyEventScreen() {
  if (!document.body) return;
  if (!previousBodyScreen) previousBodyScreen = String(document.body.dataset.screen || 'store');
  document.body.dataset.screen = 'workshopKappaJadeEvent';
}

function restoreBodyStoreScreen() {
  if (!document.body) return;
  document.body.dataset.screen = previousBodyScreen || 'store';
  previousBodyScreen = '';
}

function render() {
  if (!overlay) return;
  setBodyEventScreen();
  if (stage === 'movie') {
    overlay.innerHTML = movieMarkup();
    videoEl = overlay.querySelector('[data-wmb-video]');
    videoEl?.addEventListener('ended', finishMovie, { once:true });
    const play = videoEl?.play?.();
    play?.catch?.(() => {});
    return;
  }
  const step = STEPS.find((row) => row.stage === stage);
  if (!step) return;
  overlay.innerHTML = step.type === 'reward' ? rewardMarkup() : dialogueMarkup(step);
}

function persist(nextStage) {
  stage = VALID_STAGES.has(nextStage) ? nextStage : 'movie';
  writeResumeState();
}

async function finishMovie() {
  if (!running || stage !== 'movie') return;
  try { videoEl?.pause(); } catch (_) {}
  videoEl = null;
  playSfx('western-union-arrival', { gain:.82 });
  persist('dialogue1');
  render();
}

function nextAfter(currentStage) {
  const index = STEPS.findIndex((row) => row.stage === currentStage);
  return index >= 0 && index + 1 < STEPS.length ? STEPS[index + 1].stage : '';
}

function cleanup({ completed = false } = {}) {
  if (!running) return;
  running = false;
  try { videoEl?.pause(); } catch (_) {}
  videoEl = null;
  stopEventBgm();
  if (completed) clearResumeState();
  overlay?.remove();
  overlay = null;
  restoreBodyStoreScreen();
  resumeAudio().catch(() => {});
}

function completeEvent() {
  clearResumeState();
  playSfx('success', { gain:.72 });
  cleanup({ completed:true });
}

function advanceDialogue() {
  if (!running) return;
  const next = nextAfter(stage);
  if (!next) {
    completeEvent();
    return;
  }
  playSfx('select', { gain:.66 });
  persist(next);
  render();
}

function grantK18IgnoringCapacity() {
  if (rewardGranted || memoryAlreadySeen(snapshot(), BUTLER_MEMORY_KEY)) {
    rewardGranted = true;
    writeResumeState();
    return true;
  }
  const live = liveEventStateParts();
  if (!live?.inventory) return false;
  live.inventory.metals = live.inventory.metals && typeof live.inventory.metals === 'object' && !Array.isArray(live.inventory.metals)
    ? live.inventory.metals
    : {};
  const current = Math.max(0, Number(live.inventory.metals[REWARD_METAL_KEY]) || 0);
  live.inventory.metals[REWARD_METAL_KEY] = Math.round((current + REWARD_AMOUNT) * 10) / 10;
  const recorded = globalThis.__JXJ_MEMORIES_RECORD__?.({
    key:BUTLER_MEMORY_KEY,
    name:'執事',
    image:BUTLER_IMAGE,
    description:'狼の家に仕える羊の執事。',
  });
  if (!recorded) {
    live.inventory.metals[REWARD_METAL_KEY] = current;
    return false;
  }
  rewardGranted = true;
  writeResumeState();
  return true;
}

function receiveReward() {
  if (!running || stage !== 'reward') return;
  if (!grantK18IgnoringCapacity()) {
    console.warn('[WolfMotherButlerEvent] K18 reward update failed');
    return;
  }
  playSfx('coin', { gain:.96 });
  vibrate([22,30,58]);
  persist(nextAfter(stage));
  render();
}

function handleClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-wmb-action]') : null;
  if (!button || !overlay?.contains(button)) return;
  const action = button.dataset.wmbAction;
  if (action === 'end') {
    clearResumeState();
    cleanup({ completed:true });
    return;
  }
  if (action === 'skipMovie' && stage === 'movie') {
    finishMovie();
    return;
  }
  if (action === 'receiveReward') {
    receiveReward();
    return;
  }
  if (action === 'next') advanceDialogue();
}

function recordWolf() {
  globalThis.__JXJ_MEMORIES_RECORD__?.({
    key:WOLF_MEMORY_KEY,
    name:'狼',
    image:WOLF_IMAGE,
    description:'狼少年の母親。',
  });
}

function startEvent(startStage = 'movie', restoredReward = false) {
  if (running || document.getElementById(OVERLAY_ID)) return false;
  installStyle();
  running = true;
  stage = VALID_STAGES.has(startStage) ? startStage : 'movie';
  rewardGranted = Boolean(restoredReward || memoryAlreadySeen(snapshot(), BUTLER_MEMORY_KEY));
  previousBodyScreen = String(document.body?.dataset?.screen || 'store');
  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-label','狼と執事イベント');
  overlay.addEventListener('click', handleClick);
  document.body.appendChild(overlay);
  recordWolf();
  writeResumeState();
  suspendAudio();
  startEventBgm();
  render();
  return true;
}

function eligibleForFirstStart(stateSnapshot) {
  if (memoryAlreadySeen(stateSnapshot, WOLF_MEMORY_KEY)) return false;
  const firstSeenDay = wolfBoyFirstSeenDay(stateSnapshot);
  if (!firstSeenDay) return false;
  const currentDay = Math.max(1, Math.floor(Number(stateSnapshot?.game?.day) || 1));
  return currentDay >= firstSeenDay + DAYS_AFTER_WOLF_BOY;
}

async function onStoreEntered() {
  if (running || document.getElementById(OVERLAY_ID)) return;
  const resume = readResumeState();
  if (resume) {
    startEvent(resume.stage, resume.rewardGranted);
    return;
  }
  const stateSnapshot = snapshot();
  const serial = ++storeCheckSerial;
  if (!eligibleForFirstStart(stateSnapshot)) return;
  await Promise.resolve();
  if (serial !== storeCheckSerial || String(document.body?.dataset?.screen || '') !== 'store') return;
  if (Math.random() >= TRIGGER_CHANCE) return;
  startEvent('movie', false);
}

function handleScreenChange() {
  const nextScreen = String(document.body?.dataset?.screen || '');
  const enteredStore = nextScreen === 'store' && observerScreen !== 'store';
  observerScreen = nextScreen;
  if (enteredStore) queueMicrotask(onStoreEntered);
}

const observer = new MutationObserver(handleScreenChange);
observer.observe(document.body, { attributes:true, attributeFilter:['data-screen'] });
if (observerScreen === 'store') queueMicrotask(onStoreEntered);

export const WOLF_MOTHER_BUTLER_EVENT_SPEC = Object.freeze({
  daysAfterWolfBoy:DAYS_AFTER_WOLF_BOY,
  triggerChance:TRIGGER_CHANCE,
  rewardMetalKey:REWARD_METAL_KEY,
  rewardAmount:REWARD_AMOUNT,
});
