// Restore the previously used metal when entering the normal jewelry craft screen.
// Existing jewelry history is read only; no save-data field is added or changed.

const CRAFT_SCREENS = new Set(['craft', 'craftLoose']);
let craftSessionActive = false;

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

function currentInventoryJewelry() {
  const snapshot = globalThis.__JXJ_MEMORIES_STATE__?.();
  return Array.isArray(snapshot?.inventory?.jewelry) ? snapshot.inventory.jewelry : [];
}

function applyPreviousMetalSelection() {
  const grid = document.querySelector('.craft-metal-grid');
  if (!grid) return;

  // Order crafting already locks the ordered metal. Never override it.
  if (grid.querySelector('button[disabled]')) return;

  const metal = lastPlayerCraftMetal(currentInventoryJewelry());
  if (!metal) return;

  const buttons = Array.from(
    grid.querySelectorAll('button[data-action="craft-choice"][data-group="metal"]'),
  );
  const target = buttons.find((button) => button.dataset.id === metal);
  if (!target || target.disabled || target.classList.contains('selected')) return;

  target.click();
}

function handleCraftScreen() {
  const screen = String(document.body?.dataset?.screen || '');

  if (CRAFT_SCREENS.has(screen)) {
    if (screen === 'craft' && !craftSessionActive) {
      craftSessionActive = true;
      queueMicrotask(() => {
        if (document.body?.dataset?.screen === 'craft' && craftSessionActive) {
          applyPreviousMetalSelection();
        }
      });
    } else if (!craftSessionActive) {
      // A restored craftLoose screen belongs to the current in-progress craft session.
      craftSessionActive = true;
    }
    return;
  }

  craftSessionActive = false;
}

function installPreviousCraftMetalSelection() {
  if (typeof document === 'undefined' || !document.body) return;

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
