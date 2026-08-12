const AUDIO_DIR = './assets/audio';
const KAITENZUSHI_AUDIO_DIR = './assets/minigames/kaitenzushi/assets/audio';

function frozenScene(definition) {
  return Object.freeze({
    bgm: definition.bgm || null,
    ambient: definition.ambient || null,
    bgmScale: Number.isFinite(Number(definition.bgmScale)) ? Number(definition.bgmScale) : 1,
    ambientScale: Number.isFinite(Number(definition.ambientScale)) ? Number(definition.ambientScale) : 1,
    supplemental: Object.freeze([...(definition.supplemental || [])].map((item) => Object.freeze({ ...item }))),
  });
}

// 場面音の唯一の定義表です。BGM・環境音の変更は必ずここだけで行います。
export const AUDIO_SCENE_DEFINITIONS = Object.freeze({
  silent: frozenScene({ bgmScale: 0, ambientScale: 0 }),
  main: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-main.ogg`,
    ambient: { type: 'weather' },
    bgmScale: 1, ambientScale: 0.42,
  }),
  space: frozenScene({
    bgm: `${AUDIO_DIR}/space-main-bgm.mp3`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/space-ambient.mp3` },
    bgmScale: 0.84, ambientScale: 0.46,
  }),
  mining: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-mining.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-mining.ogg` },
    bgmScale: 0.98, ambientScale: 1,
  }),
  workshop: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-workshop.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-workshop.ogg` },
    bgmScale: 0.96, ambientScale: 1,
  }),
  craft: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-workshop.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-craft.ogg` },
    bgmScale: 0.96, ambientScale: 1,
  }),
  polishing: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-workshop.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-polishing.ogg` },
    bgmScale: 0.96, ambientScale: 1,
  }),
  store: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-store.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-store.ogg` },
    bgmScale: 0.94, ambientScale: 0.90,
  }),
  displayShop: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-okachimachi.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-displayShop.ogg` },
    bgmScale: 0.96, ambientScale: 0.92,
  }),
  materialShop: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-okachimachi.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-materialShop.ogg` },
    bgmScale: 0.98, ambientScale: 0.96,
  }),
  looseShop: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-okachimachi.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-looseShop.ogg` },
    bgmScale: 0.98, ambientScale: 0.96,
  }),
  jewelryShop: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-okachimachi.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-jewelryShop.ogg` },
    bgmScale: 0.96, ambientScale: 0.92,
  }),
  realEstate: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-okachimachi.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-realEstate.ogg` },
    bgmScale: 0.96, ambientScale: 0.94,
  }),
  glab: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-glab.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-glab.ogg` },
    bgmScale: 0.96, ambientScale: 0.94,
  }),
  okachimachi: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-okachimachi.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-street-crowd.ogg` },
    bgmScale: 0.98, ambientScale: 1,
    supplemental: [{ type: 'weather', name: 'weather', scale: 0.58 }],
  }),
  okachimachiQuiz: frozenScene({
    bgm: `${AUDIO_DIR}/quiz_show_thinking_bgm_60s_loop.mp3`,
    bgmScale: 0.94, ambientScale: 0,
  }),
  sleep: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-sleep.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-sleep.ogg` },
    bgmScale: 0.64, ambientScale: 0.56,
  }),
  meal: frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal.ogg` },
    bgmScale: 0.66, ambientScale: 0.54,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-convenience': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-convenience.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-convenience.ogg` },
    bgmScale: 0.64, ambientScale: 0.50,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-soba': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-soba.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-soba.ogg` },
    bgmScale: 0.66, ambientScale: 0.58,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-ramen': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-ramen.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-ramen.ogg` },
    bgmScale: 0.64, ambientScale: 0.50,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-hamburger': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-hamburger.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-hamburger.ogg` },
    bgmScale: 0.62, ambientScale: 0.52,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-indian': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-indian.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-indian.ogg` },
    bgmScale: 0.64, ambientScale: 0.50,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-korean': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-korean.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-korean.ogg` },
    bgmScale: 0.62, ambientScale: 0.50,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-chinese': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-chinese.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-chinese.ogg` },
    bgmScale: 0.64, ambientScale: 0.56,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  'meal-kebab': frozenScene({
    bgm: `${AUDIO_DIR}/bgm-meal-kebab.ogg`,
    ambient: { type: 'file', url: `${AUDIO_DIR}/amb-meal-kebab.ogg` },
    bgmScale: 0.64, ambientScale: 0.54,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.38 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
  kaitenzushi: frozenScene({
    bgm: `${KAITENZUSHI_AUDIO_DIR}/enka_bgm.ogg`,
    ambient: { type: 'file', url: `${KAITENZUSHI_AUDIO_DIR}/izakaya_ambient.ogg` },
    bgmScale: 0.90, ambientScale: 0.82,
    supplemental: [
      { type: 'file', name: 'street', url: `${AUDIO_DIR}/amb-street-crowd.ogg`, scale: 0.40 },
      { type: 'weather', name: 'weather', scale: 0.42 },
    ],
  }),
});

export const AUDIO_SCENE_KEYS = Object.freeze(Object.keys(AUDIO_SCENE_DEFINITIONS));

// 静的画面の割り当て。動的画面はDYNAMIC_AUDIO_SCREENSで明示し、resolveAudioSceneで決定します。
export const SCREEN_AUDIO_SCENES = Object.freeze({
  loading: 'main',
  login: 'main',
  emailVerification: 'main',
  title: 'main',
  nameSetup: 'main',
  settingsTitle: 'main',
  main: 'main',
  aquarium: 'main',
  winterColdEvent: 'main',
  westernUnionEvent: 'main',
  mermaidEvent: 'main',
  alienAbductionEvent: 'main',
  alienReturnEvent: 'main',
  robberyReport: 'main',
  settings: 'main',
  phone: 'main',
  todayGem: 'main',

  birthdaySleepEvent: 'sleep',
  hauntingEvent: 'sleep',
  dayResult: 'sleep',

  mining: 'mining',
  miningPazupanEvent: 'mining',
  kappaJadeEvent: 'mining',
  miningGame: 'mining',
  miningResult: 'mining',

  workshop: 'workshop',
  inventory: 'workshop',
  finishedItemDetail: 'workshop',
  workshopTool: 'workshop',
  workshopToolGuide: 'workshop',
  workshopStaff: 'workshop',
  processingKnowledgeDetail: 'workshop',
  metalInventoryDetail: 'workshop',
  metalProfessionalGuide: 'workshop',
  looseInventoryDetail: 'workshop',
  looseGemGuide: 'workshop',
  looseCutGuide: 'workshop',
  orders: 'workshop',

  craft: 'craft',
  craftLoose: 'craft',
  completion: 'craft',
  polishing: 'polishing',

  store: 'store',
  showcaseSelect: 'store',
  showcaseDetail: 'store',
  customer: 'store',
  employee: 'store',
  storeTheftEvent: 'store',

  okachimachi: 'okachimachi',
  clockTowerDonationEvent: 'okachimachi',
  apprenticeCinemaEvent: 'okachimachi',
  okachimachiTollEvent: 'okachimachi',
  okachimachiInvasiveTurtlesEvent: 'okachimachi',
  pandaMusicEvent: 'okachimachi',
  wristFoundEvent: 'okachimachi',

  supplier: 'materialShop',
  supplierMetals: 'materialShop',
  supplierMetalHistory: 'materialShop',
  pureMetalProfessionalGuide: 'materialShop',
  supplierRough: 'looseShop',
  looseShop: 'looseShop',
  looseShopOriginalQuizEvent: 'looseShop',
  jewelryShop: 'jewelryShop',
  displayShop: 'displayShop',
  realEstate: 'realEstate',
  tattooWomanAmberEvent: 'realEstate',
  glab: 'glab',
  glabSns: 'glab',
  glabTool: 'glab',
  glabToolGuide: 'glab',
  glabVisitVideoEvent: 'glab',
  kawaharaKnowledgeEvent: 'glab',

  mysteryChineseMealEvent: 'meal-chinese',
  ridleyOkazakiSobaEvent: 'meal-soba',
  emeraldCaptainKebabEvent: 'meal-kebab',
  grayHoodAquariumEvent: 'meal-korean',
  terryCaliforniaEvent: 'meal-hamburger',
  cyclopsEvent: 'meal-convenience',
  ganeshaTuskEvent: 'meal-indian',
  childhoodFriendEvent: 'meal-ramen',
  touristWoodSwordEvent: 'meal-hamburger',
  diamondPolishingLapEvent: 'meal-indian',
  sushiChefEvent: 'kaitenzushi',
  kaitenzushi: 'kaitenzushi',
});

export const DYNAMIC_AUDIO_SCREENS = Object.freeze(['cinemaVisitEvent', 'okachimachiQuiz', 'meal']);

const MEAL_SCENES = Object.freeze({
  convenience: 'meal-convenience',
  soba: 'meal-soba',
  ramen: 'meal-ramen',
  hamburger: 'meal-hamburger',
  indian: 'meal-indian',
  korean: 'meal-korean',
  chinese: 'meal-chinese',
  kebab: 'meal-kebab',
});

export function resolveAudioScene(target, context = {}) {
  const screen = String(target || 'main');
  if (context.alienAbducted && screen !== 'alienReturnEvent') return 'space';
  if (screen === 'cinemaVisitEvent') return context.cinemaStage === 'playing' ? 'silent' : 'okachimachi';
  if (screen === 'okachimachiQuiz') return context.quizStage === 'question' ? 'okachimachiQuiz' : 'okachimachi';
  if (screen === 'meal') return MEAL_SCENES[String(context.mealId || '')] || 'meal';
  return SCREEN_AUDIO_SCENES[screen] || 'main';
}

export function audioSceneDefinition(key) {
  return AUDIO_SCENE_DEFINITIONS[key] || AUDIO_SCENE_DEFINITIONS.main;
}

export function audioSceneUsesWeather(key) {
  const scene = audioSceneDefinition(key);
  return scene.ambient?.type === 'weather' || scene.supplemental.some((item) => item.type === 'weather');
}

export function audioSceneAuditFiles() {
  const weatherFiles = ['clear', 'cloudy', 'rain', 'snow'].map((weather) => `${AUDIO_DIR}/amb-main-${weather}.ogg`);
  const files = new Set();
  Object.values(AUDIO_SCENE_DEFINITIONS).forEach((scene) => {
    if (scene.bgm) files.add(scene.bgm);
    if (scene.ambient?.type === 'file' && scene.ambient.url) files.add(scene.ambient.url);
    if (scene.ambient?.type === 'weather') weatherFiles.forEach((file) => files.add(file));
    scene.supplemental.forEach((item) => {
      if (item.type === 'file' && item.url) files.add(item.url);
      if (item.type === 'weather') weatherFiles.forEach((file) => files.add(file));
    });
  });
  return Object.freeze([...files].sort());
}
