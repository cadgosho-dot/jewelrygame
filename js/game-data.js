export const VERSION = '0.10.10';
export const SAVE_KEY = 'jewelrygame-clean-v0.4.0';
export const STORE_LEASE_COST = 10000;
export const JEWELRY_BENCH_PRICE = 85000;
export const POLISHING_MACHINE_PRICE = 400000;
export const POLISHING_HOURS = 2;

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


export const MEALS = {
  convenience: { id: 'convenience', name: 'コンビニ', price: 900, recovery: 3 },
  soba: { id: 'soba', name: '立ち食いそば', price: 850, recovery: 3 },
  ramen: { id: 'ramen', name: 'ラーメン', price: 900, recovery: 3 },
  hamburger: { id: 'hamburger', name: 'ハンバーガー', price: 1000, recovery: 3 },
  indian: { id: 'indian', name: 'インド料理', price: 1200, recovery: 7 },
  korean: { id: 'korean', name: '韓国料理', price: 1200, recovery: 7 },
  chinese: { id: 'chinese', name: '中華料理', price: 1100, recovery: 7 },
  kebab: { id: 'kebab', name: 'ケバブ', price: 600, recovery: 2 },
};

export const GENERAL_ITEMS = {
  riceBall: {
    id: 'riceBall', name: 'おにぎり', category: '回復アイテム', symbol: '🍙', usable: true,
    description: '使うと空腹度が2回復します。', effect: { hunger: 2 }, sfx: 'eat',
  },
  boxedMeal: {
    id: 'boxedMeal', name: 'お弁当', category: '回復アイテム', symbol: '🍱', usable: true,
    description: '使うと空腹度が4回復します。', effect: { hunger: 4 }, sfx: 'eat',
  },
  energyJelly: {
    id: 'energyJelly', name: '栄養ゼリー', category: '回復アイテム', symbol: '🥤', usable: true,
    description: '使うと空腹度が1回復します。', effect: { hunger: 1 }, sfx: 'eat',
  },
};

export const EQUIPMENT_ITEMS = {
  basicPickaxe: {
    id: 'basicPickaxe', name: '採掘用ツルハシ', category: '採掘装備', symbol: '⛏', slot: 'miningTool',
    description: '岩を砕くための基本装備です。ゲーム開始時から所持しています。',
  },
};

export const WORKSHOP_TOOLS = {
  jewelryBench: {
    id: 'jewelryBench', name: '彫金机', type: '設備', symbol: '⚒', price: 85000, qualityPoints: 3,
    initiallyAvailable: true, breakable: false, repairable: false,
    description: 'ジュエリー制作の土台となる作業机です。ジュエリー作成に必須です。',
    detail: 'スリ板や工具を取り付け、切削・成形・組み立てなどの作業を行う工房の中心設備です。壊れることはありません。',
  },
  polishingMachine: {
    id: 'polishingMachine', name: '研磨機', type: '設備', symbol: '◉', price: 400000, qualityPoints: 6,
    initiallyAvailable: true, breakable: true, repairable: true,
    description: '原石を削り、ルースへ研磨するための設備です。原石研磨に必須です。',
    detail: '回転する研磨盤を使い、原石の形や面を整えます。故障すると使用不能になり、g-Lab.へ修理を依頼できます。',
  },
  file: {
    id: 'file', name: 'ヤスリ', type: '工具', symbol: '▰', price: 5000, qualityPoints: 1,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '地金の形を整え、表面の凹凸を削る基本工具です。',
    detail: '荒削りから細かな形の調整まで幅広く使います。消耗や破損時は工房からなくなり、再購入が必要です。',
  },
  pliers: {
    id: 'pliers', name: 'ヤットコ', type: '工具', symbol: '⌁', price: 4000, qualityPoints: 1,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '地金や金具をつかみ、曲げたり組み立てたりする工具です。',
    detail: '細かな部品を保持しながら、曲げ・締め・位置調整を行います。破損時は再購入が必要です。',
  },
  torch: {
    id: 'torch', name: 'バーナー', type: '工具', symbol: '♨', price: 30000, qualityPoints: 2,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '地金のろう付けや焼きなましに使う加熱工具です。',
    detail: '火力を調整して地金を加熱し、部品の接合や金属を柔らかくする工程に使います。',
  },
  hammer: {
    id: 'hammer', name: 'ハンマー', type: '工具', symbol: '🔨', price: 2000, qualityPoints: 1,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '地金をたたいて成形し、模様や硬さを調整する工具です。',
    detail: 'リングや板材の形を整える基本工具です。安価なため、ほかの工具より破損しやすい設定です。',
  },
  magnifier: {
    id: 'magnifier', name: '拡大鏡', type: '設備', symbol: '◎', price: 150000, qualityPoints: 4,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '両手を使ったまま細部を大きく確認できる拡大設備です。',
    detail: '石留めや仕上げの細かな傷を確認しやすくなり、完成品の精度向上に役立ちます。',
  },
  loupe: {
    id: 'loupe', name: 'ルーペ', type: '工具', symbol: '◍', price: 7000, qualityPoints: 1,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '宝石や地金の状態を手軽に拡大して確認する工具です。',
    detail: '内包物、爪の状態、表面の傷などを確認する携帯型の拡大工具です。',
  },
  benchPeg: {
    id: 'benchPeg', name: 'スリ板', type: '工具', symbol: '▱', price: 3000, qualityPoints: 1,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '彫金机に取り付け、地金を支えながら作業する木製工具です。',
    detail: '糸鋸やヤスリ作業の支点になります。削れて消耗するため、定期的な交換が必要です。',
  },
  graver: {
    id: 'graver', name: 'タガネ', type: '工具', symbol: '✦', price: 5000, qualityPoints: 1,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '彫り、石留め、模様付けなどに使う先端工具です。',
    detail: '先端形状によって用途が変わり、細かな彫刻や地金を動かす作業に使います。',
  },
  engravingBlock: {
    id: 'engravingBlock', name: '彫刻台', type: '設備', symbol: '⬡', price: 75000, qualityPoints: 3,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '加工物を固定し、安定して彫刻や石留めを行う設備です。',
    detail: '回転や角度調整ができ、細かな作業時の安定性と加工精度を高めます。',
  },
  stamps: {
    id: 'stamps', name: '刻印', type: '工具', symbol: 'Ａ', price: 150000, qualityPoints: 4,
    initiallyAvailable: true, breakable: true, repairable: false,
    description: '品位や文字、記号を地金へ打ち込むための工具一式です。',
    detail: '均一で読みやすい刻印を入れられ、完成品の情報性と仕上がりを高めます。',
  },
  rotaryTool: {
    id: 'rotaryTool', name: 'リューター', type: '設備', symbol: '⟳', price: 160000, qualityPoints: 4,
    initiallyAvailable: true, breakable: true, repairable: true,
    description: '先端工具を高速回転させ、研削・穴あけ・仕上げを行う設備です。',
    detail: '多くの工程を効率化します。故障すると使用不能になり、修理完了まで7日かかります。',
  },
  buffer: {
    id: 'buffer', name: 'バッファー', type: '設備', symbol: '✺', price: 300000, qualityPoints: 5,
    initiallyAvailable: true, breakable: true, repairable: true,
    description: '完成品の表面を磨き、光沢を出すための研磨設備です。',
    detail: '広い面を均一に磨き、鏡面仕上げの品質を高めます。故障時はg-Lab.で修理できます。',
  },
  ultrasonicCleaner: {
    id: 'ultrasonicCleaner', name: '超音波洗浄機', type: '設備', symbol: '≈', price: 90000, qualityPoints: 3,
    initiallyAvailable: true, breakable: true, repairable: true,
    description: '細かな隙間の研磨粉や汚れを超音波で洗浄する設備です。',
    detail: '仕上げ後の洗浄に使い、石の裏側や金具の隙間まで清潔にします。',
  },
  computer: {
    id: 'computer', name: 'パソコン', type: '設備', symbol: '▣', price: 0, qualityPoints: 5,
    initiallyAvailable: false, breakable: true, repairable: true,
    description: 'CAD設計や制作データ管理に使用する設備です。',
    detail: 'ゲーム進行後に追加されます。故障時は使用不能になり、修理に7日かかります。',
  },
  cadSoftware: {
    id: 'cadSoftware', name: 'CADソフト', type: '設備', symbol: '◇', price: 0, qualityPoints: 6,
    initiallyAvailable: false, breakable: false, repairable: false,
    description: 'ジュエリーを立体設計するためのソフトウェアです。',
    detail: 'ゲーム進行後に追加されます。ソフトウェアのため壊れることはありません。',
  },
  printer3d: {
    id: 'printer3d', name: '3Dプリンター', type: '設備', symbol: '▧', price: 0, qualityPoints: 6,
    initiallyAvailable: false, breakable: true, repairable: true,
    description: 'CADデータから原型を造形する設備です。',
    detail: 'ゲーム進行後に追加されます。故障時は使用不能になり、修理に7日かかります。',
  },
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
    id: 'river', name: '河原', hours: 2, unlockAtFinds: 0,
    description: '流れの近くにある岩を探して採掘します。',
    gems: [
      { id: 'amethyst', weight: 34 },
      { id: 'citrine', weight: 33 },
      { id: 'moonstone', weight: 33 },
    ],
  },
  mountain: {
    id: 'mountain', name: '山道', hours: 3, unlockAtFinds: 0,
    description: '山道に露出した岩を探して採掘します。',
    gems: [
      { id: 'garnet', weight: 34 },
      { id: 'peridot', weight: 33 },
      { id: 'lapislazuli', weight: 33 },
    ],
  },
  cave: {
    id: 'cave', name: '浅い鉱山', hours: 3, unlockAtFinds: 0,
    description: '入口に近い安全な場所で採掘します。',
    gems: [
      { id: 'aquamarine', weight: 34 },
      { id: 'turquoise', weight: 33 },
      { id: 'garnet', weight: 33 },
    ],
  },
  mine: {
    id: 'mine', name: '鉱山奥', hours: 5, unlockAtFinds: 10,
    description: '採掘経験を積むと進めるようになる、鉱山の奥深い場所です。',
    gems: [
      { id: 'sapphire', weight: 18 },
      { id: 'ruby', weight: 16 },
      { id: 'emerald', weight: 16 },
      { id: 'opal', weight: 15 },
      { id: 'tourmaline', weight: 14 },
      { id: 'tanzanite', weight: 10 },
      { id: 'imperialtopaz', weight: 6 },
      { id: 'paraibatourmaline', weight: 3 },
      { id: 'diamond', weight: 2 },
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

export function roughSalePrice(gemId) {
  const gem = GEMS[gemId];
  return gem ? roundThousand(gem.price * 0.35) : 0;
}

export function looseSalePrice(gemId) {
  const gem = GEMS[gemId];
  return gem ? roundThousand(gem.price * 0.6) : 0;
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

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function initialState() {
  return {
    version: VERSION,
    started: true,
    playerName: '',
    game: {
      day: 1,
      startDate: localDateString(),
      minutes: 8 * 60,
      money: 15000,
      weather: '晴れ',
      screen: 'main',
    },
    artisan: { level: 1, xp: 0 },
    wellbeing: { hunger: 7, maxHunger: 7, lastMeal: '', mealsEaten: 0 },
    inventory: {
      rough: Object.fromEntries(Object.keys(GEMS).map((key) => [key, 0])),
      loose: Object.fromEntries(Object.keys(GEMS).map((key) => [key, 0])),
      metals: Object.fromEntries(Object.keys(METALS).map((key) => [key, 0])),
      jewelry: [],
      items: Object.fromEntries(Object.keys(GENERAL_ITEMS).map((key) => [key, 0])),
      equipment: Object.fromEntries(Object.keys(EQUIPMENT_ITEMS).map((key) => [key, key === 'basicPickaxe' ? 1 : 0])),
      equipped: { miningTool: 'basicPickaxe' },
      capacity: 10,
    },
    tools: {
      items: Object.fromEntries(Object.keys(WORKSHOP_TOOLS).map((key) => [key, null])),
      morningMessages: [],
      jewelryBench: false,
      jewelryBenchDay: null,
      polishingMachine: false,
      polishingMachineDay: null,
      otherEquipment: [],
    },
    facilities: {
      materialShop: true,
      looseShop: false,
      glab: true,
      jewelryShop: false,
      settingShop: false,
      castingShop: false,
      realEstate: false,
      recruitment: false,
    },
    store: {
      name: '',
      branchNumber: 1,
      branches: [],
      rented: false,
      rentedDay: null,
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
    daily: { mined: [], polished: [], roughSold: [], looseSold: [], crafted: [], sold: [], meals: [], visitors: 0, income: 0, expense: 0 },
    settings: {
      bgmVolume: 0.75,
      ambientVolume: 0.60,
      sfxVolume: 0.75,
      bgmMuted: false,
      ambientMuted: false,
      sfxMuted: false,
      vibration: true,
      showHints: true,
    },
    miningProgress: {
      successfulFinds: 0,
      unlockedLocations: ['river', 'mountain', 'cave'],
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
  const migratedLooseRows = Object.fromEntries(Object.keys(GEMS).map((key) => [key, 0]));
  const migratedGeneralItems = Object.fromEntries(Object.keys(GENERAL_ITEMS).map((key) => [key, 0]));
  for (const row of legacyGemRows) {
    const key = row?.key || row?.gem || row?.id;
    if (key && Object.prototype.hasOwnProperty.call(migratedLooseRows, key)) {
      migratedLooseRows[key] += Math.max(0, Number(row.qty) || 1);
    } else if (key && Object.prototype.hasOwnProperty.call(migratedGeneralItems, key)) {
      migratedGeneralItems[key] += Math.max(0, Number(row.qty) || 1);
    }
  }

  state.version = VERSION;
  state.started = true;
  const legacyPlayerName = legacy.playerName || legacy.profile?.name || legacy.player?.name || '';
  state.playerName = String(state.playerName || legacyPlayerName).trim().slice(0, 20);
  state.game.day = Math.max(1, Number(state.game.day) || 1);
  const savedStartDate = String(state.game.startDate || '').trim();
  const startDateMatch = savedStartDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (startDateMatch) {
    const parsedStartDate = new Date(Number(startDateMatch[1]), Number(startDateMatch[2]) - 1, Number(startDateMatch[3]), 12, 0, 0, 0);
    state.game.startDate = Number.isNaN(parsedStartDate.getTime()) ? localDateString(new Date(state.createdAt || Date.now())) : localDateString(parsedStartDate);
  } else {
    const createdDate = new Date(state.createdAt || legacy.createdAt || Date.now());
    state.game.startDate = localDateString(Number.isNaN(createdDate.getTime()) ? new Date() : createdDate);
  }
  state.game.minutes = Math.max(8 * 60, Math.min(22 * 60, Number(state.game.minutes) || 8 * 60));
  state.game.money = Number.isFinite(Number(state.game.money)) ? Number(state.game.money) : 15000;
  state.game.weather = WEATHER.includes(state.game.weather) ? state.game.weather : '晴れ';
  state.game.screen = 'main';

  const savedRough = state.inventory.rough && !Array.isArray(state.inventory.rough) ? state.inventory.rough : {};
  const savedLoose = state.inventory.loose && !Array.isArray(state.inventory.loose) ? state.inventory.loose : {};
  state.inventory.rough = { ...initialState().inventory.rough, ...savedRough };
  state.inventory.loose = { ...initialState().inventory.loose, ...savedLoose };
  for (const key of Object.keys(GEMS)) state.inventory.loose[key] += migratedLooseRows[key];
  // v0.5.9以前の「宝石」在庫は購入品と採掘品が混在していたため、利用不能にならないようルースへ引き継ぐ。
  if (legacy.inventory?.gems && !legacy.inventory?.rough && !legacy.inventory?.loose) {
    for (const key of Object.keys(GEMS)) {
      state.inventory.loose[key] += Math.max(0, Number(legacy.inventory.gems[key]) || 0);
    }
  }
  if (Object.prototype.hasOwnProperty.call(state.inventory, 'gems')) delete state.inventory.gems;
  if (Object.prototype.hasOwnProperty.call(state.inventory, 'general')) delete state.inventory.general;
  state.inventory.metals = { ...initialState().inventory.metals, ...(state.inventory.metals || {}) };
  state.inventory.items = { ...initialState().inventory.items, ...(state.inventory.items || {}) };
  for (const key of Object.keys(GENERAL_ITEMS)) {
    state.inventory.items[key] = Math.max(0, Math.floor(Number(state.inventory.items[key]) || 0) + migratedGeneralItems[key]);
  }
  state.inventory.equipment = { ...initialState().inventory.equipment, ...(state.inventory.equipment || {}) };
  for (const key of Object.keys(EQUIPMENT_ITEMS)) {
    state.inventory.equipment[key] = Math.max(0, Math.floor(Number(state.inventory.equipment[key]) || 0));
  }
  // 既存データにも、ゲーム開始時から持っている採掘用ツルハシを引き継ぐ。
  state.inventory.equipment.basicPickaxe = Math.max(1, state.inventory.equipment.basicPickaxe || 0);
  state.inventory.equipped = { ...initialState().inventory.equipped, ...(state.inventory.equipped || {}) };
  for (const [slot, equipmentId] of Object.entries(state.inventory.equipped)) {
    const definition = EQUIPMENT_ITEMS[equipmentId];
    if (!definition || definition.slot !== slot || Number(state.inventory.equipment[equipmentId] || 0) <= 0) {
      state.inventory.equipped[slot] = '';
    }
  }
  if (!state.inventory.equipped.miningTool && state.inventory.equipment.basicPickaxe > 0) {
    state.inventory.equipped.miningTool = 'basicPickaxe';
  }
  const legacyTools = state.tools || {};
  state.tools = { ...initialState().tools, ...legacyTools };
  const savedToolItems = legacyTools.items && typeof legacyTools.items === 'object' ? legacyTools.items : {};
  state.tools.items = { ...initialState().tools.items };
  for (const [toolId, definition] of Object.entries(WORKSHOP_TOOLS)) {
    const saved = savedToolItems[toolId];
    if (saved && typeof saved === 'object') {
      const status = ['available', 'unusable', 'repairing'].includes(saved.status) ? saved.status : 'available';
      state.tools.items[toolId] = {
        id: toolId,
        status,
        acquiredDay: Math.max(1, Number(saved.acquiredDay) || state.game.day),
        failureDueDay: definition.breakable ? Math.max(state.game.day + 1, Number(saved.failureDueDay) || state.game.day + 120) : null,
        repairCompleteDay: status === 'repairing' ? Math.max(state.game.day + 1, Number(saved.repairCompleteDay) || state.game.day + 7) : null,
      };
    }
  }
  if (legacyTools.jewelryBench && !state.tools.items.jewelryBench) {
    state.tools.items.jewelryBench = { id: 'jewelryBench', status: 'available', acquiredDay: Math.max(1, Number(legacyTools.jewelryBenchDay) || 1), failureDueDay: null, repairCompleteDay: null };
  }
  if (legacyTools.polishingMachine && !state.tools.items.polishingMachine) {
    state.tools.items.polishingMachine = { id: 'polishingMachine', status: 'available', acquiredDay: Math.max(1, Number(legacyTools.polishingMachineDay) || 1), failureDueDay: state.game.day + 150, repairCompleteDay: null };
  }
  const legacyOtherEquipment = Array.isArray(legacyTools.otherEquipment) ? legacyTools.otherEquipment : [];
  for (const entry of legacyOtherEquipment) {
    const name = typeof entry === 'string' ? entry : entry?.name;
    const matched = Object.values(WORKSHOP_TOOLS).find((tool) => tool.name === name);
    if (matched && !state.tools.items[matched.id]) {
      state.tools.items[matched.id] = { id: matched.id, status: 'available', acquiredDay: Math.max(1, Number(entry?.acquiredDay) || state.game.day), failureDueDay: matched.breakable ? state.game.day + 120 : null, repairCompleteDay: null };
    }
  }
  state.tools.morningMessages = Array.isArray(legacyTools.morningMessages) ? legacyTools.morningMessages.map((message) => String(message).slice(0, 80)).slice(-10) : [];
  state.tools.jewelryBench = Boolean(state.tools.items.jewelryBench);
  state.tools.jewelryBenchDay = state.tools.items.jewelryBench?.acquiredDay || null;
  state.tools.polishingMachine = Boolean(state.tools.items.polishingMachine);
  state.tools.polishingMachineDay = state.tools.items.polishingMachine?.acquiredDay || null;
  state.tools.otherEquipment = [];
  state.facilities = { ...initialState().facilities, ...(state.facilities || {}) };
  // 初期から利用できるのは素材屋とg-Lab.のみ。
  state.facilities.materialShop = true;
  state.facilities.glab = true;
  // 既存セーブで利用済みの施設は閉じない。
  if (state.store?.rented) state.facilities.realEstate = true;
  if (state.employee?.hired) state.facilities.recruitment = true;
  // v0.5.8より店舗は不動産で契約してから利用する。旧セーブは実際の店舗利用履歴がある場合のみ契約済みとして引き継ぐ。
  if (typeof legacy.store?.rented !== 'boolean') {
    const usedStore = Number(state.store.salesCount) > 0
      || Number(state.store.totalRevenue) > 0
      || (Array.isArray(state.store.showcases) && state.store.showcases.some(Boolean))
      || (Array.isArray(state.orders) && state.orders.length > 0)
      || Object.values(state.customers || {}).some((customer) => customer?.met || customer?.visiting);
    state.store.rented = Boolean(usedStore);
  } else {
    state.store.rented = legacy.store.rented;
  }
  state.store.name = String(state.store.name || legacy.store?.storeName || '').trim().slice(0, 30);
  state.store.branchNumber = Math.max(1, Number(state.store.branchNumber) || 1);
  state.store.rentedDay = state.store.rented ? (Number(state.store.rentedDay) || 1) : null;
  const savedBranches = Array.isArray(state.store.branches) ? state.store.branches : [];
  state.store.branches = savedBranches
    .filter((branch) => branch && Number(branch.number) >= 1)
    .map((branch) => ({
      id: branch.id || `branch-${Number(branch.number)}`,
      number: Math.max(1, Number(branch.number) || 1),
      label: Number(branch.number) === 1 ? '本店' : `${Number(branch.number)}号店`,
      name: String(branch.name || state.store.name || '').trim().slice(0, 30),
      rentedDay: Math.max(1, Number(branch.rentedDay) || state.store.rentedDay || 1),
    }));
  if (state.store.rented && state.store.name && !state.store.branches.some((branch) => branch.number === 1)) {
    state.store.branches.unshift({ id: 'branch-1', number: 1, label: '本店', name: state.store.name, rentedDay: state.store.rentedDay || 1 });
  }
  if (state.store.rented) state.facilities.realEstate = true;
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
  })).filter((note) => !(/採掘結果|原石を入手|原石を採掘/.test(note.title) && note.title !== '新しい採掘場所を発見しました'));
  state.finance = Array.isArray(state.finance) ? state.finance.slice(-50) : [];
  state.wellbeing = { ...initialState().wellbeing, ...(state.wellbeing || {}) };
  state.wellbeing.maxHunger = 7;
  state.wellbeing.hunger = Math.max(0, Math.min(7, Math.round(Number(state.wellbeing.hunger) || 0)));
  state.wellbeing.lastMeal = MEALS[state.wellbeing.lastMeal] ? state.wellbeing.lastMeal : '';
  state.wellbeing.mealsEaten = Math.max(0, Math.round(Number(state.wellbeing.mealsEaten) || 0));
  state.daily = {
    mined: Array.isArray(state.daily?.mined) ? state.daily.mined : [],
    polished: Array.isArray(state.daily?.polished) ? state.daily.polished : [],
    roughSold: Array.isArray(state.daily?.roughSold) ? state.daily.roughSold : [],
    looseSold: Array.isArray(state.daily?.looseSold) ? state.daily.looseSold : [],
    crafted: Array.isArray(state.daily?.crafted) ? state.daily.crafted : [],
    sold: Array.isArray(state.daily?.sold) ? state.daily.sold : [],
    meals: Array.isArray(state.daily?.meals) ? state.daily.meals : [],
    visitors: Number(state.daily?.visitors) || 0,
    income: Number(state.daily?.income) || 0,
    expense: Number(state.daily?.expense) || 0,
  };
  const initialMiningProgress = initialState().miningProgress;
  const savedMiningProgress = state.miningProgress && typeof state.miningProgress === 'object' ? state.miningProgress : {};
  const currentGemCount = Object.values(state.inventory.rough).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0)
    + Object.values(state.inventory.loose).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0)
    + state.inventory.jewelry.length;
  const estimatedLegacyFinds = legacy.miningProgress
    ? Math.max(0, Number(savedMiningProgress.successfulFinds) || 0)
    : Math.max(currentGemCount, state.game.day >= 5 || state.artisan.level >= 2 ? 10 : 0);
  state.miningProgress = {
    successfulFinds: estimatedLegacyFinds,
    unlockedLocations: Array.isArray(savedMiningProgress.unlockedLocations)
      ? savedMiningProgress.unlockedLocations.filter((id) => MINING_LOCATIONS[id])
      : [...initialMiningProgress.unlockedLocations],
  };
  for (const location of Object.values(MINING_LOCATIONS)) {
    if (state.miningProgress.successfulFinds >= Number(location.unlockAtFinds || 0)
      && !state.miningProgress.unlockedLocations.includes(location.id)) {
      state.miningProgress.unlockedLocations.push(location.id);
    }
  }
  for (const initialId of initialMiningProgress.unlockedLocations) {
    if (!state.miningProgress.unlockedLocations.includes(initialId)) state.miningProgress.unlockedLocations.push(initialId);
  }

  state.settings = { ...initialState().settings, ...(state.settings || {}) };
  delete state.settings.textSize;
  // v0.7.3では各場面のBGM・環境音を明瞭に聞けるよう、旧初期値の音量を引き上げる。
  if (Number(state.settings.bgmVolume) <= 0.45) state.settings.bgmVolume = 0.75;
  if (Number(state.settings.ambientVolume) <= 0.35) state.settings.ambientVolume = 0.60;
  if (Number(state.settings.sfxVolume) <= 0.65) state.settings.sfxVolume = 0.75;
  if (!state.store.rented) {
    Object.values(state.customers).forEach((customer) => { customer.visiting = false; });
  }

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
