import { suspendAudio, resumeAudio, playSfx, vibrate } from '../audio.js?v=0.10.962';

const OVERLAY_ID='jxj-oyatsu-malatang-overlay';
const STYLE_ID='jxj-oyatsu-malatang-style';
const EVENT_KEY='oyatsuMalatangEvent';
const OYATSU_MALATANG_EVENT_CHANCE=0.015;
const PRICE=3500;
const CHARACTER='./assets/images/events/oyatsu-daisuki.png?v=0.10.961-oyatsu23-image';
const FOOD='./assets/images/foods/oyatsu-malatang.png';
const SHOP_L='./assets/images/backgrounds/oyatsu-malatang-shop.jpg';
const SHOP_P='./assets/images/backgrounds/oyatsu-malatang-shop-portrait.jpg';
const MENU_L='./assets/images/meal-menu.webp';
const MENU_P='./assets/images/meal-menu-portrait.webp';
const MOVIE='./assets/videos/events/oyatsu-malatang-event.mp4';
const BGM='./assets/audio/bgm-meal.ogg';
const SKIP_DELAY=1500;
const PAYMENT_DURATION=1200;
const STAGES=new Set(['intro1','intro2','movie','meal','after1','after2']);
const LINES={
  intro1:(name)=>`Hey、へい！${name}、、、ハイホー！`,
  intro2:()=> '麻辣湯いこーよっ、、、最近流行ってるよねぇ、、、、',
  after1:()=> '美味しかったね！、、次は激辛たのもっと！',
  after2:()=> 'ばいびー、、、',
};

let running=false,stage='intro1',overlay=null,video=null,bgm=null,skipTimer=0,finishing=false,charged=false,capturedButton=null,paymentFrame=0,paymentTimer=0,eatTimer=0,paymentTransitioning=false;

const H=()=>globalThis.__JXJ_EVENT_STATE_HELPERS__||null;
const snap=()=>{
  try{
    const r=H()?.eventRuntimeSnapshot?.(EVENT_KEY);
    if(r?.ok)return r;
  }catch(_){}
  try{
    const s=globalThis.__JXJ_MEMORIES_STATE__?.();
    return s?{ok:true,playerName:s.playerName||'',game:s.game||{},wellbeing:s.wellbeing||{},event:s.events?.[EVENT_KEY]||{}}:null;
  }catch(_){return null}
};
const patch=(p)=>{try{return H()?.patchEventState?.(EVENT_KEY,p)||null}catch(_){return null}};
const portrait=()=>innerHeight>=innerWidth;
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const player=()=>String(snap()?.playerName||'').trim()||'あなた';
const yen=(n)=>`${Math.max(0,Math.floor(Number(n)||0)).toLocaleString('ja-JP')}円`;

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const l=document.createElement('link');l.id=STYLE_ID;l.rel='stylesheet';l.href='./oyatsu-malatang-event.css?v=0.10.962-oyatsu23';document.head.appendChild(l);
}
function playBgm(){
  try{
    if(!bgm){bgm=new Audio(BGM);bgm.loop=true;bgm.preload='auto';bgm.volume=.55}
    bgm.play()?.catch?.(()=>{});
  }catch(_){}
}
function stopBgm(){try{bgm?.pause();if(bgm)bgm.currentTime=0}catch(_){}}
function endButton(){return '<button type="button" class="event-safety-recovery" data-mala="end">イベント終了</button>'}
function background(src){return `<div class="malatang-background" style="background-image:url('${src}')" aria-hidden="true"></div>`}
function renderDialogue(){
  const line=LINES[stage]?.(player())||'';
  overlay.innerHTML=`${background(portrait()?MENU_P:MENU_L)}
  <main class="main-screen malatang-dialogue-screen"><section class="visit-character-event">
    <div class="visit-character-area"><div class="malatang-character-shell"><img class="visit-character" src="${CHARACTER}" alt="おやつ大好き" draggable="false"></div></div>
    <button type="button" class="event-dialogue-card visit-event-dialogue glass-panel jxj-transparent-dialogue" data-mala="next">
      <small>おやつ大好き</small><strong>${esc(line)}</strong><span>タップして進む</span>
    </button>
  </section></main>${endButton()}`;
}
function status(){
  const s=snap()||{},g=s.game||{},w=s.wellbeing||{},day=Math.max(1,Math.floor(Number(g.day)||1)),min=Math.max(0,Math.floor(Number(g.minutes)||0));
  const max=Math.max(1,Math.floor(Number(w.maxHunger)||7)),h=Math.max(0,Math.min(max,Math.floor(Number(w.hunger)||0)));
  let date='',wd='',start=String(g.startDate||'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(start)){
    const [y,m,d]=start.split('-').map(Number),x=new Date(y,m-1,d+day-1,12);
    if(!Number.isNaN(x.getTime())){date=`${x.getFullYear()}年${x.getMonth()+1}月${x.getDate()}日`;wd=`（${['日','月','火','水','木','金','土'][x.getDay()]}）`}
  }
  return {date,wd,day,weather:String(g.weather||'晴れ'),time:`${String(Math.floor(min/60)%24).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`,name:String(s.playerName||'').trim()||'あなた',h,max,money:Math.max(0,Math.floor(Number(g.money)||0))};
}
function header(){
  const s=status();
  return `<header class="game-header"><div class="top-bar-one jwj-status-bar">
   <div class="jwj-status-primary"><span class="jwj-status-item jwj-calendar-date">${esc(s.date)}</span><span class="jwj-status-item jwj-weekday weekday-normal">${esc(s.wd)}</span><span class="jwj-status-item jwj-day">${s.day}日目</span><span class="jwj-status-item jwj-weather"><span class="jwj-weather-icon">☀️</span><span>${esc(s.weather)}</span></span></div>
   <div class="jwj-status-secondary"><span class="jwj-status-time-wrap"><span class="jwj-status-item">${s.time}</span></span><span class="jwj-status-item jwj-player-name">${esc(s.name)}</span><span class="jwj-status-item jwj-hunger">空腹度${s.h}／${s.max}</span></div>
   <div class="header-money-area jwj-money-area"><span class="header-money"><span class="header-money-value">${yen(s.money)}</span></span></div>
  </div></header>`;
}
function settle(){
  try{
    const r=H()?.settleEventMeal?.(EVENT_KEY,{price:PRICE,mealId:'oyatsuMalatang',mealLabel:'麻辣湯'});
    if(!r?.ok)return r||{ok:false,reason:'settle-unavailable'};charged=true;return r;
  }catch(_){return {ok:false,reason:'settle-error'}}
}
function lockMeal(){
  if(!overlay||stage!=='meal')return;
  const p=overlay.querySelector('.malatang-meal-panel'),f=overlay.querySelector('.meal-food-display'),i=f?.querySelector('img'),c=p?.querySelector('strong');
  if(!(p instanceof HTMLElement)||!(f instanceof HTMLElement)||!(i instanceof HTMLImageElement)||!(c instanceof HTMLElement))return;
  if(innerWidth<=innerHeight){[p,f,i,c].forEach(e=>e.removeAttribute('style'));return}
  p.style.cssText='flex:1 1 0!important;width:min(88vw,1050px)!important;max-width:min(88vw,1050px)!important;height:100%!important;min-height:0!important;max-height:100%!important;margin:0 auto!important;padding:2px 12px 5px!important;transform:none!important;display:grid!important;grid-template-rows:minmax(0,1fr) 30px!important;gap:0!important;overflow:hidden!important';
  f.style.cssText='width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;overflow:hidden!important;box-sizing:border-box!important';
  i.style.cssText='display:block!important;width:auto!important;height:100%!important;max-height:100%!important;max-width:min(76vw,900px)!important;margin:0 auto!important;object-fit:contain!important;object-position:center top!important';
  c.style.cssText='position:static!important;height:30px!important;min-height:30px!important;margin:0!important;padding:0!important;display:grid!important;place-items:center!important;font-size:clamp(18px,2.4vw,26px)!important;line-height:1!important';
}
function renderMeal(){
  stage='meal';patch({active:true,stage,charged});
  overlay.innerHTML=`${background(portrait()?SHOP_P:SHOP_L)}<main class="screen-shell meal-eating-shell malatang-meal-shell">${header()}
    <section class="screen-content meal-eating-screen-content"><button type="button" class="meal-eating-panel meal-eating-finish-button glass-panel malatang-meal-panel" data-mala="meal-finish">
      <figure class="meal-food-display"><img src="${FOOD}" alt="上野御徒町麻辣湯" loading="eager" draggable="false"></figure><strong>もぐもぐもぐ</strong>
    </button></section></main>${endButton()}`;
  requestAnimationFrame(lockMeal);
}
function clearMealPayment(){
  if(paymentFrame){cancelAnimationFrame(paymentFrame);paymentFrame=0}
  if(paymentTimer){clearTimeout(paymentTimer);paymentTimer=0}
  if(eatTimer){clearTimeout(eatTimer);eatTimer=0}
  paymentTransitioning=false;
}
function finishMealPayment(){
  if(!running||stage!=='meal')return;
  if(paymentFrame){cancelAnimationFrame(paymentFrame);paymentFrame=0}
  paymentTimer=0;eatTimer=0;paymentTransitioning=false;persist('after1');renderDialogue();
}
function animateMealPayment(result){
  const money=overlay?.querySelector('.header-money'),value=money?.querySelector('.header-money-value');
  if(!(money instanceof HTMLElement)||!(value instanceof HTMLElement))return;
  const toAmount=Math.max(0,Math.floor(Number(result?.money)||0)),fromAmount=toAmount+PRICE,startedAt=performance.now();
  money.classList.add('money-change-active','money-loss');
  const delta=document.createElement('span');delta.className='header-money-change loss';delta.textContent=`−${PRICE.toLocaleString('ja-JP')}円`;money.appendChild(delta);
  value.textContent=yen(fromAmount);playSfx('coin');
  const tick=(now)=>{
    if(!running||stage!=='meal')return;
    const elapsed=Math.max(0,now-startedAt),raw=Math.max(0,Math.min(1,(elapsed-PAYMENT_DURATION*.18)/(PAYMENT_DURATION*.54)));
    const eased=raw<.5?4*raw*raw*raw:1-Math.pow(-2*raw+2,3)/2;
    value.textContent=yen(Math.round(fromAmount+(toAmount-fromAmount)*eased));
    if(elapsed<PAYMENT_DURATION)paymentFrame=requestAnimationFrame(tick);else{paymentFrame=0;value.textContent=yen(toAmount)}
  };
  paymentFrame=requestAnimationFrame(tick);
}
function startMealPayment(){
  if(paymentTransitioning||!running||stage!=='meal')return;
  const result=settle();
  if(!result?.ok){cleanup(false,true);return}
  paymentTransitioning=true;
  const button=overlay?.querySelector('[data-mala="meal-finish"]');if(button instanceof HTMLElement){button.setAttribute('aria-disabled','true');button.style.pointerEvents='none'}
  vibrate([55,45,55,45,70]);
  eatTimer=setTimeout(()=>{eatTimer=0;if(running&&stage==='meal')playSfx('eat',{gain:1})},420);
  if(result.alreadyCharged){paymentTimer=setTimeout(finishMealPayment,460);return}
  animateMealPayment(result);paymentTimer=setTimeout(finishMealPayment,PAYMENT_DURATION);
}
function cleanMovie(){
  if(skipTimer){clearTimeout(skipTimer);skipTimer=0}overlay?.classList.remove('movie-skip-visible');try{video?.pause()}catch(_){}video=null;
}
function finishMovie(){
  if(!running||stage!=='movie'||finishing)return;finishing=true;cleanMovie();renderMeal();finishing=false;
}
function syncMovie(){
  if(!overlay)return;const v=globalThis.visualViewport,w=Math.max(1,Math.round(Number(v?.width)||innerWidth||1)),h=Math.max(1,Math.round(Number(v?.height)||innerHeight||1));
  overlay.style.setProperty('--oyatsu-movie-vw',`${w}px`);overlay.style.setProperty('--oyatsu-movie-vh',`${h}px`);
}
function renderMovie(){
  cleanMovie();stage='movie';patch({active:true,stage,charged});syncMovie();
  overlay.innerHTML=`<main class="oyatsu-movie-stage"><video data-mala-video preload="auto" playsinline webkit-playsinline disablepictureinpicture controlslist="nodownload noplaybackrate noremoteplayback" src="${MOVIE}"></video></main>
  <button type="button" class="oyatsu-movie-skip" data-mala="movie-skip">MOVIEスキップ</button>${endButton()}`;
  video=overlay.querySelector('[data-mala-video]');
  if(!(video instanceof HTMLVideoElement))return finishMovie();
  video.addEventListener('ended',finishMovie,{once:true});video.addEventListener('error',finishMovie,{once:true});
  try{video.currentTime=0;video.volume=1;video.play()?.catch?.(()=>overlay?.classList.add('movie-skip-visible'))}catch(_){overlay?.classList.add('movie-skip-visible')}
  skipTimer=setTimeout(()=>{skipTimer=0;if(running&&stage==='movie')overlay?.classList.add('movie-skip-visible')},SKIP_DELAY);
}
function persist(next){stage=STAGES.has(next)?next:'intro1';patch({active:true,stage,charged})}
function advance(){
  if(stage==='intro1'){persist('intro2');renderDialogue()}
  else if(stage==='intro2')renderMovie();
  else if(stage==='after1'){persist('after2');renderDialogue()}
  else if(stage==='after2')cleanup(true,false);
}
function cleanup(completed=false,resumeNormal=false){
  if(!running)return;
  const final=snap(),settled=Boolean(charged||final?.event?.charged),before=Math.max(0,Math.floor(Number(final?.event?.hungerBefore)||0)),after=Math.max(0,Math.floor(Number(final?.event?.hungerAfter)||Number(final?.wellbeing?.hunger)||0));
  running=false;cleanMovie();clearMealPayment();stopBgm();overlay?.remove();overlay=null;patch({active:false,stage:'idle',charged:false,completed:Boolean(completed)});charged=false;finishing=false;resumeAudio().catch(()=>{});
  if(settled){try{H()?.completeEventMealUi?.({before,after,mealName:'麻辣湯'})}catch(_){}}
  const b=capturedButton;capturedButton=null;
  if(resumeNormal&&b instanceof HTMLElement&&b.isConnected)queueMicrotask(()=>{b.dataset.malatangBypass='1';b.click();delete b.dataset.malatangBypass});
}
function onOverlayClick(e){
  const b=e.target instanceof Element?e.target.closest('[data-mala]'):null;if(!b||!overlay?.contains(b))return;const a=b.dataset.mala;playBgm();if(a!=='meal-finish')playSfx('select',{gain:.72});
  if(a==='end')cleanup(false,false);else if(a==='movie-skip')finishMovie();else if(a==='meal-finish'&&stage==='meal')startMealPayment();else if(a==='next')advance();
}
function start(startStage='intro1',restoredCharged=false){
  if(running||document.getElementById(OVERLAY_ID))return false;ensureStyle();running=true;charged=Boolean(restoredCharged);stage=STAGES.has(startStage)?startStage:'intro1';
  overlay=document.createElement('div');overlay.id=OVERLAY_ID;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','おやつ大好き・麻辣湯イベント');overlay.addEventListener('click',onOverlayClick);overlay.addEventListener('pointerdown',playBgm,{passive:true});document.body.appendChild(overlay);
  const currentDay=Math.max(1,Math.floor(Number(snap()?.game?.day)||1));
  patch({active:true,stage,charged,completed:false,startedDay:currentDay,lastTriggeredDay:currentDay});suspendAudio();playBgm();
  if(stage==='movie')renderMovie();else if(stage==='meal')renderMeal();else renderDialogue();return true;
}
function isMealButton(e){
  if(!(e.target instanceof Element)||String(document.body?.dataset?.screen||'')!=='main')return null;const b=e.target.closest('button,[role="button"]');if(!(b instanceof HTMLElement)||b.dataset.malatangBypass==='1')return null;
  const a=String(b.dataset.action||b.getAttribute('data-nav')||'').toLowerCase(),t=`${b.getAttribute('aria-label')||''}${b.textContent||''}`.replace(/\s+/g,'');
  return ['meal','meals','food','eat','open-meal','meal-menu'].includes(a)||t==='食事'||t.includes('食事へ')||t.includes('食事メニュー')?b:null;
}
function onCapture(e){
  const b=isMealButton(e);if(!b||running)return;
  const snapshot=snap();const money=Number(snapshot?.game?.money);const currentDay=Math.max(1,Math.floor(Number(snapshot?.game?.day)||1));
  if(!Number.isFinite(money)||money<PRICE||snapshot?.mealTimeAvailable===false||Number(snapshot?.event?.lastTriggeredDay)===currentDay||Math.random()>=OYATSU_MALATANG_EVENT_CHANCE)return;
  e.preventDefault();e.stopImmediatePropagation();capturedButton=b;start('intro1',false);
}
function resumeActive(){
  if(running)return;const s=snap()?.event||{};if(s.active&&STAGES.has(s.stage))start(s.stage,Boolean(s.charged));
}
ensureStyle();
document.addEventListener('click',onCapture,true);
addEventListener('resize',()=>{if(!running)return;if(stage==='movie')syncMovie();else if(stage==='meal')lockMeal();else renderDialogue()},{passive:true});
addEventListener('orientationchange',()=>setTimeout(()=>{if(!running)return;if(stage==='movie')syncMovie();else if(stage==='meal')lockMeal();else renderDialogue()},120),{passive:true});
globalThis.visualViewport?.addEventListener('resize',()=>{if(running&&stage==='movie')syncMovie()},{passive:true});
queueMicrotask(resumeActive);setTimeout(resumeActive,500);

export const OYATSU_MALATANG_EVENT_SPEC=Object.freeze({eventKey:EVENT_KEY,triggerChance:OYATSU_MALATANG_EVENT_CHANCE,price:PRICE,movieSkipDelayMs:SKIP_DELAY});
