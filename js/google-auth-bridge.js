import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  initializeAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const RETURN_KEY = 'jxj-google-login-redirect';
const ERROR_KEY = 'jxj-google-login-error';
const COMPLETE_KEY = 'jxj-google-login-completed-at';
const CREDENTIAL_HANDOFF_KEY = 'jxj-google-credential-handoff-v1';
const DIAGNOSTIC_KEY = 'jxj-google-login-diagnostic-v1';
const LOGIN_TIMEOUT_MS = 45000;
const CREDENTIAL_MAX_AGE_MS = 5 * 60 * 1000;

const button = document.querySelector('#google-popup-login');
const recheckButton = document.querySelector('#auth-recheck');
const externalPanel = document.querySelector('#auth-external-panel');
const externalLink = document.querySelector('#auth-external-link');
const copyButton = document.querySelector('#auth-copy-url');
const retryButton = document.querySelector('#auth-retry-popup');
const status = document.querySelector('#auth-status');
const detail = document.querySelector('#auth-detail');
const environment = document.querySelector('#auth-environment');

let auth = null;
let returning = false;
let loginInProgress = false;
let loginTimeout = 0;
let persistenceKind = '';

function safeStorage(type = 'local') {
  try {
    return type === 'session' ? window.sessionStorage : window.localStorage;
  } catch (_) {
    return null;
  }
}

function storageAvailable(type = 'local') {
  const storage = safeStorage(type);
  if (!storage) return false;
  try {
    const key = `jxj-auth-${type}-test-${Date.now()}`;
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

function storageSet(type, key, value) {
  try {
    const storage = safeStorage(type);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

function storageRemove(type, key) {
  try {
    safeStorage(type)?.removeItem(key);
  } catch (_) {}
}

function isStandaloneMode() {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

function isLikelyInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /\bwv\b|;\s*wv\)|FBAN|FBAV|Instagram|Line\/|LIFF|Twitter|TikTok|MicroMessenger|Snapchat|Pinterest|YahooApp|GSA\//i.test(ua);
}

function environmentInfo() {
  return {
    hostname: location.hostname,
    standalone: isStandaloneMode(),
    inAppBrowser: isLikelyInAppBrowser(),
    localStorage: storageAvailable('local'),
    sessionStorage: storageAvailable('session'),
    online: navigator.onLine !== false,
    userAgent: navigator.userAgent || '',
    persistenceKind,
    time: new Date().toISOString(),
  };
}

function writeDiagnostic(extra = {}) {
  const payload = { ...environmentInfo(), ...extra };
  try { safeStorage('session')?.setItem(DIAGNOSTIC_KEY, JSON.stringify(payload)); } catch (_) {}
  return payload;
}

function setStatus(message, diagnostic = '') {
  if (status) status.textContent = message;
  if (detail) detail.textContent = diagnostic;
}

function updateEnvironmentText() {
  if (!environment) return;
  const info = environmentInfo();
  const context = info.inAppBrowser
    ? 'アプリ内ブラウザ'
    : info.standalone
      ? 'ホーム画面アプリ'
      : '通常ブラウザ';
  const storage = info.localStorage ? 'ローカル保存可' : info.sessionStorage ? 'タブ内保存可' : '保存制限あり';
  environment.textContent = `${context}・${storage}`;
}

function diagnosticText(error, stage = '') {
  const code = error?.code || 'unknown';
  const stageText = stage ? ` / 段階: ${stage}` : '';
  return `エラーコード: ${code}${stageText} / 公開元: ${location.hostname}`;
}

function errorMessage(error) {
  const messages = {
    'auth/unauthorized-domain': 'この公開URLがFirebaseの承認済みドメインに登録されていません。管理者へお知らせください。',
    'auth/app-not-authorized': 'この公開URLではFirebase認証を利用できません。管理者へお知らせください。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/cancelled-popup-request': '別のGoogleログイン画面が開いています。',
    'auth/popup-blocked': 'この画面ではGoogleログインを開けませんでした。通常ブラウザで開いてください。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
    'auth/web-storage-unsupported': 'このブラウザではログイン情報を保存できません。通常ブラウザで開いてください。',
    'auth/operation-not-supported-in-this-environment': 'このアプリ内ブラウザまたはホーム画面モードではGoogleログインを完了できません。通常ブラウザで開いてください。',
    'auth/internal-error': 'Googleログインの受け取り処理を完了できませんでした。通常ブラウザで再度お試しください。',
    'auth/too-many-requests': '短時間に操作が集中しました。少し時間をおいてからお試しください。',
    'auth/credential-already-in-use': 'このGoogleアカウントは別のゲームアカウントで使用されています。',
    'auth/account-exists-with-different-credential': '同じメールアドレスの別ログイン方法が登録されています。メールアドレスでログインしてください。',
  };
  return messages[error?.code] || error?.message || 'Googleログインを完了できませんでした。';
}

function rememberError(message) {
  try { safeStorage('local')?.setItem(ERROR_KEY, message); } catch (_) {}
}

function clearLoginTimeout() {
  window.clearTimeout(loginTimeout);
  loginTimeout = 0;
}

function showExternalBrowserHelp(message = '') {
  const url = new URL(location.href);
  url.searchParams.set('browser', '1');
  if (externalLink) externalLink.href = url.href;
  if (externalPanel) externalPanel.hidden = false;
  if (message) setStatus(message);
  writeDiagnostic({ stage: 'external-browser-help-shown' });
}

function restoreButtons() {
  loginInProgress = false;
  clearLoginTimeout();
  if (button) {
    button.disabled = false;
    button.textContent = 'Googleアカウントを選ぶ';
  }
  if (recheckButton) recheckButton.hidden = false;
  if (retryButton) retryButton.hidden = false;
}

function storeCredentialHandoff(result) {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.idToken && !credential?.accessToken) return false;
  const session = safeStorage('session');
  if (!session) return false;
  try {
    session.setItem(CREDENTIAL_HANDOFF_KEY, JSON.stringify({
      idToken: credential.idToken || '',
      accessToken: credential.accessToken || '',
      createdAt: Date.now(),
      expiresAt: Date.now() + CREDENTIAL_MAX_AGE_MS,
      uid: result?.user?.uid || '',
    }));
    return true;
  } catch (_) {
    return false;
  }
}

async function returnToGame(user, result = null) {
  if (returning || !user) return;
  returning = true;
  clearLoginTimeout();
  try {
    // ポップアップ結果からGoogle資格情報を同一タブのsessionStorageへ一時保存する。
    // Firebaseの永続化反映が遅いブラウザでも、game.html側が資格情報を再交換できる。
    if (result) storeCredentialHandoff(result);
    await user.getIdToken();
    storageSet('local', RETURN_KEY, '1');
    storageSet('local', COMPLETE_KEY, new Date().toISOString());
    storageRemove('local', ERROR_KEY);
    writeDiagnostic({ stage: 'login-complete', uid: user.uid });
  } catch (error) {
    returning = false;
    const message = errorMessage(error);
    rememberError(message);
    setStatus(message, diagnosticText(error, 'token'));
    writeDiagnostic({ stage: 'token-error', code: error?.code || '', message: error?.message || '' });
    restoreButtons();
    showExternalBrowserHelp();
    return;
  }
  setStatus('ログインが完了しました。ゲームへ戻っています…');
  window.setTimeout(() => location.replace('./index.html?google-login=complete'), 120);
}

async function recheckAuthState() {
  if (!auth || returning) return false;
  try {
    await auth.authStateReady();
    if (auth.currentUser) {
      await returnToGame(auth.currentUser);
      return true;
    }
  } catch (error) {
    console.error('[Google Auth] recheck', error);
    writeDiagnostic({ stage: 'recheck-error', code: error?.code || '', message: error?.message || '' });
  }
  return false;
}

async function beginGoogleLogin() {
  if (!auth || loginInProgress || returning) return;
  loginInProgress = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Googleログインを開いています…';
  }
  if (recheckButton) recheckButton.hidden = true;
  if (retryButton) retryButton.hidden = true;
  setStatus('開いたGoogle画面でアカウントを選択してください。');
  writeDiagnostic({ stage: 'popup-start' });

  clearLoginTimeout();
  loginTimeout = window.setTimeout(async () => {
    if (await recheckAuthState()) return;
    setStatus('このブラウザでは認証結果が戻ってきませんでした。通常ブラウザで開いてください。');
    restoreButtons();
    showExternalBrowserHelp();
    writeDiagnostic({ stage: 'popup-timeout' });
  }, LOGIN_TIMEOUT_MS);

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    if (!result?.user) throw Object.assign(new Error('ログインユーザーを確認できませんでした。'), { code: 'auth/internal-error' });
    writeDiagnostic({ stage: 'popup-resolved', uid: result.user.uid });
    await returnToGame(result.user, result);
  } catch (error) {
    console.error('[Google Auth] popup', error);
    const message = errorMessage(error);
    rememberError(message);
    setStatus(message, diagnosticText(error, 'popup'));
    writeDiagnostic({ stage: 'popup-error', code: error?.code || '', message: error?.message || '' });
    restoreButtons();
    if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error?.code)) showExternalBrowserHelp();
  }
}

async function copyLoginUrl() {
  const url = new URL(location.href);
  url.searchParams.set('browser', '1');
  try {
    await navigator.clipboard.writeText(url.href);
    setStatus('URLをコピーしました。Chrome、Safari、Edgeなどの通常ブラウザへ貼り付けてください。');
  } catch (_) {
    window.prompt('このURLをコピーして通常ブラウザへ貼り付けてください。', url.href);
  }
}

async function start() {
  updateEnvironmentText();
  const env = writeDiagnostic({ stage: 'initialize-start' });
  if (env.inAppBrowser || env.standalone) {
    showExternalBrowserHelp('ホーム画面アプリやアプリ内ブラウザではGoogle認証が止まる場合があります。止まった場合は通常ブラウザで開いてください。');
  }

  try {
    const app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    persistenceKind = 'auto';
    auth.languageCode = 'ja';
    updateEnvironmentText();
    await auth.authStateReady();

    onAuthStateChanged(auth, (user) => {
      if (!user) return;
      // signInWithPopup()の結果にはGoogle資格情報が含まれるため、まずPromiseの完了を短時間待つ。
      // Promiseだけ戻らないブラウザでは、認証状態の変化を予備経路として使用する。
      if (loginInProgress) {
        window.setTimeout(() => {
          if (!returning && auth?.currentUser) returnToGame(auth.currentUser);
        }, 1200);
        return;
      }
      returnToGame(user);
    });

    if (auth.currentUser) {
      await returnToGame(auth.currentUser);
      return;
    }

    if (!env.localStorage && !env.sessionStorage) {
      throw Object.assign(new Error('このブラウザではログイン情報を保存できません。'), { code: 'auth/web-storage-unsupported' });
    }

    setStatus('下のボタンを押してGoogleアカウントを選択してください。');
    if (button) button.disabled = false;
    button?.addEventListener('click', beginGoogleLogin);
    retryButton?.addEventListener('click', beginGoogleLogin);
    recheckButton?.addEventListener('click', async () => {
      setStatus('ログイン状態を確認しています…');
      if (!(await recheckAuthState())) {
        setStatus('ログイン状態を確認できませんでした。通常ブラウザで開くか、もう一度Googleアカウントを選択してください。');
        showExternalBrowserHelp();
      }
    });
    copyButton?.addEventListener('click', copyLoginUrl);

    window.addEventListener('pageshow', () => recheckAuthState());
    window.addEventListener('focus', () => recheckAuthState());
    window.addEventListener('online', () => recheckAuthState());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') recheckAuthState();
    });
  } catch (error) {
    console.error('[Google Auth] initialize', error);
    const message = errorMessage(error);
    rememberError(message);
    setStatus(message, diagnosticText(error, 'initialize'));
    writeDiagnostic({ stage: 'initialize-error', code: error?.code || '', message: error?.message || '' });
    if (button) button.disabled = true;
    if (recheckButton) recheckButton.hidden = true;
    showExternalBrowserHelp();
    copyButton?.addEventListener('click', copyLoginUrl);
  }
}

start();
