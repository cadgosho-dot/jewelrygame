#!/usr/bin/env python3
from pathlib import Path
import base64, shutil

R = Path(__file__).resolve().parents[1]


def rep(path, old, new):
    p = R / path
    s = p.read_text(encoding='utf-8')
    if new in s:
        return
    if old not in s:
        raise SystemExit(f'missing marker: {path}: {old[:80]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')


def bump(path):
    p = R / path
    s = p.read_text(encoding='utf-8')
    if '0.10.738' in s and '0.10.737' not in s:
        return
    if '0.10.737' not in s:
        raise SystemExit(f'missing version: {path}')
    p.write_text(s.replace('0.10.737', '0.10.738'), encoding='utf-8')


for path in ['js/app.js', 'js/game-data.js', 'js/memories-screen.js', 'game.html', 'index.html', 'auth.html', 'sw.js']:
    bump(path)

rep(
    'js/app.js',
    "globalThis.__JXJ_MEMORIES_STATE__ = () => state ? structuredClone({ events: state.events, inventory: state.inventory, game: state.game }) : null;",
    """globalThis.__JXJ_MEMORIES_STATE__ = () => state ? structuredClone({ events: state.events, inventory: state.inventory, game: state.game, memories: state.memories }) : null;
globalThis.__JXJ_MEMORIES_RECORD__ = (entry) => {
  try {
    if (!state || !entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const key = String(entry.key || entry.screen || '').trim();
    const name = String(entry.name || '').trim();
    const image = String(entry.image || '').trim().replace(/\\?v=[^#]+$/, '');
    const description = String(entry.description || '').trim().slice(0, 180);
    if (!key || !name || !image) return false;
    state.memories = state.memories && typeof state.memories === 'object' && !Array.isArray(state.memories) ? state.memories : {};
    const characters = Array.isArray(state.memories.characters) ? state.memories.characters : [];
    const currentDay = Math.max(1, Math.floor(Number(state.game?.day) || 1));
    const index = characters.findIndex((row) => row && (row.key === key || (row.name === name && row.image === image)));
    const previous = index >= 0 && characters[index] && typeof characters[index] === 'object' ? characters[index] : null;
    const next = {
      key,
      name,
      image,
      description: description || previous?.description || `${name}と出会ったイベントの記録。`,
      firstSeenDay: Math.max(1, Math.floor(Number(previous?.firstSeenDay) || currentDay)),
    };
    if (previous && previous.key === next.key && previous.name === next.name && previous.image === next.image && previous.description === next.description && Number(previous.firstSeenDay) === next.firstSeenDay) return false;
    if (index >= 0) characters[index] = next;
    else characters.push(next);
    state.memories.characters = characters;
    void saveGame();
    return true;
  } catch (error) {
    console.warn('[Memories] character record failed', error);
    return false;
  }
};""",
)

rep('js/memories-screen.js', "const STYLE_ID = 'jxj-memories-style-v737';", "const STYLE_ID = 'jxj-memories-style-v738';")
rep('js/memories-screen.js', "image:'./assets/images/events/pazupan.png'", "image:'./assets/images/events/pazupan-miner.png'")
rep('js/memories-screen.js', "{ key:'looseShopOriginalQuizEvent', name:'3Dメガネ'", "{ key:'looseShopOriginalQuiz', name:'3Dメガネ'")
rep(
    'js/memories-screen.js',
    "  { key:'touristWoodSwordEvent', name:'観光客', image:'./assets/images/events/tourist.png', description:'御徒町で出会う観光客。' },\n];",
    """  { key:'touristWoodSwordEvent', name:'観光客', image:'./assets/images/events/tourist.png', description:'御徒町で出会う観光客。' },
  { key:'mysteryChineseMealEvent', name:'中華料理屋', image:'./assets/images/events/mystery-chinese-chef.png', description:'謎の中華料理を勧めてくる料理人。' },
  { key:'okachimachiTollEvent', name:'キャベツ野郎', image:'./assets/images/events/okachimachi-toll-frog.png', description:'御徒町で通行費を要求してくる、妙に馴れ馴れしい相手。', reward:{ flag:'rewardGranted', name:'翡翠の原石', image:'./assets/images/gems/jade.png' } },
  { key:'whiteBunnyIceEvent', name:'ホワイト・バニー', image:'./assets/images/events/white-bunny.png', description:'アイスを食べている時に現れる、自由奔放な人物。' },
  { key:'diamondPolishingLapEvent', name:'インド料理屋の店長', image:'./assets/images/events/indian-restaurant-manager.png', description:'ダイヤモンド研磨用の道具を用意してくれる店長。', reward:{ flag:'rewardGranted', name:'ダイヤモンド研磨用平面研磨盤', image:'./assets/images/events/diamond-polishing-lap-reward.png' } },
  { key:'okachimachiInvasiveTurtlesEvent', name:'外来種', image:'./assets/images/events/okachimachi-invasive-turtles.png', description:'御徒町で見かける、外来種にまつわる生き物。' },
  { key:'childhoodFriendEvent', name:'幼なじみ', image:'./assets/images/meal-ramen-reunion-v387.webp', description:'ラーメン屋で偶然再会する、子供の頃の友人。' },
  { key:'okachimachiQuiz', name:'通りすがりのクイズ王', image:'./assets/images/quiz/quiz-king-normal.png', description:'御徒町で突然クイズを出してくる人物。' },
];""",
)
rep(
    'js/memories-screen.js',
    """function eventState(snapshot, item){
  const events = snapshot?.events || {};
  return events[item.key] || (item.fallbackKey ? events[item.fallbackKey] : null) || null;
}""",
    """function eventState(snapshot, item){
  const events = snapshot?.events || {};
  const primary = events[item.key] || null;
  const fallback = item.fallbackKey ? (events[item.fallbackKey] || null) : null;
  if (encountered(primary)) return primary;
  if (encountered(fallback)) return fallback;
  return primary || fallback || null;
}""",
)
rep(
    'js/memories-screen.js',
    '\nfunction installStyle() {',
    """

const CATALOG_KEYS = new Set(CATALOG.flatMap((item) => [item.key, item.fallbackKey].filter(Boolean)));
const AUTO_MEMORY_IGNORED_NAMES = new Set(['', '心の声', '支払い', 'SYSTEM', '御徒町・パンダ広場']);

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
    }));
}

function captureVisibleEventCharacter(){
  let activeScreen = String(document.body?.dataset?.screen || '').trim();
  if (!activeScreen) activeScreen = String(stateSnapshot()?.game?.screen || '').trim();
  if (!activeScreen || CATALOG_KEYS.has(activeScreen) || document.getElementById(OVERLAY_ID)) return;
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

function installStyle() {""",
)
rep('js/memories-screen.js', 'background:rgba(3,6,9,.34)', 'background:rgba(3,6,9,.06)')
rep(
    'js/memories-screen.js',
    """  const snapshot = stateSnapshot();
  const items = CATALOG.map(item => ({ item, ev:eventState(snapshot,item) })).filter(({ev}) => encountered(ev));
  const overlay = document.createElement('section');""",
    """  const snapshot = stateSnapshot();
  const staticItems = CATALOG.map(item => ({ item, ev:eventState(snapshot,item) })).filter(({ev}) => encountered(ev));
  const staticKeys = new Set(staticItems.flatMap(({item}) => [item.key, item.fallbackKey].filter(Boolean)));
  const staticNames = new Set(staticItems.map(({item}) => item.name));
  const dynamicItems = normalizedDynamicCharacters(snapshot)
    .filter((item) => !staticKeys.has(item.key) && !staticNames.has(item.name))
    .sort((a,b) => a.firstSeenDay - b.firstSeenDay)
    .map((item) => ({ item, ev:null, dynamic:true }));
  const items = [...staticItems, ...dynamicItems];
  const overlay = document.createElement('section');""",
)
rep(
    'js/memories-screen.js',
    "const cards = items.map(({item,ev}) => {\n    const reward = rewardVisible(ev,item.reward) ? item.reward : null;",
    "const cards = items.map(({item,ev,dynamic=false}) => {\n    const reward = !dynamic && rewardVisible(ev,item.reward) ? item.reward : null;",
)
rep(
    'js/memories-screen.js',
    """installStyle();
installEntryButton();
new MutationObserver(() => installEntryButton()).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow', installEntryButton);""",
    """installStyle();
installEntryButton();
captureVisibleEventCharacter();
new MutationObserver(() => {
  installEntryButton();
  captureVisibleEventCharacter();
}).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('pageshow', () => {
  installEntryButton();
  captureVisibleEventCharacter();
});""",
)

(R / 'js/memories-backgrounds.js').write_text(
    "export const MEMORIES_BG_LANDSCAPE = './assets/images/ui/memories-bg-landscape-v738.webp';\n"
    "export const MEMORIES_BG_PORTRAIT = './assets/images/ui/memories-bg-portrait-v738.webp';\n",
    encoding='utf-8',
)

def decode_b64(source, target):
    source = R / source
    if not source.exists():
        raise SystemExit(f'missing background transport: {source}')
    target = R / target
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(base64.b64decode(source.read_text(encoding='utf-8').strip()))


decode_b64('scripts/v738_bg_landscape.b64', 'assets/images/ui/memories-bg-landscape-v738.webp')
decode_b64('scripts/v738_bg_portrait.b64', 'assets/images/ui/memories-bg-portrait-v738.webp')

changelog = R / 'CHANGELOG.md'
s = changelog.read_text(encoding='utf-8')
entry = """# v0.10.738 - 2026-08-22

- 「思い出」の背景を、電球と蛾の確定済み横画面／縦画面画像へ復旧し、少し暗く調整。
- これまで遭遇していても一覧から抜けていた「中華料理屋」「キャベツ野郎」「ホワイト・バニー」「インド料理屋の店長」「外来種」「幼なじみ」「通りすがりのクイズ王」を追加。
- 「3Dメガネ」の遭遇判定キーを実際の保存キーへ修正。
- ボムじいさんの「思い出」画像を、背景透過済み `pazupan-miner.png` へ変更。
- 今後追加される共通形式のイベント人物は、初回遭遇時に名前・画像をセーブデータへ自動記録し「思い出」へ自動追加。
- fallbackKey を持つ既存人物は、主イベントが未遭遇でも別イベントで遭遇済みなら表示されるよう判定を修正。
- 背景固定、一覧だけスクロール、報酬なし非表示、画像拡大は「閉じる」のみ、横画面2列の既存仕様を維持。

"""
if not s.startswith('# v0.10.738'):
    changelog.write_text(entry + s, encoding='utf-8')

# Temporary transport files are not part of the finished game.
for rel in ['scripts/v738_bg_landscape.b64', 'scripts/v738_bg_portrait.b64']:
    (R / rel).unlink(missing_ok=True)
shutil.rmtree(R / 'scripts/v738_chunks', ignore_errors=True)
print('v0.10.738 memories patch applied')
