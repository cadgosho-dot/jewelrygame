// Firebase App Check の公開設定。siteKey は秘密情報ではありません。
// SECURITY_SETUP.md の手順完了後に enabled を true にしてください。
export const securityConfig = Object.freeze({
  appCheck: Object.freeze({
    enabled: false,
    provider: 'recaptcha-enterprise',
    siteKey: 'REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY',
  }),
});
