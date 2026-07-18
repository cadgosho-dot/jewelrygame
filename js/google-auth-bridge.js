import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const RETURN_KEY = 'jxj-google-login-redirect';
const ERROR_KEY = 'jxj-google-login-error';

function errorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/unauthorized-domain': 'この公開URLはGoogleログインの許可設定に入っていません。Firebaseの承認済みドメインを確認してください。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
    'auth/redirect-cancelled-by-user': 'Googleログインがキャンセルされました。',
    'auth/web-storage-unsupported': 'このブラウザではログイン情報を保存できません。通常のブラウザで開いてください。',
    'auth/operation-not-supported-in-this-environment': 'この環境ではGoogleログインを利用できません。通常のブラウザで開いてください。',
  };
  return messages[code] || error?.message || 'Googleログインを完了できませんでした。もう一度お試しください。';
}

function returnToGame() {
  localStorage.setItem(RETURN_KEY, '1');
  location.replace('./index.html?google-login=complete');
}

function waitForFirstAuthState(auth) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, (error) => {
      unsubscribe();
      reject(error);
    });
  });
}

async function start() {
  try {
    localStorage.setItem(RETURN_KEY, '1');
    localStorage.removeItem(ERROR_KEY);
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    auth.languageCode = 'ja';
    await setPersistence(auth, browserLocalPersistence);

    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      returnToGame();
      return;
    }

    const currentUser = await waitForFirstAuthState(auth);
    if (currentUser) {
      returnToGame();
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error(error);
    try {
      localStorage.setItem(ERROR_KEY, errorMessage(error));
      localStorage.removeItem(RETURN_KEY);
    } catch (_) {}
    location.replace('./index.html?google-login=error');
  }
}

start();
