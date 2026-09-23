import { playSfx } from '../audio.js?v=0.10.963';
import {
  BULLDOG_STORE_ASSESSMENT_EVENT_KEY,
  BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE,
  buildBulldogStoreAssessmentDialogue,
} from './bulldog-store-assessment-rules.js?v=0.10.963';

const OVERLAY_ID = 'jxj-bulldog-store-assessment-overlay';
const STYLE_ID = 'jxj-bulldog-store-assessment-style';
const CHARACTER_IMAGE = './assets/images/events/bulldog-store-assessment.png';
const INTERCEPT_KEY = '__JXJ_I';
const RESUME_KEY = '__JXJ_R';

const bypass = new WeakSet();
let running = false;
let overlay = null;
let dialogueIndex = 0;
let lines = [];
let resumeButton = null;
let activeBranchId = '';

function helpers() {
  return globalThis.__JXJ_EVENT_STATE_HELPERS__ || null;
}

function snapshot() {
  try { return globalThis.__JXJ_MEMORIES_STATE__?.() || null; } catch (_) { return null; }
}

function patchEvent(patch) {
  try { return helpers()?.patchEventState?.(BULLDOG_STORE_ASSESSMENT_EVENT_KEY, patch) || null; } catch (_) { return null; }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[char]));
}

function eventState(stateSnapshot = snapshot()) {
  const value = stateSnapshot?.events?.[BULLDOG_STORE_ASSESSMENT_EVENT_KEY];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function selectedBranch(stateSnapshot, branchId) {
  const branches = Array.isArray(stateSnapshot?.store?.branches) ? stateSnapshot.store.branches : [];
  return branches.find((branch) => String(branch?.id || '') === String(branchId || '')) || null;
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{
  position:fixed;inset:0;z-index:14500;overflow:hidden;background:transparent;color:var(--text);
  isolation:isolate;touch-action:manipulation;
}
#${OVERLAY_ID} *{box-sizing:border-box}
#${OVERLAY_ID} .main-screen{position:relative;z-index:1;height:100%;min-height:100%}
#${OVERLAY_ID} .visit-character-event{min-height:100dvh!important;height:100dvh!important}
#${OVERLAY_ID} .bulldog-store-assessment-name{color:#d87171!important}
`;
  document.head.appendChild(style);
}

function render() {
  if (!overlay || !lines.length) return;
  overlay.innerHTML = `
    <main class="main-screen kappa-jade-event-screen">
      <section class="visit-character-event kappa-jade-event" aria-live="polite">
        <div class="visit-character-area" aria-hidden="true">
          <img class="visit-character kappa-character" src="${CHARACTER_IMAGE}" alt="" draggable="false">
        </div>
        <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-bulldog-store-action="next">
          <small class="bulldog-store-assessment-name">ブルドッグ夫人</small>
          <strong>${esc(lines[dialogueIndex] || '')}</strong>
          <span>タップして進む</span>
        </button>
      </section>
    </main>
    <button type="button" class="event-safety-recovery" data-bulldog-store-action="end">イベント終了</button>
  `;
}

function replay(button) {
  if (!(button instanceof Element) || !button.isConnected) return;
  bypass.add(button);
  queueMicrotask(() => {
    if (!button.isConnected) {
      bypass.delete(button);
      return;
    }
    globalThis[RESUME_KEY] = button;
    try {
      button.click();
    } finally {
      if (globalThis[RESUME_KEY] === button) delete globalThis[RESUME_KEY];
    }
  });
}

function finishEvent({ resume = true } = {}) {
  const stateSnapshot = snapshot();
  const day = Math.max(1, Math.floor(Number(stateSnapshot?.game?.day) || 1));
  const button = resumeButton;
  patchEvent({
    active:false,
    stage:'idle',
    dialogueIndex:0,
    branchId:activeBranchId,
    lastTriggeredDay:day,
  });
  running = false;
  dialogueIndex = 0;
  lines = [];
  resumeButton = null;
  activeBranchId = '';
  overlay?.remove();
  overlay = null;
  if (resume) replay(button);
}

function advance() {
  if (!running || !lines.length) return;
  playSfx('select', { gain:.72 });
  if (dialogueIndex >= lines.length - 1) {
    finishEvent();
    return;
  }
  dialogueIndex += 1;
  patchEvent({ active:true, stage:'dialogue', dialogueIndex, branchId:activeBranchId });
  render();
}

function onClick(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-bulldog-store-action]') : null;
  if (!button || !overlay?.contains(button)) return;
  const action = String(button.dataset.bulldogStoreAction || '');
  if (action === 'next') {
    advance();
    return;
  }
  if (action === 'end') {
    playSfx('select', { gain:.72 });
    finishEvent();
  }
}

function startEvent(button, stateSnapshot, branchId) {
  if (running || document.getElementById(OVERLAY_ID)) return false;
  const built = buildBulldogStoreAssessmentDialogue(stateSnapshot, branchId);
  if (!built.lines.length) return false;

  installStyle();
  running = true;
  dialogueIndex = 0;
  lines = built.lines;
  resumeButton = button;
  activeBranchId = String(branchId || '');

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'ブルドッグ夫人・店舗品揃え評価イベント');
  overlay.addEventListener('click', onClick);
  document.body.appendChild(overlay);

  patchEvent({
    active:true,
    stage:'dialogue',
    dialogueIndex:0,
    branchId:activeBranchId,
    lastTriggeredDay:Math.max(1, Math.floor(Number(stateSnapshot?.game?.day) || 1)),
  });
  render();
  return true;
}

function intercept(button, action) {
  if (!(button instanceof Element) || action !== 'open-store-branch') return false;
  if (bypass.has(button)) {
    bypass.delete(button);
    return false;
  }
  if (running || document.getElementById(OVERLAY_ID)) return true;

  const stateSnapshot = snapshot();
  const branchId = String(button.dataset?.id || '');
  if (!stateSnapshot || !branchId || !selectedBranch(stateSnapshot, branchId)) return false;

  const day = Math.max(1, Math.floor(Number(stateSnapshot.game?.day) || 1));
  const current = eventState(stateSnapshot);
  if (Number(current.lastRollDay) === day) return false;

  patchEvent({ lastRollDay:day });
  if (Math.random() >= BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE) return false;
  return startEvent(button, stateSnapshot, branchId);
}

const previous = globalThis[INTERCEPT_KEY];
globalThis[INTERCEPT_KEY] = (button, action) => {
  if (intercept(button, action)) return true;
  if (typeof previous === 'function') {
    try { return previous(button, action) === true; } catch (_) { return false; }
  }
  return false;
};

export const BULLDOG_STORE_ASSESSMENT_EVENT_SPEC = Object.freeze({
  eventKey:BULLDOG_STORE_ASSESSMENT_EVENT_KEY,
  triggerChance:BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE,
  triggerAction:'open-store-branch',
  selectedBranchOnly:true,
  characterImage:CHARACTER_IMAGE,
});
