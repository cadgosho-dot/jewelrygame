import { MEMORIES_BG_LANDSCAPE, MEMORIES_BG_PORTRAIT } from './memories-backgrounds.js?v=0.10.852';

const VERSION = '0.10.852';
const STYLE_ID = 'jxj-memories-style-v752';
const OVERLAY_ID = 'jxj-memories-overlay';
const LIGHTBOX_ID = 'jxj-memories-lightbox';

const CATALOG = [
  { key:'westernUnionEvent', name:'Western Unionの使者', image:'./assets/images/events/western-union-messenger.png', description:'突然現れ、古いダイヤモンドを託してくる使者。', reward:{ flag:'rewardGranted', name:'アンティークダイヤモンド', image:'./assets/images/events/antique-diamond.png' } },
  { key:'mermaidEvent', name:'人魚', image:'./assets/images/events/mermaid.png', description:'不思議な場所で出会う、人ならざる存在。', reward:{ flag:'rewardGranted', name:'真珠', image:'./assets/images/events/pearl.png' } },
  { key:'tattooWomanAmberEvent', name:'タトゥーの女', image:'./assets/images/events/tattoo-woman.png', description:'印象的なタトゥーをまとった女性。', reward:{ flag:'rewardGranted', name:'琥珀', image:'./assets/images/events/amber.png' } },
  { key:'apprenticeCinemaEvent', name:'見習い職人', image:'./assets/images/events/cinema-apprentice.png', description:'映画館で出会う、少し変わった見習い。' },
  { key:'ridleyOkazakiSobaEvent', name:'リドリー・岡崎', image:'./assets/images/events/ridley-okazaki.png', description:'食事中に出会う、忘れにくい人物。' },
  { key:'emeraldCaptainKebabEvent', name:'エメラルド班班長', image:'./assets/images/events/emerald-captain.png', description:'ケバブ屋で出会う、エメラルドに縁のある人物。', reward:{ flag:'rewardGranted', name:'エメラルド', image:'./assets/images/events/emerald-captain-loose-set.png' } },
  { key:'sushiChefEvent', name:'寿司屋の大将', image:'./assets/images/events/sushi-chef.png', description:'食事イベントで出会う寿司職人。' },
  { key:'cyclopsEvent', name:'サイクロプス', image:'./assets/images/events/cyclops.png', description:'コンビニで遭遇する、ひとつ目の不思議な客。' },
  { key:'ganeshaTuskEvent', name:'ガネーシャ', image:'./assets/images/events/ganesha.png', description:'突然現れる不思議な存在。', reward:{ flag:'rewardGranted', name:'ガネーシャの牙', image:'./assets/images/events/ganesha-tusk.png' } },
  { key:'grayHoodAquariumEvent', name:'灰色パーカー', image:'./assets/images/events/gray-hood-aquarium.png', description:'水槽にまつわる出来事で出会う女性。', reward:{ flag:'rewardGranted', name:'水槽', image:'./assets/images/events/aquarium-tank.png' } },
  { key:'terryCaliforniaEvent', name:'テリー・カリフォルニア', image:'./assets/images/events/terry-california.png', description:'食事中に現れる、ベニトアイトに縁のある人物。' },
  { key:'hauntingEvent', name:'幽霊', image:'./assets/images/events/haunting-ghost.png', description:'夜に現れる、不気味な存在。' },
  { key:'storeTheftEvent', name:'店に現れた老婆', image:'./assets/images/events/store-thief-old-woman.png', description:'店舗で起きる出来事に関わる老婆。' },
  { key:'miningPazupanEvent', name:'ボムじいさん', image:'./assets/images/events/pazupan-miner.png', description:'採掘中に出会う、不思議な人物。' },
  { key:'workshopKappaJadeEvent', fallbackKey:'kappaJadeEvent', eventKeys:['workshopKappaJadeEvent','kappaJadeEvent'], name:'河童', image:'./assets/images/events/kappa.png', description:'翡翠に縁のある河童。', reward:{ flag:'rewardGranted', name:'翡翠の原石', image:'./assets/images/events/workshop-kappa-jade-rough.png' } },
  { key:'pearlHumanEvent', name:'真珠人間', image:'./assets/images/events/pearl-human.png', description:'真珠にまつわる出来事で出会う謎の人物。', reward:{ flag:'rewardGranted', name:'真珠', image:'./assets/images/events/pearl.png' } },
  { key:'oyatsuDaisukiEvent', name:'お菓子大好き', image:'./assets/images/events/oyatsu-daisuki.png', description:'御徒町で出会う、アイスと熱帯魚屋が好きな人物。' },
  { key:'speedStarEvent', name:'スピードスター', image:'./assets/images/events/speed-star.png', description:'突然現れる、勢いのある人物。' },
  { key:'storytellerEvent', name:'ストーリーテラー', image:'./assets/images/events/storyteller-v751.png', description:'言葉と物語で印象を残す人物。' },
  { key:'alienAbductionEvent', fallbackKey:'alienReturnEvent', eventKeys:['alienAbductionEvent','alienReturnEvent'], name:'宇宙人', image:'./assets/images/events/alien.png', description:'宇宙に連れて行く、正体不明の存在。' },
  { key:'bluesJukeEvent', name:'ブルースマン', image:'./assets/images/events/blues-juke/bluesman-serious.png', description:'Juke Jointで出会う、ブルースを愛する男。', reward:{ flag:'rewardGranted', name:'ブラックダイヤモンド' } },
  { key:'kawaharaKnowledgeEvent', name:'カワハラ', image:'./assets/images/events/glab-kawahara.png', description:'g-Lab.で出会うジュエリー職人。' },
  { key:'looseShopOriginalQuiz', name:'3Dメガネ', image:'./assets/images/events/loose-shop-original-quiz-v751.png', description:'ルースショップのクイズに現れる人物。' },
  { key:'clockTowerDonationEvent', name:'時計台の老婆', image:'./assets/images/events/clock-tower-donation-old-woman.png', description:'御徒町に時計台を建てようとしている老婆。' },
  { key:'touristWoodSwordEvent', name:'観光客', image:'./assets/images/events/tourist.png', description:'御徒町で出会う観光客。' },
  { key:'mysteryChineseMealEvent', name:'中華料理屋', image:'./assets/images/events/mystery-chinese-chef.png', description:'謎の中華料理を勧めてくる料理人。' },
  { key:'okachimachiTollEvent', name:'キャベツ野郎', image:'./assets/images/events/okachimachi-toll-frog.png', description:'御徒町で通行費を要求してくる、妙に馴れ馴れしい相手。', reward:{ flag:'rewardGranted', name:'翡翠の原石', image:'./assets/images/gems/jade.png' } },
  { key:'whiteBunnyIceEvent', name:'ホワイト・バニー', image:'./assets/images/events/white-bunny.png', description:'アイスを食べている時に現れる、自由奔放な人物。' },
  { key:'diamondPolishingLapEvent', name:'インド料理屋の店長', image:'./assets/images/events/indian-restaurant-manager.png', description:'ダイヤモンド研磨用の道具を用意してくれる店長。', reward:{ flag:'rewardGranted', name:'ダイヤモンド研磨用平面研磨盤', image:'./assets/images/events/diamond-polishing-lap-reward.png' } },
  { key:'okachimachiInvasiveTurtlesEvent', name:'外来種', image:'./assets/images/events/okachimachi-invasive-turtles.png', description:'御徒町で見かける、外来種にまつわる生き物。' },
  { key:'childhoodFriendEvent', name:'幼なじみ', image:'./assets/images/meal-ramen-reunion-v387.webp', description:'ラーメン屋で偶然再会する、子供の頃の友人。' },
  { key:'okachimachiQuiz', name:'通りすがりのクイズ王', image:'./assets/images/quiz/quiz-king-normal.png', description:'御徒町で突然クイズを出してくる人物。' },
];

const CATALOG_KEYS = new Set(CATALOG.flatMap((item) => [item.key, item.fallbackKey, ...(item.eventKeys || [])].filter(Boolean)));
const AUTO_MEMORY_IGNORED_NAMES = new Set(['', '心の声', '支払い', 'SYSTEM', '御徒町・パンダ広場']);
const AUTO_MEMORY_IGNORED_SCREENS = new Set(['glabVisitVideoEvent']);

function normalizedDynamicCharacters(snapshot){
  const rows = Array.isArray(snapshot?.memories?.characters) ? snapshot.memories.characters : [];
  return rows
    .filter((row) => row && typeof row === 'object' && row.key && row.name && row.image)
    .map((row) => ({
      key:String(row.key),
      name:String(row.name),
      image:String(row.image),
      description:String(row.description || `${row.name}と出会ったイベントの記録。`),
      firstSeenDay:Math.max(1,Math.floor(Number(row.firstSeenDay) || 1)),
      encounterCount:Math.max(1,Math.floor(Number(row.encounterCount) || 1)),
    }));
}

function captureVisibleEventCharacter(){
  let activeScreen = String(document.body?.dataset?.screen || '').trim();
  if (!activeScreen) activeScreen = String(stateSnapshot()?.game?.screen || '').trim();
  if (!activeScreen || CATALOG_KEYS.has(activeScreen) || AUTO_MEMORY_IGNORED_SCREENS.has(activeScreen) || document.getElementById(OVERLAY_ID)) return;
  const scope = document.querySelector('main.main-screen, main');
  if (!scope) return;
  const label = scope.querySelector('.jxj-quiz-name-v2, .event-dialogue-card small');
  const image = scope.querySelector('img.visit-character, img.jxj-quiz-character-v2, [class*="character-area"] img, img[class*="-character"]');
  if (!label || !(image instanceof HTMLImageElement)) return;
  const src = String(image.getAttribute('src') || '').trim();
  const name = String(label.textContent || image.getAttribute('alt') || '').trim();
  if (!src || src.startsWith('data:') || !name || AUTO_MEMORY_IGNORED_NAMES.has(name) || /タップ|読み込み|食事中/.test(name)) return;
  globalThis.__JXJ_MEMORIES_RECORD__?.({
    key:`${activeScreen}::${name}`,
    name,
    image:src,
    description:`${name}と出会ったイベントの記録。`,
  });
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .memories-entry-section{margin-top:10px!important}
    .memories-entry-button{width:100%;min-height:48px;font-size:16px!important;font-weight:800!important}
    #${OVERLAY_ID}{position:fixed;inset:0;z-index:15000;overflow:hidden;background:#080d12;color:#fff;isolation:isolate}
    #${OVERLAY_ID} .memories-bg{position:absolute;inset:0;background-image:url("${MEMORIES_BG_PORTRAIT}");background-size:cover;background-position:center center;background-repeat:no-repeat;pointer-events:none;z-index:0}
    #${OVERLAY_ID} .memories-shade{position:absolute;inset:0;background:rgba(3,6,9,.06);pointer-events:none;z-index:1}
    #${OVERLAY_ID} .memories-shell{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden}
    #${OVERLAY_ID} .memories-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;border-bottom:1.25px solid rgba(180,218,236,.45);background:transparent}
    #${OVERLAY_ID} .memories-head h1{margin:0;font-size:20px;text-shadow:0 2px 6px #000}
    #${OVERLAY_ID} .memories-close,#${LIGHTBOX_ID} .memories-lightbox-close{border:1.25px solid rgba(210,235,247,.68);border-radius:11px;background:rgba(9,16,22,.55);color:#fff;padding:9px 14px;font-weight:800;font-size:14px}
    #${OVERLAY_ID} .memories-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:12px 12px calc(24px + env(safe-area-inset-bottom));overscroll-behavior:contain}
    #${OVERLAY_ID} .memories-list{display:grid;grid-template-columns:1fr;gap:12px;max-width:980px;margin:0 auto}
    #${OVERLAY_ID} .memory-card{display:grid;grid-template-columns:112px 1fr;gap:12px;border:1.25px solid rgba(193,225,239,.55);border-radius:17px;padding:11px;background:transparent;box-shadow:0 5px 16px rgba(0,0,0,.18)}
    #${OVERLAY_ID} .memory-person-frame{height:178px;display:grid;place-items:center;overflow:hidden;border:1.25px solid rgba(193,225,239,.38);border-radius:14px;background:transparent;padding:6px}
    #${OVERLAY_ID} .memory-person{display:block;width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain;object-position:center center;filter:drop-shadow(0 4px 6px rgba(0,0,0,.7));cursor:pointer}
    #${OVERLAY_ID} .memory-copy h2{margin:2px 0 7px;font-size:17px;line-height:1.35;text-shadow:0 2px 5px #000}
    #${OVERLAY_ID} .memory-copy p{margin:0;font-size:13px;line-height:1.65;color:#f2f7fa;text-shadow:0 2px 5px #000}
    #${OVERLAY_ID} .memory-encounter-count{margin-top:8px;font-size:12px;line-height:1.4;font-weight:800;color:#d8f2ff;text-shadow:0 2px 5px #000}
    #${OVERLAY_ID} .memory-reward{margin-top:10px;padding-top:9px;border-top:1.25px solid rgba(193,225,239,.38);display:flex;align-items:center;gap:9px}
    #${OVERLAY_ID} .memory-reward-label{font-size:11px;color:#bfe8f8;font-weight:800;text-shadow:0 2px 4px #000}
    #${OVERLAY_ID} .memory-reward-image{width:54px;height:54px;object-fit:contain;border:1.25px solid rgba(193,225,239,.38);border-radius:10px;background:transparent;padding:3px;cursor:pointer}
    #${OVERLAY_ID} .memory-reward-name{font-size:13px;font-weight:800;text-shadow:0 2px 4px #000}
    #${OVERLAY_ID} .memories-empty{border:1.25px solid rgba(193,225,239,.48);border-radius:15px;padding:18px;text-align:center;background:transparent;text-shadow:0 2px 5px #000}
    #${LIGHTBOX_ID}{position:fixed;inset:0;z-index:16000;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom));gap:14px}
    #${LIGHTBOX_ID} img{display:block;max-width:94vw;max-height:78dvh;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(0,0,0,.7))}
    @media (orientation:landscape){
      #${OVERLAY_ID} .memories-bg{background-image:url("${MEMORIES_BG_LANDSCAPE}")}
      #${OVERLAY_ID} .memories-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
      #${OVERLAY_ID} .memory-card{grid-template-columns:104px 1fr}
      #${OVERLAY_ID} .memory-person-frame{height:164px}
    }
    @media (max-width:390px) and (orientation:portrait){
      #${OVERLAY_ID} .memory-card{grid-template-columns:96px 1fr;gap:10px}
      #${OVERLAY_ID} .memory-person-frame{height:160px}
    }
  `;
  document.head.appendChild(style);
}

function stateSnapshot(){
  try { return globalThis.__JXJ_MEMORIES_STATE__?.() || null; } catch (_) { return null; }
}

function eventState(snapshot, item){
  const events = snapshot?.events || {};
  const keys = encounterEventKeys(item);
  for (const key of keys) {
    const candidate = events[key] || null;
    if (encountered(candidate)) return candidate;
  }
  for (const key of keys) {
    if (events[key]) return events[key];
  }
  return null;
}

function encounterEventKeys(item){
  return [...new Set([item.key, item.fallbackKey, ...(item.eventKeys || [])].filter(Boolean))];
}

function eventEncounterCount(ev){
  if (!ev || typeof ev !== 'object') return 0;
  const explicit = Number(ev.totalTriggered ?? ev.triggerCount ?? ev.visits ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  return encountered(ev) ? 1 : 0;
}

function encounterCount(snapshot, item){
  const events = snapshot?.events || {};
  return encounterEventKeys(item).reduce((sum, key) => sum + eventEncounterCount(events[key]), 0);
}

function encountered(ev){
  if (!ev || typeof ev !== 'object') return false;
  if (ev.active || ev.rewardGranted || ev.completed || ev.unlocked) return true;
  if (Number(ev.totalTriggered || ev.triggerCount || ev.visits || 0) > 0) return true;
  const stage = String(ev.stage || '').trim();
  if (stage && stage !== 'idle') return true;
  return Boolean(ev.lastTriggeredDate || ev.firstTriggeredDate || ev.completedDate || ev.lastSeenDate);
}

function rewardVisible(ev, reward){
  if (!reward || !ev) return false;
  if (reward.flag && Object.prototype.hasOwnProperty.call(ev, reward.flag)) return Boolean(ev[reward.flag]);
  return Boolean(ev.rewardGranted || ev.rewardReceived || ev.completed);
}

function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function openLightbox(src, alt){
  document.getElementById(LIGHTBOX_ID)?.remove();
  const layer = document.createElement('div');
  layer.id = LIGHTBOX_ID;
  layer.innerHTML = `<img src="${esc(src)}" alt="${esc(alt)}"><button type="button" class="memories-lightbox-close">閉じる</button>`;
  layer.querySelector('.memories-lightbox-close')?.addEventListener('click', () => layer.remove());
  document.body.appendChild(layer);
}

function closeMemories(){
  document.getElementById(LIGHTBOX_ID)?.remove();
  document.getElementById(OVERLAY_ID)?.remove();
  document.documentElement.classList.remove('jxj-memories-open');
}

function openMemories(){
  installStyle();
  closeMemories();
  const snapshot = stateSnapshot();
  const staticItems = CATALOG.map(item => ({ item, ev:eventState(snapshot,item), count:encounterCount(snapshot,item) })).filter(({ev}) => encountered(ev));
  const staticKeys = new Set(staticItems.flatMap(({item}) => encounterEventKeys(item)));
  const staticNames = new Set(staticItems.map(({item}) => item.name));
  const dynamicItems = normalizedDynamicCharacters(snapshot)
    .filter((item) => !staticKeys.has(item.key) && !staticNames.has(item.name) && item.name !== 'カワハラ' && !String(item.key).startsWith('glabVisitVideoEvent'))
    .sort((a,b) => a.firstSeenDay - b.firstSeenDay)
    .map((item) => ({ item, ev:null, count:item.encounterCount, dynamic:true }));
  const items = [...staticItems, ...dynamicItems];
  const overlay = document.createElement('section');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('aria-label','思い出');
  const cards = items.map(({item,ev,count,dynamic=false}) => {
    const reward = !dynamic && rewardVisible(ev,item.reward) ? item.reward : null;
    const rewardHtml = reward ? `<div class="memory-reward"><span class="memory-reward-label">報酬</span>${reward.image ? `<img class="memory-reward-image" src="${esc(reward.image)}" alt="${esc(reward.name)}" data-memory-image="${esc(reward.image)}" data-memory-alt="${esc(reward.name)}">` : ''}<span class="memory-reward-name">${esc(reward.name)}</span></div>` : '';
    const countHtml = `<div class="memory-encounter-count">出会った回数：${Math.max(1,Number(count) || 1)}回</div>`;
    return `<article class="memory-card"><div class="memory-person-frame"><img class="memory-person" src="${esc(item.image)}" alt="${esc(item.name)}" data-memory-image="${esc(item.image)}" data-memory-alt="${esc(item.name)}"></div><div class="memory-copy"><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p>${countHtml}${rewardHtml}</div></article>`;
  }).join('');
  overlay.innerHTML = `<div class="memories-bg" aria-hidden="true"></div><div class="memories-shade" aria-hidden="true"></div><div class="memories-shell"><header class="memories-head"><h1>思い出</h1><button type="button" class="memories-close">閉じる</button></header><div class="memories-scroll"><div class="memories-list">${cards || '<div class="memories-empty">まだ思い出はありません。<br>イベントで人物に出会うと、ここに記録されます。</div>'}</div></div></div>`;
  overlay.querySelector('.memories-close')?.addEventListener('click', closeMemories);
  overlay.addEventListener('click', (event) => {
    const image = event.target instanceof Element ? event.target.closest('[data-memory-image]') : null;
    if (!image) return;
    openLightbox(image.getAttribute('data-memory-image') || '', image.getAttribute('data-memory-alt') || '思い出');
  });
  document.body.appendChild(overlay);
  document.documentElement.classList.add('jxj-memories-open');
}

function installEntryButton(){
  const sections = [...document.querySelectorAll('.phone-item-section.equipment-section')];
  for (const equipment of sections) {
    if (equipment.nextElementSibling?.classList.contains('memories-entry-section')) continue;
    const section = document.createElement('section');
    section.className = 'phone-item-section memories-entry-section';
    section.innerHTML = '<button type="button" class="secondary-button memories-entry-button">思い出</button>';
    section.querySelector('button')?.addEventListener('click', openMemories);
    equipment.insertAdjacentElement('afterend', section);
  }
}

installStyle();
installEntryButton();
captureVisibleEventCharacter();
new MutationObserver(() => {
  installEntryButton();
  captureVisibleEventCharacter();
}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow', () => {
  installEntryButton();
  captureVisibleEventCharacter();
});
