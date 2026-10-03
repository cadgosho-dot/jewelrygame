import { suspendAudio, resumeAudio } from '../audio.js?v=0.10.968';
import {
  isOkachimachiBenchVideoEligible,
  OKACHIMACHI_BENCH_VIDEO_EVENT_KEY,
  nextOkachimachiBenchVideoEligibleDay,
} from './okachimachi-bench-video-event-rules.js?v=0.10.968';

const VIDEO_PATH = 'assets/videos/events/okachimachi-jewelry-bench-intro.mp4';
const VIDEO_URL = new URL(`../../${VIDEO_PATH}`, import.meta.url).href;
const INSTALLED_FLAG = '__JXJ_OKACHIMACHI_BENCH_VIDEO_EVENT_INSTALLED__';

function gameSnapshot() {
  try {
    return globalThis.__JXJ_OKACHIMACHI_BENCH_EVENT_STATE__?.() || null;
  } catch (_) {
    return null;
  }
}

function patchEvent(patch) {
  try {
    return globalThis.__JXJ_EVENT_STATE_HELPERS__?.patchEventState?.(OKACHIMACHI_BENCH_VIDEO_EVENT_KEY, patch);
  } catch (error) {
    console.warn('[Okachimachi bench video] Could not persist event state', error);
    return null;
  }
}

function ensureRandomRepeatDay(snapshot) {
  const savedEvent = snapshot?.events?.[OKACHIMACHI_BENCH_VIDEO_EVENT_KEY];
  const lastTriggeredDay = Math.max(0, Math.floor(Number(savedEvent?.lastTriggeredDay) || 0));
  const savedNextDay = Math.max(0, Math.floor(Number(savedEvent?.nextEligibleDay) || 0));
  if (!savedEvent || lastTriggeredDay === 0 || savedNextDay > 0) return;

  const nextEligibleDay = nextOkachimachiBenchVideoEligibleDay(lastTriggeredDay);
  savedEvent.nextEligibleDay = nextEligibleDay;
  patchEvent({ nextEligibleDay });
}

function safeAudioCall(callback) {
  try {
    const result = callback?.();
    result?.catch?.(() => {});
  } catch (_) {}
}

function replayOkachimachiNavigation(button) {
  const target = button?.isConnected
    ? button
    : document.querySelector('[data-action="nav"][data-screen="okachimachi"]');
  if (!target) {
    try { globalThis.__JXJ_N?.('okachimachi'); } catch (_) {}
    return;
  }

  const previousReplay = globalThis.__JXJ_R;
  globalThis.__JXJ_R = target;
  try {
    target.click();
  } finally {
    if (globalThis.__JXJ_R === target) globalThis.__JXJ_R = previousReplay;
  }
}

function createVideoOverlay(button, snapshot) {
  if (!document.body) return null;

  const savedEvent = snapshot.events?.[OKACHIMACHI_BENCH_VIDEO_EVENT_KEY] || {};
  const day = Math.max(1, Math.floor(Number(snapshot.game?.day) || 1));
  const resuming = savedEvent.active === true && savedEvent.stage === 'video';
  const overlay = document.createElement('section');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '御徒町のイベント動画');
  overlay.dataset.okachimachiBenchVideoEvent = '';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647', 'display:grid',
    'place-items:center', 'overflow:hidden', 'background:#000',
  ].join(';');

  const video = document.createElement('video');
  video.dataset.okachimachiBenchIntroVideo = '';
  video.src = VIDEO_URL;
  video.preload = 'auto';
  video.autoplay = true;
  video.playsInline = true;
  video.controls = false;
  video.setAttribute('aria-label', '御徒町と彫金机のイベント動画');
  video.style.cssText = 'display:block;width:100vw;height:100vh;height:100dvh;max-width:100%;max-height:100%;object-fit:contain;object-position:center;background:#000';

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'MOVIE スキップ';
  skip.setAttribute('aria-label', '動画をスキップして御徒町へ進む');
  skip.style.cssText = [
    'position:fixed', 'top:calc(env(safe-area-inset-top, 0px) + 14px)',
    'right:calc(env(safe-area-inset-right, 0px) + 14px)', 'z-index:1',
    'min-height:44px', 'padding:10px 16px', 'border:1px solid rgba(255,255,255,.7)',
    'border-radius:8px', 'background:rgba(0,0,0,.72)', 'color:#fff',
    'font:600 14px/1.2 system-ui,sans-serif', 'letter-spacing:.04em', 'cursor:pointer',
  ].join(';');

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = '動画を再生できません。再生するか、スキップしてください。';
  status.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom, 0px) + 28px);transform:translateX(-50%);width:min(90vw,560px);margin:0;padding:12px 16px;border-radius:8px;background:rgba(0,0,0,.82);color:#fff;text-align:center;font:14px/1.5 system-ui,sans-serif';
  status.hidden = true;

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = '動画を再生する';
  retry.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom, 0px) + 94px);transform:translateX(-50%);min-height:48px;padding:12px 22px;border:0;border-radius:8px;background:#fff;color:#15100b;font:600 16px/1.2 system-ui,sans-serif;cursor:pointer';
  retry.hidden = true;

  overlay.append(video, status, retry, skip);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    video.pause();
    video.removeAttribute('src');
    video.load();
    overlay.remove();
    patchEvent({ active: false, stage: 'completed', completedDay: day });
    replayOkachimachiNavigation(button);
    window.setTimeout(() => safeAudioCall(resumeAudio), 0);
  };

  skip.addEventListener('click', close);
  video.addEventListener('ended', close, { once: true });
  video.addEventListener('error', () => {
    status.hidden = false;
    retry.hidden = false;
  }, { once: true });
  retry.addEventListener('click', () => {
    status.hidden = true;
    retry.hidden = true;
    try {
      const playRequest = video.play();
      playRequest?.catch?.(() => {
        status.hidden = false;
        retry.hidden = false;
      });
    } catch (_) {
      status.hidden = false;
      retry.hidden = false;
    }
  });

  if (!resuming) {
    patchEvent({
      active: true,
      stage: 'video',
      lastTriggeredDay: day,
      nextEligibleDay: nextOkachimachiBenchVideoEligibleDay(day),
    });
  }
  document.body.append(overlay);
  safeAudioCall(suspendAudio);
  try {
    const playRequest = video.play();
    playRequest?.catch?.(() => {
      status.hidden = false;
      retry.hidden = false;
    });
  } catch (_) {
    status.hidden = false;
    retry.hidden = false;
  }
  return close;
}

function installEventInterceptor() {
  if (typeof document === 'undefined' || globalThis[INSTALLED_FLAG]) return;
  const previousInterceptor = globalThis.__JXJ_I;

  globalThis.__JXJ_I = (button, action) => {
    try {
      if (typeof previousInterceptor === 'function' && previousInterceptor(button, action)) return true;
      if (globalThis.__JXJ_R === button) return false;
      if (action !== 'nav' || button?.dataset?.screen !== 'okachimachi') return false;
      if (globalThis.__JXJ_OKACHIMACHI_AREA_ACTIVE__?.()) return false;

      const snapshot = gameSnapshot();
      if (snapshot?.screen === 'main' && snapshot.settings?.autopilotEnabled) return false;
      ensureRandomRepeatDay(snapshot);
      if (!isOkachimachiBenchVideoEligible(snapshot)) return false;
      if (createVideoOverlay(button, snapshot)) return true;
    } catch (error) {
      console.warn('[Okachimachi bench video] Could not start event', error);
    }
    return false;
  };

  globalThis[INSTALLED_FLAG] = true;
}

installEventInterceptor();
