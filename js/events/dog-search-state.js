import { DOG_SEARCH_EVENTS } from './dog-search-data.js';

export const DOG_SEARCH_KEY = 'dogSearchEvent';
export const DOG_SEARCH_RESET_GENERATION = 1;
export const DOG_SEARCH_FINAL_STAGES = Object.freeze(['question','cabbage','dog-wait','dog','blackout','wolf1','wolf2','butler1','butler2','reward','wolfFinal','completed']);
const ids = new Set(DOG_SEARCH_EVENTS.map(row => row.id));
const validStages = new Set(DOG_SEARCH_FINAL_STAGES);
const dayNumber = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
const generationNumber = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

export function normalizedDogSearchState(value = {}) {
  const event = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    active:event.active === true,
    seenEventIds:[...new Set(Array.isArray(event.seenEventIds) ? event.seenEventIds.filter(id => ids.has(id)) : [])].slice(0,5),
    finalActive:event.finalActive === true,
    finalStage:validStages.has(event.finalStage) ? event.finalStage : 'question',
    finalRewardGranted:event.finalRewardGranted === true,
    lastCompletedDay:dayNumber(event.lastCompletedDay),
    resetGeneration:generationNumber(event.resetGeneration),
  };
}

export function pickDogSearchEvent(state, entry, random = Math.random) {
  if (!state?.game) return null;
  const event = normalizedDogSearchState(state.events?.[DOG_SEARCH_KEY]);
  if (event.active) {
    if (event.finalActive) {
      return entry === 'okachimachi' ? {kind:'final',stage:event.finalRewardGranted ? 'wolfFinal' : event.finalStage} : null;
    }
    if (event.seenEventIds.length >= 5) {
      return entry === 'okachimachi' && random() < .5 ? {kind:'final',stage:'question'} : null;
    }
    const candidate = DOG_SEARCH_EVENTS.find(row => row.entry === entry);
    return candidate && !event.seenEventIds.includes(candidate.id) && random() < .5 ? {kind:'middle',id:candidate.id} : null;
  }
  if (entry !== 'store') return null;
  const today = dayNumber(state.game.day);
  if (event.lastCompletedDay) {
    if (today < event.lastCompletedDay + 180) return null;
  } else {
    const mother = state.events?.wolfMotherButlerEvent;
    const motherDay = dayNumber(mother?.startedDay);
    if (mother?.completed !== true || !motherDay || today < motherDay + 30) return null;
  }
  return random() < .2 ? {kind:'intro'} : null;
}

export function createDogSearchController({getState, helpers}) {
  const current = () => normalizedDogSearchState(getState()?.events?.[DOG_SEARCH_KEY]);
  const patch = value => helpers()?.patchEventState?.(DOG_SEARCH_KEY,value) || {ok:false};
  const storedGeneration = () => generationNumber(getState()?.events?.[DOG_SEARCH_KEY]?.resetGeneration);
  return Object.freeze({
    current,
    ensureCurrentGeneration() {
      const generation = storedGeneration();
      if (generation >= DOG_SEARCH_RESET_GENERATION) {
        return {ok:true,reset:false,generation};
      }
      const result = patch({
        active:false,
        seenEventIds:[],
        finalActive:false,
        finalStage:'question',
        finalRewardGranted:false,
        lastCompletedDay:0,
        resetGeneration:DOG_SEARCH_RESET_GENERATION,
      });
      if (!result?.ok) return result || {ok:false};
      return { ...result, reset:true, generation:DOG_SEARCH_RESET_GENERATION };
    },
    completeIntro() {
      return patch({
        active:true,
        seenEventIds:[],
        finalActive:false,
        finalStage:'question',
        finalRewardGranted:false,
        lastCompletedDay:0,
        resetGeneration:DOG_SEARCH_RESET_GENERATION,
      });
    },
    completeMiddle(id) {
      const event=current();
      if (!event.active || event.finalActive || !ids.has(id) || event.seenEventIds.length >= 5 || event.seenEventIds.includes(id)) return {ok:false};
      return patch({seenEventIds:[...event.seenEventIds,id]});
    },
    startFinal(stage='question') {
      const event=current();
      if (!event.active || event.seenEventIds.length < 5) return {ok:false};
      return patch({finalActive:true,finalStage:event.finalRewardGranted ? 'wolfFinal' : (validStages.has(stage) ? stage : 'question')});
    },
    setFinalStage(stage) {
      if (!current().finalActive || !validStages.has(stage)) return {ok:false};
      return patch({finalStage:stage});
    },
    receiveReward() {
      const event=current();
      if (!event.active || !event.finalActive) return {ok:false};
      if (event.finalRewardGranted) return {ok:true,alreadyGranted:true};
      if (event.finalStage !== 'reward') return {ok:false};
      return helpers()?.grantMetalIgnoreCapacity?.('gold',20,{
        withSound:false,eventKey:DOG_SEARCH_KEY,rewardFlag:'finalRewardGranted',eventPatch:{finalStage:'wolfFinal'},
      }) || {ok:false};
    },
    finishFinal() {
      const event=current();
      if (!event.finalActive || !event.finalRewardGranted) return {ok:false};
      return patch({active:false,seenEventIds:[],finalActive:false,finalStage:'completed',finalRewardGranted:false,lastCompletedDay:Math.max(1,dayNumber(getState()?.game?.day))});
    },
  });
}
