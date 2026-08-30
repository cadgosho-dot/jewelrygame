(() => {
  'use strict';

  // 2026-08-22 aquarium observation hotfix:
  // Always observable: tank / light / filter / heater.
  // Fish, plants and optional display items appear only when actually in the aquarium.
  const ALWAYS_VISIBLE = new Set(['水槽', 'ライト', 'フィルター', 'ヒーター']);

  const visibleItems = (category) => {
    const source = catalog[category] || [];
    if (category === '魚') {
      return source.filter((item) => aquariumCount('fish', aquariumNameMaps.fish[item.name], 'inTank') > 0);
    }
    if (category === '水草') {
      return source.filter((item) => aquariumCount('plants', aquariumNameMaps.plant[item.name], 'inTank') > 0);
    }
    if (category === 'ディスプレイ用品') {
      return source.filter((item) => {
        // Soil may physically exist in the aquarium, but it is not one of the four default observation entries.
        if (item.name === '床砂') return false;
        if (ALWAYS_VISIBLE.has(item.name)) return true;
        const id = aquariumNameMaps.display[item.name];
        return aquariumCount('displayItems', id, 'installed') > 0;
      });
    }
    return [];
  };

  renderTabs = function renderObservableTabs() {
    tabsEl.innerHTML = '';
    const categories = Object.keys(catalog).filter((category) => visibleItems(category).length > 0);
    if (!categories.includes(activeCategory)) activeCategory = categories[0] || 'ディスプレイ用品';
    categories.forEach((category) => {
      const items = visibleItems(category);
      const button = document.createElement('button');
      button.className = 'tab' + (category === activeCategory ? ' active' : '');
      button.textContent = `${category}（${items.length}）`;
      button.onclick = () => {
        activeCategory = category;
        renderTabs();
        renderGrid();
      };
      tabsEl.appendChild(button);
    });
  };

  renderGrid = function renderObservableGrid() {
    gridEl.innerHTML = '';
    visibleItems(activeCategory).forEach((item) => {
      const card = document.createElement('div');
      card.className = 'catalog-card';

      const image = document.createElement('img');
      image.src = item.image;
      image.alt = item.name;
      const kind = document.createElement('div');
      kind.className = 'catalog-kind';
      kind.textContent = item.classification;
      const name = document.createElement('div');
      name.className = 'catalog-name';
      name.textContent = item.name;
      card.append(image, kind, name);

      const countText = currentCountText(item);
      if (countText) {
        const count = document.createElement('div');
        count.className = 'current-count';
        count.textContent = countText;
        card.appendChild(count);
      }

      if (item.category === 'ディスプレイ用品' && ALWAYS_VISIBLE.has(item.name)) {
        const fixed = document.createElement('div');
        fixed.className = 'required-label';
        fixed.textContent = '常時設置';
        card.appendChild(fixed);
      } else if (item.category === 'ディスプレイ用品') {
        const id = aquariumNameMaps.display[item.name];
        const owned = aquariumCount('displayItems', id, 'owned');
        const installed = aquariumCount('displayItems', id, 'installed');
        const status = document.createElement('div');
        status.className = 'install-status ' + (installed > 0 ? 'on' : 'off');
        status.textContent = installed > 0 ? `設置中 ${installed}個` : '未設置';
        const actions = document.createElement('div');
        actions.className = 'catalog-actions';
        const add = document.createElement('button');
        add.textContent = '1個設置';
        add.disabled = installed >= owned;
        add.onclick = () => postAquariumMessage({ type: 'display-install', id, target: installed + 1 });
        const remove = document.createElement('button');
        remove.textContent = '1個撤去';
        remove.className = 'remove';
        remove.disabled = installed < 1;
        remove.onclick = () => postAquariumMessage({ type: 'display-install', id, target: installed - 1 });
        actions.append(add, remove);
        card.append(status, actions);
      }

      const details = document.createElement('button');
      details.className = 'detail-btn';
      details.textContent = '詳細を見る';
      details.onclick = () => openDetail(item);
      card.appendChild(details);
      gridEl.appendChild(card);
    });
  };

  // Repaint immediately if the observation panel is already open.
  renderTabs();
  renderGrid();
})();
