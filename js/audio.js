const AUDIO_DIR = './assets/audio';

const tracks = new Map();
const ambients = new Map();
let currentKey = null;
let suspended = document.hidden;
let initialized = false;
let externalPriorityActive = false;
let settingsProvider = () => ({ bgmVolume: .35, ambientVolume: .60, sfxVolume: .75, bgmMuted: false, ambientMuted: false, sfxMuted: false, externalAudioPriority: false });

let mainEnvironment = { active: false, weather: '晴れ', minutes: 9 * 60, key: 'clear' };

const validKeys = new Set([
  'main', 'mining', 'workshop', 'store', 'glab', 'okachimachi', 'phone', 'sleep',
  'meal', 'meal-convenience', 'meal-soba', 'meal-ramen', 'meal-hamburger',
  'meal-indian', 'meal-korean', 'meal-chinese', 'meal-kebab',
]);
const validSfx = new Set(['select', 'impact', 'success', 'error', 'explosion', 'dig', 'earth-dig', 'mining-win', 'mining-miss', 'sale', 'coin', 'eat', 'levelup', 'alarm', 'sleep', 'jewelry-complete']);

function createAudio(url, loop = false) {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.preload = 'none';
  return audio;
}

function environmentWeather(weather) {
  const label = String(weather || '晴れ');
  if (label.includes('雪')) return 'snow';
  if (label.includes('雨')) return 'rain';
  if (label.includes('曇')) return 'cloudy';
  return 'clear';
}

function ambientUrl(key) {
  if (key === 'main') return `${AUDIO_DIR}/amb-main-${environmentWeather(mainEnvironment.weather)}.ogg`;
  return `${AUDIO_DIR}/amb-${key}.ogg`;
}

function loopAudio(kind, key) {
  if (!validKeys.has(key)) return null;
  const map = kind === 'bgm' ? tracks : ambients;
  const url = kind === 'bgm' ? `${AUDIO_DIR}/bgm-${key}.ogg` : ambientUrl(key);
  const existing = map.get(key);
  if (existing && existing.dataset.audioUrl !== url) {
    existing.pause();
    existing.currentTime = 0;
    map.delete(key);
  }
  if (!map.has(key)) {
    const audio = createAudio(url, true);
    audio.dataset.audioUrl = url;
    map.set(key, audio);
  }
  return map.get(key);
}

export function configureAudio(provider) {
  settingsProvider = provider;
  applyAudioSettings();
}

export async function unlockAudio() {
  if (initialized) return;
  initialized = true;
  if (settingsProvider().externalAudioPriority) return;
  try {
    const audio = createAudio(`${AUDIO_DIR}/sfx-select.ogg`);
    audio.volume = 0.001;
    await audio.play();
    audio.pause();
  } catch (_) {}
  try { await startCurrentAudio(); } catch (_) {}
}

const BGM_SCALE = {
  main: 1, mining: .98, workshop: .96, store: .94, glab: .96, okachimachi: .98, phone: .92, sleep: .64,
  meal: .66, 'meal-convenience': .64, 'meal-soba': .66, 'meal-ramen': .64, 'meal-hamburger': .62,
  'meal-indian': .64, 'meal-korean': .62, 'meal-chinese': .64, 'meal-kebab': .64,
};
const AMBIENT_SCALE = {
  main: .42, mining: 1, workshop: 1, store: .90, glab: .94, okachimachi: 1, phone: .88, sleep: .56,
  meal: .54, 'meal-convenience': .50, 'meal-soba': .58, 'meal-ramen': .50, 'meal-hamburger': .52,
  'meal-indian': .50, 'meal-korean': .50, 'meal-chinese': .56, 'meal-kebab': .54,
};

function targetVolume(kind, key, settings) {
  if (settings.externalAudioPriority) return 0;
  const muted = kind === 'bgm' ? settings.bgmMuted : settings.ambientMuted;
  if (muted) return 0;
  const base = Number(kind === 'bgm' ? settings.bgmVolume : settings.ambientVolume) || 0;
  const scale = (kind === 'bgm' ? BGM_SCALE : AMBIENT_SCALE)[key] ?? 1;
  return Math.max(0, Math.min(1, base * scale));
}

export function applyAudioSettings() {
  const settings = settingsProvider();
  const wasExternalPriority = externalPriorityActive;
  externalPriorityActive = Boolean(settings.externalAudioPriority);
  if (externalPriorityActive) {
    tracks.forEach((audio) => audio.pause());
    ambients.forEach((audio) => audio.pause());
    return;
  }
  tracks.forEach((audio, key) => { audio.volume = targetVolume('bgm', key, settings); });
  ambients.forEach((audio, key) => { audio.volume = targetVolume('ambient', key, settings); });
  if (wasExternalPriority && initialized && !suspended && currentKey) startCurrentAudio().catch(() => {});
}

function fade(audio, target, duration = 450) {
  if (!audio) return;
  const start = audio.volume;
  const started = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    audio.volume = Math.max(0, Math.min(1, start + (target - start) * progress));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function stopLoopPair(key, reset = true) {
  const track = tracks.get(key);
  const ambient = ambients.get(key);
  for (const audio of [track, ambient]) {
    if (!audio) continue;
    audio.pause();
    if (reset) audio.currentTime = 0;
  }
}

async function startCurrentAudio() {
  if (!currentKey || suspended) return;
  const settings = settingsProvider();
  if (settings.externalAudioPriority) return;
  const track = loopAudio('bgm', currentKey);
  const ambient = loopAudio('ambient', currentKey);
  if (track) {
    track.volume = 0;
    try { await track.play(); fade(track, targetVolume('bgm', currentKey, settings), 550); } catch (_) {}
  }
  if (ambient) {
    ambient.volume = 0;
    try { await ambient.play(); fade(ambient, targetVolume('ambient', currentKey, settings), 550); } catch (_) {}
  }
}

export async function switchAudio(key) {
  if (!key || key === 'inherit' || !validKeys.has(key)) return;
  if (key === currentKey) {
    if (!suspended) applyAudioSettings();
    return;
  }
  const oldKey = currentKey;
  if (oldKey) {
    const oldTrack = tracks.get(oldKey);
    const oldAmbient = ambients.get(oldKey);
    if (oldTrack) fade(oldTrack, 0, 250);
    if (oldAmbient) fade(oldAmbient, 0, 250);
    setTimeout(() => stopLoopPair(oldKey, true), 290);
  }
  currentKey = key;
  await startCurrentAudio();
}


async function restartMainAmbient() {
  if (currentKey !== 'main' || suspended || !mainEnvironment.active) return;
  const previous = ambients.get('main');
  if (previous) {
    previous.pause();
    previous.currentTime = 0;
    ambients.delete('main');
  }
  const ambient = loopAudio('ambient', 'main');
  if (!ambient) return;
  const settings = settingsProvider();
  ambient.volume = 0;
  try {
    await ambient.play();
    fade(ambient, targetVolume('ambient', 'main', settings), 550);
  } catch (_) {}
}

export function updateMainEnvironment({ active = false, weather = '晴れ', minutes = 9 * 60 } = {}) {
  const normalized = {
    active: Boolean(active),
    weather: String(weather || '晴れ'),
    minutes: Math.max(0, Number(minutes) || 0),
  };
  const nextKey = environmentWeather(normalized.weather);
  const changed = normalized.active !== mainEnvironment.active || nextKey !== mainEnvironment.key;
  mainEnvironment = { ...normalized, key: nextKey };
  if (!changed) return;
  if (!normalized.active) {
    const ambient = ambients.get('main');
    if (ambient) {
      ambient.pause();
      ambient.currentTime = 0;
    }
    return;
  }
  restartMainAmbient().catch(() => {});
}

export function playSfx(name, options = {}) {
  const settings = settingsProvider();
  if (suspended || settings.externalAudioPriority || settings.sfxMuted || !validSfx.has(name)) return;
  const audio = createAudio(`${AUDIO_DIR}/sfx-${name}.ogg`);
  audio.volume = Math.max(0, Math.min(1, Number(settings.sfxVolume) * (options.gain || 1)));
  if (options.rate) audio.playbackRate = options.rate;
  audio.play().catch(() => {});
}

export function vibrate(pattern = 35) {
  const settings = settingsProvider();
  if (document.hidden || !settings.vibration || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}

export function suspendAudio() {
  if (suspended) return;
  suspended = true;
  if (currentKey) stopLoopPair(currentKey, false);
}

export async function resumeAudio() {
  if (!suspended) return;
  suspended = false;
  await startCurrentAudio();
}

export function stopAllAudio() {
  tracks.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  ambients.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  mainEnvironment.active = false;
  currentKey = null;
}
