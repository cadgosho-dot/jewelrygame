(() => {
  'use strict';

  const LEGACY_HOST = 'cadgosho-dot.github.io';
  const LEGACY_BASE_PATH = '/jewelrygame';
  const CANONICAL_ORIGIN = 'https://jewelrygame.firebaseapp.com';

  if (window.location.hostname !== LEGACY_HOST) return;

  let targetPath = window.location.pathname || '/';
  if (targetPath === LEGACY_BASE_PATH || targetPath === `${LEGACY_BASE_PATH}/`) {
    targetPath = '/';
  } else if (targetPath.startsWith(`${LEGACY_BASE_PATH}/`)) {
    targetPath = targetPath.slice(LEGACY_BASE_PATH.length) || '/';
  }

  const target = `${CANONICAL_ORIGIN}${targetPath}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
})();
