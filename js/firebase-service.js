import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app-check.js';
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  deleteUser,
  reload,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { securityConfig } from './security-config.js';

const previewMode = ['localhost', '127.0.0.1'].includes(location.hostname)
  && new URLSearchParams(location.search).get('preview') === '1';

let auth = null;
let db = null;
let unsubscribeSession = null;
let appCheckConfigured = false;

function validAppCheckConfig() {
  const config = securityConfig?.appCheck || {};
  return config.enabled === true
    && config.provider === 'recaptcha-enterprise'
    && typeof config.siteKey === 'string'
    && config.siteKey.length > 20
    && !config.siteKey.includes('REPLACE_WITH_');
}

export async function initializeFirebase() {
  if (previewMode) return { previewMode: true, configured: true, appCheckConfigured: false };
  const app = initializeApp(firebaseConfig);

  // App Check はFirebaseサービスへ接続する前に初期化する。
  if (validAppCheckConfig()) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(securityConfig.appCheck.siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckConfigured = true;
  } else if (securityConfig?.appCheck?.enabled) {
    throw new Error('App Checkの設定が不完全です。SECURITY_SETUP.mdを確認してください。');
  }

  auth = getAuth(app);
  auth.languageCode = 'ja';
  await setPersistence(auth, browserLocalPersistence);
  db = getFirestore(app);
  return { previewMode: false, configured: true, appCheckConfigured };
}

export function observeAuth(callback) {
  if (previewMode) {
    queueMicrotask(() => callback({ uid: 'preview-user', displayName: 'Preview', email: 'preview@local', emailVerified: true, providerData: [] }));
    return () => {};
  }
  if (!auth) throw new Error('Firebaseの初期化が完了していません。');
  return onAuthStateChanged(auth, callback);
}

export function googleLogin() {
  if (previewMode) return Promise.resolve(null);
  if (!auth) return Promise.reject(new Error('Firebaseの初期化が完了していません。'));
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // ユーザーのタップ処理中に直接呼び出し、iOSでもポップアップがブロックされにくくする。
  return signInWithPopup(auth, provider).then((result) => result.user);
}

export async function emailLogin(email, password) {
  if (previewMode) return null;
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}

export async function emailSignup(email, password) {
  if (previewMode) return null;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(result.user);
  return result.user;
}

export function needsEmailVerification(user = auth?.currentUser) {
  if (!user || previewMode) return false;
  const usesPassword = user.providerData?.some((provider) => provider.providerId === 'password');
  return Boolean(usesPassword && !user.emailVerified);
}

export async function resendVerificationEmail() {
  if (previewMode) return;
  if (!auth?.currentUser) throw new Error('ログインしていません。');
  await sendEmailVerification(auth.currentUser);
}

export async function refreshAuthUser() {
  if (previewMode) return auth?.currentUser || null;
  if (!auth?.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function requestPasswordReset(email) {
  if (previewMode) return;
  await sendPasswordResetEmail(auth, email);
}

export function currentProviderKind(user = auth?.currentUser) {
  const providers = user?.providerData?.map((provider) => provider.providerId) || [];
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('password')) return 'password';
  return 'unknown';
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
    activeSession: null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteAccountCompletely(password = '') {
  if (previewMode) {
    localStorage.clear();
    return;
  }
  const user = auth?.currentUser;
  if (!user) throw new Error('ログインしていません。');
  const providerKind = currentProviderKind(user);

  // アカウント削除はセキュリティ上、直前の本人確認が必要。
  if (providerKind === 'google') {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await reauthenticateWithPopup(user, provider);
  } else if (providerKind === 'password') {
    if (!password) {
      const error = new Error('ゲーム用パスワードを入力してください。');
      error.code = 'auth/missing-password';
      throw error;
    }
    const credential = EmailAuthProvider.credential(user.email || '', password);
    await reauthenticateWithCredential(user, credential);
  } else {
    const error = new Error('このログイン方法ではアカウントを削除できません。');
    error.code = 'auth/unsupported-provider';
    throw error;
  }

  // 再認証が成功した後にクラウドデータと認証アカウントを削除する。
  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
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
    'auth/weak-password': 'パスワードは10文字以上で設定してください。',
    'auth/email-already-in-use': 'このメールアドレスでは新規登録できません。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/invalid-login-credentials': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/cancelled-popup-request': '別のGoogleログイン画面が開いています。開いている画面で操作してください。',
    'auth/popup-blocked': 'Googleログイン画面を開けませんでした。SafariまたはChromeの通常タブでゲームを開き、もう一度お試しください。',
    'auth/redirect-cancelled-by-user': 'Googleログインがキャンセルされました。',
    'auth/internal-error': 'Googleログインを完了できませんでした。ページを再読み込みして、もう一度お試しください。',
    'auth/web-storage-unsupported': 'このブラウザではログイン情報を保存できません。通常のブラウザで開いてください。',
    'auth/operation-not-supported-in-this-environment': 'この環境ではGoogleログインを利用できません。通常のブラウザで開いてください。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
    'auth/too-many-requests': '短時間に操作が集中しました。しばらく待ってからお試しください。',
    'auth/requires-recent-login': '安全のため、いったんログアウトして再ログインしてから実行してください。',
    'auth/unsupported-provider': 'このログイン方法では操作できません。',
  };
  return messages[code] || error?.message || '処理を完了できませんでした。もう一度お試しください。';
}
