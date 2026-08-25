(() => {
  'use strict';

  const STYLE_ID = 'jxj-workshop-staff-images-v754';
  const FIGURE_CLASS = 'workshop-staff-level-figure-v754';
  const IMAGE_CLASS = 'workshop-staff-level-image-v754';
  const IMAGE_DATA = Object.freeze({
    junior: './assets/images/workshop-staff-apprentice-v754.base64.txt',
    skilled: './assets/images/workshop-staff-skilled-v754.base64.txt',
  });
  const imageCache = new Map();

  const installStyle = () => {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body[data-screen="workshopStaff"] .${FIGURE_CLASS}{
        display:flex!important;align-items:flex-end!important;justify-content:center!important;
        width:100%!important;margin:2px auto 8px!important;padding:0!important;
        pointer-events:none!important;overflow:visible!important
      }
      body[data-screen="workshopStaff"] .${IMAGE_CLASS}{
        display:block!important;width:200px!important;height:auto!important;max-width:72vw!important;
        max-height:38vh!important;margin:0 auto!important;object-fit:contain!important;
        object-position:center bottom!important;filter:none!important;opacity:1!important;
        transform:none!important;pointer-events:none!important
      }
      @media (orientation:landscape){
        body[data-screen="workshopStaff"] .${IMAGE_CLASS}{max-height:48vh!important}
      }`;
    document.head.appendChild(style);
  };

  const currentLevel = (card) => {
    const text = String(card?.textContent || '');
    const match = text.match(/Lv\.\s*([1-5])/i);
    return match ? Number(match[1]) : 0;
  };

  const removeInjected = () => {
    document.querySelectorAll(`.${FIGURE_CLASS}`).forEach((node) => node.remove());
  };

  const imageSrc = async (key) => {
    if (imageCache.has(key)) return imageCache.get(key);
    const response = await fetch(IMAGE_DATA[key], { cache: 'force-cache' });
    if (!response.ok) throw new Error(`職人画像を読み込めません: ${key}`);
    const base64 = (await response.text()).trim();
    const src = `data:image/png;base64,${base64}`;
    imageCache.set(key, src);
    return src;
  };

  const apply = async () => {
    installStyle();
    if (document.body?.dataset?.screen !== 'workshopStaff') {
      removeInjected();
      return;
    }

    const card = document.querySelector('.workshop-staff-card');
    if (!(card instanceof HTMLElement)) {
      removeInjected();
      return;
    }

    // 未雇用画面には Lv. 表記がないため、画像を一切表示しない。
    const level = currentLevel(card);
    if (level < 1) {
      removeInjected();
      return;
    }

    const key = level >= 4 ? 'skilled' : 'junior';
    let src;
    try {
      src = await imageSrc(key);
    } catch (error) {
      console.warn('[workshop-staff-images-v754]', error);
      return;
    }

    // 読込中に別画面へ移った場合は何も挿入しない。
    if (document.body?.dataset?.screen !== 'workshopStaff') return;
    const activeCard = document.querySelector('.workshop-staff-card');
    if (activeCard !== card || currentLevel(card) !== level) return;

    let figure = card.querySelector(`:scope > .${FIGURE_CLASS}`);
    if (!(figure instanceof HTMLElement)) {
      figure = document.createElement('figure');
      figure.className = FIGURE_CLASS;
      figure.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.className = IMAGE_CLASS;
      image.alt = '';
      image.draggable = false;
      figure.appendChild(image);
      const heading = card.querySelector(':scope > h1');
      if (heading) card.insertBefore(figure, heading);
      else card.prepend(figure);
    }

    const image = figure.querySelector(`.${IMAGE_CLASS}`);
    if (image instanceof HTMLImageElement && image.getAttribute('src') !== src) {
      image.setAttribute('src', src);
    }
    figure.dataset.staffLevel = String(level);
  };

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      void apply();
    });
  };

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-screen'],
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  void apply();
})();
