import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
assert.ok(existsSync(new URL('../js/events/bank-nezumi-rules.js',import.meta.url)), 'bank nezumi rules must exist');
const {shouldShowBankNezumi,canBuyPurpleCapsule,purchasePurpleCapsule,restorePurpleCapsuleForRetest,PURPLE_CAPSULE_RETEST_RECOVERY_KEY}=await import('../js/events/bank-nezumi-rules.js');
assert.equal(shouldShowBankNezumi(()=>0),true);
assert.equal(shouldShowBankNezumi(()=>1/30),false);
assert.equal(canBuyPurpleCapsule({ok:true,game:{money:1000000},event:{totalTriggered:2}}),true);
assert.equal(canBuyPurpleCapsule({ok:true,game:{money:999999},event:{totalTriggered:2}}),false);
assert.equal(canBuyPurpleCapsule({ok:true,game:{money:2000000},event:{totalTriggered:1}}),false);
const state={playerName:'川原',game:{money:2000000,minutes:960,day:300},events:{bluesJukeEvent:{totalTriggered:2}},inventory:{items:{energyDrink:3}},bank:{balance:123456}};
const receipt={};assert.equal(purchasePurpleCapsule(state,receipt).ok,true);assert.equal(state.game.money,1000000);assert.equal(state.inventory.items.purpleCapsule,1);assert.equal(state.inventory.items.energyDrink,3);assert.equal(state.game.minutes,960);assert.equal(state.bank.balance,123456);
assert.equal(purchasePurpleCapsule(state,receipt).reason,'already-purchased');assert.equal(state.game.money,1000000);
const denied=structuredClone(state);denied.game.money=999999;const before=JSON.stringify(denied);assert.equal(purchasePurpleCapsule(denied,{}).ok,false);assert.equal(JSON.stringify(denied),before);
const recoveryState={finance:[{label:'紫のカプセルを購入',expense:1000000}],inventory:{items:{purpleCapsule:0}},events:{}};
const recovery=restorePurpleCapsuleForRetest(recoveryState);assert.equal(recovery.handled,true);assert.equal(recovery.restored,true);assert.equal(recoveryState.inventory.items.purpleCapsule,1);
const alreadyOwned={finance:[{label:'紫のカプセルを購入',expense:1000000}],inventory:{items:{purpleCapsule:1}},events:{}};assert.equal(restorePurpleCapsuleForRetest(alreadyOwned).restored,false);assert.equal(alreadyOwned.inventory.items.purpleCapsule,1);
const noPurchase={finance:[],inventory:{items:{purpleCapsule:0}},events:{}};assert.equal(restorePurpleCapsuleForRetest(noPurchase).handled,false);assert.equal(noPurchase.inventory.items.purpleCapsule,0);
const alreadyHandled={finance:[{label:'紫のカプセルを購入',expense:1000000}],inventory:{items:{purpleCapsule:0}},events:{[PURPLE_CAPSULE_RETEST_RECOVERY_KEY]:{handled:true}}};assert.equal(restorePurpleCapsuleForRetest(alreadyHandled).handled,false);assert.equal(alreadyHandled.inventory.items.purpleCapsule,0);
const restoreViaPurchase={finance:[{label:'紫のカプセルを購入',expense:1000000}],inventory:{items:{purpleCapsule:0}},events:{}};const restoreReceipt=purchasePurpleCapsule(restoreViaPurchase,{retestRestore:true});assert.equal(restoreReceipt.ok,false);assert.equal(restoreReceipt.handled,true);assert.equal(restoreReceipt.restored,true);assert.equal(restoreViaPurchase.inventory.items.purpleCapsule,1);
const {createEventStateHelpers,setServices}=await import('../js/events/event-state-helpers.js');let saves=0,finance=[];setServices(null,null,(...a)=>finance.push(a));const helper=createEventStateHelpers(()=>state,()=>{saves++});assert.equal(helper.purchasePurpleCapsule({}).ok,true);assert.equal(saves,1);assert.deepEqual(finance,[['紫のカプセルを購入',0,1000000]]);
const {GENERAL_ITEMS,migrateState}=await import('../js/game-data.js');assert.equal(GENERAL_ITEMS.purpleCapsule.usable,true);assert.equal(migrateState(structuredClone(state)).inventory.items.purpleCapsule,2);
const {canUsePurpleCapsule,purpleCapsuleBluesmanLines}=await import('../js/events/purple-capsule-rules.js');
assert.equal(canUsePurpleCapsule({minutes:19*60,count:1}).ok,true,'19:00は残り3時間ちょうどなので使用できる');
assert.equal(canUsePurpleCapsule({minutes:19*60+1,count:1}).reason,'insufficient-time','19:01は残り3時間未満なので使用できない');
assert.equal(canUsePurpleCapsule({minutes:18*60,count:0}).reason,'no-item','所持数0では使用できない');
assert.deepEqual(purpleCapsuleBluesmanLines('川原'),[
  '「おう、、、また来たな！川原様々！！、、、この店はいっつもオマエのブルースで盛り上がってるぜ！！、、、」',
  '「サイコーだぜ、まったく！、オマエはサイコー！、、、」',
  '「今日も好きなだけ楽しんでってくれよな、兄弟！、、、、、」',
]);
const eventSource=readFileSync(new URL('../js/events/purple-capsule-event.js',import.meta.url),'utf8');
assert.match(eventSource,/\[data-action="use-phone-item"\]\[data-id="purpleCapsule"\]/,'紫のカプセルイベントは実際のスマホ使用ボタンのdata-id属性を捕捉する');
assert.match(eventSource,/normal\('outside', '「あ、、、、あの店だ、、、また来れたのか、、、、」', '', false\)/,'店外の主人公セリフではキャラクター名を表示しない');
assert.match(eventSource,/normal\('inside', '「やっぱり、、落ち着くなぁ、、、、」', '', false\)/,'店内の主人公セリフではキャラクター名を表示しない');
assert.match(eventSource,/blackDialogue\('「眠くなってきた、、、、、」', ''\)/,'眠気の主人公セリフではキャラクター名を表示しない');
assert.match(eventSource,/stage === 'blues3'[\s\S]*blackout\(\(\) => \{[\s\S]*stage = 'sleep'/,'ブルースマン3セリフ後は2秒暗転してから眠気セリフへ進む');
assert.match(eventSource,/stage === 'sleep'[\s\S]*blackDialogue\('「眠くなってきた、、、、、」'/,'眠気セリフは背景画像なしの真っ暗な画面で表示する');
assert.match(eventSource,/stage === 'sleep'[\s\S]*blackout\(finish\)/,'眠気セリフをタップ後は2秒暗転して終了する');
assert.match(eventSource,/purchasePurpleCapsule\(\{ retestRestore:true \}\)/,'再確認用復旧は既存の紫カプセル状態APIを経由する');
assert.match(eventSource,/patchEventState\(PURPLE_CAPSULE_RETEST_RECOVERY_KEY/,'再確認用復旧済み状態を保存して二重復旧を防ぐ');
assert.match(eventSource,/window\.addEventListener\('click',\s*click,\s*true\)/,'紫のカプセル使用クリックは既存のdocument側アイテム処理より先に捕捉する');
assert.match(eventSource,/purple-capsule-float-bg/,'紫のカプセル背景に専用の大きな揺れを付ける');
assert.match(eventSource,/scale\(1\.055\) translate3d\(-1\.8%,1\.0%,0\)/,'背景揺れの承認済み開始値を維持する');
assert.match(eventSource,/scale\(1\.062\) translate3d\(-2\.1%,-1\.2%,0\)/,'背景揺れの承認済み最大値を維持する');
assert.match(eventSource,/purple-capsule-character-motion/,'ブルースマンだけに専用回転アニメーションを付ける');
assert.match(eventSource,/rotate\(205deg\) scale\(1\.04\)/,'ブルースマンの大きな回転と拡大を維持する');
assert.match(eventSource,/rotate\(344deg\) scale\(1\.02\)/,'ブルースマンの一周近い回転を維持する');
console.log('BANK NEZUMI + PURPLE CAPSULE: purchase, retest recovery, use eligibility, approved dialogue, sequence, migration and motion PASS');
