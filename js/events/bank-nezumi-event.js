import { VERSION } from '../game-data.js';
// Share the application's configured audio instance (including mute settings).
const { playSfx, suspendAudio, resumeAudio } = await import(`../audio.js?v=${VERSION}`);

const CHANNEL = 'jxj-bank-nezumi';
let active = false;

export function showBankNezumi(mode, helpers) {
  if (active) return Promise.resolve(false);
  active = true;
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.id = 'jxj-bank-nezumi-frame';
    frame.title = '銀行・ネズミのイベント';
    frame.allow = 'autoplay';
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:12000;background:#090603';
    const receipt = {};
    let audioSuspended = false;
    let done = false;
    let ready = false;
    const restoreAudio = () => {
      if (!audioSuspended) return;
      audioSuspended = false;
      void resumeAudio().catch(() => {});
    };
    const cleanup = (completed = true) => {
      if (done) return;
      done = true;
      clearTimeout(watchdog);
      removeEventListener('message', receive);
      frame.remove();
      restoreAudio();
      active = false;
      if (receipt.purchased) helpers?.refreshBankEventScene?.();
      resolve(completed);
    };
    const send = (type, payload = {}) => frame.contentWindow?.postMessage({ channel:CHANNEL, type, ...payload }, location.origin);
    const receive = (event) => {
      if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.channel !== CHANNEL || done) return;
      const data = event.data;
      if (data.type === 'ready' && !ready) {
        ready = true;
        clearTimeout(watchdog);
        send('init', { mode, playerName:helpers?.eventRuntimeSnapshot?.('bluesJukeEvent')?.playerName });
      } else if (data.type === 'video-start') {
        audioSuspended = true;
        suspendAudio();
      } else if (data.type === 'video-end') {
        restoreAudio();
      } else if (data.type === 'sound' && ['select', 'coin', 'success'].includes(data.key)) {
        restoreAudio();
        playSfx(data.key);
      } else if (data.type === 'buy' && mode === 'purchase') {
        send('purchase-result', { result:helpers?.purchasePurpleCapsule?.(receipt) || { ok:false } });
      } else if (data.type === 'finish') cleanup();
    };
    const watchdog = setTimeout(() => cleanup(false), 15000);
    addEventListener('message', receive);
    frame.addEventListener('error', () => cleanup(false), { once:true });
    frame.src = './bank-nezumi-event.html';
    document.body.append(frame);
  });
}
