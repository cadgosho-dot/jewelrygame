const AUDIO_DIR = './assets/audio';

const tracks = new Map();
const ambients = new Map();
let currentKey = null;
let suspended = document.hidden;
let initialized = false;
let settingsProvider = () => ({ bgmVolume: .35, ambientVolume: .60, sfxVolume: .75, bgmMuted: false, ambientMuted: false, sfxMuted: false });

let environmentContext = null;
let environmentMaster = null;
let environmentNodes = [];
let environmentTimers = [];
let environmentGeneration = 0;
let mainEnvironment = { active: false, weather: '晴れ', minutes: 9 * 60, key: '' };
let noiseBuffer = null;

const validKeys = new Set([
  'main', 'mining', 'workshop', 'store', 'glab', 'okachimachi', 'phone', 'sleep',
  'meal', 'meal-convenience', 'meal-soba', 'meal-ramen', 'meal-hamburger',
  'meal-indian', 'meal-korean', 'meal-chinese', 'meal-kebab',
]);
const validSfx = new Set(['select', 'impact', 'success', 'error', 'explosion', 'dig', 'earth-dig', 'mining-win', 'mining-miss', 'sale', 'coin', 'eat', 'levelup', 'alarm']);

function createAudio(url, loop = false) {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.preload = 'none';
  return audio;
}

function loopAudio(kind, key) {
  if (!validKeys.has(key)) return null;
  const map = kind === 'bgm' ? tracks : ambients;
  if (!map.has(key)) map.set(key, createAudio(`${AUDIO_DIR}/${kind === 'bgm' ? 'bgm' : 'amb'}-${key}.ogg`, true));
  return map.get(key);
}

export function configureAudio(provider) {
  settingsProvider = provider;
  applyAudioSettings();
}

export async function unlockAudio() {
  if (initialized) return;
  initialized = true;
  try {
    ensureEnvironmentContext();
    if (environmentContext?.state === 'suspended') await environmentContext.resume();
    rebuildMainEnvironment();
  } catch (_) {}
  try {
    const audio = createAudio(`${AUDIO_DIR}/sfx-select.ogg`);
    audio.volume = 0.001;
    await audio.play();
    audio.pause();
  } catch (_) {}
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
  const muted = kind === 'bgm' ? settings.bgmMuted : settings.ambientMuted;
  if (muted) return 0;
  const base = Number(kind === 'bgm' ? settings.bgmVolume : settings.ambientVolume) || 0;
  const scale = (kind === 'bgm' ? BGM_SCALE : AMBIENT_SCALE)[key] ?? 1;
  return Math.max(0, Math.min(1, base * scale));
}

export function applyAudioSettings() {
  const settings = settingsProvider();
  tracks.forEach((audio, key) => { audio.volume = targetVolume('bgm', key, settings); });
  ambients.forEach((audio, key) => { audio.volume = targetVolume('ambient', key, settings); });
  applyMainEnvironmentVolume(settings);
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


function ensureEnvironmentContext() {
  if (environmentContext) return environmentContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  environmentContext = new AudioContextClass();
  return environmentContext;
}

function environmentPeriod(minutes) {
  const hour = Math.floor((Number(minutes) || 0) / 60);
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  if (hour < 20) return 'evening';
  return 'night';
}

function environmentWeather(weather) {
  const label = String(weather || '晴れ');
  if (label.includes('雨')) return 'rain';
  if (label.includes('曇')) return 'cloudy';
  return 'clear';
}

function environmentVolume(settings = settingsProvider()) {
  if (settings.ambientMuted) return 0;
  const base = Math.max(0, Math.min(1, Number(settings.ambientVolume) || 0));
  return base * 0.62;
}

function applyMainEnvironmentVolume(settings = settingsProvider()) {
  if (!environmentMaster || !environmentContext) return;
  const target = mainEnvironment.active && !suspended ? environmentVolume(settings) : 0;
  environmentMaster.gain.cancelScheduledValues(environmentContext.currentTime);
  environmentMaster.gain.setTargetAtTime(target, environmentContext.currentTime, 0.12);
}

function clearEnvironmentTimers() {
  environmentTimers.forEach((timer) => clearTimeout(timer));
  environmentTimers = [];
}

function stopEnvironmentNodes() {
  clearEnvironmentTimers();
  environmentGeneration += 1;
  environmentNodes.forEach((node) => {
    try { node.stop?.(); } catch (_) {}
    try { node.disconnect?.(); } catch (_) {}
  });
  environmentNodes = [];
  if (environmentMaster) {
    try { environmentMaster.disconnect(); } catch (_) {}
    environmentMaster = null;
  }
}

function getNoiseBuffer(context) {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const seconds = 5;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let smoothed = 0;
  for (let index = 0; index < channel.length; index += 1) {
    const white = Math.random() * 2 - 1;
    smoothed = smoothed * 0.975 + white * 0.025;
    channel[index] = white * 0.28 + smoothed * 1.8;
  }
  noiseBuffer = buffer;
  return buffer;
}

function addNoiseLayer(context, destination, { gain = 0.1, type = 'lowpass', frequency = 1200, q = 0.7 } = {}) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const layerGain = context.createGain();
  source.buffer = getNoiseBuffer(context);
  source.loop = true;
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  layerGain.gain.value = gain;
  source.connect(filter).connect(layerGain).connect(destination);
  source.start();
  environmentNodes.push(source, filter, layerGain);
  return layerGain;
}

function addHumLayer(context, destination, { frequency = 58, gain = 0.018 } = {}) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const layerGain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  layerGain.gain.value = gain;
  oscillator.connect(filter).connect(layerGain).connect(destination);
  oscillator.start();
  environmentNodes.push(oscillator, filter, layerGain);
}

function playEnvironmentChirp(context, destination, { start = 2100, end = 3100, duration = 0.16, gain = 0.035, repetitions = 1, gap = 0.09 } = {}) {
  if (!mainEnvironment.active || suspended || context.state !== 'running') return;
  const now = context.currentTime + 0.02;
  for (let index = 0; index < repetitions; index += 1) {
    const at = now + index * (duration + gap);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(start, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, end), at + duration);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(gain, at + duration * 0.22);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(envelope).connect(destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.03);
    environmentNodes.push(oscillator, envelope);
    oscillator.onended = () => {
      try { oscillator.disconnect(); } catch (_) {}
      try { envelope.disconnect(); } catch (_) {}
      environmentNodes = environmentNodes.filter((node) => node !== oscillator && node !== envelope);
    };
  }
}

function scheduleEnvironmentSound(callback, minimumMs, maximumMs, generation, immediate = false) {
  const schedule = (delay) => {
    let timer = null;
    timer = setTimeout(() => {
      environmentTimers = environmentTimers.filter((entry) => entry !== timer);
      if (generation !== environmentGeneration || !mainEnvironment.active || suspended) return;
      callback();
      schedule(minimumMs + Math.random() * Math.max(0, maximumMs - minimumMs));
    }, delay);
    environmentTimers.push(timer);
  };
  schedule(immediate ? 240 : minimumMs + Math.random() * Math.max(0, maximumMs - minimumMs));
}

function buildClearEnvironment(context, destination, period, generation) {
  const airGain = period === 'night' ? 0.055 : period === 'evening' ? 0.045 : 0.035;
  addNoiseLayer(context, destination, { gain: airGain, type: 'lowpass', frequency: period === 'night' ? 760 : 1300 });
  if (period === 'morning') {
    scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 1750 + Math.random() * 450, end: 3200 + Math.random() * 600, duration: 0.17, gain: 0.034, repetitions: 2 }), 2600, 6200, generation, true);
  } else if (period === 'day') {
    addHumLayer(context, destination, { frequency: 64, gain: 0.012 });
    scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 2100, end: 2900, duration: 0.13, gain: 0.02 }), 6500, 13000, generation);
  } else if (period === 'evening') {
    addHumLayer(context, destination, { frequency: 54, gain: 0.014 });
    scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 5200, end: 3900, duration: 0.07, gain: 0.018, repetitions: 3, gap: 0.055 }), 1800, 3600, generation, true);
  } else {
    scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 6100 + Math.random() * 500, end: 4300 + Math.random() * 350, duration: 0.065, gain: 0.022, repetitions: 4, gap: 0.045 }), 1200, 2600, generation, true);
  }
}

function buildCloudyEnvironment(context, destination, period, generation) {
  addNoiseLayer(context, destination, { gain: period === 'night' ? 0.075 : 0.09, type: 'lowpass', frequency: period === 'night' ? 700 : 980 });
  addNoiseLayer(context, destination, { gain: 0.018, type: 'bandpass', frequency: 1900, q: 0.45 });
  if (period === 'morning' || period === 'day') {
    scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 1850, end: 2550, duration: 0.14, gain: 0.015 }), 9000, 16000, generation);
  }
  if (period === 'evening' || period === 'night') {
    scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 5400, end: 4100, duration: 0.06, gain: 0.012, repetitions: 3, gap: 0.05 }), 3200, 6200, generation);
  }
}

function buildRainEnvironment(context, destination, period, generation) {
  addNoiseLayer(context, destination, { gain: period === 'night' ? 0.15 : 0.18, type: 'highpass', frequency: 620, q: 0.55 });
  addNoiseLayer(context, destination, { gain: period === 'night' ? 0.075 : 0.095, type: 'lowpass', frequency: 1450 });
  addHumLayer(context, destination, { frequency: period === 'night' ? 47 : 55, gain: 0.012 });
  scheduleEnvironmentSound(() => playEnvironmentChirp(context, destination, { start: 1250 + Math.random() * 550, end: 720 + Math.random() * 260, duration: 0.11, gain: 0.018, repetitions: 1 }), 1100, 2800, generation, true);
}

function rebuildMainEnvironment() {
  stopEnvironmentNodes();
  if (!initialized || !mainEnvironment.active || suspended) return;
  const context = ensureEnvironmentContext();
  if (!context) return;
  const period = environmentPeriod(mainEnvironment.minutes);
  const weather = environmentWeather(mainEnvironment.weather);
  mainEnvironment.key = `${weather}-${period}`;
  environmentMaster = context.createGain();
  environmentMaster.gain.value = 0;
  environmentMaster.connect(context.destination);
  const generation = environmentGeneration;
  if (weather === 'rain') buildRainEnvironment(context, environmentMaster, period, generation);
  else if (weather === 'cloudy') buildCloudyEnvironment(context, environmentMaster, period, generation);
  else buildClearEnvironment(context, environmentMaster, period, generation);
  applyMainEnvironmentVolume();
}

export function updateMainEnvironment({ active = false, weather = '晴れ', minutes = 9 * 60 } = {}) {
  const normalized = {
    active: Boolean(active),
    weather: String(weather || '晴れ'),
    minutes: Math.max(0, Number(minutes) || 0),
  };
  const nextKey = `${environmentWeather(normalized.weather)}-${environmentPeriod(normalized.minutes)}`;
  const changed = normalized.active !== mainEnvironment.active || nextKey !== mainEnvironment.key;
  mainEnvironment = { ...mainEnvironment, ...normalized, key: nextKey };
  if (!changed) {
    applyMainEnvironmentVolume();
    return;
  }
  rebuildMainEnvironment();
}

export function playSfx(name, options = {}) {
  const settings = settingsProvider();
  if (suspended || settings.sfxMuted || !validSfx.has(name)) return;
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
  applyMainEnvironmentVolume();
  environmentContext?.suspend?.().catch(() => {});
}

export async function resumeAudio() {
  if (!suspended) return;
  suspended = false;
  try { await environmentContext?.resume?.(); } catch (_) {}
  await startCurrentAudio();
  rebuildMainEnvironment();
}

export function stopAllAudio() {
  tracks.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  ambients.forEach((audio) => { audio.pause(); audio.currentTime = 0; });
  stopEnvironmentNodes();
  mainEnvironment.active = false;
  currentKey = null;
}
