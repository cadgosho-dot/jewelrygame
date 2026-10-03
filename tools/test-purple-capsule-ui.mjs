import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.listeners={};this.classList={toggle(){},add(){},remove(){}};}
  setAttribute(k,v){this.attrs[k]=v;}
  append(...children){this.children.push(...children);}
  replaceChildren(){this.children=[];}
  addEventListener(k,fn){this.listeners[k]=fn;}
  focus(){}
  remove(){body.children=body.children.filter(c=>c!==this);}
  querySelector(){return this.children.find(c=>c.tag==='button');}
}
const body=new Element('body'),toast=new Element('div');
let click,observer,timer,stage='opening',active=false,owned=2,minutes=1141,returned=null;
const helper={beginPurpleCapsule(){if(active)return {ok:false,reason:'active'};if(minutes>1140)return {ok:false,reason:'time'};active=true;owned--;stage='opening';return {ok:true};},purpleCapsuleSnapshot(){return {ok:true,playerName:'川原',event:{active,stage}};},patchEventState(_,patch){stage=patch.stage;},finishPurpleCapsule(){active=false;minutes+=180;return {ok:true};}};
const context=vm.createContext({console,globalThis:null,document:{body,createElement:tag=>new Element(tag),getElementById:id=>id==='toast'?toast:{querySelector:()=>true},addEventListener:(_,fn)=>click=fn},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},setTimeout:(fn,ms)=>{timer={fn,ms};return 1;},clearTimeout:()=>{timer=null;},switchAudio:()=>Promise.resolve(),playSfx:()=>{}});
context.globalThis=context;context.__JXJ_EVENT_STATE_HELPERS__=helper;context.__JXJ_N=(...args)=>returned=args;
const source=fs.readFileSync(new URL('../js/events/purple-capsule-event.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
vm.runInContext(source,context);
const use=()=>click({target:{closest:()=>({disabled:false})},preventDefault(){},stopImmediatePropagation(){}});
const overlay=()=>body.children[0];
const next=()=>{const b=overlay().querySelector();assert.ok(b);b.listeners.click({stopPropagation(){}});};
const text=()=>overlay().querySelector()?.children.map(c=>c.textContent).join('');
use();assert.equal(owned,2);assert.equal(toast.textContent,'今日はこれは使わずに寝たほうがいいです');assert.equal(body.children.length,0);
minutes=1140;use();assert.equal(owned,1);assert.equal(timer.ms,2000);assert.equal(overlay().querySelector(),undefined);
timer.fn();assert.equal(stage,'outside');next();assert.match(text(),/やっぱり、、落ち着くなぁ/);
next();assert.match(text(),/川原様々！/);assert.match(text(),/いっつもこの店は/);
// Removing the overlay simulates a page interruption; the saved stage resumes.
overlay().remove();vm.runInContext('overlay=null',context);observer();assert.match(text(),/川原様々！/);assert.equal(owned,1);
next();assert.match(text(),/サイコーだぜ/);next();assert.match(text(),/兄弟！/);next();assert.equal(timer.ms,2000);assert.equal(overlay().querySelector(),undefined);
timer.fn();assert.equal(text(),'眠くなってきた、、、、、タップして進む');next();assert.equal(timer.ms,2000);timer.fn();
assert.equal(minutes,1320);assert.equal(owned,1);assert.equal(active,false);assert.equal(body.children.length,0);assert.equal(JSON.stringify(returned),JSON.stringify(['phone',{phoneTab:'items'},false]));
console.log('Purple capsule UI: PASS (time warning, 3 fades, dialogue, saved-stage resume and item-screen return)');
