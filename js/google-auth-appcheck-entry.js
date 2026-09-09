import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js';
import { firebaseConfig } from './firebase-config.js';
import { securityConfig } from './security-config.js';

function isFirebaseHostingHost() {
  return location.hostname === firebaseConfig.authDomain
    || location.hostname === `${firebaseConfig.projectId}.web.app`
    || location.hostname === `${firebaseConfig.projectId}.firebaseapp.com`;
}

function effectiveFirebaseConfig() {
  return isFirebaseHostingHost() ? { ...firebaseConfig, authDomain: location.hostname } : firebaseConfig;
}

function validAppCheckConfig() {
  const config = securityConfig?.appCheck || {};
  return config.enabled === true
    && config.provider === 'recaptcha-enterprise'
    && typeof config.siteKey === 'string'
    && config.siteKey.length > 20
    && !config.siteKey.includes('REPLACE_WITH_');
}

const app = initializeApp(effectiveFirebaseConfig());

// Authenticationも、他のFirebaseサービスと同様にApp Check初期化後に開始する。
if (validAppCheckConfig()) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(securityConfig.appCheck.siteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else if (securityConfig?.appCheck?.enabled) {
  throw new Error('App Checkの設定が不完全です。SECURITY_SETUP.mdを確認してください。');
}

await import('./google-auth-bridge.js?v=0.10.936');
