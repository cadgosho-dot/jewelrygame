(() => {
  'use strict';

  // SO-52Cで制作してきた実表示領域を基準に、他端末では全体を等倍比率で縮拡大する。
  // 縦 360×800 / 横 800×360 は、制作画像の20:9比率にも一致する。
  const REFERENCE = Object.freeze({
    portrait: Object.freeze({ width: 360, height: 800 }),
    landscape: Object.freeze({ width: 800, height: 360 }),
  });

  const safeArea = document.querySelector('#viewport-safe-area');
  const stage = document.querySelector('#device-stage');
  const frame = document.querySelector('#game-frame');
  let deferredInstallPrompt = null;
  let resizeTimer = 0;

  function isStandalone() {
    return window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  }

  function postToGame(message) {
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(message, window.location.origin);
  }

  function sendInstallStatus() {
    postToGame({
      type: 'jwj-shell-install-status',
      available: Boolean(deferredInstallPrompt),
      installed: isStandalone(),
    });
  }

  function updateStage() {
    if (!safeArea || !stage) return;
    const bounds = safeArea.getBoundingClientRect();
    const landscape = bounds.width > bounds.height;
    const reference = landscape ? REFERENCE.landscape : REFERENCE.portrait;
    const scale = Math.max(0.1, Math.min(bounds.width / reference.width, bounds.height / reference.height));

    document.documentElement.style.setProperty('--reference-width', `${reference.width}px`);
    document.documentElement.style.setProperty('--reference-height', `${reference.height}px`);
    document.documentElement.style.setProperty('--stage-scale', String(scale));
    document.documentElement.style.setProperty('--render-width', `${reference.width * scale}px`);
    document.documentElement.style.setProperty('--render-height', `${reference.height * scale}px`);
    document.documentElement.dataset.orientation = landscape ? 'landscape' : 'portrait';

    postToGame({
      type: 'jwj-shell-viewport',
      orientation: landscape ? 'landscape' : 'portrait',
      referenceWidth: reference.width,
      referenceHeight: reference.height,
      scale,
    });
  }

  function scheduleStageUpdate() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(updateStage, 40);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    sendInstallStatus();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    sendInstallStatus();
    postToGame({ type: 'jwj-shell-app-installed' });
  });

  window.addEventListener('message', async (event) => {
    if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
    const data = event.data || {};

    if (data.type === 'jwj-game-install-status-request') {
      sendInstallStatus();
      return;
    }

    if (data.type === 'jwj-game-install-request') {
      const requestId = data.requestId;
      if (isStandalone()) {
        postToGame({ type: 'jwj-shell-install-result', requestId, outcome: 'installed' });
        return;
      }
      if (!deferredInstallPrompt) {
        postToGame({ type: 'jwj-shell-install-result', requestId, outcome: 'unavailable' });
        return;
      }

      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        postToGame({
          type: 'jwj-shell-install-result',
          requestId,
          outcome: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed',
        });
      } catch (_) {
        postToGame({ type: 'jwj-shell-install-result', requestId, outcome: 'unavailable' });
      } finally {
        sendInstallStatus();
      }
      return;
    }

    if (data.type === 'jwj-game-navigate-external') {
      const allowed = new Set([
        'https://cadgosho-dot.github.io/glab-gem-game/g-lab-gem-game-github-pages/',
        'https://share.google/eBzOWpwGACREtEKMf',
        'https://ja.wikipedia.org/wiki/%E5%BE%A1%E5%BE%92%E7%94%BA',
        'https://jto-net.com/origin/',
      ]);
      if (allowed.has(data.url)) window.location.assign(data.url);
    }
  });

  frame?.addEventListener('load', () => {
    updateStage();
    sendInstallStatus();
  });

  window.addEventListener('resize', scheduleStageUpdate, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(updateStage, 120), { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleStageUpdate, { passive: true });

  updateStage();
})();
