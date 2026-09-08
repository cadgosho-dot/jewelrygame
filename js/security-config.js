// Firebase App Check の公開設定。siteKey は秘密情報ではありません。
// reCAPTCHA Enterprise 登録済み。Enforce はメトリクス確認後に別途判断します。
export const securityConfig = Object.freeze({
  appCheck: Object.freeze({
    enabled: true,
    provider: 'recaptcha-enterprise',
    siteKey: '6Le20a8tAAAAAMEb_b8exhYF7h4_A7u20CYMIV0z',
  }),
});
