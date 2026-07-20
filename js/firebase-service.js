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
let firebaseInitialized = false;

function authErrorDiagnostics(stage, error) {
  const customData = error?.customData || {};
  const serverMessage = customData?._tokenResponse?.error?.message
    || customData?._serverResponse?.error?.message
    || '';
  return {
    stage,
    code: error?.code || '',
    name: error?.name || '',
    message: error?.message || '',
    serverMessage,
    hostname: location.hostname,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    appCheckConfigured,
    firebaseInitialized,
  };
}

function logAuthError(stage, error) {
  console.error(`[Firebase Auth] ${stage}`, authErrorDiagnostics(stage, error));
}

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
  firebaseInitialized = true;
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
  try {
    return (await signInWithEmailAndPassword(auth, email, password)).user;
  } catch (error) {
    logAuthError('email-login', error);
    throw error;
  }
}

export async function emailSignup(email, password) {
  if (previewMode) return { user: null, verificationSent: true, verificationError: null };
  let result;
  try {
    result = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    logAuthError('email-signup-create-account', error);
    throw error;
  }

  // アカウント作成後の確認メール送信は別工程として扱う。
  // 送信だけ失敗した場合に、作成済みアカウントまで「登録失敗」と誤表示しない。
  try {
    await sendEmailVerification(result.user);
    return { user: result.user, verificationSent: true, verificationError: null };
  } catch (error) {
    logAuthError('email-signup-send-verification', error);
    return { user: result.user, verificationSent: false, verificationError: error };
  }
}

export function needsEmailVerification(user = auth?.currentUser) {
  if (!user || previewMode) return false;
  const usesPassword = user.providerData?.some((provider) => provider.providerId === 'password');
  return Boolean(usesPassword && !user.emailVerified);
}

export async function resendVerificationEmail() {
  if (previewMode) return;
  if (!auth?.currentUser) throw new Error('ログインしていません。');
  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error) {
    logAuthError('resend-verification-email', error);
    throw error;
  }
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
  const userRef = doc(db, 'users', uid);
  try {
    // gameStateフィールド全体を置き換え、旧版のinventory.general / inventory.gemsなどをクラウドに残さない。
    await updateDoc(userRef, {
      gameState: clean,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error?.code !== 'not-found') throw error;
    await setDoc(userRef, {
      gameState: clean,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
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

export function firebaseErrorMessage(error, context = '') {
  const code = error?.code || '';
  const messages = {
    'auth/invalid-email': 'メールアドレスの形式を確認してください。',
    'auth/missing-email': 'メールアドレスを入力してください。',
    'auth/missing-password': 'パスワードを入力してください。',
    'auth/weak-password': 'パスワードは10文字以上で設定してください。',
    'auth/password-does-not-meet-requirements': 'パスワードがFirebaseで設定された条件を満たしていません。文字数や文字の種類を確認してください。',
    'auth/email-already-in-use': 'このメールアドレスでは新規登録できません。すでに作成済みの場合は「ログインして始める」をお試しください。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/invalid-login-credentials': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/wrong-password': 'メールアドレスまたはパスワードが正しくありません。',
    'auth/user-disabled': 'このアカウントは現在利用できません。',
    'auth/operation-not-allowed': 'メールアドレスでの登録がFirebase側で有効になっていません。管理者へお知らせください。',
    'auth/app-not-authorized': 'この公開URLはFirebase認証の利用を許可されていません。管理者へお知らせください。',
    'auth/unauthorized-domain': 'この公開URLはFirebase認証の承認済みドメインに登録されていません。管理者へお知らせください。',
    'auth/invalid-api-key': 'FirebaseのAPIキー設定を確認できませんでした。管理者へお知らせください。',
    'auth/quota-exceeded': '確認メールの送信上限に達しました。時間をおいてから再送してください。',
    'auth/invalid-recipient-email': '確認メールの送信先を確認できませんでした。メールアドレスを確認してください。',
    'auth/invalid-sender': 'Firebaseの確認メール送信者設定に問題があります。管理者へお知らせください。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/cancelled-popup-request': '別のGoogleログイン画面が開いています。開いている画面で操作してください。',
    'auth/popup-blocked': 'Googleログイン画面を開けませんでした。SafariまたはChromeの通常タブでゲームを開き、もう一度お試しください。',
    'auth/redirect-cancelled-by-user': 'Googleログインがキャンセルされました。',
    'auth/web-storage-unsupported': 'このブラウザではログイン情報を保存できません。通常のブラウザで開いてください。',
    'auth/operation-not-supported-in-this-environment': 'この環境ではGoogleログインを利用できません。通常のブラウザで開いてください。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
    'auth/too-many-requests': '短時間に操作が集中しました。時間をおいてからお試しください。',
    'auth/requires-recent-login': '安全のため、いったんログアウトして再ログインしてから実行してください。',
    'auth/unsupported-provider': 'このログイン方法では操作できません。',
  };
  if (code === 'auth/internal-error') {
    if (context === 'google-login') return 'Googleログインを完了できませんでした。ページを再読み込みして、もう一度お試しください。';
    if (context === 'email-verification') return '確認メールを送信できませんでした。アカウントは作成済みの可能性があります。画面の「確認メールを再送」をお試しください。';
    if (context === 'email-signup') return 'Firebaseが新規登録処理を完了できませんでした。ページを再読み込みしても続く場合は、Firebase認証設定を管理者が確認する必要があります。';
    if (context === 'email-login') return 'Firebaseがメールログイン処理を完了できませんでした。ページを再読み込みして、もう一度お試しください。';
    return 'Firebase認証処理を完了できませんでした。ページを再読み込みして、もう一度お試しください。';
  }
  return messages[code] || error?.message || '処理を完了できませんでした。もう一度お試しください。';
}
