import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const previewMode = ['localhost', '127.0.0.1'].includes(location.hostname)
  && new URLSearchParams(location.search).get('preview') === '1';

let auth = null;
let db = null;
let unsubscribeSession = null;

export async function initializeFirebase() {
  if (previewMode) return { previewMode: true, configured: true };
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  return { previewMode: false, configured: true };
}

export function observeAuth(callback) {
  if (previewMode) {
    queueMicrotask(() => callback({ uid: 'preview-user', displayName: 'Preview', email: 'preview@local' }));
    return () => {};
  }
  if (!auth) throw new Error('Firebaseの初期化が完了していません。');
  return onAuthStateChanged(auth, callback);
}

export async function googleLogin() {
  if (previewMode) return;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

export async function emailLogin(email, password) {
  if (previewMode) return;
  await signInWithEmailAndPassword(auth, email, password);
}

export async function emailSignup(email, password) {
  if (previewMode) return;
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (previewMode) {
    location.href = location.pathname;
    return;
  }
  await signOut(auth);
}

export async function loadState(uid) {
  if (previewMode) {
    const saved = localStorage.getItem(`jewelrygame-preview-${uid}`);
    return saved ? JSON.parse(saved) : null;
  }
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data().gameState || null : null;
}

export async function saveState(uid, state) {
  const clean = structuredClone(state);
  clean.updatedAt = new Date().toISOString();
  if (previewMode) {
    localStorage.setItem(`jewelrygame-preview-${uid}`, JSON.stringify(clean));
    return;
  }
  await setDoc(doc(db, 'users', uid), {
    gameState: clean,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteGameData(uid) {
  if (previewMode) {
    localStorage.removeItem(`jewelrygame-preview-${uid}`);
    return;
  }
  await setDoc(doc(db, 'users', uid), {
    gameState: null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function claimSession(uid, sessionId) {
  if (previewMode) return;
  await setDoc(doc(db, 'users', uid), {
    activeSession: {
      id: sessionId,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }, { merge: true });
}

export function watchSession(uid, sessionId, onTakenOver) {
  if (previewMode || !db) return () => {};
  if (unsubscribeSession) unsubscribeSession();
  let initialized = false;
  unsubscribeSession = onSnapshot(doc(db, 'users', uid), (snapshot) => {
    if (!snapshot.exists()) return;
    const active = snapshot.data().activeSession;
    if (!initialized) {
      initialized = true;
      return;
    }
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
  } catch (error) {
    console.warn('Heartbeat failed:', error);
  }
}

export function firebaseErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-email': 'メールアドレスの形式を確認してください。',
    'auth/missing-password': 'パスワードを入力してください。',
    'auth/weak-password': 'パスワードは6文字以上にしてください。',
    'auth/email-already-in-use': 'このメールアドレスはすでに登録されています。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
  };
  return messages[code] || '処理を完了できませんでした。もう一度お試しください。';
}
