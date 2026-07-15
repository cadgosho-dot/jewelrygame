const AUDIO_DIR = './assets/audio';

const tracks = {};
const ambients = {};
const sfx = {};
let currentKey = null;
let initialized = false;
let settingsProvider = () => ({ bgmVolume: .35, ambientVolume: .60, sfxVolume: .75, bgmMuted: false, ambientMuted: false, sfxMuted: false });

const keys = [
  'main', 'mining', 'workshop', 'store', 'glab', 'okachimachi', 'phone', 'sleep',
  'meal', 'meal-convenience', 'meal-soba', 'meal-ramen', 'meal-hamburger',
  'meal-indian', 'meal-korean', 'meal-chinese', 'meal-kebab',
];
for (const key of keys) {
  const bgm = new Audio(`${AUDIO_DIR}/bgm-${key}.ogg`);
  bgm.loop = true; bgm.preload = 'auto'; tracks[key] = bgm;
  const ambient = new Audio(`${AUDIO_DIR}/amb-${key}.ogg`);
  ambient.loop = true; ambient.preload = 'auto'; ambients[key] = ambient;
}
for (const name of ['select', 'impact', 'success', 'error', 'explosion', 'dig', 'mining-win', 'mining-miss', 'sale', 'eat', 'levelup']) {
  const audio = new Audio(`${AUDIO_DIR}/sfx-${name}.ogg`);
  audio.preload = 'auto'; sfx[name] = audio;
}

export function configureAudio(provider) {
  settingsProvider = provider;
  applyAudioSettings();
}

export async function unlockAudio() {
  if (initialized) return;
  initialized = true;
  try {
    const a = sfx.select.cloneNode(); a.volume = 0.001; await a.play(); a.pause();
  } catch (_) {}
}

const BGM_SCALE = {
  main: 1,
  mining: .98,
  workshop: .96,
  store: .94,
  glab: .96,
  okachimachi: .98,
  phone: .92,
  sleep: .64,
  // 食事関連は全体的に悲しい曲調。以前のBGMが大きかったため控えめに再生する。
  meal: .66,
  'meal-convenience': .64,
  'meal-soba': .66,
  'meal-ramen': .64,
  'meal-hamburger': .62,
  'meal-indian': .64,
  'meal-korean': .62,
  'meal-chinese': .64,
  'meal-kebab': .64,
};

const AMBIENT_SCALE = {
  main: .92,
  mining: 1,
  workshop: 1,
  store: .90,
  glab: .94,
  okachimachi: 1,
  phone: .88,
  sleep: .56,
  meal: .54,
  'meal-convenience': .50,
  'meal-soba': .58,
  'meal-ramen': .50,
  'meal-hamburger': .52,
  'meal-indian': .50,
  'meal-korean': .50,
  'meal-chinese': .56,
  'meal-kebab': .54,
};

function targetVolume(kind, key, settings) {
  const muted = kind === 'bgm' ? settings.bgmMuted : settings.ambientMuted;
  if (muted) return 0;
  const base = Number(kind === 'bgm' ? settings.bgmVolume : settings.ambientVolume) || 0;
  const scale = (kind === 'bgm' ? BGM_SCALE : AMBIENT_SCALE)[key] ?? 1;
  return Math.max(0, Math.min(1, base * scale));
}

export function applyAudioSettings() {
  const settings = settingsProvider();
  Object.entries(tracks).forEach(([key, audio]) => {
    audio.volume = targetVolume('bgm', key, settings);
  });
  Object.entries(ambients).forEach(([key, audio]) => {
    audio.volume = targetVolume('ambient', key, settings);
  });
}

function fade(audio, target, duration = 450) {
  const start = audio.volume;
  const started = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - started) / duration);
    audio.volume = Math.max(0, Math.min(1, start + (target - start) * p));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export async function switchAudio(key) {
  if (!key || key === 'inherit' || key === currentKey) return;
  const s = settingsProvider();
  const oldTrack = tracks[currentKey];
  const oldAmbient = ambients[currentKey];
  if (oldTrack) {
    fade(oldTrack, 0, 350);
    setTimeout(() => { oldTrack.pause(); oldTrack.currentTime = 0; }, 390);
  }
  if (oldAmbient) {
    fade(oldAmbient, 0, 350);
    setTimeout(() => { oldAmbient.pause(); oldAmbient.currentTime = 0; }, 390);
  }
  currentKey = key;
  const track = tracks[key];
  const ambient = ambients[key];
  if (track) {
    track.volume = 0;
    try { await track.play(); fade(track, targetVolume('bgm', key, s), 550); } catch (_) {}
  }
  if (ambient) {
    ambient.volume = 0;
    try { await ambient.play(); fade(ambient, targetVolume('ambient', key, s), 550); } catch (_) {}
  }
}

export function playSfx(name, options = {}) {
  const s = settingsProvider();
  if (s.sfxMuted || !sfx[name]) return;
  const a = sfx[name].cloneNode();
  a.volume = Math.max(0, Math.min(1, Number(s.sfxVolume) * (options.gain || 1)));
  if (options.rate) a.playbackRate = options.rate;
  a.play().catch(() => {});
}

export function vibrate(pattern = 35) {
  const s = settingsProvider();
  if (!s.vibration || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

export function stopAllAudio() {
  Object.values(tracks).forEach((a) => { a.pause(); a.currentTime = 0; });
  Object.values(ambients).forEach((a) => { a.pause(); a.currentTime = 0; });
  currentKey = null;
}
