import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const RETURN_KEY = 'jxj-google-login-redirect';
const ERROR_KEY = 'jxj-google-login-error';
const button = document.querySelector('#google-popup-login');
const status = document.querySelector('#auth-status');

function errorMessage(error) {
  const messages = {
    'auth/unauthorized-domain': 'この公開URLはGoogleログインの許可設定に入っていません。',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました。',
    'auth/cancelled-popup-request': '別のGoogleログイン画面が開いています。',
    'auth/popup-blocked': 'ログイン画面を開けませんでした。SafariまたはChromeの通常タブで開いてください。',
    'auth/network-request-failed': '通信できません。インターネット接続を確認してください。',
    'auth/web-storage-unsupported': 'このブラウザではログイン情報を保存できません。通常のブラウザで開いてください。',
    'auth/operation-not-supported-in-this-environment': 'この環境ではGoogleログインを利用できません。通常のブラウザで開いてください。',
  };
  return messages[error?.code] || error?.message || 'Googleログインを完了できませんでした。';
}

function returnToGame() {
  try { localStorage.setItem(RETURN_KEY, '1'); } catch (_) {}
  location.replace('./index.html?google-login=complete');
}

async function start() {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    auth.languageCode = 'ja';
    await setPersistence(auth, browserLocalPersistence);
    onAuthStateChanged(auth, (user) => {
      if (user) returnToGame();
    });
    button?.addEventListener('click', () => {
      button.disabled = true;
      status.textContent = 'Googleログイン画面を開いています…';
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      signInWithPopup(auth, provider).catch((error) => {
        console.error(error);
        const message = errorMessage(error);
        try { localStorage.setItem(ERROR_KEY, message); } catch (_) {}
        status.textContent = message;
        button.disabled = false;
      });
    });
  } catch (error) {
    console.error(error);
    status.textContent = errorMessage(error);
    if (button) button.disabled = true;
  }
}

start();
