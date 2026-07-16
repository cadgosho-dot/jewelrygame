# JEWELRY×JEWELRY v0.10.39 公開前セキュリティ設定

このZIPには、コードだけで実装できる安全対策を反映済みです。下記の管理画面設定は、川原さんのGitHub・Firebase管理権限が必要なため、初回のみ手動で行ってください。

## 1. GitHubアカウント

1. GitHubの Settings → Password and authentication を開く。
2. Two-factor authentication を有効化する。認証アプリまたはパスキーを使用する。
3. Recovery codesを紙または安全なパスワード管理アプリに保存する。
4. リポジトリ jewelrygame → Settings → Rules → Rulesets → New branch ruleset。
5. 対象ブランチを main にし、Restrict deletions と Block force pushes を有効化する。
6. GitHub Desktopから直接更新を続ける場合は「Require a pull request」は有効にしない。

## 2. Firebase App Check（課金先を登録しない無料運用）

1. Google CloudでreCAPTCHA Enterpriseのサイトキーを作成する。ドメインは `cadgosho-dot.github.io`。
2. **Essentialsを使用し、Google Cloudの請求先・クレジットカードをこのプロジェクトへ登録しない。** Essentialsは組織全体で月10,000 assessmentsまで無料。
3. Firebase Console → App Check → WebアプリをreCAPTCHA Enterpriseで登録する。
4. App CheckトークンのTTLは、無料枠を長く保つため最初は**7日**にする。短いTTLほど安全性は少し上がる一方、assessment回数が増える。
5. 取得した公開site keyを `js/security-config.js` の `siteKey` へ貼り、`enabled: true` にする。site keyは公開情報で、秘密鍵ではない。
6. GitHubへ公開後、App CheckのメトリクスとreCAPTCHA使用量を確認する。月10,000回へ近づいた場合は、課金先を追加せず、Enforceを一時解除して利用不能を防ぐ。
7. 正規リクエストが確認できてから、FirestoreとAuthenticationのEnforceを有効化する。最初からEnforceを有効にしない。

## 3. Firebase APIキー

1. Google Cloud Console → APIs & Services → Credentials。
2. `Browser key (auto created by Firebase)` を開く。
3. API restrictionsがFirebase関連APIだけになっていることを確認し、Generative Language APIなど不要なAPIを含めない。
4. Application restrictionsをHTTP referrersにし、`https://cadgosho-dot.github.io/*` を登録する。
5. ローカル確認が必要な期間だけ `http://localhost/*` を追加し、公開確認後は削除する。

## 4. Firebase Authentication

1. Firebase Console → Authentication → Settings → Password policy。
2. Minimum lengthを10、EnforcementをRequireにする。既存の短いパスワード利用者がいる場合は、最初はNotifyで確認してからRequireへ変更する。
3. Authentication → Settings → User actions → Email enumeration protectionを有効化する。
4. Authentication → Templatesで、メール確認とパスワード再設定メールの送信者名・本文を確認する。

## 5. Firestore Rules

このZIPの `firestore.rules` をFirebaseへ反映する。**メール確認済みで、ログイン中の本人UIDと一致する場合だけ**読み書きできる設定です。

## v0.10.39で実装済み

- iframeの不要なclipboard-read権限を削除。
- Content Security Policyを追加。
- 新規メールパスワードを10文字以上に変更。
- メール確認が完了するまでゲームを開始できないよう変更。
- 確認メール再送とパスワード再設定を追加。
- ゲームデータ削除とFirebaseアカウント完全削除を分離。
- アカウント完全削除時にGoogleまたはパスワードで再認証。
- 音源と大容量画像を利用時に読み込む方式へ変更。
- バックグラウンド中は音と定期通信を停止。
- App Checkを安全に有効化できる設定ファイルを追加。
