(() => {
  'use strict';

  const FRAME_ID = 'game-frame';
  const STYLE_ID = 'jxj-memories-encounter-count-style-v743';
  const COUNT_CLASS = 'memory-encounter-count-v743';

  const STATIC_EVENT_KEYS = Object.freeze({
    'Western Unionの使者': ['westernUnionEvent'],
    '人魚': ['mermaidEvent'],
    'タトゥーの女': ['tattooWomanAmberEvent'],
    '見習い職人': ['apprenticeCinemaEvent'],
    'リドリー・岡崎': ['ridleyOkazakiSobaEvent'],
    'エメラルド班班長': ['emeraldCaptainKebabEvent'],
    '寿司屋の大将': ['sushiChefEvent'],
    'サイクロプス': ['cyclopsEvent'],
    'ガネーシャ': ['ganeshaTuskEvent'],
    '灰色パーカー': ['grayHoodAquariumEvent'],
    'テリー・カリフォルニア': ['terryCaliforniaEvent'],
    '幽霊': ['hauntingEvent'],
    '店に現れた老婆': ['storeTheftEvent'],
    'ボムじいさん': ['miningPazupanEvent'],
    '河童': ['kappaJadeEvent', 'workshopKappaJadeEvent'],
    '真珠人間': ['pearlHumanEvent'],
    'お菓子大好き': ['oyatsuDaisukiEvent'],
    'スピードスター': ['speedStarEvent'],
    'ストーリーテラー': ['storytellerEvent'],
    '宇宙人': ['alienAbductionEvent', 'alienReturnEvent'],
    'ブルースマン': ['bluesJukeEvent'],
    'カワハラ': ['glabVisitVideoEvent', 'kawaharaKnowledgeEvent'],
    '3Dメガネ': ['looseShopOriginalQuiz'],
    '時計台の老婆': ['clockTowerDonationEvent'],
    '観光客': ['touristWoodSwordEvent'],
    '中華料理屋': ['mysteryChineseMealEvent'],
    'キャベツ野郎': ['okachimachiTollEvent'],
    'ホワイト・バニー': ['whiteBunnyIceEvent'],
    'インド料理屋の店長': ['diamondPolishingLapEvent'],
    '外来種': ['okachimachiInvasiveTurtlesEvent'],
    '幼なじみ': ['childhoodFriendEvent'],
    '通りすがりのクイズ王': ['okachimachiQuiz'],
  });

  function normalizeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.max(0, Math.floor(number)) : 0;
  }

  function eventWasEncountered(eventState) {
    if (!eventState || typeof eventState !== 'object') return false;
    if (eventState.active || eventState.rewardGranted || eventState.completed || eventState.unlocked) return true;
    const stage = String(eventState.stage || '').trim();
    if (stage && stage !== 'idle') return true;
    return Boolean(
      eventState.lastTriggeredDate || eventState.firstTriggeredDate || eventState.completedDate ||
      eventState.lastSeenDate || normalizeCount(eventState.lastTriggeredDay) > 0
    );
  }

  function eventEncounterCount(eventState) {
    if (!eventState || typeof eventState !== 'object') return 0;
    const explicitKeys = ['totalTriggered', 'triggerCount', 'encounterCount', 'timesMet', 'visits'];
    for (const key of explicitKeys) {
      const count = normalizeCount(eventState[key]);
      if (count > 0) return count;
    }
    return eventWasEncountered(eventState) ? 1 : 0;
  }

  function dynamicEventKeys(snapshot, name) {
    const rows = Array.isArray(snapshot?.memories?.characters) ? snapshot.memories.characters : [];
    const keys = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object' || String(row.name || '').trim() !== name) continue;
      const rawKey = String(row.key || '').trim();
      const eventKey = rawKey.includes('::') ? rawKey.split('::', 1)[0] : rawKey;
      if (eventKey) keys.push(eventKey);
    }
    return [...new Set(keys)];
  }

  function characterEncounterCount(snapshot, name) {
    const events = snapshot?.events && typeof snapshot.events === 'object' ? snapshot.events : {};
    const dynamicKeys = dynamicEventKeys(snapshot, name);
    const keys = [...new Set([...(STATIC_EVENT_KEYS[name] || []), ...dynamicKeys])];
    if (!keys.length) return 1;

    const dynamicSet = new Set(dynamicKeys);
    let total = 0;
    for (const key of keys) {
      const count = eventEncounterCount(events[key]);
      if (count > 0) total += count;
      else if (dynamicSet.has(key)) total += 1;
    }
    return Math.max(1, total);
  }

  function ensureStyle(doc) {
    if (!doc?.head || doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #jxj-memories-overlay .${COUNT_CLASS}{
        margin-top:7px;
        font-size:12px;
        line-height:1.45;
        font-weight:800;
        color:#c8efff;
        text-shadow:0 2px 4px #000;
      }
      #jxj-memories-overlay .${COUNT_CLASS} strong{
        font-size:14px;
        color:#fff;
      }
    `;
    doc.head.appendChild(style);
  }

  function decorateFrame(frame) {
    let doc;
    let win;
    try {
      doc = frame.contentDocument;
      win = frame.contentWindow;
    } catch (_) {
      return;
    }
    if (!doc || !win) return;
    ensureStyle(doc);

    const overlay = doc.getElementById('jxj-memories-overlay');
    if (!overlay) return;

    let snapshot = null;
    try {
      snapshot = win.__JXJ_MEMORIES_STATE__?.() || null;
    } catch (_) {
      snapshot = null;
    }

    for (const card of overlay.querySelectorAll('.memory-card')) {
      const name = String(card.querySelector('.memory-copy h2')?.textContent || '').trim();
      if (!name) continue;
      const count = characterEncounterCount(snapshot, name);
      const expected = `出会った回数：${count}回`;
      let countEl = card.querySelector(`.${COUNT_CLASS}`);
      if (!countEl) {
        countEl = doc.createElement('div');
        countEl.className = COUNT_CLASS;
        const description = card.querySelector('.memory-copy > p');
        if (description) description.insertAdjacentElement('afterend', countEl);
        else card.querySelector('.memory-copy')?.appendChild(countEl);
      }
      if (countEl && countEl.textContent !== expected) {
        countEl.innerHTML = `出会った回数：<strong>${count}</strong>回`;
      }
    }
  }

  function attachFrame(frame) {
    if (!frame || frame.dataset.memoriesEncounterCountV743 === '1') return;
    frame.dataset.memoriesEncounterCountV743 = '1';

    let observer = null;
    const start = () => {
      observer?.disconnect();
      let doc;
      try { doc = frame.contentDocument; } catch (_) { return; }
      if (!doc?.documentElement) return;
      decorateFrame(frame);
      observer = new MutationObserver(() => decorateFrame(frame));
      observer.observe(doc.documentElement, { childList: true, subtree: true });
    };

    frame.addEventListener('load', start);
    start();
  }

  function boot() {
    const frame = document.getElementById(FRAME_ID);
    if (frame) attachFrame(frame);
    new MutationObserver(() => {
      const current = document.getElementById(FRAME_ID);
      if (current) attachFrame(current);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
