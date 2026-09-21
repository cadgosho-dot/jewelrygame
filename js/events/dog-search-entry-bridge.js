import { createDogSearchEventRuntime, dogSearchEntryForScreen } from './dog-search-event.js';
import { DOG_SEARCH_KEY } from './dog-search-state.js';

const INTERCEPT_KEY = '__JXJ_I';
const NAVIGATE_KEY = '__JXJ_N';
const RESUME_KEY = '__JXJ_R';
const bypass = new WeakSet();
let selectedMining = 'river';

function helpers() {
  return globalThis.__JXJ_EVENT_STATE_HELPERS__ || null;
}

function eventSnapshot(key) {
  try { return helpers()?.eventRuntimeSnapshot?.(key) || null; } catch (_) { return null; }
}

function dogSearchStateSnapshot() {
  const dog = eventSnapshot(DOG_SEARCH_KEY);
  if (!dog?.ok) return null;
  const mother = eventSnapshot('wolfMotherButlerEvent');
  return {
    playerName:dog.playerName,
    game:{ ...dog.game },
    wellbeing:{ ...dog.wellbeing },
    events:{
      [DOG_SEARCH_KEY]:{ ...(dog.event || {}) },
      wolfMotherButlerEvent:{ ...(mother?.event || {}) },
    },
  };
}

function navigate(target, data = {}, push = true) {
  const fn = globalThis[NAVIGATE_KEY];
  if (typeof fn === 'function') fn(target, data, push);
}

export function dogSearchEntryFromAction(button, action, miningSelection = selectedMining) {
  if (!button) return '';
  if (action === 'select-mining') return '';
  if (action === 'eat-meal') {
    const mealId = String(button.dataset?.id || '');
    return mealId ? `meal:${mealId}` : '';
  }
  if (action === 'play-kaitenzushi') return 'meal:kaitenzushi';
  if (action === 'mine') {
    if (miningSelection === 'river') return 'mining:river';
    if (miningSelection === 'mine') return 'mining:mine';
    return '';
  }
  if (action === 'supplier-category') {
    return button.dataset?.screen === 'supplierMetals' ? 'supplierMetals' : '';
  }
  if (action === 'nav') {
    const target = String(button.dataset?.screen || '');
    if (target === 'okachimachi') return 'okachimachi';
    return dogSearchEntryForScreen(target);
  }
  return '';
}

const runtime = createDogSearchEventRuntime({
  getState:dogSearchStateSnapshot,
  getHelpers:helpers,
  navigate,
});

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

function continuationFor(button, action) {
  if (action === 'nav' || action === 'supplier-category') {
    const target = String(button.dataset?.screen || '');
    return () => {
      if (target) navigate(target, { dogSearchResume:true });
    };
  }
  return () => replay(button);
}

function intercept(button, action) {
  if (!(button instanceof Element)) return false;
  if (bypass.has(button)) {
    bypass.delete(button);
    return false;
  }
  if (action === 'select-mining') {
    selectedMining = String(button.dataset?.id || selectedMining);
    return false;
  }
  const entry = dogSearchEntryFromAction(button, action, selectedMining);
  if (!entry) return false;
  return runtime.startActionEntry(entry, { resume:continuationFor(button, action) });
}

const previous = globalThis[INTERCEPT_KEY];
globalThis[INTERCEPT_KEY] = (button, action) => {
  if (intercept(button, action)) return true;
  if (typeof previous === 'function') {
    try { return previous(button, action) === true; } catch (_) { return false; }
  }
  return false;
};

globalThis.__JXJ_DOG_SEARCH_RUNTIME__ = runtime;
