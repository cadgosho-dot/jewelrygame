import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, addDoc, collection,
  getDocs, query, orderBy, limit, startAfter, writeBatch, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { defaultState, APP_URL } from './game-data.js';

const isPlaceholder = (value) => !value || String(value).startsWith('PASTE_');
export const firebaseConfigured = !isPlaceholder(firebaseConfig.apiKey)
  && !isPlaceholder(firebaseConfig.messagingSenderId)
  && !isPlaceholder(firebaseConfig.appId);

const previewMode = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('preview') === '1';
let app;
let auth;
let db;
let currentUser = null;
let unsubscribeSession = null;

function localKey(uid) { return `jewelife-preview-${uid}`; }

export async function initializeFirebase() {
  if (previewMode) return { previewMode: true };
  if (!firebaseConfigured) return { configured: false };
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  try { await getRedirectResult(auth); } catch (error) { console.error(error); }
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = localStorage.getItem('jewelife-email-for-signin');
    if (!email) email = window.prompt('ログインに使用したメールアドレスを入力してください。') || '';
    if (email) {
      await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem('jewelife-email-for-signin');
      history.replaceState({}, document.title, location.pathname);
    }
  }
  return { configured: true };
}

export function observeAuth(callback) {
  if (previewMode) {
    const user = { uid: 'preview-user', displayName: 'Preview', email: 'preview@local' };
    currentUser = user;
    queueMicrotask(() => callback(user));
    return () => {};
  }
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) => { currentUser = user; callback(user); });
}

export async function googleLogin() {
  if (!auth) throw new Error('Firebaseの設定が完了していません。');
  const provider = new GoogleAuthProvider();
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile) return signInWithRedirect(auth, provider);
  try { return await signInWithPopup(auth, provider); }
  catch (error) {
    if (['auth/popup-blocked', 'auth/cancelled-popup-request', 'auth/popup-closed-by-user'].includes(error.code)) {
      return signInWithRedirect(auth, provider);
    }
    throw error;
  }
}

export async function sendEmailLoginLink(email) {
  if (!auth) throw new Error('Firebaseの設定が完了していません。');
  const actionCodeSettings = { url: APP_URL, handleCodeInApp: true };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem('jewelife-email-for-signin', email);
}

export async function logout() {
  if (previewMode) { location.href = location.pathname; return; }
  if (auth) await signOut(auth);
}

export function getCurrentUser() { return currentUser; }
export function isPreviewMode() { return previewMode; }

export async function loadState(uid) {
  if (previewMode) {
    const saved = localStorage.getItem(localKey(uid));
    return saved ? JSON.parse(saved) : null;
  }
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data().gameState || null : null;
}

export async function saveState(uid, state) {
  const clean = structuredClone(state);
  clean.updatedAt = new Date().toISOString();
  if (previewMode) {
    localStorage.setItem(localKey(uid), JSON.stringify(clean));
    return;
  }
  await setDoc(doc(db, 'users', uid), { gameState: clean, updatedAt: serverTimestamp() }, { merge: true });
}

export async function ensureState(uid) {
  const existing = await loadState(uid);
  if (existing) return existing;
  const state = defaultState();
  await saveState(uid, state);
  return state;
}

export async function appendHistory(uid, event) {
  const entry = { ...event, createdAt: new Date().toISOString() };
  if (previewMode) {
    const key = `${localKey(uid)}-history`;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push({ id: crypto.randomUUID(), ...entry });
    localStorage.setItem(key, JSON.stringify(arr));
    return;
  }
  await addDoc(collection(db, 'users', uid, 'history'), entry);
}

export async function fetchAllHistory(uid) {
  if (previewMode) return JSON.parse(localStorage.getItem(`${localKey(uid)}-history`) || '[]');
  const rows = [];
  let last = null;
  while (true) {
    const constraints = [orderBy('createdAt', 'asc'), limit(500)];
    if (last) constraints.splice(1, 0, startAfter(last));
    const snap = await getDocs(query(collection(db, 'users', uid, 'history'), ...constraints));
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    if (snap.size < 500) break;
    last = snap.docs[snap.docs.length - 1];
  }
  return rows;
}

export async function deleteAllGameData(uid, replacementState) {
  if (previewMode) {
    localStorage.removeItem(`${localKey(uid)}-history`);
    localStorage.setItem(localKey(uid), JSON.stringify(replacementState));
    return;
  }
  const historySnap = await getDocs(collection(db, 'users', uid, 'history'));
  let batch = writeBatch(db);
  let count = 0;
  for (const item of historySnap.docs) {
    batch.delete(item.ref);
    count += 1;
    if (count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
  }
  if (count) await batch.commit();
  await setDoc(doc(db, 'users', uid), { gameState: replacementState, updatedAt: serverTimestamp() });
}

export async function claimSession(uid, sessionId) {
  if (previewMode) return;
  await setDoc(doc(db, 'users', uid), {
    activeSession: { id: sessionId, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  }, { merge: true });
}

export function watchSession(uid, sessionId, onTakenOver) {
  if (previewMode || !db) return () => {};
  if (unsubscribeSession) unsubscribeSession();
  let initialized = false;
  unsubscribeSession = onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) return;
    const active = snap.data().activeSession;
    if (!initialized) { initialized = true; return; }
    if (active?.id && active.id !== sessionId) onTakenOver(active);
  });
  return unsubscribeSession;
}

export async function heartbeat(uid, sessionId) {
  if (previewMode || !db) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      'activeSession.id': sessionId,
      'activeSession.updatedAt': new Date().toISOString(),
    });
  } catch (error) { console.warn(error); }
}
