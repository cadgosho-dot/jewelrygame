(() => {
  'use strict';

  const safeArea = document.querySelector('#viewport-safe-area');
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
    if (!safeArea) return;
    const visual = window.visualViewport;
    const viewportWidth = Math.max(1, Math.round(visual?.width || window.innerWidth || document.documentElement.clientWidth));
    const viewportHeight = Math.max(1, Math.round(visual?.height || window.innerHeight || document.documentElement.clientHeight));
    const viewportLeft = Math.max(0, Math.round(visual?.offsetLeft || 0));
    const viewportTop = Math.max(0, Math.round(visual?.offsetTop || 0));
    const landscape = viewportWidth > viewportHeight;

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--jwj-viewport-width', `${viewportWidth}px`);
    rootStyle.setProperty('--jwj-viewport-height', `${viewportHeight}px`);
    rootStyle.setProperty('--jwj-viewport-left', `${viewportLeft}px`);
    rootStyle.setProperty('--jwj-viewport-top', `${viewportTop}px`);
    document.documentElement.dataset.orientation = landscape ? 'landscape' : 'portrait';

    postToGame({
      type: 'jwj-shell-viewport',
      orientation: landscape ? 'landscape' : 'portrait',
      referenceWidth: viewportWidth,
      referenceHeight: viewportHeight,
      scale: 1,
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
        'https://x.com/glab_gala_gosho',
        'https://www.instagram.com/g_lab_okachimachi?igsh=N2QyNHU4YTFxcWxj',
        'https://youtube.com/@glab3836?si=Siz3n2QMjtSSvjNi',
        'https://www.tiktok.com/@glabokachimachi?_r=1&_t=ZS-987UDkk0VgC',
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
  window.visualViewport?.addEventListener('scroll', scheduleStageUpdate, { passive: true });

  updateStage();
})();
