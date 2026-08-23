(() => {
  'use strict';

  const applyOverrides = () => {
    const overlay = document.getElementById('jxj-memories-overlay');
    if (!overlay) return;

    const images = {
      '3Dメガネ': globalThis.__JXJ_MEMORY_IMAGE_3D_V750__,
      'ストーリーテラー': globalThis.__JXJ_MEMORY_IMAGE_STORYTELLER_V750__,
    };

    overlay.querySelectorAll('img.memory-person').forEach((img) => {
      const name = String(img.getAttribute('alt') || '').trim();
      const replacement = images[name];
      if (!replacement || img.dataset.memoryImageOverrideV750 === '1') return;
      img.src = replacement;
      img.setAttribute('data-memory-image', replacement);
      img.dataset.memoryImageOverrideV750 = '1';
    });
  };

  new MutationObserver(applyOverrides).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener('pageshow', applyOverrides);
  applyOverrides();
})();
