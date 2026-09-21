import { playSfx } from '../audio.js?v=0.10.959';

const OVERLAY_ID = 'jxj-glab-kawahara-game-event-overlay';
const STYLE_ID = 'jxj-glab-kawahara-game-event-style';
const EVENT_KEY = 'glabKawaharaGameEvent';
const CHARACTER_IMAGE = './assets/images/events/glab-kawahara.png';
const GLAB_BG_LANDSCAPE = './assets/images/glab.webp';
const GLAB_BG_PORTRAIT = './assets/images/glab-portrait.webp';
const MIN_DAY = 300;
const TRIGGER_CHANCE = 0.05;

const DIALOGUES = Object.freeze([
  'いらっしゃいませ、、、、、',
  'あ、、○○○さん、、こんにちは、、、、',
  'そうだ、、最近自分ゲーム作ってるんですよ、、、○○○さんにもやってほしいな、、、、、',
  'ここ御徒町を舞台にして、この現実と同じように宝石買って、ジュエリー作って、売るとこまでやれるんです、、、、',
  'また進捗あったら共有しますね！',
]);

let running = false;
let dialogueIndex = 0;
let overlay = null;
let observedScreen = String(document.body?.dataset?.screen || '');
let entryCheckSerial = 0;

function helpers() {
  return globalThis.__JXJ_EVENT_STATE_HELPERS__ || null;
}

function snapshot() {
  return globalThis.__JXJ_MEMORIES_STATE__?.() || null;
}

function patchEvent(patch) {
  try { return helpers()?.patchEventState?.(EVENT_KEY, patch) || null; } catch (_) { return null; }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[char]));
}

function playerName() {
  const name = String(snapshot()?.playerName || '').trim();
  return name || '○○○';
}

function dialogueText(index) {
  return String(DIALOGUES[index] || '').replaceAll('○○○', playerName());
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{
  position:fixed;inset:0;z-index:14000;overflow:hidden;background:#090603;color:#eef3f4;
  isolation:isolate;touch-action:manipulation;
}
#${OVERLAY_ID} *{box-sizing:border-box}
#${OVERLAY_ID} .glab-kawahara-bg{
  position:absolute;inset:0;z-index:0;
  background:#090603 url("${GLAB_BG_LANDSCAPE}") center/contain no-repeat;
}
#${OVERLAY_ID} .glab-kawahara-shade{
  position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.04) 45%,rgba(0,0,0,.38));
}
#${OVERLAY_ID} .main-screen{position:relative;z-index:2;height:100%}
#${OVERLAY_ID} .visit-character-event{min-height:100dvh!important;height:100dvh!important}
#${OVERLAY_ID} .glab-kawahara-character{
  max-width:min(92vw,720px);
  filter:drop-shadow(0 24px 38px rgba(0,0,0,.88));
}
#${OVERLAY_ID} .event-dialogue-card>small{color:#f0b46b}
@media (orientation:portrait){
  #${OVERLAY_ID} .glab-kawahara-bg{background-image:url("${GLAB_BG_PORTRAIT}")}
}
@media (orientation:landscape){
  #${OVERLAY_ID} .glab-kawahara-character{max-height:96dvh;max-width:54vw}
}
`;
  document.head.appendChild(style);
}

function render() {
  if (!overlay) return;
  overlay.innerHTML = `
    <div class="glab-kawahara-bg" aria-hidden="true"></div>
    <div class="glab-kawahara-shade" aria-hidden="true"></div>
    <main class="main-screen kappa-jade-event-screen">
      <section class="visit-character-event kappa-jade-event" aria-live="polite">
        <div class="visit-character-area" aria-hidden="true">
          <img class="visit-character kappa-character glab-kawahara-character" src="${CHARACTER_IMAGE}" alt="" draggable="false">
        </div>
        <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-glab-kawahara-action="next">
          <small>カワハラ</small>
          <strong>${esc(dialogueText(dialogueIndex))}</strong>
          <span>タップして進む</span>
        </button>
      </section>
    </main>
    <button type="button" class="event-safety-recovery" data-glab-kawahara-action="end">イベント終了</button>
  `;
}

function completeEvent() {
  patchEvent({
    active:false,
    completed:true,
    stage:'completed',
    completedDay:Math.max(1, Math.floor(Number(snapshot()?.game?.day) || 1)),
  });
  running = false;
  overlay?.remove();
  overlay = null;
}

function advance() {
  if (!running) return;
  playSfx('select', { gain:.72 });
  if (dialogueIndex >= DIALOGUES.length - 1) {
    completeEvent();
    return;
  }
  dialogueIndex += 1;
  patchEvent({ active:true, completed:false, stage:'dialogue', dialogueIndex });
  render();
}

function onClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-glab-kawahara-action]') : null;
  if (!button || !overlay?.contains(button)) return;
  if (button.dataset.glabKawaharaAction === 'end') {
    completeEvent();
    return;
  }
  if (button.dataset.glabKawaharaAction === 'next') advance();
}

function startEvent(startIndex = 0) {
  if (running || document.getElementById(OVERLAY_ID)) return false;
  installStyle();
  running = true;
  dialogueIndex = Math.max(0, Math.min(DIALOGUES.length - 1, Math.floor(Number(startIndex) || 0)));
  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-label','g-Lab. カワハラ ゲーム制作イベント');
  overlay.addEventListener('click', onClick);
  document.body.appendChild(overlay);
  patchEvent({
    active:true,
    completed:false,
    stage:'dialogue',
    dialogueIndex,
    startedDay:Math.max(1, Math.floor(Number(snapshot()?.game?.day) || 1)),
  });
  render();
  return true;
}

function eligible(stateSnapshot) {
  const eventState = stateSnapshot?.events?.[EVENT_KEY] || {};
  if (eventState.completed) return false;
  const currentDay = Math.max(1, Math.floor(Number(stateSnapshot?.game?.day) || 1));
  return currentDay >= MIN_DAY;
}

async function onGlabEntered() {
  if (running || document.getElementById(OVERLAY_ID)) return;
  if (document.documentElement?.hasAttribute('data-jxj-exclusive-event')) return;
  const stateSnapshot = snapshot();
  const eventState = stateSnapshot?.events?.[EVENT_KEY] || {};

  if (eventState.active && !eventState.completed) {
    startEvent(eventState.dialogueIndex);
    return;
  }

  if (!eligible(stateSnapshot)) return;
  const serial = ++entryCheckSerial;
  await Promise.resolve();
  if (serial !== entryCheckSerial || String(document.body?.dataset?.screen || '') !== 'glab') return;
  if (Math.random() >= TRIGGER_CHANCE) return;
  startEvent(0);
}

function handleScreenChange() {
  const previousScreen = observedScreen;
  const nextScreen = String(document.body?.dataset?.screen || '');
  const enteredGlab = nextScreen === 'glab' && previousScreen !== 'glab';
  observedScreen = nextScreen;

  // g-Lab.内イベント終了後に通常画面へ戻っただけの場合は、
  // 同じ入店の続きとして扱い、新しいカワハライベントを連続発生させない。
  const returningFromGlabEvent = previousScreen === 'kawaharaKnowledgeEvent'
    || previousScreen === 'glabVisitVideoEvent';

  if (enteredGlab && !returningFromGlabEvent) queueMicrotask(onGlabEntered);
}

const observer = new MutationObserver(handleScreenChange);
observer.observe(document.body, { attributes:true, attributeFilter:['data-screen'] });
if (observedScreen === 'glab') queueMicrotask(onGlabEntered);

export const GLAB_KAWAHARA_GAME_EVENT_SPEC = Object.freeze({
  eventKey:EVENT_KEY,
  minDay:MIN_DAY,
  triggerChance:TRIGGER_CHANCE,
  onceOnly:true,
  characterImage:CHARACTER_IMAGE,
  dialogueCount:DIALOGUES.length,
});
