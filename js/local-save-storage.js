const DB_NAME = 'jewelrygame-device-save-v1';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
let databasePromise = null;

function normalizedUserId(uid) {
  const value = String(uid || '').trim();
  if (!value) throw new Error('IndexedDB save requires a user id.');
  return value;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
  });
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable.'));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    let request;
    try {
      request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed.'));
    request.onblocked = () => reject(new Error('IndexedDB open was blocked.'));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

function parseRecord(record) {
  if (!record) return null;
  try {
    const raw = typeof record === 'string' ? record : record.raw;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : record.state;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

export async function readIndexedDbSave(uid) {
  const key = normalizedUserId(uid);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const done = transactionDone(transaction);
  const record = await requestResult(transaction.objectStore(STORE_NAME).get(key));
  await done;
  return parseRecord(record);
}

export async function writeIndexedDbSave(uid, state) {
  const key = normalizedUserId(uid);
  const raw = JSON.stringify(state);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  transaction.objectStore(STORE_NAME).put({
    raw,
    saveRevision: Math.max(0, Math.floor(Number(state?.saveRevision) || 0)),
    updatedAt: String(state?.updatedAt || ''),
    writtenAt: new Date().toISOString(),
  }, key);
  await done;
  return true;
}

export async function deleteIndexedDbSave(uid) {
  const key = normalizedUserId(uid);
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  transaction.objectStore(STORE_NAME).delete(key);
  await done;
}
