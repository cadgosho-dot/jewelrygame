import { purpleCapsuleBluesmanLines } from './purple-capsule-rules.js';

const ITEM_BUTTON = '[data-action="use-phone-item"][data-item-id="purpleCapsule"]';
const ROOT_ID = 'purple-capsule-event-overlay';
const BLUESMAN = './assets/images/events/blues-juke/bluesman-smile.png';
let active = false;
let stage = 'idle';
let playerName = 'あなた';
let timer = 0;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api = () => globalThis.__JXJ_EVENT_STATE_HELPERS__;
const audio = (scene) => { try { globalThis.__JXJ_AUDIO_SWITCH__?.(scene); } catch (_) {} };
const sfx = (name, options = {}) => { try { api()?.playEventSfx?.(name, options); } catch (_) {} };

function installStyle() {
  if (document.getElementById('purple-capsule-event-style')) return;
  const el = document.createElement('style');
  el.id = 'purple-capsule-event-style';
  el.textContent = `#${ROOT_ID}{position:fixed;inset:0;z-index:2147483000;background:#000;overflow:hidden;isolation:isolate}#${ROOT_ID} .purple-capsule-bg{position:absolute;inset:-2%;z-index:0;width:104%;height:104%;object-fit:cover;animation:purpleCapsuleSway 7s ease-in-out infinite alternate}#${ROOT_ID} .purple-capsule-haze{position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle,rgba(114,72,151,.06),rgba(0,0,0,.12));animation:purpleCapsuleHaze 5s ease-in-out infinite alternate}#${ROOT_ID}>main{position:relative;z-index:2}#${ROOT_ID} .visit-character-event{z-index:2}@keyframes purpleCapsuleSway{from{transform:translate3d(-.5%,-.35%,0) scale(1.02)}to{transform:translate3d(.5%,.4%,0) scale(1.035)}}@keyframes purpleCapsuleHaze{from{opacity:.45}to{opacity:.8}}@media(prefers-reduced-motion:reduce){#${ROOT_ID} .purple-capsule-bg,#${ROOT_ID} .purple-capsule-haze{animation:none}}`;
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
  return `<picture><source media="(orientation:portrait)" srcset="${portrait}"><img class="purple-capsule-bg" src="${wide}" alt="" draggable="false"></picture><div class="purple-capsule-haze" aria-hidden="true"></div>`;
}

function dialogue(line, speaker = '') {
  return `<button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-purple-capsule-next>${speaker ? `<small>${esc(speaker)}</small>` : ''}<strong>${esc(line)}</strong><span>タップして進む</span></button>`;
}

function normal(place, line, speaker = '', character = false) {
  return `${bg(place)}<main class="main-screen kappa-jade-event-screen"><section class="visit-character-event kappa-jade-event" aria-live="polite">${character ? `<div class="visit-character-area" aria-hidden="true"><img class="visit-character kappa-character" src="${BLUESMAN}" alt="" draggable="false"></div>` : ''}${dialogue(line, speaker)}</section></main>`;
}

function draw() {
  const el = root();
  const lines = purpleCapsuleBluesmanLines(playerName);
  if (stage === 'outside') el.innerHTML = normal('outside', 'あ、、、、あの店だ、、、また来れたのか、、、、');
  else if (stage === 'inside') el.innerHTML = normal('inside', 'やっぱり、、落ち着くなぁ、、、、');
  else if (stage === 'blues1') el.innerHTML = normal('inside', lines[0], 'ブルースマン', true);
  else if (stage === 'blues2') el.innerHTML = normal('inside', lines[1], 'ブルースマン', true);
  else if (stage === 'blues3') el.innerHTML = normal('inside', lines[2], 'ブルースマン', true);
  else if (stage === 'sleep') el.innerHTML = `<main class="main-screen kappa-jade-event-screen"><section class="visit-character-event kappa-jade-event" aria-live="polite">${dialogue('眠くなってきた、、、、、')}</section></main>`;
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
  if (stage === 'blues1') stage = 'blues2';
  else if (stage === 'blues2') stage = 'blues3';
  else if (stage === 'blues3') { blackout(() => { if (active) { stage = 'sleep'; draw(); } }); return; }
  else if (stage === 'sleep') { blackout(finish); return; }
  else return;
  draw();
}

function syncButton() {
  const snapshot = api()?.purpleCapsuleRuntimeSnapshot?.();
  const count = Math.max(0, Number(snapshot?.count) || 0);
  document.querySelectorAll(ITEM_BUTTON).forEach((button) => { button.disabled = count <= 0; });
}

function click(event) {
  const advance = event.target?.closest?.('[data-purple-capsule-next]');
  if (advance && document.getElementById(ROOT_ID)?.contains(advance)) {
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
  document.addEventListener('click', click, true);
  new MutationObserver(() => queueMicrotask(syncButton)).observe(document.documentElement, { childList:true, subtree:true });
  queueMicrotask(syncButton);
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') init();
