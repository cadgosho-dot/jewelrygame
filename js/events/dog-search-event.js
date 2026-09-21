import { playSfx, vibrate } from '../audio.js?v=0.10.961';
import { DOG_SEARCH_INTRO, DOG_SEARCH_EVENTS } from './dog-search-data.js';
import { DOG_SEARCH_KEY, createDogSearchController, pickDogSearchEvent } from './dog-search-state.js';

const OVERLAY_ID = 'jxj-dog-search-event-overlay';
const STYLE_ID = 'jxj-dog-search-event-style';
const EXCLUSIVE_ATTR = 'data-jxj-exclusive-event';
const EXCLUSIVE_VALUE = 'dog-search';
const FINAL_WAIT_MS = 2000;

const ASSETS = Object.freeze({
  wolfBoy: './assets/images/events/wolf-boy.png',
  butler: './assets/images/events/sheep-butler.png',
  cabbage: './assets/images/events/dog-search-cabbage.png',
  dog: './assets/images/events/dog-search-shepherd.png',
  reward: './assets/images/metals/k18yg.png',
  panda: './assets/images/panda-hiroba.webp',
  pandaPortrait: './assets/images/panda-hiroba-portrait.webp',
  store: './assets/images/store.webp',
  storePortrait: './assets/images/store-portrait.webp',
});

const FINAL_DIALOGUE = Object.freeze({
  cabbage: 'うわぁぁぁー！！、、、たすけてたすけてー！！、、マイフレンド！、、、、、',
  dog: 'ワン！　ワン！、、、、',
  wolf1: 'わぁ！、、、よしよし、、、、、、',
  wolf2: 'ありがとうございます、○○○さん、、、、よかったぁ、、、、よしよし、、、、',
  butler1: 'ありがとうございます○○○様、、、、、',
  butler2: 'こちら奥様からお預かりしておりますので、お収めください、、、、',
  wolfFinal: 'ありがとうございました○○○さん！、、、、',
});

const SCREEN_ENTRY_TARGETS = Object.freeze(new Set([
  'store',
  'looseShop',
  'glab',
  'supplierMetals',
  'displayShop',
  'realEstate',
]));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[char]));
}

function portrait() {
  return window.innerHeight >= window.innerWidth;
}

function backgroundPath(key) {
  const value = String(key || '').trim();
  return value ? `./assets/images/${value}.webp` : '';
}

function setExclusive(active) {
  const root = document.documentElement;
  if (!root) return;
  if (active) root.setAttribute(EXCLUSIVE_ATTR, EXCLUSIVE_VALUE);
  else if (root.getAttribute(EXCLUSIVE_ATTR) === EXCLUSIVE_VALUE) root.removeAttribute(EXCLUSIVE_ATTR);
}

function occupiedByOtherExclusiveEvent() {
  const value = document.documentElement?.getAttribute(EXCLUSIVE_ATTR);
  return Boolean(value && value !== EXCLUSIVE_VALUE);
}

export function dogSearchExclusiveEventActive() {
  return document.documentElement?.getAttribute(EXCLUSIVE_ATTR) === EXCLUSIVE_VALUE;
}

export function dogSearchEntryForScreen(target) {
  const value = String(target || '');
  return SCREEN_ENTRY_TARGETS.has(value) ? value : '';
}

function playApprovedHappyChime(kind = 'found') {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    playSfx(kind === 'ending' ? 'success' : 'loose-sparkle', { gain:.9 });
    return;
  }
  let context = null;
  try {
    context = new Context();
    const master = context.createGain();
    master.gain.setValueAtTime(.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(kind === 'ending' ? .18 : .14, context.currentTime + .025);
    master.gain.exponentialRampToValueAtTime(.0001, context.currentTime + (kind === 'ending' ? .78 : .56));
    master.connect(context.destination);

    const notes = kind === 'ending'
      ? [[523.25,0,.34],[659.25,.11,.36],[783.99,.22,.46],[1046.5,.36,.40]]
      : [[659.25,0,.28],[783.99,.09,.30],[987.77,.18,.34]];
    for (const [frequency, offset, duration] of notes) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, context.currentTime + offset);
      gain.gain.setValueAtTime(.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(.36, context.currentTime + offset + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + offset + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(context.currentTime + offset);
      osc.stop(context.currentTime + offset + duration + .02);
    }
    window.setTimeout(() => { try { context?.close?.(); } catch (_) {} }, 1200);
  } catch (_) {
    try { context?.close?.(); } catch (_) {}
    playSfx(kind === 'ending' ? 'success' : 'loose-sparkle', { gain:.9 });
  }
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${OVERLAY_ID}{
  position:fixed;inset:0;z-index:14500;overflow:hidden;background:#050505;color:#eef3f4;
  isolation:isolate;touch-action:manipulation;
}
#${OVERLAY_ID} *{box-sizing:border-box}
#${OVERLAY_ID} .dog-search-background{
  position:absolute;inset:0;z-index:0;background:#080604 center/cover no-repeat;
}
#${OVERLAY_ID} .dog-search-shade{
  position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.02) 48%,rgba(0,0,0,.30));
}
#${OVERLAY_ID} .main-screen{position:relative;z-index:2;height:100%}
#${OVERLAY_ID} .visit-character-event{min-height:100dvh!important;height:100dvh!important}
#${OVERLAY_ID} .dog-search-question{
  position:absolute;z-index:4;left:50%;top:50%;transform:translate(-50%,-50%);
  border:0;background:transparent;color:#fff;font:700 clamp(32px,7vw,72px)/1.1 inherit;
  text-shadow:0 3px 14px rgba(0,0,0,.9);padding:28px;cursor:pointer;
}
#${OVERLAY_ID} .dog-search-blackout{position:absolute;inset:0;z-index:20;background:#000}
#${OVERLAY_ID} .dog-search-character{filter:drop-shadow(0 22px 34px rgba(0,0,0,.72))}
#${OVERLAY_ID} .dog-search-reward-image{object-fit:contain}
#${OVERLAY_ID} .dog-search-background-only{position:absolute;inset:0;z-index:2}
`;
  document.head.appendChild(style);
}

export function createDogSearchEventRuntime({
  getState,
  getHelpers,
  navigate,
  random = Math.random,
} = {}) {
  let pending = null;
  let running = false;
  let overlay = null;
  let lineIndex = 0;
  let middleEvent = null;
  let resumeAction = null;
  let waitTimer = 0;

  const helpers = () => {
    try { return getHelpers?.() || globalThis.__JXJ_EVENT_STATE_HELPERS__ || null; } catch (_) { return null; }
  };
  const state = () => {
    try { return getState?.() || null; } catch (_) { return null; }
  };
  const controller = createDogSearchController({ getState:state, helpers });
  const currentSnapshot = () => {
    try { return helpers()?.eventRuntimeSnapshot?.(DOG_SEARCH_KEY) || null; } catch (_) { return null; }
  };
  const playerName = () => String(currentSnapshot()?.playerName || state()?.playerName || '').trim() || '○○○';
  const replaceName = (text) => String(text || '').replaceAll('○○○', playerName());

  function clearWait() {
    if (waitTimer) window.clearTimeout(waitTimer);
    waitTimer = 0;
  }

  function removeOverlay() {
    clearWait();
    overlay?.remove();
    overlay = null;
    running = false;
    middleEvent = null;
    lineIndex = 0;
    setExclusive(false);
  }

  function finishSession({ continueAction = false } = {}) {
    const continuation = continueAction ? resumeAction : null;
    resumeAction = null;
    removeOverlay();
    if (typeof continuation === 'function') queueMicrotask(() => {
      try { continuation(); } catch (error) { console.warn('[DogSearch] continuation failed', error); }
    });
  }

  function endEarly() {
    if (!running) return;
    playSfx('select', { gain:.68 });
    // Intro/middle are not completed. Final progress is already persisted and can resume later.
    finishSession({ continueAction:false });
  }

  function backgroundForMiddle(row) {
    return backgroundPath(portrait() ? row?.portraitBackground : row?.background);
  }

  function dialogueMarkup({ speaker, text, image, background, action='next', extraClass='' }) {
    return `
      <div class="dog-search-background" style="background-image:url('${esc(background)}')" aria-hidden="true"></div>
      <div class="dog-search-shade" aria-hidden="true"></div>
      <main class="main-screen kappa-jade-event-screen">
        <section class="visit-character-event kappa-jade-event" aria-live="polite">
          <div class="visit-character-area" aria-hidden="true">
            <img class="visit-character kappa-character dog-search-character ${esc(extraClass)}" src="${esc(image)}" alt="" draggable="false">
          </div>
          <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel" data-dog-search="${esc(action)}">
            <small>${esc(speaker)}</small>
            <strong>${esc(replaceName(text))}</strong>
            <span>タップして進む</span>
          </button>
        </section>
      </main>
      <button type="button" class="event-safety-recovery" data-dog-search="end">イベント終了</button>
    `;
  }

  function rewardMarkup() {
    const bg = portrait() ? ASSETS.storePortrait : ASSETS.store;
    return `
      <div class="dog-search-background" style="background-image:url('${bg}')" aria-hidden="true"></div>
      <div class="dog-search-shade" aria-hidden="true"></div>
      <main class="main-screen kappa-jade-event-screen">
        <section class="visit-character-event kappa-jade-event is-reward" aria-live="polite">
          <button type="button" class="kappa-jade-reward-button" data-dog-search="reward">
            <span class="special-item-glow kappa-jade-glow" aria-hidden="true"></span>
            <img class="dog-search-reward-image" src="${ASSETS.reward}" alt="K18 20g" draggable="false">
            <strong>K18　20g</strong>
            <small>タップして受け取る</small>
          </button>
        </section>
      </main>
      <button type="button" class="event-safety-recovery" data-dog-search="end">イベント終了</button>
    `;
  }

  function finalBackground(stage) {
    if (['question','cabbage','dog-wait','dog'].includes(stage)) return portrait() ? ASSETS.pandaPortrait : ASSETS.panda;
    return portrait() ? ASSETS.storePortrait : ASSETS.store;
  }

  function renderFinal() {
    if (!overlay) return;
    const event = controller.current();
    const stage = event.finalRewardGranted && event.finalStage === 'reward' ? 'wolfFinal' : event.finalStage;
    const bg = finalBackground(stage);

    if (stage === 'dog-wait') {
      overlay.innerHTML = `<div class="dog-search-background" style="background-image:url('${bg}')" aria-hidden="true"></div><div class="dog-search-background-only" aria-hidden="true"></div>`;
      clearWait();
      waitTimer = window.setTimeout(() => {
        waitTimer = 0;
        if (!running || controller.current().finalStage !== 'dog-wait') return;
        controller.setFinalStage('dog');
        renderFinal();
        playApprovedHappyChime('found');
      }, FINAL_WAIT_MS);
      return;
    }

    if (stage === 'blackout') {
      overlay.innerHTML = '<div class="dog-search-blackout" aria-hidden="true"></div>';
      clearWait();
      waitTimer = window.setTimeout(() => {
        waitTimer = 0;
        if (!running || controller.current().finalStage !== 'blackout') return;
        try { navigate?.('store', {}, false); } catch (_) {}
        controller.setFinalStage('wolf1');
        renderFinal();
      }, FINAL_WAIT_MS);
      return;
    }

    if (stage === 'question') {
      overlay.innerHTML = `
        <div class="dog-search-background" style="background-image:url('${bg}')" aria-hidden="true"></div>
        <div class="dog-search-shade" aria-hidden="true"></div>
        <button type="button" class="dog-search-question" data-dog-search="final-next">ん？</button>
        <button type="button" class="event-safety-recovery" data-dog-search="end">イベント終了</button>
      `;
      return;
    }

    if (stage === 'reward') {
      overlay.innerHTML = rewardMarkup();
      return;
    }

    const scene = {
      cabbage: { speaker:'キャベツ野郎', text:FINAL_DIALOGUE.cabbage, image:ASSETS.cabbage },
      dog: { speaker:'牧羊犬', text:FINAL_DIALOGUE.dog, image:ASSETS.dog },
      wolf1: { speaker:'狼少年', text:FINAL_DIALOGUE.wolf1, image:ASSETS.wolfBoy },
      wolf2: { speaker:'狼少年', text:FINAL_DIALOGUE.wolf2, image:ASSETS.wolfBoy },
      butler1: { speaker:'執事', text:FINAL_DIALOGUE.butler1, image:ASSETS.butler },
      butler2: { speaker:'執事', text:FINAL_DIALOGUE.butler2, image:ASSETS.butler },
      wolfFinal: { speaker:'狼少年', text:FINAL_DIALOGUE.wolfFinal, image:ASSETS.wolfBoy },
    }[stage];

    if (!scene) {
      console.warn('[DogSearch] unsupported final stage', stage);
      endEarly();
      return;
    }
    overlay.innerHTML = dialogueMarkup({ ...scene, background:bg, action:'final-next' });
  }

  function renderIntro() {
    if (!overlay) return;
    overlay.innerHTML = dialogueMarkup({
      speaker:'狼少年',
      text:DOG_SEARCH_INTRO[lineIndex] || '',
      image:ASSETS.wolfBoy,
      background:portrait() ? ASSETS.storePortrait : ASSETS.store,
      action:'intro-next',
    });
  }

  function renderMiddle() {
    if (!overlay || !middleEvent) return;
    overlay.innerHTML = dialogueMarkup({
      speaker:middleEvent.speaker,
      text:middleEvent.lines[lineIndex] || '',
      image:middleEvent.image,
      background:backgroundForMiddle(middleEvent),
      action:'middle-next',
    });
  }

  function createOverlay(label) {
    installStyle();
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-label',label);
    overlay.addEventListener('click', onOverlayClick);
    document.body.appendChild(overlay);
  }

  function startClaim() {
    if (!pending || running || document.getElementById(OVERLAY_ID)) return false;
    const claim = pending;
    pending = null;
    running = true;
    resumeAction = typeof claim.resume === 'function' ? claim.resume : null;
    lineIndex = 0;
    createOverlay('迷子犬・犬探しイベント');

    if (claim.selection.kind === 'intro') {
      renderIntro();
      return true;
    }
    if (claim.selection.kind === 'middle') {
      middleEvent = DOG_SEARCH_EVENTS.find((row) => row.id === claim.selection.id) || null;
      if (!middleEvent) {
        finishSession();
        return false;
      }
      renderMiddle();
      return true;
    }
    if (claim.selection.kind === 'final') {
      const event = controller.current();
      if (!event.finalActive) {
        const started = controller.startFinal(claim.selection.stage || 'question');
        if (!started?.ok) {
          finishSession();
          return false;
        }
      }
      renderFinal();
      if (controller.current().finalStage === 'dog') playApprovedHappyChime('found');
      return true;
    }

    finishSession();
    return false;
  }

  function claim(entry, { resume = null } = {}) {
    if (pending || running || document.getElementById(OVERLAY_ID) || occupiedByOtherExclusiveEvent()) return false;
    const selection = pickDogSearchEvent(state(), String(entry || ''), random);
    if (!selection) return false;
    pending = { entry:String(entry || ''), selection, resume };
    setExclusive(true);
    return true;
  }

  function startActionEntry(entry, { resume = null } = {}) {
    if (!claim(entry, { resume })) return false;
    if (!startClaim()) {
      pending = null;
      setExclusive(false);
      return false;
    }
    return true;
  }

  function advanceIntro() {
    playSfx('select', { gain:.72 });
    if (lineIndex < DOG_SEARCH_INTRO.length - 1) {
      lineIndex += 1;
      renderIntro();
      return;
    }
    const result = controller.completeIntro();
    if (!result?.ok) return endEarly();
    finishSession({ continueAction:false });
  }

  function advanceMiddle() {
    playSfx('select', { gain:.72 });
    if (!middleEvent) return endEarly();
    if (lineIndex < middleEvent.lines.length - 1) {
      lineIndex += 1;
      renderMiddle();
      return;
    }
    const result = controller.completeMiddle(middleEvent.id);
    if (!result?.ok) return endEarly();
    finishSession({ continueAction:true });
  }

  function setFinalStage(stage, { renderNow = true } = {}) {
    const result = controller.setFinalStage(stage);
    if (!result?.ok) return false;
    if (renderNow) renderFinal();
    return true;
  }

  function advanceFinal() {
    const stage = controller.current().finalStage;
    playSfx('select', { gain:.72 });
    if (stage === 'question') return void setFinalStage('cabbage');
    if (stage === 'cabbage') return void setFinalStage('dog-wait');
    if (stage === 'dog') return void setFinalStage('blackout');
    if (stage === 'wolf1') return void setFinalStage('wolf2');
    if (stage === 'wolf2') return void setFinalStage('butler1');
    if (stage === 'butler1') return void setFinalStage('butler2');
    if (stage === 'butler2') return void setFinalStage('reward');
    if (stage === 'wolfFinal') {
      playApprovedHappyChime('ending');
      const result = controller.finishFinal();
      if (!result?.ok) return;
      finishSession({ continueAction:false });
      try { navigate?.('main', {}, false); } catch (_) {}
    }
  }

  function receiveReward() {
    playSfx('select', { gain:.72 });
    const result = controller.receiveReward();
    if (!result?.ok) return;
    if (!result.alreadyGranted) {
      playSfx('coin', { gain:.92 });
      vibrate([28,22,48]);
    }
    renderFinal();
  }

  function onOverlayClick(event) {
    const button = event.target instanceof Element ? event.target.closest('[data-dog-search]') : null;
    if (!button || !overlay?.contains(button)) return;
    const action = button.dataset.dogSearch;
    if (action === 'end') return endEarly();
    if (action === 'intro-next') return advanceIntro();
    if (action === 'middle-next') return advanceMiddle();
    if (action === 'final-next') return advanceFinal();
    if (action === 'reward') return receiveReward();
  }

  function cancelPending() {
    pending = null;
    if (!running) setExclusive(false);
  }

  function onResize() {
    if (!running || !overlay) return;
    if (middleEvent) renderMiddle();
    else {
      const current = controller.current();
      if (current.finalActive) renderFinal();
      else renderIntro();
    }
  }

  window.addEventListener('orientationchange', () => window.setTimeout(onResize, 100), { passive:true });

  return Object.freeze({
    claim,
    startClaim,
    startActionEntry,
    cancelPending,
    isReserved:() => Boolean(pending || running || dogSearchExclusiveEventActive()),
    isRunning:() => running,
    current:() => controller.current(),
    assets:ASSETS,
  });
}

export const DOG_SEARCH_RUNTIME_SPEC = Object.freeze({
  eventKey:DOG_SEARCH_KEY,
  exclusiveAttribute:EXCLUSIVE_ATTR,
  exclusiveValue:EXCLUSIVE_VALUE,
  finalWaitMs:FINAL_WAIT_MS,
  cabbageAsset:ASSETS.cabbage,
  dogAsset:ASSETS.dog,
});
