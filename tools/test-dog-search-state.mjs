import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const modulePath = new URL('../js/events/dog-search-state.js', import.meta.url);
assert.ok(existsSync(modulePath), 'Dog search state module must exist');
const { pickDogSearchEvent, normalizedDogSearchState, createDogSearchController, DOG_SEARCH_RESET_GENERATION } = await import(modulePath);
const { DOG_SEARCH_EVENTS } = await import('../js/events/dog-search-data.js');
const make = () => ({ playerName:'川原', game:{day:130,money:10000,minutes:600},wellbeing:{hunger:2},inventory:{metals:{gold:9999}},events:{wolfMotherButlerEvent:{completed:true,startedDay:100}} });

const legacy=make();
legacy.events.dogSearchEvent={
  active:true,
  seenEventIds:['meal_ice','meal_kebab'],
  finalActive:true,
  finalStage:'reward',
  finalRewardGranted:true,
  lastCompletedDay:129,
};
let legacySaves=0;
const legacyHelper={
  patchEventState(key,patch){
    Object.assign(legacy.events[key]??={},patch);
    legacySaves++;
    return {ok:true};
  },
};
const legacyController=createDogSearchController({getState:()=>legacy,helpers:()=>legacyHelper});
const legacyReset=legacyController.ensureCurrentGeneration();
assert.equal(legacyReset.ok,true);
assert.equal(legacyReset.reset,true);
assert.equal(legacy.events.dogSearchEvent.resetGeneration,DOG_SEARCH_RESET_GENERATION);
assert.equal(legacy.events.dogSearchEvent.active,false);
assert.deepEqual(legacy.events.dogSearchEvent.seenEventIds,[]);
assert.equal(legacy.events.dogSearchEvent.finalActive,false);
assert.equal(legacy.events.dogSearchEvent.finalStage,'question');
assert.equal(legacy.events.dogSearchEvent.finalRewardGranted,false);
assert.equal(legacy.events.dogSearchEvent.lastCompletedDay,0);
assert.equal(legacySaves,1,'legacy reset must persist exactly once');
assert.equal(legacyController.ensureCurrentGeneration().reset,false);
assert.equal(legacySaves,1,'current generation must not reset repeatedly');
assert.deepEqual(pickDogSearchEvent(legacy,'store',()=>.199),{kind:'intro'},'reset players must be eligible for the intro again under the original trigger conditions');
let calls=0; const roll = n => () => {calls++;return n;};
let s=make();
assert.equal(pickDogSearchEvent({...s,events:{}},'store',roll(0)),null);
s.game.day=129; assert.equal(pickDogSearchEvent(s,'store',roll(0)),null); assert.equal(calls,0);
s.game.day=130; assert.equal(pickDogSearchEvent(s,'store',roll(.2)),null);
assert.deepEqual(pickDogSearchEvent(s,'store',roll(.19999)),{kind:'intro'});
assert.equal(pickDogSearchEvent(s,'meal:ice',roll(0)),null);
const saved=[];
const helper={patchEventState(key,patch){Object.assign(s.events[key]??={},patch);saved.push(structuredClone(s));return{ok:true};},grantMetalIgnoreCapacity(key,n,options){const e=s.events[options.eventKey];if(e[options.rewardFlag])return{ok:true,alreadyGranted:true};s.inventory.metals[key]+=n;Object.assign(e,options.eventPatch,{[options.rewardFlag]:true});saved.push(structuredClone(s));return{ok:true};}};
const c=createDogSearchController({getState:()=>s,helpers:()=>helper});
c.completeIntro(); assert.equal(s.events.dogSearchEvent.active,true);
assert.equal(DOG_SEARCH_EVENTS.length,16);
for(const e of DOG_SEARCH_EVENTS){assert.deepEqual(pickDogSearchEvent(s,e.entry,roll(.499)),{kind:'middle',id:e.id});assert.equal(pickDogSearchEvent(s,e.entry,roll(.5)),null);}
assert.equal(s.events.dogSearchEvent.seenEventIds.length,0,'roll or cancellation must not complete a conversation');
const ids=DOG_SEARCH_EVENTS.map(e=>e.id);
for(const id of ids.slice(0,4))c.completeMiddle(id);
c.completeMiddle(ids[0]);assert.equal(s.events.dogSearchEvent.seenEventIds.length,4);
assert.equal(pickDogSearchEvent(s,'okachimachi',roll(0)),null);
s=JSON.parse(JSON.stringify(s));s.game.day++;
assert.equal(pickDogSearchEvent(s,DOG_SEARCH_EVENTS[0].entry,roll(0)),null);
c.completeMiddle(ids[4]);assert.equal(s.events.dogSearchEvent.finalActive,false,'fifth completion must not start final');
c.completeMiddle(ids[5]);assert.equal(s.events.dogSearchEvent.seenEventIds.length,5);
assert.equal(pickDogSearchEvent(s,DOG_SEARCH_EVENTS[5].entry,roll(0)),null);
assert.equal(pickDogSearchEvent(s,'okachimachi',roll(.5)),null);
assert.deepEqual(pickDogSearchEvent(s,'okachimachi',roll(.49)),{kind:'final',stage:'question'});
c.startFinal('reward');assert.equal(c.receiveReward().ok,true);assert.equal(c.receiveReward().ok,true);assert.equal(s.inventory.metals.gold,10019);
s=JSON.parse(JSON.stringify(s));const c2=createDogSearchController({getState:()=>s,helpers:()=>helper});
assert.equal(c2.receiveReward().ok,true);assert.equal(s.inventory.metals.gold,10019);
assert.deepEqual(pickDogSearchEvent(s,'okachimachi',roll(.99)),{kind:'final',stage:'wolfFinal'});
c2.finishFinal();assert.equal(s.events.dogSearchEvent.lastCompletedDay,131);assert.equal(s.events.dogSearchEvent.active,false);assert.equal(s.events.dogSearchEvent.finalStage,'completed');assert.deepEqual(s.events.dogSearchEvent.seenEventIds,[]);
s.game.day=310;assert.equal(pickDogSearchEvent(s,'store',roll(0)),null);
s.game.day=311;assert.deepEqual(pickDogSearchEvent(s,'store',roll(.199)),{kind:'intro'});assert.equal(pickDogSearchEvent(s,'store',roll(.2)),null);
c2.completeIntro();assert.equal(s.events.dogSearchEvent.finalRewardGranted,false);
assert.deepEqual(normalizedDogSearchState({seenEventIds:[ids[0],ids[0],'fake',...ids]}).seenEventIds,ids.slice(0,5));
assert.equal(s.game.money,10000);assert.equal(s.game.minutes,600);assert.equal(s.wellbeing.hunger,2);
console.log('PASS: dog search replay reset, conditions, 16 entries, unique progress, reload reward, recurrence, no economic effects');
