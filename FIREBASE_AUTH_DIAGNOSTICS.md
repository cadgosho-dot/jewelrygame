# JEWELRY×JEWELRY v0.10.205 Firebase新規登録診断

## 調査結果

v0.10.204では、メール新規登録の処理が次の2工程を1つの `try/catch` として扱っていました。

1. Firebase Authenticationへ新規アカウントを作成
2. 作成したアカウントへ確認メールを送信

そのため、2番の確認メール送信だけが失敗した場合でも「新規登録が失敗した」と表示されていました。さらに、`auth/internal-error` の日本語メッセージがGoogleログイン専用の内容に固定されていたため、メール登録のエラーでも「Googleログインを完了できませんでした」と誤表示されていました。

v0.10.205では両工程を分離し、失敗した段階をブラウザの開発者コンソールへ次の名称で記録します。

- `email-signup-create-account`：アカウント作成で失敗
- `email-signup-send-verification`：初回確認メール送信で失敗
- `resend-verification-email`：確認メール再送で失敗
- `email-login`：メールログインで失敗

診断ログには、パスワードとメールアドレスを出力しません。

## Firebase管理画面で最優先に確認する項目

### 1. App CheckのAuthentication強制

現在の `js/security-config.js` は `appCheck.enabled: false` です。

Firebase Consoleの「App Check」でAuthenticationが **Enforced（強制）** になっている場合、App Checkトークンを付けない現在のゲームからの新規登録・ログイン要求が拒否されます。

どちらか一方を行ってください。

- App Checkの設定が完了するまでAuthenticationを **Unenforced（強制しない）** に戻す
- reCAPTCHA Enterpriseの正しいサイトキーを `js/security-config.js` に設定し、`enabled: true` にしてから公開する

### 2. Firebase APIキーのAPI制限

Google Cloud Consoleの「APIとサービス」→「認証情報」→ゲームで使用中のブラウザキーを開き、APIの許可一覧に次の2つが含まれていることを確認してください。

- Identity Toolkit API（`identitytoolkit.googleapis.com`）
- Token Service API（`securetoken.googleapis.com`）

どちらかを外すとFirebase Authenticationが正常に動きません。

### 3. メール／パスワード認証

Firebase Consoleの「Authentication」→「Sign-in method」で、メール／パスワードが有効になっていることを確認してください。

### 4. 承認済みドメイン

Firebase Consoleの「Authentication」→「Settings」→「Authorized domains」に、公開元のGitHub Pagesドメインが登録されていることを確認してください。

- `cadgosho-dot.github.io`

### 5. 確認メール設定

Firebase Consoleの「Authentication」→「Templates」で、メールアドレス確認メールの送信者名・件名・本文に不完全な設定がないか確認してください。

## v0.10.205公開後の見分け方

- 「アカウント作成は完了しました」と表示される場合：アカウント作成は成功し、確認メール送信だけが失敗しています。
- 新規登録画面のままエラーになる場合：アカウント作成要求自体が失敗しています。
- 開発者コンソールに `email-signup-create-account` が出る場合：App Check、APIキー制限、メール認証の有効化を優先確認します。
- 開発者コンソールに `email-signup-send-verification` が出る場合：確認メールテンプレート、送信上限、Firebase Authentication側の状態を優先確認します。
