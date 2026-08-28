(() => {
  'use strict';

  const PLACEHOLDER = '○○○';
  const EVENT_SELECTOR = '.one-love-event-screen';
  const DIALOGUE_SELECTOR = '.one-love-event-screen .event-dialogue-card strong';
  const DB_NAME = 'jewelrygame-device-save-v1';
  const STORE_NAME = 'saves';
  let cachedPlayerName = '';
  let resolving = null;

  const normalizedName = (value) => String(value || '').trim();

  function nameFromParsedSave(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '';
    return normalizedName(parsed.playerName);
  }

  function readPlayerNameFromLocalStorage() {
    let best = { name: '', revision: -1, updatedAt: '' };
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key) continue;
        let parsed;
        try { parsed = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { continue; }
        const name = nameFromParsedSave(parsed);
        if (!name) continue;
        const revision = Math.max(0, Math.floor(Number(parsed.saveRevision) || 0));
        const updatedAt = String(parsed.updatedAt || '');
        if (revision > best.revision || (revision === best.revision && updatedAt > best.updatedAt)) {
          best = { name, revision, updatedAt };
        }
      }
    } catch (_) {}
    return best.name;
  }

  function readPlayerNameFromIndexedDb() {
    return new Promise((resolve) => {
      if (!globalThis.indexedDB) { resolve(''); return; }
      let request;
      try { request = indexedDB.open(DB_NAME, 1); } catch (_) { resolve(''); return; }
      request.onerror = () => resolve('');
      request.onblocked = () => resolve('');
      request.onsuccess = () => {
        const db = request.result;
        try {
          if (!db.objectStoreNames.contains(STORE_NAME)) { db.close(); resolve(''); return; }
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const getAll = transaction.objectStore(STORE_NAME).getAll();
          getAll.onerror = () => { db.close(); resolve(''); };
          getAll.onsuccess = () => {
            let best = { name: '', revision: -1, updatedAt: '' };
            for (const record of Array.isArray(getAll.result) ? getAll.result : []) {
              let parsed = record?.state;
              if (!parsed && typeof record?.raw === 'string') {
                try { parsed = JSON.parse(record.raw); } catch (_) { parsed = null; }
              }
              const name = nameFromParsedSave(parsed);
              if (!name) continue;
              const revision = Math.max(0, Math.floor(Number(parsed.saveRevision) || 0));
              const updatedAt = String(parsed.updatedAt || record?.writtenAt || '');
              if (revision > best.revision || (revision === best.revision && updatedAt > best.updatedAt)) {
                best = { name, revision, updatedAt };
              }
            }
            db.close();
            resolve(best.name);
          };
        } catch (_) {
          try { db.close(); } catch (_) {}
          resolve('');
        }
      };
    });
  }

  async function resolvePlayerName() {
    if (cachedPlayerName) return cachedPlayerName;
    const localName = readPlayerNameFromLocalStorage();
    if (localName) return (cachedPlayerName = localName);
    const indexedName = await readPlayerNameFromIndexedDb();
    if (indexedName) return (cachedPlayerName = indexedName);
    return 'あなた';
  }

  function replacePlaceholder(playerName) {
    if (!document.querySelector(EVENT_SELECTOR)) return false;
    let changed = false;
    document.querySelectorAll(DIALOGUE_SELECTOR).forEach((element) => {
      const before = element.textContent || '';
      if (!before.includes(PLACEHOLDER)) return;
      element.textContent = before.split(PLACEHOLDER).join(playerName);
      changed = true;
    });
    return changed;
  }

  function repairOneLoveName() {
    if (!document.querySelector(EVENT_SELECTOR)) return;
    const immediateName = cachedPlayerName || readPlayerNameFromLocalStorage();
    if (immediateName) {
      cachedPlayerName = immediateName;
      replacePlaceholder(immediateName);
      return;
    }
    if (resolving) return;
    resolving = resolvePlayerName()
      .then((name) => replacePlaceholder(name))
      .finally(() => { resolving = null; });
  }

  const scheduleRepair = () => queueMicrotask(repairOneLoveName);
  new MutationObserver(scheduleRepair).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('pageshow', scheduleRepair);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRepair(); });
  scheduleRepair();
})();
