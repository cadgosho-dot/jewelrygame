import './oyatsu-character-position-lock.js';

let eventServices = {};
export function setServices(canSpendMealTime, spendMealTime, addFinance, addNotification, setMealFeedback, render) {
  eventServices = { ...eventServices, canSpendMealTime, spendMealTime, addFinance, addNotification, setMealFeedback, render };
}

export function createEventStateHelpers(getState, saveGame, showToast, playSfx, roundedMetalWeight, metals) {
  const readState = () => {
    try { return getState?.() || null; } catch (_) { return null; }
  };
  const persist = () => {
    try { void saveGame?.(); } catch (_) {}
  };
  return Object.freeze({
    configureServices(services = {}) {
      if (!services || typeof services !== 'object' || Array.isArray(services)) return { ok:false, reason:'invalid-services' };
      eventServices = { ...eventServices, ...services };
      return { ok:true };
    },
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
    eventRuntimeSnapshot(eventKey) {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        const key = String(eventKey || '').trim();
        const event = key && state.events?.[key] && typeof state.events[key] === 'object' && !Array.isArray(state.events[key])
          ? { ...state.events[key] }
          : {};
        return {
          ok:true,
          playerName:String(state.playerName || ''),
          game:{
            day:Math.max(1, Math.floor(Number(state.game?.day) || 1)),
            startDate:String(state.game?.startDate || ''),
            minutes:Math.max(0, Math.floor(Number(state.game?.minutes) || 0)),
            money:Math.max(0, Math.floor(Number(state.game?.money) || 0)),
            weather:String(state.game?.weather || '晴れ'),
          },
          wellbeing:{
            hunger:Math.max(0, Math.floor(Number(state.wellbeing?.hunger) || 0)),
            maxHunger:Math.max(1, Math.floor(Number(state.wellbeing?.maxHunger) || 7)),
            lastMeal:String(state.wellbeing?.lastMeal || ''),
            mealsEaten:Math.max(0, Math.floor(Number(state.wellbeing?.mealsEaten) || 0)),
          },
          mealTimeAvailable: (() => {
            try { return eventServices.canSpendMealTime?.() !== false; } catch (_) { return true; }
          })(),
          event,
        };
      } catch (error) {
        console.warn('[EventStateHelpers] eventRuntimeSnapshot failed', error);
        return { ok:false, error };
      }
    },
    settleEventMeal(eventKey, options = {}) {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        const key = String(eventKey || '').trim();
        const price = Math.max(0, Math.floor(Number(options?.price) || 0));
        const mealId = String(options?.mealId || '').trim();
        if (!key || !mealId || price <= 0) return { ok:false, reason:'invalid-arguments' };
        state.events = state.events && typeof state.events === 'object' && !Array.isArray(state.events) ? state.events : {};
        const current = state.events[key] && typeof state.events[key] === 'object' && !Array.isArray(state.events[key]) ? state.events[key] : {};
        state.events[key] = current;
        if (current.charged) {
          return {
            ok:true,
            alreadyCharged:true,
            money:Math.max(0, Math.floor(Number(state.game?.money) || 0)),
            hunger:Math.max(0, Math.floor(Number(state.wellbeing?.hunger) || 0)),
          };
        }
        const money = Math.max(0, Math.floor(Number(state.game?.money) || 0));
        if (money < price) return { ok:false, reason:'insufficient-funds', money, price };
        state.game = state.game && typeof state.game === 'object' && !Array.isArray(state.game) ? state.game : {};
        state.wellbeing = state.wellbeing && typeof state.wellbeing === 'object' && !Array.isArray(state.wellbeing) ? state.wellbeing : {};
        const maxHunger = Math.max(1, Math.floor(Number(state.wellbeing.maxHunger) || 7));
        const hungerBefore = Math.max(0, Math.min(maxHunger, Math.floor(Number(state.wellbeing.hunger) || 0)));
        const mealLabel = String(options?.mealLabel || mealId);
        state.game.money = money - price;
        try { eventServices.addFinance?.(String(options?.financeLabel || `${mealLabel}で食事`), 0, price); } catch (_) {}
        try { eventServices.spendMealTime?.(); } catch (_) {}
        state.wellbeing.hunger = maxHunger;
        state.wellbeing.lastMeal = mealId;
        state.wellbeing.mealsEaten = Math.max(0, Math.floor(Number(state.wellbeing.mealsEaten) || 0)) + 1;
        state.daily = state.daily && typeof state.daily === 'object' && !Array.isArray(state.daily) ? state.daily : {};
        state.daily.meals = Array.isArray(state.daily.meals) ? state.daily.meals : [];
        state.daily.meals.push({ id:mealId, name:mealLabel, price, recovery:Math.max(0, maxHunger - hungerBefore) });
        current.charged = true;
        current.mealPrice = price;
        current.mealId = mealId;
        current.mealLabel = mealLabel;
        current.hungerBefore = hungerBefore;
        current.hungerAfter = maxHunger;
        try { eventServices.addNotification?.(`${mealLabel}を食べた`, `${price.toLocaleString('ja-JP')}円を支払い、空腹度が回復しました。`, 'special'); } catch (_) {}
        persist();
        return { ok:true, money:state.game.money, hunger:state.wellbeing.hunger, maxHunger, hungerBefore };
      } catch (error) {
        console.warn('[EventStateHelpers] settleEventMeal failed', error);
        return { ok:false, error };
      }
    },
    completeEventMealUi(options = {}) {
      const before = Math.max(0, Math.floor(Number(options?.before) || 0));
      const after = Math.max(0, Math.floor(Number(options?.after) || 0));
      const mealName = String(options?.mealName || '食事');
      try { eventServices.setMealFeedback?.(before, after, mealName); } catch (_) {}
      try { eventServices.render?.(); } catch (_) {}
      try { showToast?.('ごちそうさまでした', 'meal-complete', false); } catch (_) {}
      try { playSfx?.('levelup'); } catch (_) {}
      return { ok:true, before, after, mealName };
    },
    grantMetalIgnoreCapacity(metalKey, amount, options = {}) {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        const key = String(metalKey || '').trim();
        const quantity = Number(amount);
        if (!metals?.[key] || !Number.isFinite(quantity) || quantity <= 0) return { ok:false, reason:'invalid-arguments' };
        // Optional event receipt: inventory and its guard share the same save snapshot.
        const rewardEvent = options.eventKey ? state.events?.[options.eventKey] : null;
        if (options.eventKey && (!rewardEvent || typeof rewardEvent !== 'object' || Array.isArray(rewardEvent) || !options.rewardFlag)) return { ok:false, reason:'event-state-unavailable' };
        if (rewardEvent?.[options.rewardFlag] === true) return { ok:true, alreadyGranted:true };
        state.inventory = state.inventory && typeof state.inventory === 'object' && !Array.isArray(state.inventory) ? state.inventory : {};
        state.inventory.metals = state.inventory.metals && typeof state.inventory.metals === 'object' && !Array.isArray(state.inventory.metals) ? state.inventory.metals : {};
        const current = Math.max(0, Number(state.inventory.metals[key]) || 0);
        state.inventory.metals[key] = roundedMetalWeight(current + quantity);
        if (rewardEvent) Object.assign(rewardEvent, options.eventPatch || {}, { [options.rewardFlag]:true });
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
