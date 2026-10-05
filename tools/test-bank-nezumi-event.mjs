import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
assert.ok(existsSync(new URL('../js/events/bank-nezumi-rules.js',import.meta.url)), 'bank nezumi rules must exist');
const {shouldShowBankNezumi,canBuyPurpleCapsule,purchasePurpleCapsule}=await import('../js/events/bank-nezumi-rules.js');
assert.equal(shouldShowBankNezumi(()=>0),true);
assert.equal(shouldShowBankNezumi(()=>1/30),false);
assert.equal(canBuyPurpleCapsule({ok:true,game:{money:1000000},event:{totalTriggered:2}}),true);
assert.equal(canBuyPurpleCapsule({ok:true,game:{money:999999},event:{totalTriggered:2}}),false);
assert.equal(canBuyPurpleCapsule({ok:true,game:{money:2000000},event:{totalTriggered:1}}),false);
const state={playerName:'川原',game:{money:2000000,minutes:960,day:300},events:{bluesJukeEvent:{totalTriggered:2}},inventory:{items:{energyDrink:3}},bank:{balance:123456}};
const receipt={};assert.equal(purchasePurpleCapsule(state,receipt).ok,true);assert.equal(state.game.money,1000000);assert.equal(state.inventory.items.purpleCapsule,1);assert.equal(state.inventory.items.energyDrink,3);assert.equal(state.game.minutes,960);assert.equal(state.bank.balance,123456);
assert.equal(purchasePurpleCapsule(state,receipt).reason,'already-purchased');assert.equal(state.game.money,1000000);
const denied=structuredClone(state);denied.game.money=999999;const before=JSON.stringify(denied);assert.equal(purchasePurpleCapsule(denied,{}).ok,false);assert.equal(JSON.stringify(denied),before);
const {createEventStateHelpers,setServices}=await import('../js/events/event-state-helpers.js');let saves=0,finance=[];setServices(null,null,(...a)=>finance.push(a));const helper=createEventStateHelpers(()=>state,()=>{saves++});assert.equal(helper.purchasePurpleCapsule({}).ok,true);assert.equal(saves,1);assert.deepEqual(finance,[['紫のカプセルを購入',0,1000000]]);
const {GENERAL_ITEMS,migrateState}=await import('../js/game-data.js');assert.equal(GENERAL_ITEMS.purpleCapsule.usable,true);assert.equal(migrateState(structuredClone(state)).inventory.items.purpleCapsule,2);
const {canUsePurpleCapsule,purpleCapsuleBluesmanLines}=await import('../js/events/purple-capsule-rules.js');
assert.equal(canUsePurpleCapsule({minutes:19*60,count:1}).ok,true,'19:00は残り3時間ちょうどなので使用できる');
assert.equal(canUsePurpleCapsule({minutes:19*60+1,count:1}).reason,'insufficient-time','19:01は残り3時間未満なので使用できない');
assert.equal(canUsePurpleCapsule({minutes:18*60,count:0}).reason,'no-item','所持数0では使用できない');
assert.deepEqual(purpleCapsuleBluesmanLines('川原'),[
  '「おう、、また来たな！川原様々！、、、、いっつもこの店はオマエのブルースで盛り上がってるぜ！、、、」',
  '「モテも人気も金も時間も全部忘れて音に溶けろ、、、、、、それが俺のブルースだ！」',
  '「、、、、、、もうオマエの時間そのものが俺のブルースになってるけどな！、、、、、、」',
]);
const eventSource=readFileSync(new URL('../js/events/purple-capsule-event.js',import.meta.url),'utf8');
assert.match(eventSource,/window\.addEventListener\('click',\s*click,\s*true\)/,'紫のカプセル使用クリックは既存のdocument側アイテム処理より先に捕捉する');
assert.match(eventSource,/purple-capsule-float-bg/,'紫のカプセル背景に専用の大きな揺れを付ける');
assert.match(eventSource,/scale\(1\.055\) translate3d\(-1\.8%,1\.0%,0\)/,'背景揺れの承認済み開始値を維持する');
assert.match(eventSource,/scale\(1\.062\) translate3d\(-2\.1%,-1\.2%,0\)/,'背景揺れの承認済み最大値を維持する');
assert.match(eventSource,/purple-capsule-character-motion/,'ブルースマンだけに専用回転アニメーションを付ける');
assert.match(eventSource,/rotate\(205deg\) scale\(1\.04\)/,'ブルースマンの大きな回転と拡大を維持する');
assert.match(eventSource,/rotate\(344deg\) scale\(1\.02\)/,'ブルースマンの一周近い回転を維持する');
console.log('BANK NEZUMI + PURPLE CAPSULE: purchase, use eligibility, dialogue, migration and approved motion PASS');
