import { purchasePurpleCapsule } from './bank-nezumi-rules.js';
import { PURPLE_CAPSULE_BLOCK_MESSAGE, PURPLE_CAPSULE_DAY_END_MINUTES, PURPLE_CAPSULE_REQUIRED_MINUTES, canUsePurpleCapsule } from './purple-capsule-rules.js';
import './purple-capsule-event.js';
import './oyatsu-character-position-lock.js';

let bankEngine = null;
try {
  bankEngine = await import('../finance/bank-engine.js');
} catch (error) {
  console.warn('[Bank] engine module unavailable', error);
}
const accrueBankInterest = (...args) => bankEngine?.accrueBankInterest?.(...args)
  ?? { credited:0, periods:0, balance:0, changed:false };
const bankIsOpen = (...args) => bankEngine?.bankIsOpen?.(...args) ?? false;
const bankClosureReason = (...args) => bankEngine?.bankClosureReason?.(...args) ?? 'hours';
const performBankTransaction = (...args) => bankEngine?.performBankTransaction?.(...args)
  ?? { ok:false, reason:'bank-module-unavailable' };

if (typeof document !== 'undefined') {
  void import('../finance/bank-ui.js').catch((error) => {
    console.warn('[Bank] ui module unavailable', error);
  });
}

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
    purpleCapsuleRuntimeSnapshot() {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        return {
          ok:true,
          playerName:String(state.playerName || ''),
          minutes:Math.max(0, Math.floor(Number(state.game?.minutes) || 0)),
          count:Math.max(0, Math.floor(Number(state.inventory?.items?.purpleCapsule) || 0)),
        };
      } catch (error) {
        return { ok:false, error };
      }
    },
    beginPurpleCapsuleUse() {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        const minutes = Math.max(0, Math.floor(Number(state.game?.minutes) || 0));
        const count = Math.max(0, Math.floor(Number(state.inventory?.items?.purpleCapsule) || 0));
        const eligibility = canUsePurpleCapsule({ minutes, count });
        if (!eligibility.ok) {
          if (eligibility.reason === 'insufficient-time') showToast?.(PURPLE_CAPSULE_BLOCK_MESSAGE, 'error');
          else if (eligibility.reason === 'no-item') showToast?.('紫のカプセルを持っていません。', 'error');
          return eligibility;
        }
        state.inventory = state.inventory && typeof state.inventory === 'object' && !Array.isArray(state.inventory) ? state.inventory : {};
        state.inventory.items = state.inventory.items && typeof state.inventory.items === 'object' && !Array.isArray(state.inventory.items) ? state.inventory.items : {};
        state.inventory.items.purpleCapsule = count - 1;
        persist();
        try { playSfx?.('select', { gain:.82 }); } catch (_) {}
        return { ok:true, playerName:String(state.playerName || '').trim() || 'あなた', countAfter:count - 1, minutes, remainingMinutes:eligibility.remainingMinutes };
      } catch (error) {
        console.warn('[PurpleCapsule] begin failed', error);
        return { ok:false, error };
      }
    },
    finishPurpleCapsuleUse() {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        state.game = state.game && typeof state.game === 'object' && !Array.isArray(state.game) ? state.game : {};
        const beforeMinutes = Math.max(0, Math.floor(Number(state.game.minutes) || 0));
        const remaining = Math.max(0, PURPLE_CAPSULE_DAY_END_MINUTES - beforeMinutes);
        if (remaining < PURPLE_CAPSULE_REQUIRED_MINUTES) return { ok:false, reason:'insufficient-time' };
        let usedService = true;
        for (let i = 0; i < 3; i += 1) {
          try { eventServices.spendMealTime?.(); }
          catch (_) { usedService = false; break; }
        }
        if (!usedService || Math.max(0, Math.floor(Number(state.game.minutes) || 0)) < beforeMinutes + PURPLE_CAPSULE_REQUIRED_MINUTES) {
          state.game.minutes = Math.min(PURPLE_CAPSULE_DAY_END_MINUTES, beforeMinutes + PURPLE_CAPSULE_REQUIRED_MINUTES);
        }
        state.wellbeing = state.wellbeing && typeof state.wellbeing === 'object' && !Array.isArray(state.wellbeing) ? state.wellbeing : {};
        state.wellbeing.hunger = Math.max(0, Math.floor(Number(state.wellbeing.hunger) || 0) - 3);
        persist();
        try { eventServices.render?.(); } catch (_) {}
        return { ok:true, minutes:Math.max(0, Math.floor(Number(state.game.minutes) || 0)), hunger:Math.max(0, Math.floor(Number(state.wellbeing.hunger) || 0)) };
      } catch (error) {
        console.warn('[PurpleCapsule] finish failed', error);
        return { ok:false, error };
      }
    },
    playEventSfx(name, options = {}) {
      try { playSfx?.(String(name || 'select'), options); return { ok:true }; }
      catch (error) { return { ok:false, error }; }
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
    bankRuntimeSnapshot() {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        if (!bankEngine) return { ok:false, reason:'bank-module-unavailable' };
        state.game = state.game && typeof state.game === 'object' && !Array.isArray(state.game) ? state.game : {};
        const day = Math.max(1, Math.floor(Number(state.game.day) || 1));
        const startDate = String(state.game.startDate || '');
        const interest = accrueBankInterest(state, day);
        if (interest.changed) persist();
        const schedule = { startDate, day };
        return {
          ok:true,
          game:{
            day,
            startDate,
            minutes:Math.max(0, Math.floor(Number(state.game.minutes) || 0)),
            money:Math.max(0, Math.floor(Number(state.game.money) || 0)),
          },
          bank:{
            balance:Math.max(0, Math.floor(Number(state.bank?.balance) || 0)),
            lastInterestDay:Math.max(1, Math.floor(Number(state.bank?.lastInterestDay) || day)),
          },
          open:bankIsOpen(state.game.minutes, { startDate:state.game.startDate, day }),
          closureReason:bankClosureReason(state.game.minutes, schedule),
          interest,
        };
      } catch (error) {
        console.warn('[EventStateHelpers] bankRuntimeSnapshot failed', error);
        return { ok:false, error };
      }
    },
    refreshBankEventScene() {
      try { eventServices.render?.(); } catch (_) {}
    },
    purchasePurpleCapsule(receipt) {
      const result = purchasePurpleCapsule(readState(), receipt);
      if (result.ok) {
        try { eventServices.addFinance?.('紫のカプセルを購入', 0, result.amount); } catch (_) {}
        persist();
      }
      return result;
    },
    bankTransaction(kind, amount) {
      try {
        const state = readState();
        if (!state) return { ok:false, reason:'state-unavailable' };
        if (!bankEngine) return { ok:false, reason:'bank-module-unavailable' };
        state.game = state.game && typeof state.game === 'object' && !Array.isArray(state.game) ? state.game : {};
        const day = Math.max(1, Math.floor(Number(state.game.day) || 1));
        if (!bankIsOpen(state.game.minutes, { startDate:state.game.startDate, day })) return { ok:false, reason:'closed' };
        const result = performBankTransaction(state, String(kind || ''), amount, state.game.day);
        if (!result.ok) return result;

        // 銀行取引は成立時だけ1時間進める。既存の時間進行を再利用し、
        // 食事用の「空腹度を減らさない」差分だけここで通常の1時間分へ戻す。
        try { eventServices.spendMealTime?.(); } catch (_) {
          state.game.minutes = Math.max(0, Math.floor(Number(state.game.minutes) || 0)) + 60;
        }
        state.wellbeing = state.wellbeing && typeof state.wellbeing === 'object' && !Array.isArray(state.wellbeing) ? state.wellbeing : {};
        state.wellbeing.hunger = Math.max(0, Math.floor(Number(state.wellbeing.hunger) || 0) - 1);

        persist();
        return {
          ...result,
          minutes:Math.max(0, Math.floor(Number(state.game.minutes) || 0)),
          hunger:Math.max(0, Math.floor(Number(state.wellbeing.hunger) || 0)),
        };
      } catch (error) {
        console.warn('[EventStateHelpers] bankTransaction failed', error);
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
