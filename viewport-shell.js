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

  // v0.10.514: ホーム画面アプリではiframeシェルを使わず、ゲーム本体を直接開く。
  // Androidのstandalone表示で起きるタップ座標・クリック伝達の不安定さを避ける。
  if (isStandalone()) {
    const directUrl = new URL('./game.html', window.location.href);
    directUrl.searchParams.set('source', 'pwa');
    const currentParams = new URLSearchParams(window.location.search);
    for (const key of ['google-login', 'phone-game-return', 'glab-about-return', 'glab-sns-return', 'okachimachi-external-return']) {
      if (currentParams.has(key)) directUrl.searchParams.set(key, currentParams.get(key) || '1');
    }
    window.location.replace(directUrl.href);
    return;
  }

  function installLooseQuizLegacyCompat() {
    try {
      const doc = frame?.contentDocument;
      if (!doc?.head || doc.getElementById('loose-quiz-legacy-android-v749-shell')) return;
      const style = doc.createElement('style');
      style.id = 'loose-quiz-legacy-android-v749-shell';
      style.textContent = `
        @media screen and (max-width:820px){
          body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2:not(.jxj-quiz-stage-reward-v2)>.jxj-quiz-character-area-v2{
            position:absolute!important;top:0!important;right:0!important;bottom:0!important;left:0!important;
            display:flex!important;align-items:center!important;justify-content:center!important;
            width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;
            overflow:hidden!important;pointer-events:none!important
          }
          body[data-screen="looseShopOriginalQuizEvent"] .jxj-quiz-loose-v2 .jxj-quiz-character-v2{
            position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
            display:block!important;width:90%!important;height:auto!important;max-width:430px!important;max-height:72vh!important;
            margin:auto!important;transform:none!important;object-fit:contain!important;object-position:center center!important
          }
        }`;
      doc.head.appendChild(style);
    } catch (_) {}
  }

  function openGoogleLoginInBrowser() {
    const authUrl = new URL('./auth.html?from=game&source=shell&browser=1', window.location.href);
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) {
      const scheme = authUrl.protocol.replace(':', '');
      const intentPath = `${authUrl.host}${authUrl.pathname}${authUrl.search}${authUrl.hash}`;
      const intentUrl = `intent://${intentPath}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(authUrl.href)};end`;
      window.location.href = intentUrl;
      return;
    }
    window.location.assign(authUrl.href);
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

  function viewportProfile(viewportWidth, viewportHeight) {
    const landscape = viewportWidth > viewportHeight;
    const shortSide = Math.min(viewportWidth, viewportHeight);
    const longSide = Math.max(viewportWidth, viewportHeight);
    const touchDevice = Number(navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
    const deviceClass = touchDevice && shortSide <= 620 && longSide <= 1100
      ? 'phone'
      : touchDevice && shortSide <= 900
        ? 'tablet'
        : 'desktop';
    const scaleAxis = landscape ? viewportHeight : viewportWidth;
    const uiScale = deviceClass === 'phone'
      ? Math.min(1.08, Math.max(.84, scaleAxis / 390))
      : 1;
    return { landscape, deviceClass, uiScale };
  }

  function updateStage() {
    if (!safeArea) return;
    const visual = window.visualViewport;
    const viewportWidth = Math.max(1, Math.round(visual?.width || window.innerWidth || document.documentElement.clientWidth));
    const viewportHeight = Math.max(1, Math.round(visual?.height || window.innerHeight || document.documentElement.clientHeight));
    const viewportLeft = Math.max(0, Math.round(visual?.offsetLeft || 0));
    const viewportTop = Math.max(0, Math.round(visual?.offsetTop || 0));
    const { landscape, deviceClass, uiScale } = viewportProfile(viewportWidth, viewportHeight);

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--jwj-viewport-width', `${viewportWidth}px`);
    rootStyle.setProperty('--jwj-viewport-height', `${viewportHeight}px`);
    rootStyle.setProperty('--jwj-viewport-left', `${viewportLeft}px`);
    rootStyle.setProperty('--jwj-viewport-top', `${viewportTop}px`);
    rootStyle.setProperty('--jwj-ui-scale', uiScale.toFixed(4));
    document.documentElement.dataset.orientation = landscape ? 'landscape' : 'portrait';
    document.documentElement.dataset.deviceClass = deviceClass;

    installLooseQuizLegacyCompat();
    postToGame({
      type: 'jwj-shell-viewport',
      orientation: landscape ? 'landscape' : 'portrait',
      referenceWidth: viewportWidth,
      referenceHeight: viewportHeight,
      deviceClass,
      uiScale,
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

    if (data.type === 'jwj-game-google-login') {
      // Google認証はiframe内ではなく最上位ページで実行する。
      // Google側で新しいセッションを追加する操作は埋め込みiframeでは制限されるため、
      // 専用のauth.htmlへ同一タブで移動してからFirebaseのポップアップを開く。
      openGoogleLoginInBrowser();
      return;
    }

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
    installLooseQuizLegacyCompat();
    updateStage();
    sendInstallStatus();
  });

  window.addEventListener('resize', scheduleStageUpdate, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(updateStage, 120), { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleStageUpdate, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleStageUpdate, { passive: true });

  updateStage();
})();
