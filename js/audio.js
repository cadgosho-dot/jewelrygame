const AUDIO_DIR = './assets/audio';

const tracks = new Map();
const ambients = new Map();
const supplementalAmbients = new Map();
let currentKey = null;
let suspended = document.hidden;
let bgmSuspended = false;
let initialized = false;
let externalPriorityActive = false;
let policeSiren = null;
let policeSirenRequested = false;
let settingsProvider = () => ({ bgmVolume: .35, ambientVolume: .60, sfxVolume: .75, bgmMuted: false, ambientMuted: false, sfxMuted: false, externalAudioPriority: false });

let weatherEnvironment = { active: false, weather: '晴れ', minutes: 9 * 60, key: 'clear', audioKey: 'main' };

const validKeys = new Set([
  'main', 'mining', 'workshop', 'craft', 'polishing', 'store', 'displayShop', 'materialShop', 'looseShop', 'jewelryShop', 'realEstate', 'glab', 'okachimachi', 'okachimachiQuiz', 'phone', 'sleep',
  'meal', 'meal-convenience', 'meal-soba', 'meal-ramen', 'meal-hamburger',
  'meal-indian', 'meal-korean', 'meal-chinese', 'meal-kebab',
]);
const validSfx = new Set(['select', 'impact', 'success', 'error', 'explosion', 'dig', 'earth-dig', 'mining-win', 'mining-miss', 'sale', 'coin', 'eat', 'levelup', 'alarm', 'sleep', 'jewelry-complete', 'loose-sparkle', 'quiz-correct', 'quiz-incorrect']);

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

function isMealAudioKey(key) {
  return key === 'meal' || String(key || '').startsWith('meal-');
}

function usesLayeredOutdoorEnvironment(key) {
  return key === 'okachimachi' || isMealAudioKey(key);
}

function hasActiveWeatherEnvironment(key) {
  return weatherEnvironment.active && weatherEnvironment.audioKey === key;
}

function ambientUrl(key) {
  const weatherKey = hasActiveWeatherEnvironment(key)
    ? environmentWeather(weatherEnvironment.weather)
    : 'clear';
  if (key === 'main' || (key === 'phone' && hasActiveWeatherEnvironment(key))) return `${AUDIO_DIR}/amb-main-${weatherKey}.ogg`;
  if (usesLayeredOutdoorEnvironment(key) && hasActiveWeatherEnvironment(key)) {
    return `${AUDIO_DIR}/amb-street-crowd.ogg`;
  }
  return `${AUDIO_DIR}/amb-${key}.ogg`;
}

function supplementalAmbientSpecs(key) {
  if (!hasActiveWeatherEnvironment(key) || !usesLayeredOutdoorEnvironment(key)) return [];
  const weatherKey = environmentWeather(weatherEnvironment.weather);
  return [{
    name: 'weather',
    url: `${AUDIO_DIR}/amb-main-${weatherKey}.ogg`,
    scale: key === 'okachimachi' ? .58 : .48,
  }];
}

function loopSupplementalAmbients(key) {
  const specs = supplementalAmbientSpecs(key);
  const activeIds = new Set(specs.map((spec) => `${key}:${spec.name}`));
  supplementalAmbients.forEach((audio, id) => {
    if (audio.dataset.sceneKey !== key || activeIds.has(id)) return;
    audio.pause();
    audio.currentTime = 0;
    supplementalAmbients.delete(id);
  });
  return specs.map((spec) => {
    const id = `${key}:${spec.name}`;
    const existing = supplementalAmbients.get(id);
    if (existing && existing.dataset.audioUrl !== spec.url) {
      existing.pause();
      existing.currentTime = 0;
      supplementalAmbients.delete(id);
    }
    if (!supplementalAmbients.has(id)) {
      const audio = createAudio(spec.url, true);
      audio.dataset.audioUrl = spec.url;
      audio.dataset.sceneKey = key;
      audio.dataset.layerScale = String(spec.scale);
      supplementalAmbients.set(id, audio);
    }
    return supplementalAmbients.get(id);
  });
}

function loopAudio(kind, key) {
  if (!validKeys.has(key)) return null;
  if (kind === 'ambient' && key === 'okachimachiQuiz') return null;
  const map = kind === 'bgm' ? tracks : ambients;
  const bgmKey = (key === 'craft' || key === 'polishing') ? 'workshop' : ((key === 'displayShop' || key === 'jewelryShop' || key === 'looseShop' || key === 'materialShop' || key === 'realEstate') ? 'okachimachi' : key);
  const url = kind === 'bgm'
    ? (key === 'okachimachiQuiz' ? `${AUDIO_DIR}/quiz_show_thinking_bgm_60s_loop.mp3` : `${AUDIO_DIR}/bgm-${bgmKey}.ogg`)
    : ambientUrl(key);
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
  main: 1, mining: .98, workshop: .96, craft: .96, polishing: .96, store: .94, displayShop: .96, materialShop: .98, looseShop: .98, jewelryShop: .96, realEstate: .96, glab: .96, okachimachi: .98, okachimachiQuiz: .94, phone: .92, sleep: .64,
  meal: .66, 'meal-convenience': .64, 'meal-soba': .66, 'meal-ramen': .64, 'meal-hamburger': .62,
  'meal-indian': .64, 'meal-korean': .62, 'meal-chinese': .64, 'meal-kebab': .64,
};
const AMBIENT_SCALE = {
  main: .42, mining: 1, workshop: 1, craft: 1, polishing: 1, store: .90, displayShop: .92, materialShop: .96, looseShop: .96, jewelryShop: .92, realEstate: .94, glab: .94, okachimachi: 1, phone: .88, sleep: .56,
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

function targetSupplementalVolume(audio, settings) {
  if (settings.externalAudioPriority || settings.ambientMuted) return 0;
  const base = Number(settings.ambientVolume) || 0;
  const scale = Number(audio?.dataset?.layerScale) || 1;
  return Math.max(0, Math.min(1, base * scale));
}

export function applyAudioSettings() {
  const settings = settingsProvider();
  const wasExternalPriority = externalPriorityActive;
  externalPriorityActive = Boolean(settings.externalAudioPriority);
  if (externalPriorityActive) {
    tracks.forEach((audio) => audio.pause());
    ambients.forEach((audio) => audio.pause());
    supplementalAmbients.forEach((audio) => audio.pause());
    policeSiren?.pause();
    return;
  }
  tracks.forEach((audio, key) => { audio.volume = targetVolume('bgm', key, settings); });
  ambients.forEach((audio, key) => { audio.volume = targetVolume('ambient', key, settings); });
  supplementalAmbients.forEach((audio) => { audio.volume = targetSupplementalVolume(audio, settings); });
  if (policeSiren) {
    policeSiren.volume = Math.max(0, Math.min(1, Number(settings.sfxVolume) * .92));
    if (settings.sfxMuted || suspended || !policeSirenRequested) policeSiren.pause();
    else policeSiren.play().catch(() => {});
  }
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
  const supplemental = [...supplementalAmbients.values()].filter((audio) => audio.dataset.sceneKey === key);
  for (const audio of [track, ambient, ...supplemental]) {
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
  const supplemental = loopSupplementalAmbients(currentKey);
  if (track && !bgmSuspended) {
    track.volume = 0;
    try { await track.play(); fade(track, targetVolume('bgm', currentKey, settings), 550); } catch (_) {}
  }
  if (ambient) {
    ambient.volume = 0;
    try { await ambient.play(); fade(ambient, targetVolume('ambient', currentKey, settings), 550); } catch (_) {}
  }
  for (const layer of supplemental) {
    layer.volume = 0;
    try { await layer.play(); fade(layer, targetSupplementalVolume(layer, settings), 550); } catch (_) {}
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
    const oldSupplemental = [...supplementalAmbients.values()].filter((audio) => audio.dataset.sceneKey === oldKey);
    if (oldTrack) fade(oldTrack, 0, 250);
    if (oldAmbient) fade(oldAmbient, 0, 250);
    oldSupplemental.forEach((audio) => fade(audio, 0, 250));
    setTimeout(() => stopLoopPair(oldKey, true), 290);
  }
  currentKey = key;
  await startCurrentAudio();
}


async function restartWeatherAmbient(key) {
  if (!key || currentKey !== key || suspended) return;
  const ambient = loopAudio('ambient', key);
  const supplemental = loopSupplementalAmbients(key);
  const settings = settingsProvider();
  if (ambient?.paused) {
    ambient.volume = 0;
    try { await ambient.play(); fade(ambient, targetVolume('ambient', key, settings), 550); } catch (_) {}
  } else if (ambient) {
    ambient.volume = targetVolume('ambient', key, settings);
  }
  for (const layer of supplemental) {
    if (layer.paused) {
      layer.volume = 0;
      try { await layer.play(); fade(layer, targetSupplementalVolume(layer, settings), 550); } catch (_) {}
    } else {
      layer.volume = targetSupplementalVolume(layer, settings);
    }
  }
}

export function updateMainEnvironment({ active = false, weather = '晴れ', minutes = 9 * 60, audioKey = 'main' } = {}) {
  const normalizedAudioKey = audioKey === 'okachimachi' || audioKey === 'phone' || isMealAudioKey(audioKey) ? audioKey : 'main';
  const normalized = {
    active: Boolean(active),
    weather: String(weather || '晴れ'),
    minutes: Math.max(0, Number(minutes) || 0),
    audioKey: normalizedAudioKey,
  };
  const nextKey = environmentWeather(normalized.weather);
  const previous = weatherEnvironment;
  const changed = normalized.active !== previous.active
    || nextKey !== previous.key
    || normalized.audioKey !== previous.audioKey;
  weatherEnvironment = { ...normalized, key: nextKey };
  if (!changed) return;

  // Leaving a weather-sensitive screen must restore that scene's ordinary
  // clear-weather ambience, even when its audio key itself has not changed.
  if (currentKey === normalized.audioKey) restartWeatherAmbient(normalized.audioKey).catch(() => {});
}

export function playSfx(name, options = {}) {
  const settings = settingsProvider();
  if (suspended || settings.externalAudioPriority || settings.sfxMuted || !validSfx.has(name)) return;
  const customUrls = {
    'quiz-correct': `${AUDIO_DIR}/quiz_correct_sfx.mp3`,
    'quiz-incorrect': `${AUDIO_DIR}/quiz_incorrect_sfx.mp3`,
  };
  const audio = createAudio(customUrls[name] || `${AUDIO_DIR}/sfx-${name}.ogg`);
  audio.volume = Math.max(0, Math.min(1, Number(settings.sfxVolume) * (options.gain || 1)));
  if (options.rate) audio.playbackRate = options.rate;
  audio.play().catch(() => {});
}

export async function startPoliceSiren() {
  policeSirenRequested = true;
  const settings = settingsProvider();
  if (!policeSiren) policeSiren = createAudio(`${AUDIO_DIR}/sfx-police-siren.ogg`, true);
  policeSiren.volume = Math.max(0, Math.min(1, Number(settings.sfxVolume) * .92));
  if (suspended || settings.externalAudioPriority || settings.sfxMuted) return;
  try { await policeSiren.play(); } catch (_) {}
}

export function stopPoliceSiren() {
  policeSirenRequested = false;
  if (!policeSiren) return;
  policeSiren.pause();
  policeSiren.currentTime = 0;
}

export function vibrate(pattern = 35) {
  const settings = settingsProvider();
  if (document.hidden || !settings.vibration || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}


export function suspendBgm() {
  bgmSuspended = true;
  const track = currentKey ? tracks.get(currentKey) : null;
  if (track) track.pause();
}

export async function resumeBgm() {
  if (!bgmSuspended) return;
  bgmSuspended = false;
  if (!currentKey || suspended) return;
  const settings = settingsProvider();
  if (settings.externalAudioPriority) return;
  const track = loopAudio('bgm', currentKey);
  if (!track) return;
  track.volume = 0;
  try { await track.play(); fade(track, targetVolume('bgm', currentKey, settings), 550); } catch (_) {}
}

export function suspendAudio() {
  if (suspended) return;
  suspended = true;
  if (currentKey) stopLoopPair(currentKey, false);
  policeSiren?.pause();
}

export async function resumeAudio() {
  if (!suspended) return;
  suspended = false;
  await startCurrentAudio();
  if (policeSirenRequested) await startPoliceSiren();
}

export function stopAllAudio() {
  tracks.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  ambients.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  supplementalAmbients.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  stopPoliceSiren();
  weatherEnvironment.active = false;
  bgmSuspended = false;
  currentKey = null;
}
