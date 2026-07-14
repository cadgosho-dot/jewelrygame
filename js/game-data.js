export const VERSION = '0.5.2';
export const SAVE_KEY = 'jewelrygame-clean-v0.4.0';

export const METALS = {
  silver: { id: 'silver', name: 'シルバー', price: 3000 },
  gold: { id: 'gold', name: 'ゴールド', price: 12000 },
  platinum: { id: 'platinum', name: 'プラチナ', price: 18000 },
};

export const GEMS = {
  garnet: { id: 'garnet', name: 'ガーネット', price: 4000, hue: '#7d1f2d' },
  amethyst: { id: 'amethyst', name: 'アメシスト', price: 3000, hue: '#8e62c7' },
  aquamarine: { id: 'aquamarine', name: 'アクアマリン', price: 5000, hue: '#78cddd' },
  diamond: { id: 'diamond', name: 'ダイヤモンド', price: 20000, hue: '#dcecf2' },
  emerald: { id: 'emerald', name: 'エメラルド', price: 12000, hue: '#11a67a' },
  moonstone: { id: 'moonstone', name: 'ムーンストーン', price: 4500, hue: '#c9e4ef' },
  ruby: { id: 'ruby', name: 'ルビー', price: 13000, hue: '#c51f55' },
  peridot: { id: 'peridot', name: 'ペリドット', price: 4000, hue: '#98cf3d' },
  sapphire: { id: 'sapphire', name: 'サファイア', price: 10000, hue: '#3158a5' },
  opal: { id: 'opal', name: 'オパール', price: 9000, hue: '#ffbe60' },
  imperialtopaz: { id: 'imperialtopaz', name: 'インペリアルトパーズ', price: 11000, hue: '#e7b07c' },
  turquoise: { id: 'turquoise', name: 'トルコ石', price: 5000, hue: '#36c9d0' },
  lapislazuli: { id: 'lapislazuli', name: 'ラピスラズリ', price: 4500, hue: '#2f55c8' },
  paraibatourmaline: { id: 'paraibatourmaline', name: 'パライバトルマリン', price: 15000, hue: '#1ed8dd' },
  tourmaline: { id: 'tourmaline', name: 'トルマリン', price: 7000, hue: '#c36f98' },
  tanzanite: { id: 'tanzanite', name: 'タンザナイト', price: 11000, hue: '#6a68df' },
  citrine: { id: 'citrine', name: 'シトリン', price: 3500, hue: '#d89a22' },
};

export const ITEMS = {
  ring: { id: 'ring', name: 'リング', basePrice: 12000, hours: 2, symbol: '◯' },
  pendant: { id: 'pendant', name: 'ペンダント', basePrice: 10000, hours: 2, symbol: '◇' },
  earrings: { id: 'earrings', name: 'ピアス', basePrice: 14000, hours: 3, symbol: '◈' },
};

export const DESIGNS = {
  simple: { id: 'simple', name: 'シンプル', price: 0, hours: 0 },
  classic: { id: 'classic', name: 'クラシック', price: 3000, hours: 1 },
  modern: { id: 'modern', name: 'モダン', price: 4000, hours: 1 },
};

export const FINISHES = {
  mirror: { id: 'mirror', name: '鏡面', price: 0, hours: 0 },
  matte: { id: 'matte', name: 'つや消し', price: 1000, hours: 0 },
  decorated: { id: 'decorated', name: '装飾あり', price: 3000, hours: 1 },
};

export const QUALITIES = {
  standard: { id: 'standard', name: '標準', price: 0, saleBonus: 0 },
  good: { id: 'good', name: '良品', price: 3000, saleBonus: 0.08 },
  premium: { id: 'premium', name: '上質', price: 7000, saleBonus: 0.16 },
};

export const PRICE_MODES = {
  low: { id: 'low', name: '安め', multiplier: 0.9, saleBonus: 0.2 },
  standard: { id: 'standard', name: '適正', multiplier: 1, saleBonus: 0 },
  high: { id: 'high', name: '高め', multiplier: 1.2, saleBonus: -0.2 },
};

export const MINING_LOCATIONS = {
  river: {
    id: 'river', name: '河原', hours: 2,
    description: '比較的やさしい採掘場所です。淡い色の原石や定番の石が見つかります。',
    gems: [
      { id: 'amethyst', weight: 18 },
      { id: 'aquamarine', weight: 18 },
      { id: 'moonstone', weight: 16 },
      { id: 'citrine', weight: 16 },
      { id: 'turquoise', weight: 14 },
      { id: 'lapislazuli', weight: 10 },
      { id: 'garnet', weight: 8 },
    ],
  },
  mountain: {
    id: 'mountain', name: '山道', hours: 3,
    description: '色の鮮やかな原石が見つかります。種類も少し増えます。',
    gems: [
      { id: 'garnet', weight: 16 },
      { id: 'peridot', weight: 16 },
      { id: 'ruby', weight: 10 },
      { id: 'sapphire', weight: 9 },
      { id: 'opal', weight: 10 },
      { id: 'tourmaline', weight: 14 },
      { id: 'tanzanite', weight: 8 },
      { id: 'emerald', weight: 8 },
      { id: 'lapislazuli', weight: 9 },
    ],
  },
  cave: {
    id: 'cave', name: '洞窟', hours: 4,
    description: 'やや希少な原石が見つかります。時間はかかりますが、品揃えが広がります。',
    gems: [
      { id: 'emerald', weight: 12 },
      { id: 'sapphire', weight: 14 },
      { id: 'opal', weight: 11 },
      { id: 'imperialtopaz', weight: 10 },
      { id: 'tourmaline', weight: 12 },
      { id: 'ruby', weight: 9 },
      { id: 'aquamarine', weight: 10 },
      { id: 'paraibatourmaline', weight: 7 },
      { id: 'diamond', weight: 5 },
      { id: 'tanzanite', weight: 10 },
    ],
  },
  mine: {
    id: 'mine', name: '鉱山奥', hours: 5,
    description: '希少石を狙える採掘場所です。時間は長いですが、高価な原石が見つかります。',
    gems: [
      { id: 'diamond', weight: 8 },
      { id: 'paraibatourmaline', weight: 10 },
      { id: 'tanzanite', weight: 12 },
      { id: 'imperialtopaz', weight: 10 },
      { id: 'emerald', weight: 12 },
      { id: 'sapphire', weight: 12 },
      { id: 'opal', weight: 12 },
      { id: 'tourmaline', weight: 12 },
      { id: 'ruby', weight: 8 },
      { id: 'moonstone', weight: 4 },
    ],
  },
};

export const CUSTOMERS = {
  misaki: {
    id: 'misaki', name: '山本美咲',
    opening: '普段使いできる、あまり派手ではないリングを探しています。',
    preferenceText: 'アメシスト・シルバー・シンプルなリング',
    request: { item: 'ring', gem: 'amethyst', metal: 'silver', design: 'simple', budget: 30000, deadlineDays: 4 },
  },
  kenta: {
    id: 'kenta', name: '佐藤健太',
    opening: 'プレゼント用のペンダントを探しています。間に合うものがあると助かります。',
    preferenceText: 'アクアマリン・ゴールド・シンプルなペンダント',
    request: { item: 'pendant', gem: 'aquamarine', metal: 'gold', design: 'simple', budget: 60000, deadlineDays: 3 },
  },
};

export const WEATHER = ['晴れ', '曇り', '雨'];

export function roundThousand(value) {
  return Math.max(1000, Math.round(Number(value || 0) / 1000) * 1000);
}

export function recommendedPrice({ item, gem, metal, design, finish, quality }) {
  return roundThousand(
    ITEMS[item].basePrice
    + GEMS[gem].price
    + METALS[metal].price
    + DESIGNS[design].price
    + FINISHES[finish].price
    + QUALITIES[quality].price,
  );
}

export function productionCost({ gem, metal }) {
  return GEMS[gem].price + METALS[metal].price;
}

export function productionHours({ item, design, finish }, employee = null) {
  const base = ITEMS[item].hours + DESIGNS[design].hours + FINISHES[finish].hours;
  const assisted = employee?.hired && employee?.working && employee?.role === 'craft';
  return Math.max(1, base - (assisted ? 1 : 0));
}

export function itemName({ gem, metal, item }) {
  return `${GEMS[gem].name}・${METALS[metal].name}${ITEMS[item].name}`;
}

export function initialState() {
  return {
    version: VERSION,
    started: true,
    game: {
      day: 1,
      minutes: 8 * 60,
      money: 15000,
      weather: '晴れ',
      screen: 'main',
    },
    artisan: { level: 1, xp: 0 },
    inventory: {
      gems: Object.fromEntries(Object.keys(GEMS).map((key) => [key, 0])),
      metals: Object.fromEntries(Object.keys(METALS).map((key) => [key, 0])),
      jewelry: [],
      capacity: 10,
    },
    store: {
      expanded: false,
      showcaseCount: 3,
      showcases: [null, null, null],
      rating: 1,
      salesCount: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalVisitors: 0,
      lastResult: null,
    },
    customers: {
      misaki: { met: false, relation: '初来店', purchases: 0, visiting: false, lastVisitDay: null, ignoredToday: false },
      kenta: { met: false, relation: '初来店', purchases: 0, visiting: false, lastVisitDay: null, ignoredToday: false },
    },
    orders: [],
    employee: { hired: false, name: '田中 葵', role: 'sales', working: true },
    notifications: [],
    finance: [],
    daily: { mined: [], crafted: [], sold: [], visitors: 0, income: 0, expense: 0 },
    settings: {
      bgmVolume: 0.45,
      ambientVolume: 0.3,
      sfxVolume: 0.65,
      bgmMuted: false,
      ambientMuted: false,
      sfxMuted: false,
      vibration: true,
      textSize: 'normal',
      showHints: true,
    },
    miningMisses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return structuredClone(base);
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(saved)) {
    if (Array.isArray(value)) out[key] = structuredClone(value);
    else if (value && typeof value === 'object' && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) out[key] = merge(out[key], value);
    else out[key] = value;
  }
  return out;
}

export function migrateState(saved) {
  const legacy = saved && typeof saved === 'object' ? structuredClone(saved) : {};
  const state = merge(initialState(), legacy);

  // v0.1系のクラウドセーブから、保持できる基本情報を引き継ぐ。
  if (legacy.game?.dayNumber != null && legacy.game?.day == null) state.game.day = Number(legacy.game.dayNumber) || 1;
  if (legacy.game?.currentScreen && !legacy.game?.screen) state.game.screen = 'main';
  if (legacy.game?.weather?.label) state.game.weather = legacy.game.weather.label;
  if (legacy.inventory?.metals) {
    for (const key of Object.keys(METALS)) {
      if (Number.isFinite(Number(legacy.inventory.metals[key]))) state.inventory.metals[key] = Math.max(0, Number(legacy.inventory.metals[key]));
    }
  }
  const legacyGemRows = [
    ...(Array.isArray(legacy.inventory?.general) ? legacy.inventory.general : []),
    ...(Array.isArray(legacy.inventory?.loose) ? legacy.inventory.loose : []),
  ];
  for (const row of legacyGemRows) {
    const key = row?.key || row?.gem;
    if (key && Object.prototype.hasOwnProperty.call(state.inventory.gems, key)) {
      state.inventory.gems[key] += Math.max(0, Number(row.qty) || 1);
    }
  }

  state.version = VERSION;
  state.started = true;
  state.game.day = Math.max(1, Number(state.game.day) || 1);
  state.game.minutes = Math.max(8 * 60, Math.min(22 * 60, Number(state.game.minutes) || 8 * 60));
  state.game.money = Number.isFinite(Number(state.game.money)) ? Number(state.game.money) : 15000;
  state.game.weather = WEATHER.includes(state.game.weather) ? state.game.weather : '晴れ';
  state.game.screen = 'main';

  state.inventory.gems = { ...initialState().inventory.gems, ...(state.inventory.gems || {}) };
  state.inventory.metals = { ...initialState().inventory.metals, ...(state.inventory.metals || {}) };
  state.inventory.jewelry = Array.isArray(state.inventory.jewelry) ? state.inventory.jewelry.filter((entry) => entry && entry.id && ITEMS[entry.item] && GEMS[entry.gem] && METALS[entry.metal] && DESIGNS[entry.design] && FINISHES[entry.finish] && QUALITIES[entry.quality]) : [];
  state.store.showcaseCount = state.store.expanded ? 5 : 3;
  state.inventory.capacity = state.store.expanded ? 20 : 10;
  state.store.showcases = Array.isArray(state.store.showcases) ? state.store.showcases.slice(0, state.store.showcaseCount) : [];
  while (state.store.showcases.length < state.store.showcaseCount) state.store.showcases.push(null);
  const jewelryIds = new Set(state.inventory.jewelry.map((item) => item.id));
  state.store.showcases = state.store.showcases.map((slot) => slot && jewelryIds.has(slot.jewelryId) ? slot : null);
  state.orders = Array.isArray(state.orders) ? state.orders.filter((entry) => entry && entry.id && ITEMS[entry.item] && GEMS[entry.gem] && METALS[entry.metal]) : [];
  state.notifications = (Array.isArray(state.notifications) ? state.notifications : []).slice(0, 80).map((note, index) => ({
    id: note?.id || `legacy-note-${index}`,
    title: note?.title || note?.sender || 'お知らせ',
    body: note?.body || '',
    type: note?.type || 'info',
    day: Number(note?.day) || state.game.day,
    unread: note?.unread !== false,
  }));
  state.finance = Array.isArray(state.finance) ? state.finance.slice(-50) : [];
  state.daily = state.daily || { mined: [], crafted: [], sold: [], visitors: 0, income: 0, expense: 0 };

  // 主人公像・顔アイコン・キャラクター選択は使用しない。
  for (const key of ['player', 'profile', 'character', 'avatar', 'customization', 'characterCustomize', 'onboardingComplete']) {
    if (Object.prototype.hasOwnProperty.call(state, key)) delete state[key];
  }

  return state;
}

export function clock(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function nextWeather() {
  const r = Math.random();
  if (r < 0.55) return '晴れ';
  if (r < 0.8) return '曇り';
  return '雨';
}
