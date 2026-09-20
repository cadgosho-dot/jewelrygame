// g-Lab.で300日以降に1回だけ発生する「カワハラ・ゲーム制作」通常イベント。
// 通常イベントUIの共通クラスをそのまま使用し、既存イベント本体には触れない。

export const GLAB_KAWAHARA_GAME_EVENT_KEY = 'glabKawaharaGameEvent';
export const GLAB_KAWAHARA_GAME_EVENT_FIRST_DAY = 300;
export const GLAB_KAWAHARA_GAME_EVENT_CHANCE = 0.05;
export const GLAB_KAWAHARA_GAME_EVENT_CHARACTER = './assets/images/events/glab-kawahara.png';
export const GLAB_KAWAHARA_GAME_EVENT_BACKGROUND_LANDSCAPE = './assets/images/glab.webp';
export const GLAB_KAWAHARA_GAME_EVENT_BACKGROUND_PORTRAIT = './assets/images/glab-portrait.webp';
export const GLAB_KAWAHARA_GAME_EVENT_TAP_SFX = './assets/audio/sfx-select.ogg';

const OVERLAY_ID = 'jxj-glab-kawahara-game-event';
const STYLE_ID = 'jxj-glab-kawahara-game-event-style';
const VALID_STAGES = new Set(['line1', 'line2', 'line3', 'line4', 'line5']);
const STAGE_ORDER = Object.freeze(['line1', 'line2', 'line3', 'line4', 'line5']);

let overlay = null;
let running = false;
let tapAudio = null;
let pendingGlabEntry = false;

const helpers = () => globalThis.__JXJ_EVENT_STATE_HELPERS__ || null;

function snapshot() {
  try {
    const result = helpers()?.eventRuntimeSnapshot?.(GLAB_KAWAHARA_GAME_EVENT_KEY);
    if (result?.ok) return result;
  } catch (_) {}
  return null;
}

function patchEvent(patch) {
  try {
    return helpers()?.patchEventState?.(GLAB_KAWAHARA_GAME_EVENT_KEY, patch) || null;
  } catch (_) {
    return null;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

export function glabKawaharaGameEventLines(playerName = 'あなた') {
  const name = String(playerName || '').trim() || 'あなた';
  return Object.freeze({
    line1: 'いらっしゃいませ、、、、、',
    line2: `あ、、${name}さん、、こんにちは、、、、`,
    line3: `そうだ、、最近自分ゲーム作ってるんですよ、、、${name}さんにもやってほしいな、、、、、`,
    line4: 'ここ御徒町を舞台にして、この現実と同じように宝石買って、ジュエリー作って、売るとこまでやれるんです、、、、',
    line5: 'また進捗あったら共有しますね！',
  });
}

export function shouldTriggerGlabKawaharaGameEvent({ day, completed = false, active = false, random = Math.random } = {}) {
  if (active || completed) return false;
  if (Math.max(1, Math.floor(Number(day) || 1)) < GLAB_KAWAHARA_GAME_EVENT_FIRST_DAY) return false;
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) return false;
  return value < GLAB_KAWAHARA_GAME_EVENT_CHANCE;
}

function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{position:fixed;inset:0;z-index:2147483200;width:100%;height:100dvh;overflow:hidden;background:#000;isolation:isolate}
#${OVERLAY_ID} .jxj-kawahara-game-bg{position:absolute;inset:0;z-index:0;width:100%;height:100%;margin:0;pointer-events:none;overflow:hidden}
#${OVERLAY_ID} .jxj-kawahara-game-bg img{display:block;width:100%;height:100%;object-fit:cover;object-position:center center}
#${OVERLAY_ID} .main-screen{position:relative!important;z-index:1!important;width:100%!important;height:100dvh!important;min-height:100dvh!important;margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important}
#${OVERLAY_ID} .visit-character-event{min-height:100dvh!important;height:100dvh!important}
#${OVERLAY_ID} .jxj-kawahara-game-reveal{animation:jxjKawaharaGameReveal .72s ease-out both}
#${OVERLAY_ID} .jxj-kawahara-game-character{animation:jxjKawaharaGameCharacterReveal .72s ease-out both}
@keyframes jxjKawaharaGameReveal{0%{opacity:0;background:#000}22%{opacity:.18;background:#000}38%{opacity:.06}55%{opacity:.28}100%{opacity:1;background:transparent}}
@keyframes jxjKawaharaGameCharacterReveal{0%{opacity:0;transform:translate3d(-1px,0,0)}34%{opacity:.72;transform:translate3d(1px,-1px,0)}48%{opacity:.5;transform:translate3d(-1px,1px,0)}66%{opacity:.9;transform:translate3d(1px,0,0)}100%{opacity:1;transform:translate3d(0,0,0)}}
@media (prefers-reduced-motion:reduce){#${OVERLAY_ID} .jxj-kawahara-game-reveal,#${OVERLAY_ID} .jxj-kawahara-game-character{animation:none!important}}
`;
  document.head.appendChild(style);
}

function playTapSound() {
  try {
    if (!tapAudio) {
      tapAudio = new Audio(GLAB_KAWAHARA_GAME_EVENT_TAP_SFX);
      tapAudio.preload = 'auto';
      tapAudio.volume = 0.72;
    }
    tapAudio.currentTime = 0;
    tapAudio.play()?.catch?.(() => {});
  } catch (_) {}
}

function currentEventState() {
  const event = snapshot()?.event;
  return event && typeof event === 'object' ? event : {};
}

function renderStage(stage, animate = false) {
  if (!overlay) return;
  const snap = snapshot();
  const lines = glabKawaharaGameEventLines(snap?.playerName || 'あなた');
  const safeStage = VALID_STAGES.has(stage) ? stage : 'line1';
  overlay.innerHTML = `
    <picture class="jxj-kawahara-game-bg" aria-hidden="true">
      <source media="(orientation: portrait)" srcset="${GLAB_KAWAHARA_GAME_EVENT_BACKGROUND_PORTRAIT}">
      <img src="${GLAB_KAWAHARA_GAME_EVENT_BACKGROUND_LANDSCAPE}" alt="" draggable="false">
    </picture>
    <main class="main-screen${animate ? ' jxj-kawahara-game-reveal' : ''}" aria-label="カワハラ ゲーム制作イベント">
      <section class="visit-character-event" aria-live="polite">
        <div class="visit-character-area" aria-hidden="true">
          <img class="visit-character${animate ? ' jxj-kawahara-game-character' : ''}" src="${GLAB_KAWAHARA_GAME_EVENT_CHARACTER}" alt="" draggable="false">
        </div>
        <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-kawahara-game-next>
          <small>カワハラ</small>
          <strong>${escapeHtml(lines[safeStage] || '')}</strong>
          <span>タップして進む</span>
        </button>
      </section>
    </main>`;
}

function finishEvent() {
  patchEvent({ active: false, stage: 'completed', completed: true });
  running = false;
  overlay?.remove();
  overlay = null;
}

function advanceEvent() {
  const state = currentEventState();
  const current = VALID_STAGES.has(state.stage) ? state.stage : 'line1';
  const index = STAGE_ORDER.indexOf(current);
  playTapSound();
  if (index < 0 || index >= STAGE_ORDER.length - 1) {
    finishEvent();
    return;
  }
  const next = STAGE_ORDER[index + 1];
  patchEvent({ active: true, stage: next, completed: false });
  renderStage(next);
}

function onOverlayClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-kawahara-game-next]') : null;
  if (!button || !overlay?.contains(button)) return;
  event.preventDefault();
  event.stopPropagation();
  advanceEvent();
}

function startEvent(stage = 'line1', restore = false) {
  if (typeof document === 'undefined' || running || document.getElementById(OVERLAY_ID)) return false;
  ensureStyle();
  const snap = snapshot();
  if (!snap?.ok) return false;
  const safeStage = VALID_STAGES.has(stage) ? stage : 'line1';
  const day = Math.max(1, Math.floor(Number(snap.game?.day) || 1));
  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.addEventListener('click', onOverlayClick);
  document.body.appendChild(overlay);
  running = true;
  patchEvent({
    active: true,
    stage: safeStage,
    completed: false,
    startedDay: Math.max(0, Math.floor(Number(snap.event?.startedDay) || day)),
    lastTriggeredDay: Math.max(0, Math.floor(Number(snap.event?.lastTriggeredDay) || day)),
    triggerCount: Math.max(0, Math.floor(Number(snap.event?.triggerCount) || 0)) + (restore ? 0 : 1),
  });
  renderStage(safeStage, !restore && safeStage === 'line1');
  return true;
}

function tryStartAfterGlabEntry() {
  if (!pendingGlabEntry || running) return false;
  if (String(document.body?.dataset?.screen || '') !== 'glab') return false;
  pendingGlabEntry = false;
  const snap = snapshot();
  if (!snap?.ok) return false;
  const event = snap.event || {};
  if (!shouldTriggerGlabKawaharaGameEvent({
    day: snap.game?.day,
    completed: Boolean(event.completed || event.stage === 'completed'),
    active: Boolean(event.active),
  })) return false;
  return startEvent('line1', false);
}

function markGlabEntry(event) {
  if (running || !(event.target instanceof Element)) return;
  const button = event.target.closest('button,[role="button"],a');
  if (!(button instanceof Element)) return;
  const targetScreen = String(button.getAttribute('data-screen') || button.getAttribute('data-nav') || '').trim();
  const action = String(button.getAttribute('data-action') || '').trim();
  if (targetScreen !== 'glab' || (action && action !== 'nav')) return;
  pendingGlabEntry = true;
  setTimeout(tryStartAfterGlabEntry, 0);
  setTimeout(tryStartAfterGlabEntry, 80);
  setTimeout(tryStartAfterGlabEntry, 250);
  setTimeout(() => { pendingGlabEntry = false; }, 500);
}

function resumeActiveEvent() {
  if (typeof document === 'undefined' || running) return false;
  if (String(document.body?.dataset?.screen || '') !== 'glab') return false;
  const event = currentEventState();
  if (!event.active || !VALID_STAGES.has(event.stage)) return false;
  return startEvent(event.stage, true);
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', markGlabEntry, true);
  queueMicrotask(resumeActiveEvent);
  setTimeout(resumeActiveEvent, 500);
  setTimeout(resumeActiveEvent, 1500);
  setTimeout(resumeActiveEvent, 3000);
}

export const GLAB_KAWAHARA_GAME_EVENT_SPEC = Object.freeze({
  eventKey: GLAB_KAWAHARA_GAME_EVENT_KEY,
  firstEligibleDay: GLAB_KAWAHARA_GAME_EVENT_FIRST_DAY,
  triggerChance: GLAB_KAWAHARA_GAME_EVENT_CHANCE,
  onceOnly: true,
  stages: STAGE_ORDER,
});
