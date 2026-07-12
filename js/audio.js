const AUDIO_DIR = './assets/audio';

const tracks = {};
const ambients = {};
const sfx = {};
let currentKey = null;
let initialized = false;
let settingsProvider = () => ({ bgmVolume: .45, ambientVolume: .35, sfxVolume: .65, bgmMuted: false, ambientMuted: false, sfxMuted: false });

const keys = ['main', 'mining', 'workshop', 'store', 'glab', 'okachimachi', 'sleep'];
for (const key of keys) {
  const bgm = new Audio(`${AUDIO_DIR}/bgm-${key}.ogg`);
  bgm.loop = true; bgm.preload = 'auto'; tracks[key] = bgm;
  const ambient = new Audio(`${AUDIO_DIR}/amb-${key}.ogg`);
  ambient.loop = true; ambient.preload = 'auto'; ambients[key] = ambient;
}
for (const name of ['select', 'impact', 'success', 'error', 'explosion']) {
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

export function applyAudioSettings() {
  const s = settingsProvider();
  Object.values(tracks).forEach((a) => { a.volume = s.bgmMuted ? 0 : Number(s.bgmVolume); });
  Object.values(ambients).forEach((a) => { a.volume = s.ambientMuted ? 0 : Number(s.ambientVolume); });
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
    try { await track.play(); fade(track, s.bgmMuted ? 0 : Number(s.bgmVolume), 550); } catch (_) {}
  }
  if (ambient) {
    ambient.volume = 0;
    try { await ambient.play(); fade(ambient, s.ambientMuted ? 0 : Number(s.ambientVolume), 550); } catch (_) {}
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
