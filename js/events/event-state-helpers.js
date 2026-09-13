export function createEventStateHelpers(getState, saveGame, showToast, playSfx, roundedMetalWeight, metals) {
  const readState = () => {
    try { return getState?.() || null; } catch (_) { return null; }
  };
  const persist = () => {
    try { void saveGame?.(); } catch (_) {}
  };
  return Object.freeze({
    patchEventState(eventKey, patch) {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        const key = String(eventKey || '').trim();
        if (!key || !patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok:false, reason:'invalid-arguments' };
        state.events = state.events && typeof state.events === 'object' && !Array.isArray(state.events) ? state.events : {};
        const current = state.events[key] && typeof state.events[key] === 'object' && !Array.isArray(state.events[key]) ? state.events[key] : {};
        Object.assign(current, patch);
        state.events[key] = current;
        persist();
        return { ok:true };
      } catch (error) {
        console.warn('[EventStateHelpers] patchEventState failed', error);
        return { ok:false, error };
      }
    },
    grantMetalIgnoreCapacity(metalKey, amount, options = {}) {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        const key = String(metalKey || '').trim();
        const quantity = Number(amount);
        if (!metals?.[key] || !Number.isFinite(quantity) || quantity <= 0) return { ok:false, reason:'invalid-arguments' };
        state.inventory = state.inventory && typeof state.inventory === 'object' && !Array.isArray(state.inventory) ? state.inventory : {};
        state.inventory.metals = state.inventory.metals && typeof state.inventory.metals === 'object' && !Array.isArray(state.inventory.metals) ? state.inventory.metals : {};
        const current = Math.max(0, Number(state.inventory.metals[key]) || 0);
        state.inventory.metals[key] = roundedMetalWeight(current + quantity);
        if (options?.message) showToast?.(String(options.message), options.type || 'success');
        if (options?.withSound !== false) playSfx?.('coin', { gain:.9 });
        persist();
        return { ok:true, value:state.inventory.metals[key] };
      } catch (error) {
        console.warn('[EventStateHelpers] grantMetalIgnoreCapacity failed', error);
        return { ok:false, error };
      }
    },
  });
}
