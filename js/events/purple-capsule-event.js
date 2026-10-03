import { switchAudio, playSfx } from '../audio.js?v=0.10.968';

const KEY = 'purpleCapsuleEvent';
const scenes = {
  opening: { dark:true, next:'outside' },
  outside: { place:'exterior', next:'inside' },
  inside: { place:'interior', line:'やっぱり、、落ち着くなぁ、、、、', next:'greeting' },
  greeting: { place:'interior', character:true, speaker:'ブルースマン', line:name=>`おう、、また来たな！${name}様々！、、、、いっつもこの店はオマエのブルースで盛り上がってるぜ！、、、`, next:'praise' },
  praise: { place:'interior', character:true, speaker:'ブルースマン', line:'サイコーだぜ、まったく！、オマエはサイコー！、、、', next:'enjoy' },
  enjoy: { place:'interior', character:true, speaker:'ブルースマン', line:'今日も好きなだけ楽しんでってくれよな、兄弟！、、、、、', next:'sleepFade' },
  sleepFade: { dark:true, next:'sleepy' },
  sleepy: { dark:true, line:'眠くなってきた、、、、、', next:'returnFade' },
  returnFade: { dark:true, next:'completed' },
};
let overlay = null;
let timer = null;
let currentStage = '';
const helper = () => globalThis.__JXJ_EVENT_STATE_HELPERS__;
const snapshot = () => helper()?.purpleCapsuleSnapshot?.();
const audio = key => { try { void switchAudio(key).catch(()=>{}); } catch (_) {} };

function advance(next) {
  if (!snapshot()?.event?.active) return;
  if (next === 'completed') {
    const result = helper().finishPurpleCapsule();
    if (!result.ok) return;
    clearTimeout(timer);
    overlay?.remove();
    overlay = null;
    currentStage = '';
    globalThis.__JXJ_N?.('phone', { phoneTab:'items' }, false);
    return;
  }
  helper().patchEventState(KEY, {stage:next});
  renderScene();
}

function renderScene() {
  const saved = snapshot();
  if (!saved?.event?.active || !overlay) return;
  clearTimeout(timer);
  currentStage = scenes[saved.event.stage] ? saved.event.stage : 'opening';
  const scene = scenes[currentStage];
  overlay.replaceChildren();
  overlay.classList.toggle('capsule-dark', Boolean(scene.dark));
  if (scene.place) {
    const background = document.createElement('picture');
    const portrait = document.createElement('source');
    portrait.media = '(orientation: portrait)';
    portrait.srcset = `./assets/images/events/purple-capsule/${scene.place}-portrait.png`;
    const image = document.createElement('img');
    image.src = `./assets/images/events/purple-capsule/${scene.place}.png`;
    image.alt = '';
    image.className = 'capsule-background';
    background.append(portrait,image);
    overlay.append(background);
    audio(scene.place === 'interior' ? 'bluesJukeInside' : 'bluesJukeOutside');
  } else {
    audio('silent');
  }
  if (scene.character) {
    const character = document.createElement('img');
    character.src = './assets/images/events/blues-juke/bluesman-smile.png';
    character.alt = 'ブルースマン';
    character.className = 'capsule-character';
    overlay.append(character);
  }
  if (scene.dark && !scene.line) {
    const expectedStage = currentStage;
    timer = setTimeout(()=>{ if (snapshot()?.event?.stage === expectedStage) advance(scene.next); },2000);
    return;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'capsule-next';
  if (scene.speaker) {
    const speaker = document.createElement('span');
    speaker.className = 'capsule-speaker';
    speaker.textContent = scene.speaker;
    button.append(speaker);
  }
  const line = document.createElement('strong');
  line.textContent = typeof scene.line === 'function' ? scene.line(saved.playerName) : scene.line || '';
  const hint = document.createElement('span');
  hint.className = 'capsule-hint';
  hint.textContent = 'タップして進む';
  button.append(line,hint);
  button.addEventListener('click', event=>{
    event.stopPropagation();
    if (button.disabled) return;
    button.disabled = true;
    playSfx('select');
    advance(scene.next);
  });
  overlay.append(button);
  button.focus({preventScroll:true});
}

function openOverlay() {
  if (overlay || !document.body) return;
  overlay = document.createElement('section');
  overlay.className = 'purple-capsule-event';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','紫のカプセル');
  overlay.tabIndex = -1;
  overlay.addEventListener('keydown', event=>{
    if (event.key === 'Tab') { event.preventDefault(); overlay.querySelector('button')?.focus(); }
  });
  document.body.append(overlay);
  overlay.focus();
  renderScene();
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', event=>{
    const button = event.target.closest?.('[data-action="use-phone-item"][data-id="purpleCapsule"]');
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const result = helper()?.beginPurpleCapsule?.();
    if (result?.ok) { playSfx('eat'); openOverlay(); }
    else if (result?.reason === 'time') {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '今日はこれは使わずに寝たほうがいいです';
        toast.dataset.type = 'error';
        toast.classList.add('show');
        setTimeout(()=>toast.classList.remove('show'),3500);
      }
      playSfx('error');
    }
  },true);
  const root = document.getElementById('root');
  if (root) new MutationObserver(()=>{
    // A saved event resumes only after the player has entered the game.
    if (root.querySelector('[data-action="phone-tab"], [data-action="nav"][data-screen="phone"]') && snapshot()?.event?.active) openOverlay();
  }).observe(root,{childList:true,subtree:true});
}
