import { AUDIO_SCENE_DEFINITIONS, AUDIO_SCENE_KEYS, audioSceneDefinition, audioSceneUsesWeather } from './audio-scene-map.js?v=0.10.885';

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
const fadeJobs = new WeakMap();
const pendingStopTimers = new Map();
let ambientDuckFactor = 1;
let ambientDuckTimer = null;
let transitionSerial = 0;
let wristFoundDroneRequested = false;
let wristFoundDroneContext = null;
let wristFoundDroneMaster = null;
const wristFoundDroneNodes = [];
// v0.10.668: keep startup BGM/ambient dormant until the player actually enters the game.
// switchAudio() may still record the destination scene, but no loop media is created/fetched while held.
let startupAudioHeld = true;
let settingsProvider = () => ({ bgmVolume: .35, ambientVolume: .60, sfxVolume: .75, bgmMuted: false, ambientMuted: false, sfxMuted: false, externalAudioPriority: false });

let weatherEnvironment = { active: false, weather: '晴れ', minutes: 9 * 60, key: 'clear', audioKey: 'main' };

const validKeys = new Set(AUDIO_SCENE_KEYS);
const validSfx = new Set(['select', 'impact', 'success', 'error', 'explosion', 'dig', 'earth-dig', 'mining-win', 'mining-miss', 'sale', 'coin', 'eat', 'levelup', 'alarm', 'sleep', 'jewelry-complete', 'loose-sparkle', 'barcode-beeps', 'bomb-jii-appear', 'mermaid-splash', 'quiz-intro', 'quiz-question', 'western-union-arrival', 'western-union-handover', 'ganesha-appear', 'ganesha-gift', 'kappa-appear', 'jade-gift', 'haunting-appear', 'haunting-whisper', 'old-lady-appear', 'shoplift-steal', 'police-siren', 'quiz-correct', 'quiz-incorrect', 'blues-juke-cheer', 'pyuu']);

function wristFoundDroneTargetVolume(settings = settingsProvider()) {
  if (!wristFoundDroneRequested || suspended || settings.externalAudioPriority || settings.bgmMuted) return 0;
  const configured = Math.max(0, Math.min(1, Number(settings.bgmVolume) || 0));
  return Math.min(0.38, configured * (0.13 / 0.35));
}

function setWristFoundDroneGain(target, duration = 240) {
  if (!wristFoundDroneContext || !wristFoundDroneMaster) return;
  const boundedTarget = Math.max(0, Math.min(0.38, Number(target) || 0));
  const now = wristFoundDroneContext.currentTime;
  const gain = wristFoundDroneMaster.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(boundedTarget, now + Math.max(0.01, duration / 1000));
}

function silenceWristFoundDrone() {
  if (!wristFoundDroneContext || !wristFoundDroneMaster) return;
  const now = wristFoundDroneContext.currentTime;
  wristFoundDroneMaster.gain.cancelScheduledValues(now);
  wristFoundDroneMaster.gain.setValueAtTime(0, now);
}

function ensureWristFoundDarkDrone() {
  if (wristFoundDroneContext) return true;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  wristFoundDroneContext = new AudioContextClass();
  wristFoundDroneMaster = wristFoundDroneContext.createGain();
  wristFoundDroneMaster.gain.value = 0;

  const lowpass = wristFoundDroneContext.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 430;
  lowpass.Q.value = 0.9;
  const rumble = wristFoundDroneContext.createBiquadFilter();
  rumble.type = 'lowpass';
  rumble.frequency.value = 115;
  rumble.Q.value = 0.55;
  const droneBus = wristFoundDroneContext.createGain();
  droneBus.gain.value = 0.86;
  const subBus = wristFoundDroneContext.createGain();
  subBus.gain.value = 0.55;

  [
    { type: 'sine', frequency: 32.70, gain: 0.070, bus: subBus },
    { type: 'triangle', frequency: 43.65, gain: 0.052, bus: droneBus },
    { type: 'sine', frequency: 46.25, gain: 0.033, bus: droneBus },
    { type: 'sawtooth', frequency: 61.74, gain: 0.010, bus: droneBus },
    { type: 'sine', frequency: 65.41, gain: 0.020, bus: droneBus },
  ].forEach((config, index) => {
    const oscillator = wristFoundDroneContext.createOscillator();
    const gain = wristFoundDroneContext.createGain();
    oscillator.type = config.type;
    oscillator.frequency.value = config.frequency;
    oscillator.detune.value = index % 2 ? -5 : 3;
    gain.gain.value = config.gain;
    oscillator.connect(gain).connect(config.bus);
    oscillator.start();
    wristFoundDroneNodes.push(oscillator, gain);
  });

  subBus.connect(rumble).connect(lowpass);
  droneBus.connect(lowpass);

  const pulse = wristFoundDroneContext.createOscillator();
  const pulseGain = wristFoundDroneContext.createGain();
  pulse.type = 'sine';
  pulse.frequency.value = 0.075;
  pulseGain.gain.value = 0.018;
  pulse.connect(pulseGain).connect(droneBus.gain);
  pulse.start();
  wristFoundDroneNodes.push(pulse, pulseGain);

  const sweep = wristFoundDroneContext.createOscillator();
  const sweepGain = wristFoundDroneContext.createGain();
  sweep.type = 'sine';
  sweep.frequency.value = 0.035;
  sweepGain.gain.value = 85;
  sweep.connect(sweepGain).connect(lowpass.frequency);
  sweep.start();
  wristFoundDroneNodes.push(sweep, sweepGain);

  lowpass.connect(wristFoundDroneMaster).connect(wristFoundDroneContext.destination);
  return true;
}

export async function startWristFoundDarkDrone() {
  wristFoundDroneRequested = true;
  if (!ensureWristFoundDarkDrone()) return;
  try {
    if (wristFoundDroneContext.state !== 'running') await wristFoundDroneContext.resume();
  } catch (_) {}
  setWristFoundDroneGain(wristFoundDroneTargetVolume(), 1200);
}

export function stopWristFoundDarkDrone() {
  wristFoundDroneRequested = false;
  setWristFoundDroneGain(0, 240);
}

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
  return key === 'meal' || key === 'kaitenzushi' || String(key || '').startsWith('meal-');
}

function hasActiveWeatherEnvironment(key) {
  return weatherEnvironment.active && weatherEnvironment.audioKey === key;
}

function weatherAmbientUrl() {
  const weatherKey = hasActiveWeatherEnvironment(weatherEnvironment.audioKey)
    ? environmentWeather(weatherEnvironment.weather)
    : 'clear';
  return `${AUDIO_DIR}/amb-main-${weatherKey}.ogg`;
}

function bgmUrlFor(key) {
  return audioSceneDefinition(key).bgm;
}

function ambientUrl(key) {
  const ambient = audioSceneDefinition(key).ambient;
  if (!ambient) return null;
  if (ambient.type === 'weather') return weatherAmbientUrl();
  return ambient.type === 'file' ? ambient.url : null;
}

function supplementalAmbientSpecs(key) {
  const scene = audioSceneDefinition(key);
  return scene.supplemental.flatMap((item) => {
    if (item.type === 'weather') {
      if (!hasActiveWeatherEnvironment(key)) return [];
      return [{ name: item.name || 'weather', url: weatherAmbientUrl(), scale: Number(item.scale) || 1 }];
    }
    if (item.type === 'file' && item.url) {
      return [{ name: item.name || 'layer', url: item.url, scale: Number(item.scale) || 1 }];
    }
    return [];
  });
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
  const url = kind === 'bgm' ? bgmUrlFor(key) : ambientUrl(key);
  const existing = map.get(key);
  if (!url) {
    if (existing) {
      existing.pause();
      existing.currentTime = 0;
      map.delete(key);
    }
    return null;
  }
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

export function releaseStartupAudioHold() {
  if (!startupAudioHeld) return false;
  startupAudioHeld = false;
  if (initialized && !suspended && currentKey && !settingsProvider().externalAudioPriority) {
    startCurrentAudio().catch(() => {});
  }
  return true;
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

// v0.10.298: 環境音全体を従来の約50％へ抑える。設定スライダーの値は保持する。
const AMBIENT_MASTER_SCALE = .50;

function targetVolume(kind, key, settings) {
  if (settings.externalAudioPriority) return 0;
  const muted = kind === 'bgm' ? settings.bgmMuted : settings.ambientMuted;
  if (muted) return 0;
  const base = Number(kind === 'bgm' ? settings.bgmVolume : settings.ambientVolume) || 0;
  const scene = audioSceneDefinition(key);
  const scale = kind === 'bgm' ? scene.bgmScale : scene.ambientScale;
  const duck = kind === 'ambient' && key === currentKey ? ambientDuckFactor : 1;
  const master = kind === 'ambient' ? AMBIENT_MASTER_SCALE : 1;
  return Math.max(0, Math.min(1, base * scale * duck * master));
}

function targetSupplementalVolume(audio, settings) {
  if (settings.externalAudioPriority || settings.ambientMuted) return 0;
  const base = Number(settings.ambientVolume) || 0;
  const scale = Number(audio?.dataset?.layerScale) || 1;
  const duck = audio?.dataset?.sceneKey === currentKey ? ambientDuckFactor : 1;
  return Math.max(0, Math.min(1, base * scale * duck * AMBIENT_MASTER_SCALE));
}

export function applyAudioSettings() {
  const settings = settingsProvider();
  const wasExternalPriority = externalPriorityActive;
  externalPriorityActive = Boolean(settings.externalAudioPriority);
  setWristFoundDroneGain(wristFoundDroneTargetVolume(settings), 180);
  if (externalPriorityActive) {
    transitionSerial += 1;
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

function cancelFade(audio) {
  if (!audio) return;
  fadeJobs.set(audio, (fadeJobs.get(audio) || 0) + 1);
}

function fade(audio, target, duration = 450) {
  if (!audio) return;
  const boundedTarget = Math.max(0, Math.min(1, Number(target) || 0));
  const job = (fadeJobs.get(audio) || 0) + 1;
  fadeJobs.set(audio, job);
  if (duration <= 0) {
    audio.volume = boundedTarget;
    return;
  }
  const start = audio.volume;
  const started = performance.now();
  const tick = (now) => {
    if (fadeJobs.get(audio) !== job) return;
    const progress = Math.min(1, (now - started) / duration);
    audio.volume = Math.max(0, Math.min(1, start + (boundedTarget - start) * progress));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function cancelPendingStop(key) {
  const timer = pendingStopTimers.get(key);
  if (!timer) return;
  clearTimeout(timer);
  pendingStopTimers.delete(key);
}

function scheduleStop(key, delay = 290) {
  cancelPendingStop(key);
  const timer = setTimeout(() => {
    pendingStopTimers.delete(key);
    if (currentKey === key) return;
    const keepSharedBgm = Boolean(currentKey && bgmUrlFor(currentKey) === bgmUrlFor(key));
    stopLoopPair(key, true, { keepBgm: keepSharedBgm });
  }, delay);
  pendingStopTimers.set(key, timer);
}

function stopLoopPair(key, reset = true, { keepBgm = false } = {}) {
  const track = keepBgm ? null : tracks.get(key);
  const ambient = ambients.get(key);
  const supplemental = [...supplementalAmbients.values()].filter((audio) => audio.dataset.sceneKey === key);
  for (const audio of [track, ambient, ...supplemental]) {
    if (!audio) continue;
    cancelFade(audio);
    audio.pause();
    if (reset) audio.currentTime = 0;
  }
}

async function startLoop(audio, target, duration = 550, isCurrent = () => true) {
  if (!audio || !isCurrent()) return;
  if (audio.paused) {
    audio.volume = 0;
    try {
      await audio.play();
      if (!isCurrent()) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }
      fade(audio, target, duration);
    } catch (_) {}
    return;
  }
  if (isCurrent()) fade(audio, target, Math.min(duration, 220));
}

async function startCurrentAudio() {
  if (startupAudioHeld || !currentKey || suspended) return;
  const sceneKey = currentKey;
  const serial = transitionSerial;
  const isCurrent = () => currentKey === sceneKey
    && transitionSerial === serial
    && !suspended
    && !settingsProvider().externalAudioPriority;
  cancelPendingStop(sceneKey);
  const settings = settingsProvider();
  if (settings.externalAudioPriority) return;
  const track = loopAudio('bgm', sceneKey);
  const ambient = loopAudio('ambient', sceneKey);
  const supplemental = loopSupplementalAmbients(sceneKey);
  if (track) {
    if (bgmSuspended) track.pause();
    else await startLoop(track, targetVolume('bgm', sceneKey, settings), 550, isCurrent);
  }
  if (!isCurrent()) return;
  await startLoop(ambient, targetVolume('ambient', sceneKey, settings), 550, isCurrent);
  if (!isCurrent()) return;
  for (const layer of supplemental) {
    await startLoop(layer, targetSupplementalVolume(layer, settings), 550, isCurrent);
    if (!isCurrent()) return;
  }
}

function resetAmbientDuck(restore = false) {
  if (ambientDuckTimer) clearTimeout(ambientDuckTimer);
  ambientDuckTimer = null;
  ambientDuckFactor = 1;
  if (!restore || !currentKey || suspended) return;
  const settings = settingsProvider();
  const ambient = ambients.get(currentKey);
  if (ambient) fade(ambient, targetVolume('ambient', currentKey, settings), 260);
  [...supplementalAmbients.values()]
    .filter((audio) => audio.dataset.sceneKey === currentKey)
    .forEach((audio) => fade(audio, targetSupplementalVolume(audio, settings), 260));
}

export function duckCurrentAmbient({ factor = .2, duration = 1000 } = {}) {
  if (!currentKey || suspended) return;
  if (ambientDuckTimer) clearTimeout(ambientDuckTimer);
  ambientDuckFactor = Math.max(0, Math.min(1, Number(factor) || 0));
  const settings = settingsProvider();
  const ambient = ambients.get(currentKey);
  if (ambient) fade(ambient, targetVolume('ambient', currentKey, settings), 100);
  [...supplementalAmbients.values()]
    .filter((audio) => audio.dataset.sceneKey === currentKey)
    .forEach((audio) => fade(audio, targetSupplementalVolume(audio, settings), 100));
  ambientDuckTimer = setTimeout(() => {
    ambientDuckTimer = null;
    ambientDuckFactor = 1;
    const latestSettings = settingsProvider();
    const currentAmbient = ambients.get(currentKey);
    if (currentAmbient) fade(currentAmbient, targetVolume('ambient', currentKey, latestSettings), 320);
    [...supplementalAmbients.values()]
      .filter((audio) => audio.dataset.sceneKey === currentKey)
      .forEach((audio) => fade(audio, targetSupplementalVolume(audio, latestSettings), 320));
  }, Math.max(100, Number(duration) || 1000));
}

export async function switchAudio(key) {
  if (!key || key === 'inherit' || !validKeys.has(key)) return;
  cancelPendingStop(key);
  if (key === currentKey) {
    if (!suspended) await startCurrentAudio();
    return;
  }
  // 映画上映などの無音場はフェード待ちをせず、その場ですべて停止する。
  if (key === 'silent') {
    transitionSerial += 1;
    resetAmbientDuck(false);
    pendingStopTimers.forEach((timer) => clearTimeout(timer));
    pendingStopTimers.clear();
    tracks.forEach((audio) => { cancelFade(audio); audio.pause(); audio.currentTime = 0; });
    ambients.forEach((audio) => { cancelFade(audio); audio.pause(); audio.currentTime = 0; });
    supplementalAmbients.forEach((audio) => { cancelFade(audio); audio.pause(); audio.currentTime = 0; });
    currentKey = key;
    return;
  }
  const oldKey = currentKey;
  const sharedBgm = Boolean(oldKey && bgmUrlFor(oldKey) === bgmUrlFor(key));
  const inheritedTrack = sharedBgm ? tracks.get(oldKey) : null;
  transitionSerial += 1;
  resetAmbientDuck(false);
  if (oldKey) {
    const oldTrack = tracks.get(oldKey);
    const oldAmbient = ambients.get(oldKey);
    const oldSupplemental = [...supplementalAmbients.values()].filter((audio) => audio.dataset.sceneKey === oldKey);
    if (oldTrack && !sharedBgm) fade(oldTrack, 0, 250);
    if (oldAmbient) fade(oldAmbient, 0, 250);
    oldSupplemental.forEach((audio) => fade(audio, 0, 250));
    if (sharedBgm && inheritedTrack) {
      cancelFade(inheritedTrack);
      tracks.delete(oldKey);
      tracks.set(key, inheritedTrack);
    }
    scheduleStop(oldKey, 290);
  }
  currentKey = key;
  await startCurrentAudio();
}


async function restartWeatherAmbient(key) {
  if (startupAudioHeld || !key || currentKey !== key || suspended) return;
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
  const normalizedAudioKey = validKeys.has(audioKey) ? audioKey : 'main';
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

  // Only replace the weather layer when the destination uses the same audio scene.
  // When leaving for a different scene, switchAudio() performs the fade-out so a
  // clear-weather clip cannot briefly leak into the transition.
  if (currentKey === normalized.audioKey && audioSceneUsesWeather(normalized.audioKey)) restartWeatherAmbient(normalized.audioKey).catch(() => {});
}

export function stopMealAudio() {
  resetAmbientDuck(false);
  const mealKeys = new Set();
  tracks.forEach((_, key) => { if (isMealAudioKey(key)) mealKeys.add(key); });
  ambients.forEach((_, key) => { if (isMealAudioKey(key)) mealKeys.add(key); });
  for (const key of mealKeys) {
    cancelPendingStop(key);
    const track = tracks.get(key);
    const ambient = ambients.get(key);
    if (track) {
      cancelFade(track);
      track.pause();
      track.currentTime = 0;
      tracks.delete(key);
    }
    if (ambient) {
      cancelFade(ambient);
      ambient.pause();
      ambient.currentTime = 0;
      ambients.delete(key);
    }
  }
  supplementalAmbients.forEach((audio, id) => {
    if (!isMealAudioKey(audio.dataset.sceneKey)) return;
    cancelFade(audio);
    audio.pause();
    audio.currentTime = 0;
    supplementalAmbients.delete(id);
  });
  if (isMealAudioKey(currentKey)) {
    transitionSerial += 1;
    currentKey = null;
  }
}

export function playSfx(name, options = {}) {
  const settings = settingsProvider();
  if (suspended || settings.externalAudioPriority || settings.sfxMuted || !validSfx.has(name)) return;
  const customUrls = {
    'quiz-correct': `${AUDIO_DIR}/quiz_correct_sfx.mp3`,
    'quiz-incorrect': `${AUDIO_DIR}/quiz_incorrect_sfx.mp3`,
    'haunting-appear': `${AUDIO_DIR}/sfx-haunting-appear.wav`,
    'haunting-whisper': `${AUDIO_DIR}/sfx-haunting-whisper.wav`,
    'old-lady-appear': `${AUDIO_DIR}/sfx-old-lady-appear.wav`,
    'shoplift-steal': `${AUDIO_DIR}/sfx-shoplift-steal.wav`,
    'kappa-appear': `${AUDIO_DIR}/sfx-kappa-appear.wav`,
    'jade-gift': `${AUDIO_DIR}/sfx-jade-gift.wav`,
    'blues-juke-cheer': `${AUDIO_DIR}/sfx-blues-juke-cheer.wav`,
    'pyuu': `${AUDIO_DIR}/sfx-pyuu.wav`,
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


export function setPoliceSirenGain(scale = 1) {
  if (!policeSiren) return;
  const settings = settingsProvider();
  policeSiren.volume = Math.max(0, Math.min(1, Number(settings.sfxVolume) * .92 * Math.max(0, Number(scale) || 0)));
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
  transitionSerial += 1;
  suspended = true;
  silenceWristFoundDrone();
  if (currentKey) stopLoopPair(currentKey, false);
  policeSiren?.pause();
  wristFoundDroneContext?.suspend().catch(() => {});
}

export async function resumeAudio() {
  if (!suspended) return;
  suspended = false;
  if (wristFoundDroneRequested && wristFoundDroneContext) {
    try { await wristFoundDroneContext.resume(); } catch (_) {}
    setWristFoundDroneGain(wristFoundDroneTargetVolume(), 420);
  }
  await startCurrentAudio();
  if (policeSirenRequested) await startPoliceSiren();
}

export function stopAllAudio() {
  transitionSerial += 1;
  pendingStopTimers.forEach((timer) => clearTimeout(timer));
  pendingStopTimers.clear();
  resetAmbientDuck(false);
  tracks.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  ambients.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  supplementalAmbients.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  stopPoliceSiren();
  wristFoundDroneRequested = false;
  silenceWristFoundDrone();
  wristFoundDroneContext?.suspend().catch(() => {});
  weatherEnvironment.active = false;
  bgmSuspended = false;
  currentKey = null;
}
