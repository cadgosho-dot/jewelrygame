// Remember the metal from the last successfully completed manual craft and restore it
// when the next normal jewelry craft starts. This is a local UI preference only;
// the game save schema is not changed.

const CRAFT_SCREENS = new Set(['craft', 'craftLoose']);
export const LAST_CRAFT_METAL_STORAGE_KEY = 'jxj:last-crafted-metal';

let craftSessionActive = false;
let craftSessionMetal = '';
let previousScreen = '';

export function lastPlayerCraftMetal(jewelry) {
  const rows = Array.isArray(jewelry) ? jewelry : [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const item = rows[index];
    if (!item || typeof item !== 'object') continue;

    const metal = typeof item.metal === 'string' ? item.metal.trim() : '';
    if (!metal) continue;

    // These entries were not made through the player's manual craft selection.
    if (item.madeBy === 'workshopStaff') continue;
    if (item.autopilot) continue;
    if (item.acquisition === 'jewelryShop' || item.purchasedDay) continue;
    if (item.receivedGiftCode) continue;

    return metal;
  }
  return '';
}

export function storedCraftMetal(storage) {
  try {
    const metal = storage?.getItem?.(LAST_CRAFT_METAL_STORAGE_KEY);
    return typeof metal === 'string' ? metal.trim() : '';
  } catch (_) {
    return '';
  }
}

export function previousCraftMetal(storage, jewelry) {
  return storedCraftMetal(storage) || lastPlayerCraftMetal(jewelry);
}

export function rememberCompletedCraftMetal(storage, metal) {
  const normalized = typeof metal === 'string' ? metal.trim() : '';
  if (!normalized) return false;
  try {
    storage?.setItem?.(LAST_CRAFT_METAL_STORAGE_KEY, normalized);
    return true;
  } catch (_) {
    return false;
  }
}

function browserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch (_) {
    return null;
  }
}

function currentInventoryJewelry() {
  const snapshot = globalThis.__JXJ_MEMORIES_STATE__?.();
  return Array.isArray(snapshot?.inventory?.jewelry) ? snapshot.inventory.jewelry : [];
}

function visibleSelectedMetal() {
  const selected = document.querySelector(
    '.craft-metal-grid button[data-action="craft-choice"][data-group="metal"].selected',
  );
  return typeof selected?.dataset?.id === 'string' ? selected.dataset.id.trim() : '';
}

function captureVisibleMetalSelection() {
  const metal = visibleSelectedMetal();
  if (metal) craftSessionMetal = metal;
}

function applyPreviousMetalSelection() {
  const grid = document.querySelector('.craft-metal-grid');
  if (!grid) return;

  // Order crafting already locks the ordered metal. Never override it.
  if (grid.querySelector('button[disabled]')) return;

  const metal = previousCraftMetal(browserStorage(), currentInventoryJewelry());
  if (!metal) return;

  const buttons = Array.from(
    grid.querySelectorAll('button[data-action="craft-choice"][data-group="metal"]'),
  );
  const target = buttons.find((button) => button.dataset.id === metal);
  if (!target || target.disabled || target.classList.contains('selected')) return;

  target.click();
}

function handleCraftChoiceClick(event) {
  const button = event.target?.closest?.(
    'button[data-action="craft-choice"][data-group="metal"]',
  );
  if (!button || !CRAFT_SCREENS.has(String(document.body?.dataset?.screen || ''))) return;
  const metal = typeof button.dataset.id === 'string' ? button.dataset.id.trim() : '';
  if (metal) craftSessionMetal = metal;
}

function handleCraftScreen() {
  const screen = String(document.body?.dataset?.screen || '');
  const wasCraftScreen = CRAFT_SCREENS.has(previousScreen);
  const isCraftScreen = CRAFT_SCREENS.has(screen);

  if (!isCraftScreen && screen === 'completion' && wasCraftScreen && craftSessionActive) {
    rememberCompletedCraftMetal(browserStorage(), craftSessionMetal);
  }

  if (isCraftScreen) {
    const startingSession = !craftSessionActive;
    if (startingSession) {
      craftSessionActive = true;
      craftSessionMetal = '';
    }

    if (screen === 'craft') {
      queueMicrotask(() => {
        if (document.body?.dataset?.screen !== 'craft' || !craftSessionActive) return;
        if (startingSession) applyPreviousMetalSelection();
        captureVisibleMetalSelection();
      });
    }

    previousScreen = screen;
    return;
  }

  craftSessionActive = false;
  craftSessionMetal = '';
  previousScreen = screen;
}

function installPreviousCraftMetalSelection() {
  if (typeof document === 'undefined' || !document.body) return;

  document.addEventListener('click', handleCraftChoiceClick, true);
  const observer = new MutationObserver(handleCraftScreen);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['data-screen'],
  });
  handleCraftScreen();
}

if (typeof document !== 'undefined') {
  if (document.body) {
    installPreviousCraftMetalSelection();
  } else {
    document.addEventListener('DOMContentLoaded', installPreviousCraftMetalSelection, { once: true });
  }
}
