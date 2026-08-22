from pathlib import Path
import re

NEW_VERSION = '0.10.735'
OLD_VERSION = '0.10.734'

APP = Path('js/app.js')
AQUARIUM = Path('assets/minigames/aquarium/index.html')
GAME_DATA = Path('js/game-data.js')
VERSION_TARGETS = [Path('game.html'), Path('index.html'), Path('auth.html'), Path('sw.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)

# 1) Aquarium observation UI: only the four base fixtures are always observable.
aq = AQUARIUM.read_text(encoding='utf-8')
marker = '/* v0.10.735 aquarium observation visibility: four base fixtures + actually placed purchases. */'
if marker not in aq:
    anchor = "function closeCatalog(){catalogPanel.classList.remove('show');document.documentElement.classList.remove('catalog-open');document.body.classList.remove('catalog-open')}\n"
    if anchor not in aq:
        raise SystemExit('aquarium: closeCatalog anchor not found')
    override = r'''
/* v0.10.735 aquarium observation visibility: four base fixtures + actually placed purchases. */
const observeAlwaysVisibleDisplayNames=new Set(['水槽','フィルター','ライト','ヒーター']);
function observeVisibleItems(category){
 const source=catalog[category]||[];
 if(category==='魚') return source.filter(item=>aquariumCount('fish',aquariumNameMaps.fish[item.name],'inTank')>0);
 if(category==='水草') return source.filter(item=>aquariumCount('plants',aquariumNameMaps.plant[item.name],'inTank')>0);
 if(category==='ディスプレイ用品') return source.filter(item=>{
   if(item.name==='床砂') return false;
   if(observeAlwaysVisibleDisplayNames.has(item.name)) return true;
   const id=aquariumNameMaps.display[item.name];
   return aquariumCount('displayItems',id,'installed')>0;
 });
 return [];
}
renderTabs=function(){
 tabsEl.innerHTML='';
 const cats=Object.keys(catalog).filter(cat=>observeVisibleItems(cat).length>0);
 if(!cats.includes(activeCategory)) activeCategory=cats[0]||'ディスプレイ用品';
 cats.forEach(cat=>{
   const items=observeVisibleItems(cat);
   const b=document.createElement('button');
   b.className='tab'+(cat===activeCategory?' active':'');
   b.textContent=cat+'（'+items.length+'）';
   b.onclick=()=>{activeCategory=cat;renderTabs();renderGrid();};
   tabsEl.appendChild(b);
 });
};
renderGrid=function(){
 gridEl.innerHTML='';
 observeVisibleItems(activeCategory).forEach((item)=>{
   const c=document.createElement('div');c.className='catalog-card';
   const im=document.createElement('img');im.src=item.image;im.alt=item.name;
   const kind=document.createElement('div');kind.className='catalog-kind';kind.textContent=item.classification;
   const n=document.createElement('div');n.className='catalog-name';n.textContent=item.name;
   c.append(im,kind,n);
   const countText=currentCountText(item);
   if(countText){const count=document.createElement('div');count.className='current-count';count.textContent=countText;c.appendChild(count);}
   if(item.category==='ディスプレイ用品'&&observeAlwaysVisibleDisplayNames.has(item.name)){
     const fixed=document.createElement('div');fixed.className='required-label';fixed.textContent='常時設置';c.appendChild(fixed);
   } else if(item.category==='ディスプレイ用品'){
     const id=aquariumNameMaps.display[item.name];
     const owned=aquariumCount('displayItems',id,'owned'),installed=aquariumCount('displayItems',id,'installed');
     const status=document.createElement('div');status.className='install-status '+(installed>0?'on':'off');status.textContent=installed>0?`設置中 ${installed}個`:'未設置';
     const actions=document.createElement('div');actions.className='catalog-actions';
     const add=document.createElement('button');add.textContent='1個設置';add.disabled=installed>=owned;add.onclick=()=>postAquariumMessage({type:'display-install',id,target:installed+1});
     const remove=document.createElement('button');remove.textContent='1個撤去';remove.className='remove';remove.disabled=installed<1;remove.onclick=()=>postAquariumMessage({type:'display-install',id,target:installed-1});
     actions.append(add,remove);c.append(status,actions);
   }
   const b=document.createElement('button');b.className='detail-btn';b.textContent='詳細を見る';b.onclick=()=>openDetail(item);c.appendChild(b);
   gridEl.appendChild(c);
 });
};
'''
    aq = aq.replace(anchor, anchor + override, 1)
AQUARIUM.write_text(aq, encoding='utf-8')

# 2) Main-game guard: match the same four-fixture rule, while allowing actually installed shop items.
app = APP.read_text(encoding='utf-8')
const_marker = "const AQUARIUM_ALWAYS_OBSERVABLE_DISPLAY_IDS = new Set(['tank', 'hang_on_filter', 'light', 'heater']);"
if const_marker not in app:
    alias_anchor = "const AQUARIUM_ENGINE_LAYOUT_ALIASES = Object.freeze({"
    idx = app.find(alias_anchor)
    if idx < 0:
        raise SystemExit('app: aquarium layout alias anchor not found')
    app = app[:idx] + const_marker + "\n" + app[idx:]

old_current = """  // v0.10.726: 観察画面は固定5項目を常時表示し、任意レイアウト品は実際に設置中のみ表示する。\n  for (const definition of AQUARIUM_CONFIG.displayItems) {\n    const installed = Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0));\n    if (!definition.required && installed <= 0) continue;\n    names.add(normalizeAquariumObservationName(definition.name));\n    const engineId = aquariumEngineCompatibleId(decorationRegistry, definition.id, AQUARIUM_ENGINE_LAYOUT_ALIASES);\n    if (engineId) names.add(normalizeAquariumObservationName(decorationRegistry[engineId]?.displayName));\n  }\n"""
new_current = """  // v0.10.735: 観察画面は水槽・フィルター・ライト・ヒーターを常時表示。\n  // 床砂は常設状態でも観察一覧には出さず、任意用品は実際に設置中のものだけ表示する。\n  for (const definition of AQUARIUM_CONFIG.displayItems) {\n    if (definition.id === 'soil') continue;\n    const installed = Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0));\n    const alwaysObservable = AQUARIUM_ALWAYS_OBSERVABLE_DISPLAY_IDS.has(definition.id);\n    if (!alwaysObservable && installed <= 0) continue;\n    names.add(normalizeAquariumObservationName(definition.name));\n    const engineId = aquariumEngineCompatibleId(decorationRegistry, definition.id, AQUARIUM_ENGINE_LAYOUT_ALIASES);\n    if (engineId) names.add(normalizeAquariumObservationName(decorationRegistry[engineId]?.displayName));\n  }\n"""
if old_current in app:
    app = app.replace(old_current, new_current, 1)
elif 'v0.10.735: 観察画面は水槽・フィルター・ライト・ヒーターを常時表示。' not in app:
    raise SystemExit('app: aquariumCurrentObservationNames target not found')

old_placed = """  for (const definition of AQUARIUM_CONFIG.displayItems) {\n    // 任意用品は設置されているものだけ既知扱いにする。必須用品は既存仕様を維持。\n    if (!definition.required && Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0)) <= 0) continue;\n    if (definition.required || Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0)) > 0) {\n      names.add(normalizeAquariumObservationName(definition.name));\n      const engineId = aquariumEngineCompatibleId(decorationRegistry, definition.id, AQUARIUM_ENGINE_LAYOUT_ALIASES);\n      if (engineId) names.add(normalizeAquariumObservationName(decorationRegistry[engineId]?.displayName));\n    }\n  }\n"""
new_placed = """  for (const definition of AQUARIUM_CONFIG.displayItems) {\n    // v0.10.735: 基本4設備は常時既知。床砂は観察対象外。任意用品は設置中のみ既知扱い。\n    if (definition.id === 'soil') continue;\n    const installed = Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0));\n    const alwaysObservable = AQUARIUM_ALWAYS_OBSERVABLE_DISPLAY_IDS.has(definition.id);\n    if (!alwaysObservable && installed <= 0) continue;\n    names.add(normalizeAquariumObservationName(definition.name));\n    const engineId = aquariumEngineCompatibleId(decorationRegistry, definition.id, AQUARIUM_ENGINE_LAYOUT_ALIASES);\n    if (engineId) names.add(normalizeAquariumObservationName(decorationRegistry[engineId]?.displayName));\n  }\n"""
if old_placed in app:
    app = app.replace(old_placed, new_placed, 1)
elif 'v0.10.735: 基本4設備は常時既知。床砂は観察対象外。任意用品は設置中のみ既知扱い。' not in app:
    raise SystemExit('app: aquariumPlacedDiscoveryNames target not found')

old_allowed = """    for (const definition of AQUARIUM_CONFIG.displayItems) {\n      const engineId = aquariumEngineCompatibleId(decorationRegistry, definition.id, AQUARIUM_ENGINE_LAYOUT_ALIASES);\n      addIds(knownIds, [definition.id, engineId]);\n      if (definition.required || Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0)) > 0) addIds(allowedIds, [definition.id, engineId]);\n    }\n"""
new_allowed = """    for (const definition of AQUARIUM_CONFIG.displayItems) {\n      const engineId = aquariumEngineCompatibleId(decorationRegistry, definition.id, AQUARIUM_ENGINE_LAYOUT_ALIASES);\n      addIds(knownIds, [definition.id, engineId]);\n      if (definition.id === 'soil') continue;\n      const installed = Math.max(0, Math.floor(Number(snapshot.displayItems?.[definition.id]?.installed) || 0));\n      if (AQUARIUM_ALWAYS_OBSERVABLE_DISPLAY_IDS.has(definition.id) || installed > 0) addIds(allowedIds, [definition.id, engineId]);\n    }\n"""
if old_allowed in app:
    app = app.replace(old_allowed, new_allowed, 1)
elif "if (definition.id === 'soil') continue;" not in app:
    raise SystemExit('app: filterAquariumUndiscoveredDocument target not found')

app = app.replace("const UI_BUILD_VERSION = '0.10.734';", "const UI_BUILD_VERSION = '0.10.735';", 1)
app = app.replace("./audio.js?v=0.10.734", "./audio.js?v=0.10.735", 1)
app = app.replace("./audio-scene-map.js?v=0.10.734", "./audio-scene-map.js?v=0.10.735", 1)
app = app.replace("./firebase-service.js?v=0.10.734", "./firebase-service.js?v=0.10.735", 1)
APP.write_text(app, encoding='utf-8')

# 3) Public version wrapper and cache-busting.
gd = GAME_DATA.read_text(encoding='utf-8')
if "export const VERSION = '0.10.734';" in gd:
    gd = gd.replace('// v0.10.734: 正式版のバージョン入口。', '// v0.10.735: 正式版のバージョン入口。', 1)
    gd = gd.replace("export const VERSION = '0.10.734';", "export const VERSION = '0.10.735';", 1)
elif "export const VERSION = '0.10.735';" not in gd:
    raise SystemExit('game-data: current public version not 0.10.734/735')
GAME_DATA.write_text(gd, encoding='utf-8')

for path in VERSION_TARGETS:
    text = path.read_text(encoding='utf-8')
    if OLD_VERSION in text:
        text = text.replace(OLD_VERSION, NEW_VERSION)
    elif NEW_VERSION not in text:
        raise SystemExit(f'{path}: no {OLD_VERSION} or {NEW_VERSION} marker')
    path.write_text(text, encoding='utf-8')

aq_check = AQUARIUM.read_text(encoding='utf-8')
app_check = APP.read_text(encoding='utf-8')
assert "observeAlwaysVisibleDisplayNames=new Set(['水槽','フィルター','ライト','ヒーター'])" in aq_check
assert "if(item.name==='床砂') return false;" in aq_check
assert const_marker in app_check
assert "definition.id === 'soil'" in app_check
assert "const UI_BUILD_VERSION = '0.10.735';" in app_check
assert "export const VERSION = '0.10.735';" in GAME_DATA.read_text(encoding='utf-8')
assert "const VERSION = '0.10.735';" in Path('sw.js').read_text(encoding='utf-8')
print('v0.10.735 aquarium observation patch applied safely')
