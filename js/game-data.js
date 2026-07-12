export const VERSION = '0.1.0';
export const APP_NAME = 'Jewelife';
export const APP_URL = 'https://cadgosho-dot.github.io/jewelife/';
export const SMARTPHONE_GAME_URL = 'https://cadgosho-dot.github.io/glab-gem-game/g-lab-gem-game-github-pages/';

export const SCREEN_META = {
  main: { image: './assets/images/main.webp', bgm: 'main', ambient: 'main' },
  mining: { image: './assets/images/mining.webp', bgm: 'mining', ambient: 'mining' },
  workshop: { image: './assets/images/workshop.webp', bgm: 'workshop', ambient: 'workshop' },
  store: { image: './assets/images/store.webp', bgm: 'store', ambient: 'store' },
  glab: { image: './assets/images/glab.webp', bgm: 'glab', ambient: 'glab' },
  okachimachi: { image: './assets/images/okachimachi.webp', bgm: 'okachimachi', ambient: 'okachimachi' },
  sleep: { image: './assets/images/sleep.webp', bgm: 'sleep', ambient: 'sleep' },
  phone: { image: './assets/images/main.webp', bgm: 'inherit', ambient: 'inherit' },
  settings: { image: './assets/images/main.webp', bgm: 'inherit', ambient: 'inherit' },
  finance: { image: './assets/images/main.webp', bgm: 'inherit', ambient: 'inherit' },
};

export const MINING_LOCATIONS = {
  river: {
    id: 'river', name: '河原', hours: 2, hp: 5, description: '浅瀬や砂利の中から原石や金属片を探します。',
    rewards: [
      { type: 'rough', key: 'quartz', name: '水晶の原石', quality: '普通', weight: 55 },
      { type: 'rough', key: 'agate', name: '瑪瑙の原石', quality: '普通', weight: 30 },
      { type: 'metal', metal: 'silver', name: 'シルバー', min: 1, max: 5, weight: 15 },
    ],
  },
  mountain: {
    id: 'mountain', name: '山道', hours: 3, hp: 7, description: '露頭や崩れた岩から色石の原石を採取します。',
    rewards: [
      { type: 'rough', key: 'amethyst', name: 'アメシストの原石', quality: '普通', weight: 45 },
      { type: 'rough', key: 'garnet', name: 'ガーネットの原石', quality: '普通', weight: 35 },
      { type: 'rough', key: 'quartz', name: '水晶の原石', quality: '良質', weight: 15 },
      { type: 'metal', metal: 'silver', name: 'シルバー', min: 2, max: 7, weight: 5 },
    ],
  },
  shallowMine: {
    id: 'shallowMine', name: '浅い鉱山', hours: 4, hp: 9, description: '暗い坑道で原石と金属鉱脈を探します。',
    rewards: [
      { type: 'rough', key: 'amethyst', name: 'アメシストの原石', quality: '良質', weight: 30 },
      { type: 'rough', key: 'garnet', name: 'ガーネットの原石', quality: '良質', weight: 25 },
      { type: 'rough', key: 'aquamarine', name: 'アクアマリンの原石', quality: '普通', weight: 20 },
      { type: 'metal', metal: 'silver', name: 'シルバー', min: 4, max: 12, weight: 20 },
      { type: 'metal', metal: 'gold', name: 'ゴールド', min: 1, max: 2, weight: 5 },
    ],
  },
};

export const GLAB_ITEMS = [
  { id: 'pickaxe-2', name: '強化ツルハシ', price: 15000, hours: 1, category: 'tool', description: '採掘ミニゲームの打撃力が上がります。', unique: true, effect: { pickaxeLevel: 2 } },
  { id: 'pickaxe-3', name: '精密採掘ツルハシ', price: 60000, hours: 1, category: 'tool', description: '採掘効率と良質素材の発見率が上がります。', unique: true, effect: { pickaxeLevel: 3 } },
  { id: 'general-storage', name: '工房収納棚', price: 8000, hours: 1, category: 'equipment', description: '通常収納を10枠拡張します。', effect: { generalCapacity: 10 } },
  { id: 'loose-box', name: 'ルースボックス', price: 12000, hours: 1, category: 'equipment', description: 'ルース保管数を10石拡張します。', effect: { looseCapacity: 10 } },
  { id: 'metal-vault', name: '地金金庫拡張', price: 15000, hours: 1, category: 'equipment', description: 'PtとGoldを各50g、Silverを500g拡張します。', effect: { metalCapacity: true } },
  { id: 'jewelry-box', name: 'ジュエリーボックス', price: 12000, hours: 1, category: 'equipment', description: '完成ジュエリーを20点追加保管できます。', effect: { jewelryCapacity: 20 } },
  { id: 'rough-cutter', name: '原石カット設備', price: 25000, hours: 1, category: 'equipment', description: '工房で原石カットが可能になります。', unique: true, effect: { unlock: 'roughCut' } },
  { id: 'jewelry-bench', name: 'ジュエリー制作設備', price: 50000, hours: 1, category: 'equipment', description: '工房でジュエリー作成が可能になります。', unique: true, effect: { unlock: 'jewelryCraft' } },
];

export const ROUGH_BASE_PRICE = {
  quartz: 450,
  agate: 650,
  amethyst: 1200,
  garnet: 1500,
  aquamarine: 2600,
};

export const QUALITY_MULTIPLIER = { '低品質': 0.65, '普通': 1, '良質': 1.45, '上質': 2.1 };

export const DEFAULT_METAL_PRICES = {
  platinum: 5500,
  gold: 16000,
  silver: 180,
  source: 'ゲーム内参考値（外部相場API未設定）',
  fetchedAt: null,
};

export function tokyoTodayISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const obj = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${obj.year}-${obj.month}-${obj.day}`;
}

export function defaultState() {
  const date = tokyoTodayISO();
  return {
    version: VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingComplete: false,
    player: {
      name: '',
      customization: { gender: '男性', hairStyle: 'ショート', hairColor: 'ブラック', eyeColor: 'ブラウン', skinColor: '標準' },
    },
    game: {
      date,
      minutes: 9 * 60,
      money: 30000,
      currentScreen: 'main',
      previousScreen: 'main',
      worldScreen: 'main',
      weather: { label: '晴れ', icon: '☀️', code: 0, source: 'seasonal' },
      dayNumber: 1,
      lastRealDate: date,
    },
    inventory: {
      generalCapacity: 20,
      general: [
        { id: 'tool-pickaxe-basic', category: 'tool', key: 'pickaxe-basic', name: '採掘用ツルハシ', qty: 1, equipped: true, level: 1 },
      ],
      looseCapacity: 10,
      loose: [],
      metalCapacity: { platinum: 100, gold: 100, silver: 1000 },
      metals: { platinum: 0, gold: 0, silver: 0 },
      jewelryCapacity: 20,
      jewelry: [],
    },
    unlocks: {
      miningLocations: ['river', 'mountain', 'shallowMine'],
      equipment: [],
      discovered: [],
      shops: ['materialShop'],
    },
    settings: {
      bgmVolume: 0.45,
      ambientVolume: 0.35,
      sfxVolume: 0.65,
      bgmMuted: false,
      ambientMuted: false,
      sfxMuted: false,
      vibration: true,
    },
    notifications: [
      {
        id: crypto.randomUUID(), sender: 'システム', title: 'Jewelifeへようこそ',
        body: 'スマホのg--gle.から、現在利用できる機能を確認できます。', date, minutes: 9 * 60,
        unread: true, link: { screen: 'ggle', query: 'ゲームの始め方' },
      },
    ],
    manualCalendar: [],
    daily: { income: 0, expense: 0, events: [] },
    market: { ...DEFAULT_METAL_PRICES },
    featureFlags: {
      mining: true, materialShop: true, storage: true, phone: true, sleep: true,
      roughCut: false, jewelryCraft: false, storeOwnership: false, employees: false, outsourcing: false,
    },
  };
}

export function minutesToClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function weekdayJa(iso) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', weekday: 'short' }).format(new Date(`${iso}T12:00:00+09:00`));
}

export function formatDateJa(iso) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${iso}T12:00:00+09:00`));
}

function nthMonday(year, monthIndex, nth) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const day = first.getUTCDay();
  const date = 1 + ((8 - day) % 7) + (nth - 1) * 7;
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
}

function equinoxDay(year, spring = true) {
  if (spring) return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

export function japaneseHolidays(year) {
  const base = new Map();
  const add = (iso, name) => base.set(iso, name);
  add(`${year}-01-01`, '元日');
  add(nthMonday(year, 0, 2), '成人の日');
  add(`${year}-02-11`, '建国記念の日');
  add(`${year}-02-23`, '天皇誕生日');
  add(`${year}-03-${String(equinoxDay(year, true)).padStart(2, '0')}`, '春分の日');
  add(`${year}-04-29`, '昭和の日');
  add(`${year}-05-03`, '憲法記念日');
  add(`${year}-05-04`, 'みどりの日');
  add(`${year}-05-05`, 'こどもの日');
  add(nthMonday(year, 6, 3), '海の日');
  add(`${year}-08-11`, '山の日');
  add(nthMonday(year, 8, 3), '敬老の日');
  add(`${year}-09-${String(equinoxDay(year, false)).padStart(2, '0')}`, '秋分の日');
  add(nthMonday(year, 9, 2), 'スポーツの日');
  add(`${year}-11-03`, '文化の日');
  add(`${year}-11-23`, '勤労感謝の日');

  const dates = [...base.keys()].sort();
  for (let i = 0; i < dates.length - 1; i += 1) {
    const a = new Date(`${dates[i]}T00:00:00+09:00`);
    const b = new Date(`${dates[i + 1]}T00:00:00+09:00`);
    if ((b - a) / 86400000 === 2) {
      const middle = addDaysISO(dates[i], 1);
      if (!base.has(middle)) base.set(middle, '国民の休日');
    }
  }
  for (const [iso] of [...base.entries()].sort()) {
    const day = new Date(`${iso}T12:00:00+09:00`).getDay();
    if (day === 0) {
      let sub = addDaysISO(iso, 1);
      while (base.has(sub)) sub = addDaysISO(sub, 1);
      base.set(sub, '振替休日');
    }
  }
  return base;
}

export function holidayName(iso) {
  const year = Number(iso.slice(0, 4));
  return japaneseHolidays(year).get(iso) || '';
}

export function isOkachimachiOpen(state) {
  const date = state.game.date;
  const day = new Date(`${date}T12:00:00+09:00`).getDay();
  return day !== 0 && day !== 6 && !holidayName(date) && state.game.minutes < 18 * 60;
}

export function isGLabOpen(state) {
  const md = state.game.date.slice(5);
  return !['12-31', '01-01', '01-02'].includes(md) && state.game.minutes < 18 * 60;
}

export function seasonForDate(iso) {
  const month = Number(iso.slice(5, 7));
  if (month >= 3 && month <= 5) return '春';
  if (month >= 6 && month <= 8) return '夏';
  if (month >= 9 && month <= 11) return '秋';
  return '冬';
}

export function deterministicWeather(iso) {
  let seed = [...iso].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const season = seasonForDate(iso);
  const r = rand();
  if (season === '冬' && r < 0.08) return { label: '雪', icon: '🌨️', code: 71, source: 'seasonal' };
  if (r < 0.16) return { label: '雨', icon: '🌧️', code: 61, source: 'seasonal' };
  if (r < 0.24) return { label: '曇り', icon: '☁️', code: 3, source: 'seasonal' };
  if (season === '夏' && r > 0.94) return { label: '嵐', icon: '⛈️', code: 95, source: 'seasonal' };
  return { label: '晴れ', icon: '☀️', code: 0, source: 'seasonal' };
}

export function weatherLabelFromCode(code) {
  if (code === 0) return { label: '晴れ', icon: '☀️' };
  if ([1, 2, 3].includes(code)) return { label: '曇り', icon: '☁️' };
  if ([45, 48].includes(code)) return { label: '霧', icon: '🌫️' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: '雨', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '雪', icon: '🌨️' };
  if ([95, 96, 99].includes(code)) return { label: '嵐', icon: '⛈️' };
  return { label: '曇り', icon: '☁️' };
}

export function qualityScore(quality) {
  return { '低品質': 45, '普通': 62, '良質': 78, '上質': 92 }[quality] || 60;
}

export const HELP_ENTRIES = [
  { id: 'start', title: 'ゲームの始め方', category: '基本', keywords: '開始 採掘 売却 素材屋', body: '9:00から1日が始まります。採掘で原石や金属を入手し、平日の18:00までに御徒町の素材屋で売却して資金を増やします。行動ごとに時間が進み、21:00になると「寝る」だけ選べます。' },
  { id: 'time', title: '日付・時刻・営業時間', category: '基本', keywords: '時間 曜日 祝日 営業', body: '1日は9:00開始・21:00終了です。g-Lab.と御徒町は18:00以降利用できません。御徒町は土日祝日休業、g-Lab.は12月31日・1月1日・1月2日のみ休業です。' },
  { id: 'weather', title: '天気', category: '基本', keywords: '天候 現実 季節', body: 'ゲーム内日付が現実日付と同じ場合は御徒町周辺の現在天気を取得します。日付がずれた後は東京の季節傾向に沿って自動生成されます。天気は採掘結果などへ影響します。' },
  { id: 'mining', title: '採掘', category: '採掘', keywords: '河原 山道 浅い鉱山 ツルハシ', body: '初期採掘場所は河原・山道・浅い鉱山です。場所を選び、岩が壊れるまでツルハシを振ります。採掘場所ごとに所要時間と入手しやすい素材が異なります。' },
  { id: 'storage', title: '工房の保管', category: '工房', keywords: '収納 原石 ルース 地金 ジュエリー', body: '通常収納は20枠です。カット済みルースはルースボックス10石、地金はプラチナ100g・ゴールド100g・シルバー1000g、完成ジュエリーはジュエリーボックス20点に保管します。' },
  { id: 'selling', title: '素材屋での売却', category: '御徒町', keywords: '買取 原石 金属 相場', body: '御徒町の素材屋では原石と金属を売却できます。原石は種類・品質・ゲーム内需要、金属は設定された地金相場を基準に価格が決まります。' },
  { id: 'phone', title: 'スマホ', category: 'スマホ', keywords: 'プロフィール 通知 カレンダー AI g--gle', body: 'スマホではプロフィール、通知、カレンダー、g--gle.、スマホゲーム、AIを利用できます。スマホを操作している間はゲーム内時間が進みません。' },
  { id: 'ai', title: 'AI相談用ゲームデータ', category: 'スマホ', keywords: 'コピー 分析 外部AI', body: 'AI画面の「ゲームデータコピー」を押すと、現在のゲーム状況とゲーム開始からの履歴を外部AIへ貼り付けられる形式でコピーします。' },
  { id: 'save', title: '自動セーブ', category: '設定', keywords: '保存 クラウド Firebase 端末', body: '行動後にクラウドへ自動保存します。同じアカウントでスマートフォンとパソコンから同じデータを利用できます。同時操作はできません。' },
  { id: 'roughCut', title: '原石カット', category: '工房', keywords: 'ルース カット 設備', body: 'g-Lab.で原石カット設備を購入すると利用できます。原石を1個消費し、品質に応じたルースを作成します。', requiresUnlock: 'roughCut' },
  { id: 'jewelryCraft', title: 'ジュエリー作成', category: '工房', keywords: '制作 リング ペンダント', body: 'g-Lab.でジュエリー制作設備を購入すると利用できます。ルースと地金を使ってジュエリーを制作します。', requiresUnlock: 'jewelryCraft' },
];
