import { GENERAL_ITEMS } from '../game-data.js';
import { PURPLE_CAPSULE_RETEST_RECOVERY_KEY } from './bank-nezumi-rules.js';
import { purpleCapsuleBluesmanLines } from './purple-capsule-rules.js';

const ITEM_BUTTON = '[data-action="use-phone-item"][data-id="purpleCapsule"]';
const ROOT_ID = 'purple-capsule-event-overlay';
const BLUESMAN = './assets/images/events/blues-juke/bluesman-smile.png';
let active = false;
let stage = 'idle';
let playerName = 'あなた';
let timer = 0;
let recoveryChecked = false;

// 紫のカプセルだけを正式な使用可能アイテムとして有効化する。
// game-data-core.js 本体や他アイテム定義は変更しない。
if (GENERAL_ITEMS?.purpleCapsule) GENERAL_ITEMS.purpleCapsule.usable = true;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api = () => globalThis.__JXJ_EVENT_STATE_HELPERS__;
const audio = (scene) => { try { globalThis.__JXJ_AUDIO_SWITCH__?.(scene); } catch (_) {} };
const sfx = (name, options = {}) => { try { api()?.playEventSfx?.(name, options); } catch (_) {} };

function installStyle() {
  if (document.getElementById('purple-capsule-event-style')) return;
  const el = document.createElement('style');
  el.id = 'purple-capsule-event-style';
  el.textContent = `#${ROOT_ID}{position:fixed;inset:0;z-index:2147483000;background:#000;overflow:hidden;isolation:isolate}#${ROOT_ID} .purple-capsule-bg{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover}#${ROOT_ID} .purple-capsule-float-bg{animation:purpleCapsuleDriftBg 6.4s ease-in-out infinite;transform-origin:center center}#${ROOT_ID} .purple-capsule-character-motion{animation:purpleCapsuleDriftCharacter 3.8s ease-in-out infinite;transform-origin:50% 48%}#${ROOT_ID}>main{position:relative;z-index:2}#${ROOT_ID} .visit-character-event{z-index:2}#${ROOT_ID}.is-sleeping{animation:purpleCapsuleSleepFall 1.3s ease-in forwards}@keyframes purpleCapsuleDriftBg{0%,100%{transform:scale(1.055) translate3d(-1.8%,1.0%,0)}25%{transform:scale(1.060) translate3d(2.2%,-1.5%,0)}55%{transform:scale(1.058) translate3d(1.0%,2.0%,0)}78%{transform:scale(1.062) translate3d(-2.1%,-1.2%,0)}}@keyframes purpleCapsuleDriftCharacter{0%{transform:translate3d(-10px,8px,0) rotate(-8deg) scale(1.00)}18%{transform:translate3d(14px,-16px,0) rotate(32deg) scale(1.03)}36%{transform:translate3d(-18px,-4px,0) rotate(118deg) scale(.98)}54%{transform:translate3d(16px,14px,0) rotate(205deg) scale(1.04)}72%{transform:translate3d(-12px,-18px,0) rotate(292deg) scale(1.00)}88%{transform:translate3d(10px,6px,0) rotate(344deg) scale(1.02)}100%{transform:translate3d(-10px,8px,0) rotate(352deg) scale(1.00)}}@keyframes purpleCapsuleSleepFall{0%{transform:translateY(0)}20%{transform:translateY(-6px)}40%{transform:translateY(5px)}60%{transform:translateY(-3px)}80%{transform:translateY(8px)}100%{transform:translateY(34px);opacity:.2}}@media(prefers-reduced-motion:reduce){#${ROOT_ID} .purple-capsule-float-bg,#${ROOT_ID} .purple-capsule-character-motion{animation:none}#${ROOT_ID}.is-sleeping{animation:none;opacity:.2}}`;
  document.head.appendChild(el);
}

function root() {
  let el = document.getElementById(ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ROOT_ID;
    document.body.appendChild(el);
  }
  return el;
}

function bg(place) {
  const outside = place === 'outside';
  const wide = outside ? './assets/images/blues-juke-exterior.webp' : './assets/images/blues-juke-interior.webp';
  const portrait = outside ? './assets/images/blues-juke-exterior-portrait.webp' : './assets/images/blues-juke-interior-portrait.webp';
  return `<picture><source media="(orientation:portrait)" srcset="${portrait}"><img class="purple-capsule-bg purple-capsule-float-bg" src="${wide}" alt="" draggable="false"></picture>`;
}

function dialogue(line, speaker = '') {
  return `<button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-purple-capsule-next>${speaker ? `<small>${esc(speaker)}</small>` : ''}<strong>${esc(line)}</strong><span>タップして進む</span></button>`;
}

function normal(place, line, speaker = '', character = false) {
  return `${bg(place)}<main class="main-screen kappa-jade-event-screen"><section class="visit-character-event kappa-jade-event" aria-live="polite">${character ? `<div class="visit-character-area" aria-hidden="true"><img class="visit-character kappa-character purple-capsule-character-motion" src="${BLUESMAN}" alt="" draggable="false"></div>` : ''}${dialogue(line, speaker)}</section></main>`;
}

function blackDialogue(line, speaker = '') {
  return `<main class="main-screen kappa-jade-event-screen" style="background:transparent"><section class="visit-character-event kappa-jade-event" aria-live="polite">${dialogue(line, speaker)}</section></main>`;
}

function draw() {
  const el = root();
  el.classList.remove('is-sleeping');
  const lines = purpleCapsuleBluesmanLines(playerName);
  if (stage === 'outside') el.innerHTML = normal('outside', '「あ、、、、あの店だ、、、また来れたのか、、、、」', '', false);
  else if (stage === 'inside') el.innerHTML = normal('inside', '「やっぱり、、落ち着くなぁ、、、、」', '', false);
  else if (stage === 'blues1') el.innerHTML = normal('inside', lines[0], 'ブルースマン', true);
  else if (stage === 'blues2') el.innerHTML = normal('inside', lines[1], 'ブルースマン', true);
  else if (stage === 'blues3') el.innerHTML = normal('inside', lines[2], 'ブルースマン', true);
  else if (stage === 'sleep') el.innerHTML = blackDialogue('「眠くなってきた、、、、、」', '');
  else el.innerHTML = '';
}

function blackout(next) {
  stage = 'black';
  draw();
  clearTimeout(timer);
  timer = window.setTimeout(next, 2000);
}

function start(result) {
  active = true;
  playerName = String(result?.playerName || 'あなた').trim() || 'あなた';
  installStyle();
  root();
  audio('main');
  blackout(() => {
    if (!active) return;
    stage = 'outside';
    audio('bluesJukeOutside');
    draw();
  });
}

function finish() {
  if (!active) return;
  active = false;
  clearTimeout(timer);
  try { api()?.finishPurpleCapsuleUse?.(); } catch (_) {}
  audio('main');
  document.getElementById(ROOT_ID)?.remove();
  syncButton();
}

function next() {
  if (!active) return;
  sfx('select', { gain:.78 });
  if (stage === 'outside') { stage = 'inside'; audio('bluesJukeInside'); draw(); return; }
  if (stage === 'inside') { stage = 'blues1'; sfx('blues-juke-cheer', { gain:.62 }); draw(); return; }
  if (stage === 'blues1') { stage = 'blues2'; draw(); return; }
  if (stage === 'blues2') { stage = 'blues3'; draw(); return; }
  if (stage === 'blues3') {
    blackout(() => {
      if (!active) return;
      stage = 'sleep';
      draw();
    });
    return;
  }
  if (stage === 'sleep') { blackout(finish); return; }
}

function restoreRetestCapsuleOnce() {
  if (recoveryChecked) return;
  const helper = api();
  if (!helper?.purchasePurpleCapsule || !helper?.patchEventState) return;
  recoveryChecked = true;
  const result = helper.purchasePurpleCapsule({ retestRestore:true });
  if (!result?.handled) return;
  helper.patchEventState(PURPLE_CAPSULE_RETEST_RECOVERY_KEY, {
    handled:true,
    restored:Boolean(result.restored),
  });
}

function syncButton() {
  restoreRetestCapsuleOnce();
  const snapshot = api()?.purpleCapsuleRuntimeSnapshot?.();
  const count = Math.max(0, Number(snapshot?.count) || 0);
  document.querySelectorAll(ITEM_BUTTON).forEach((button) => { button.disabled = count <= 0; });
}

function click(event) {
  const overlay = document.getElementById(ROOT_ID);
  if (active && overlay?.contains(event.target) && (stage === 'outside' || stage === 'inside')) {
    event.preventDefault(); event.stopImmediatePropagation(); next(); return;
  }
  const advance = event.target?.closest?.('[data-purple-capsule-next]');
  if (advance && overlay?.contains(advance)) {
    event.preventDefault(); event.stopImmediatePropagation(); next(); return;
  }
  const button = event.target?.closest?.(ITEM_BUTTON);
  if (!button) return;
  event.preventDefault(); event.stopImmediatePropagation();
  if (active) return;
  const result = api()?.beginPurpleCapsuleUse?.();
  syncButton();
  if (result?.ok) start(result);
}

function init() {
  window.addEventListener('click', click, true);
  new MutationObserver(() => queueMicrotask(syncButton)).observe(document.documentElement, { childList:true, subtree:true });
  queueMicrotask(syncButton);
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') init();
