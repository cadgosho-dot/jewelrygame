import { suspendAudio, resumeAudio, playSfx, vibrate } from './audio.js?v=0.10.940';

const OVERLAY_ID = 'jxj-wolf-boy-ring-overlay';
const STYLE_ID = 'jxj-wolf-boy-ring-style';
const ACTIVE_KEY = 'jxj-wolf-boy-ring-event-active-v1';
const MEMORY_KEY = 'wolfBoyRingEvent';
const CHARACTER_IMAGE = './assets/images/events/wolf-boy.png';
const RING_IMAGE = './assets/images/events/wolf-boy-ring.png';
const VIDEO_URL = './assets/videos/wolf-boy-ring-event.mp4';
const RUBY_OVAL = './assets/images/loose/ruby/oval.png';
const CRAFT_AMBIENT_URL = './assets/audio/amb-craft.ogg';
const STORE_BG_LANDSCAPE = './assets/images/store.webp';
const STORE_BG_PORTRAIT = './assets/images/store-portrait.webp';
const MIN_DAY = 366;
const TRIGGER_CHANCE = 0.30;
const BLACKOUT_MS = 5000;

const DIALOGUES = Object.freeze({
  intro1: 'こんにちは、、ここ、指輪を作ってくれる店なんですか？、、',
  intro2: 'この石で作って欲しくて、、、',
  intro3: 'お母さまにあげるんです、、、、作ってくれますか？、、、、',
  ring1: '凄い！！きれい、、ありがとう御座います！、、、、、',
  ring2: 'これなら、お母さまも喜んでくれるかな、、、',
  ring3: 'また来ます、お礼をさせてもらいます、、ありがとうございました、、、',
});

const VALID_STAGES = new Set(['movie', 'intro1', 'intro2', 'ruby', 'intro3', 'blackout', 'ring1', 'ring2', 'ring3']);

let running = false;
let stage = 'movie';
let overlay = null;
let videoEl = null;
let blackoutTimer = null;
let craftAmbient = null;
let previousScreen = String(document.body?.dataset?.screen || '');

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function safeLocalStorage() {
  try { return window.localStorage; } catch (_) { return null; }
}

function readResumeStage() {
  const storage = safeLocalStorage();
  if (!storage) return '';
  try {
    const saved = JSON.parse(storage.getItem(ACTIVE_KEY) || 'null');
    if (!saved?.active || !VALID_STAGES.has(saved.stage)) return '';
    return saved.stage === 'blackout' ? 'intro3' : saved.stage;
  } catch (_) {
    return '';
  }
}

function writeResumeStage(nextStage) {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(ACTIVE_KEY, JSON.stringify({ active: true, stage: nextStage, updatedAt: Date.now() }));
  } catch (_) {}
}

function clearResumeStage() {
  try { safeLocalStorage()?.removeItem(ACTIVE_KEY); } catch (_) {}
}

function memoryAlreadySeen(snapshot) {
  const characters = Array.isArray(snapshot?.memories?.characters) ? snapshot.memories.characters : [];
  return characters.some((entry) => {
    const key = String(entry?.key || '');
    return key === MEMORY_KEY || key.startsWith(`${MEMORY_KEY}::`);
  });
}

function parseSaveRecord(record) {
  try {
    const raw = typeof record === 'string' ? record : record?.raw;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : record?.state;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

async function readMatchingFullSave(snapshot) {
  if (!globalThis.indexedDB || !snapshot?.game || !snapshot?.inventory) return null;
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('jewelrygame-device-save-v1', 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('saves')) database.createObjectStore('saves');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
      request.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
    const tx = db.transaction('saves', 'readonly');
    const records = await requestResult(tx.objectStore('saves').getAll());
    const candidates = (Array.isArray(records) ? records : [])
      .map(parseSaveRecord)
      .filter(Boolean)
      .filter((saved) => (
        Number(saved?.game?.day) === Number(snapshot.game.day)
        && Number(saved?.game?.minutes) === Number(snapshot.game.minutes)
        && Number(saved?.game?.money) === Number(snapshot.game.money)
        && Number(saved?.inventory?.jewelry?.length || 0) === Number(snapshot.inventory?.jewelry?.length || 0)
      ))
      .sort((a, b) => Math.max(0, Number(b.saveRevision) || 0) - Math.max(0, Number(a.saveRevision) || 0));
    return candidates[0] || null;
  } catch (_) {
    return null;
  } finally {
    try { db?.close(); } catch (_) {}
  }
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{
  --wolf-safe-bottom:max(8px,env(safe-area-inset-bottom));
  position:fixed;inset:0;z-index:14000;overflow:hidden;background:#090603;color:#eef3f4;
  font-family:var(--ui-font,-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic","Meiryo","Noto Sans JP",sans-serif);
  isolation:isolate;touch-action:manipulation;
}
#${OVERLAY_ID} *{box-sizing:border-box}
#${OVERLAY_ID} button{font:inherit}
#${OVERLAY_ID} .wolf-bg{
  position:absolute;inset:0;z-index:0;background-color:#090603;
  background-image:url("${STORE_BG_LANDSCAPE}");background-size:contain;background-position:center;background-repeat:no-repeat;
}
#${OVERLAY_ID} .wolf-shade{
  position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.04) 45%,rgba(0,0,0,.38));pointer-events:none;
}
#${OVERLAY_ID} .normal-event-screen{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;overflow:hidden}
#${OVERLAY_ID} .normal-event-stage{
  position:relative;display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:100dvh;height:100dvh;isolation:isolate;overflow:hidden;
}
#${OVERLAY_ID} .normal-event-stage::before{
  content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 50% 39%,transparent 10%,rgba(0,0,0,.16) 58%,rgba(0,0,0,.58));
}
#${OVERLAY_ID} .visit-character-area{
  position:absolute;left:50%;top:0;bottom:clamp(132px,23vh,202px);z-index:5;width:100%;min-width:0;padding:8px 12px 0;
  transform:translateX(-50%);display:flex;align-items:center;justify-content:center;overflow:visible;pointer-events:none;
}
#${OVERLAY_ID} .visit-character{
  display:block;width:auto;height:auto;max-width:min(92vw,720px);max-height:min(70dvh,980px);margin:0 auto;object-fit:contain;object-position:center center;
  filter:drop-shadow(0 24px 38px rgba(0,0,0,.88));user-select:none;
}
#${OVERLAY_ID} .event-dialogue-card{
  appearance:none;-webkit-appearance:none;position:relative!important;z-index:18!important;grid-row:2!important;align-self:end!important;display:grid;gap:9px;
  width:calc(100% - 16px);margin:0 auto max(8px,var(--wolf-safe-bottom));padding:14px 15px;border:1.25px solid rgba(232,191,104,.45);border-radius:16px;
  background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;color:#eef3f4;text-align:left;cursor:pointer;
}
#${OVERLAY_ID} .event-dialogue-card>small{
  display:block;color:#d59a91;font-size:.78rem;font-weight:900;letter-spacing:.08em;text-shadow:0 2px 10px rgba(0,0,0,.82);
}
#${OVERLAY_ID} .event-dialogue-card>strong{
  font-size:.96rem;line-height:1.58;letter-spacing:.018em;text-shadow:0 2px 10px rgba(0,0,0,.82);
}
#${OVERLAY_ID} .event-dialogue-card>.tap-guide{
  justify-self:end;color:#bdc9cd;font-size:.72rem;transform-origin:right center;-webkit-text-size-adjust:none;text-size-adjust:none;line-height:1.1;font-weight:800;
  max-width:100%;white-space:nowrap;text-shadow:0 2px 10px rgba(0,0,0,.82);animation:wolfBoyTapBob 1.35s ease-in-out infinite;
}
#${OVERLAY_ID} .tap-guide-text{
  display:inline-block!important;font-size:1em!important;line-height:1!important;transform:scale(.58)!important;transform-origin:right center!important;
  -webkit-text-size-adjust:none!important;text-size-adjust:none!important;white-space:nowrap!important;
}
@keyframes wolfBoyTapBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
#${OVERLAY_ID} .event-safety-recovery{
  position:fixed!important;z-index:14050!important;top:calc(env(safe-area-inset-top,0px) + 1px)!important;left:calc(env(safe-area-inset-left,0px) + 1px)!important;
  right:auto!important;bottom:auto!important;min-width:0!important;min-height:21px!important;margin:0!important;padding:3px 6px!important;border:0!important;
  border-right:1.25px solid rgba(255,255,255,.2)!important;border-bottom:1.25px solid rgba(255,255,255,.2)!important;border-radius:0 0 7px 0!important;
  background:rgba(12,10,14,.38)!important;color:rgba(255,255,255,.72)!important;font-size:9px!important;font-weight:700!important;line-height:1.05!important;
  box-shadow:none!important;opacity:.56!important;cursor:pointer;
}
#${OVERLAY_ID} .normal-item-frame{
  appearance:none;-webkit-appearance:none;position:absolute;z-index:10;left:50%;top:48%;transform:translate(-50%,-50%);width:min(86vw,620px);min-height:220px;
  border:1.25px solid rgba(123,220,175,.72);border-radius:20px;padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
  color:#effff7;background:transparent!important;box-shadow:none!important;cursor:pointer;
}
#${OVERLAY_ID} .normal-item-frame img{
  width:min(72vw,430px);max-height:31dvh;object-fit:contain;filter:drop-shadow(0 0 18px rgba(255,170,170,.38));animation:wolfBoyItemFloat 2.1s ease-in-out infinite;
}
#${OVERLAY_ID} .normal-item-label{
  display:block;margin-top:2px;color:#effff7;font-size:clamp(.9rem,3.6vw,1.18rem);font-weight:900;line-height:1.2;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.9);
}
@keyframes wolfBoyItemFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
#${OVERLAY_ID} .normal-item-stage .visit-character{opacity:.34!important;filter:brightness(.52) drop-shadow(0 24px 38px rgba(0,0,0,.9))}
#${OVERLAY_ID} .normal-yes{
  position:absolute;z-index:20;left:50%;top:48%;transform:translate(-50%,-50%);border:0;background:transparent;color:#fff;
  font-size:clamp(2.5rem,13vw,6rem);font-weight:900;text-shadow:0 3px 20px rgba(0,0,0,.95);padding:22px 38px;cursor:pointer;
  animation:wolfBoyYesPulse 1.5s ease-in-out infinite;
}
@keyframes wolfBoyYesPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.035)}}
#${OVERLAY_ID} .blackout{
  position:absolute;inset:0;z-index:20000;background:#000;opacity:0;pointer-events:none;transition:opacity .18s linear;
}
#${OVERLAY_ID} .blackout.active{opacity:1}
#${OVERLAY_ID} .movie-screen{position:absolute;inset:0;z-index:15000;background:#000;display:grid;place-items:center}
#${OVERLAY_ID} .movie-screen video{display:block;width:100%;height:100%;object-fit:contain;object-position:center center;background:#000}
#${OVERLAY_ID} .movie-skip{
  position:absolute;z-index:15020;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top));border:1px solid rgba(255,255,255,.35);
  border-radius:8px;padding:6px 9px;background:rgba(0,0,0,.48);color:rgba(255,255,255,.86);font-size:11px;font-weight:800;cursor:pointer;
}
#${OVERLAY_ID} .movie-start{
  position:absolute;z-index:15015;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;
  border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.58);color:#fff;font-size:30px;display:none;place-items:center;cursor:pointer;
}
#${OVERLAY_ID} .movie-start.show{display:grid}
@media (orientation:portrait){
  #${OVERLAY_ID} .wolf-bg{background-image:url("${STORE_BG_PORTRAIT}")}
}
@media (orientation:landscape){
  #${OVERLAY_ID} .movie-screen video{
    width:auto!important;height:100dvh!important;max-width:none!important;max-height:100dvh!important;object-fit:contain!important;object-position:center center!important;
  }
  #${OVERLAY_ID} .visit-character{max-height:96dvh;max-width:54vw}
  #${OVERLAY_ID} .event-dialogue-card{margin-bottom:6px;padding:10px 14px;gap:6px;width:calc(100% - 12px)}
  #${OVERLAY_ID} .event-dialogue-card>strong{font-size:.84rem;line-height:1.45}
  #${OVERLAY_ID} .event-dialogue-card>.tap-guide{
    position:relative!important;left:-4px!important;top:-5px!important;transform-origin:right center!important;-webkit-text-size-adjust:none!important;text-size-adjust:none!important;
  }
  #${OVERLAY_ID} .normal-item-frame{width:min(52vw,620px);min-height:170px}
  #${OVERLAY_ID} .normal-item-frame img{width:min(40vw,430px);max-height:34dvh}
}
`;
  document.head.appendChild(style);
}

function dialogueCard(text, hideTap = false) {
  return `<button type="button" class="event-dialogue-card visit-event-dialogue" data-wolf-action="next">
    <small>狼少年</small>
    <strong>${esc(text)}</strong>
    <span class="tap-guide"${hideTap ? ' style="display:none!important"' : ''}><span class="tap-guide-text">タップして進む</span></span>
  </button>`;
}

function eventEndButton() {
  return '<button type="button" class="event-safety-recovery" data-wolf-action="end">イベント終了</button>';
}

function baseStage(extraClass = '', centerContent = '', dialogue = '') {
  return `<div class="wolf-bg" aria-hidden="true"></div>
    <div class="wolf-shade" aria-hidden="true"></div>
    <main class="normal-event-screen">
      <section class="normal-event-stage visit-character-event ${extraClass}" aria-live="polite">
        <div class="visit-character-area" aria-hidden="true">
          <img class="visit-character" src="${CHARACTER_IMAGE}" alt="" draggable="false">
        </div>
        ${centerContent}
        ${dialogue}
      </section>
    </main>
    ${eventEndButton()}
    <div class="blackout${stage === 'blackout' ? ' active' : ''}" aria-hidden="true"></div>`;
}

function persistStage(nextStage) {
  stage = nextStage;
  writeResumeStage(nextStage);
}

function ensureCraftAmbient() {
  if (craftAmbient) return craftAmbient;
  craftAmbient = new Audio(CRAFT_AMBIENT_URL);
  craftAmbient.preload = 'auto';
  craftAmbient.loop = true;
  return craftAmbient;
}

function startCraftAmbient() {
  try {
    const audio = ensureCraftAmbient();
    audio.pause();
    audio.currentTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (_) {}
}

function stopCraftAmbient() {
  try {
    craftAmbient?.pause();
    if (craftAmbient) craftAmbient.currentTime = 0;
  } catch (_) {}
}

function renderMovie() {
  if (!overlay) return;
  overlay.innerHTML = `<section class="movie-screen">
    <video data-wolf-boy-video playsinline preload="auto" src="${VIDEO_URL}"></video>
    <button type="button" class="movie-skip" data-wolf-action="skipMovie">MOVIEスキップ</button>
    <button type="button" class="movie-start" data-wolf-action="startMovie" aria-label="動画再生">▶</button>
    ${eventEndButton()}
  </section>`;
  videoEl = overlay.querySelector('video[data-wolf-boy-video]');
  const startButton = overlay.querySelector('.movie-start');
  videoEl?.addEventListener('ended', finishMovie, { once: true });
  if (videoEl) {
    videoEl.defaultMuted = false;
    videoEl.muted = false;
    videoEl.volume = 1;
    const promise = videoEl.play();
    promise?.catch?.(() => startButton?.classList.add('show'));
  }
}

function render() {
  if (!overlay) return;
  if (stage === 'movie') return renderMovie();

  if (stage === 'intro1' || stage === 'intro2') {
    overlay.innerHTML = baseStage('', '', dialogueCard(DIALOGUES[stage]));
    return;
  }

  if (stage === 'ruby') {
    overlay.innerHTML = baseStage('normal-item-stage',
      `<button type="button" class="normal-item-frame" data-wolf-action="rubyNext" aria-label="ルビーのオーバルを確認して進む">
        <img src="${RUBY_OVAL}" alt="ルビー オーバル" draggable="false">
        <strong class="normal-item-label">お預かりする</strong>
      </button>`, '');
    playSfx('loose-sparkle', { gain: .72 });
    return;
  }

  if (stage === 'intro3') {
    overlay.innerHTML = baseStage('',
      '<button type="button" class="normal-yes" data-wolf-action="yes">はい</button>',
      dialogueCard(DIALOGUES.intro3, true));
    return;
  }

  if (stage === 'blackout') {
    overlay.innerHTML = baseStage('', '', dialogueCard(DIALOGUES.intro3, true));
    return;
  }

  if (stage === 'ring1') {
    overlay.innerHTML = baseStage('normal-item-stage',
      `<div class="normal-item-frame" aria-hidden="true">
        <img src="${RING_IMAGE}" alt="" draggable="false">
      </div>`,
      dialogueCard(DIALOGUES.ring1));
    return;
  }

  if (stage === 'ring2' || stage === 'ring3') {
    overlay.innerHTML = baseStage('', '', dialogueCard(DIALOGUES[stage]));
  }
}

async function finishMovie() {
  if (!running || stage !== 'movie') return;
  try { videoEl?.pause(); } catch (_) {}
  videoEl = null;
  await resumeAudio().catch(() => {});
  persistStage('intro1');
  render();
}

function startBlackoutToRing() {
  if (!running || stage !== 'intro3') return;
  persistStage('blackout');
  suspendAudio();
  startCraftAmbient();
  render();
  blackoutTimer = window.setTimeout(() => {
    blackoutTimer = null;
    stopCraftAmbient();
    resumeAudio().catch(() => {});
    persistStage('ring1');
    render();
    playSfx('jewelry-complete', { gain: .84 });
    vibrate([34, 24, 56]);
  }, BLACKOUT_MS);
}

function cleanup({ completed = true } = {}) {
  if (!running) return;
  running = false;
  if (blackoutTimer) {
    clearTimeout(blackoutTimer);
    blackoutTimer = null;
  }
  try { videoEl?.pause(); } catch (_) {}
  videoEl = null;
  stopCraftAmbient();
  overlay?.remove();
  overlay = null;
  if (completed) clearResumeStage();
  resumeAudio().catch(() => {});
}

function advanceDialogue() {
  if (stage === 'intro1') persistStage('intro2');
  else if (stage === 'intro2') persistStage('ruby');
  else if (stage === 'intro3' || stage === 'blackout') return;
  else if (stage === 'ring1') persistStage('ring2');
  else if (stage === 'ring2') persistStage('ring3');
  else if (stage === 'ring3') {
    cleanup({ completed: true });
    return;
  } else return;
  render();
}

function handleClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-wolf-action]') : null;
  if (!button || !overlay?.contains(button)) return;
  const action = button.dataset.wolfAction;

  if (action === 'end') {
    cleanup({ completed: true });
    return;
  }
  if (action === 'skipMovie' && stage === 'movie') {
    finishMovie();
    return;
  }
  if (action === 'startMovie' && stage === 'movie') {
    if (!videoEl) return;
    videoEl.play()
      .then(() => button.classList.remove('show'))
      .catch(() => {});
    return;
  }
  if (action === 'rubyNext' && stage === 'ruby') {
    persistStage('intro3');
    render();
    return;
  }
  if (action === 'yes' && stage === 'intro3') {
    playSfx('select', { gain: .72 });
    startBlackoutToRing();
    return;
  }
  if (action === 'next') advanceDialogue();
}

function startEvent(startStage = 'movie', { recordEncounter = true } = {}) {
  if (running || document.getElementById(OVERLAY_ID)) return false;
  installStyle();
  running = true;
  stage = VALID_STAGES.has(startStage) ? startStage : 'movie';
  if (stage === 'blackout') stage = 'intro3';
  writeResumeStage(stage);
  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', '狼少年・指輪イベント');
  overlay.addEventListener('click', handleClick);
  document.body.appendChild(overlay);

  if (recordEncounter) {
    globalThis.__JXJ_MEMORIES_RECORD__?.({
      key: MEMORY_KEY,
      name: '狼少年',
      image: CHARACTER_IMAGE,
    });
  }

  suspendAudio();
  render();
  if (stage !== 'movie') resumeAudio().catch(() => {});
  return true;
}

async function eligibleForFirstStart() {
  const snapshot = globalThis.__JXJ_MEMORIES_STATE__?.();
  if (!snapshot?.game || Number(snapshot.game.day) < MIN_DAY) return false;
  if (memoryAlreadySeen(snapshot)) return false;

  const fullState = await readMatchingFullSave(snapshot);
  if (!fullState) return false;

  const hasStore = Boolean(fullState?.store?.rented)
    || (Array.isArray(fullState?.store?.branches) && fullState.store.branches.length > 0);
  if (!hasStore) return false;

  const benchUsable = fullState?.tools?.items?.jewelryBench?.status === 'available';
  if (!benchUsable) return false;

  return true;
}

let storeCheckSerial = 0;
async function onStoreEntered() {
  if (running || document.getElementById(OVERLAY_ID)) return;
  const resumeStage = readResumeStage();
  if (resumeStage) {
    startEvent(resumeStage, { recordEncounter: false });
    return;
  }

  const serial = ++storeCheckSerial;
  const eligible = await eligibleForFirstStart();
  if (serial !== storeCheckSerial || String(document.body?.dataset?.screen || '') !== 'store') return;
  if (!eligible || Math.random() >= TRIGGER_CHANCE) return;
  startEvent('movie', { recordEncounter: true });
}

function handleScreenChange() {
  const nextScreen = String(document.body?.dataset?.screen || '');
  const enteredStore = nextScreen === 'store' && previousScreen !== 'store';
  previousScreen = nextScreen;
  if (enteredStore) queueMicrotask(onStoreEntered);
}

const observer = new MutationObserver(handleScreenChange);
observer.observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });

if (previousScreen === 'store') queueMicrotask(onStoreEntered);

export const WOLF_BOY_RING_EVENT_SPEC = Object.freeze({
  minDay: MIN_DAY,
  triggerChance: TRIGGER_CHANCE,
  blackoutMs: BLACKOUT_MS,
  memoryKey: MEMORY_KEY,
});
