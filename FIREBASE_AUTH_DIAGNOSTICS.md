# JEWELRY×JEWELRY v0.10.262 Googleログイン診断・ブラウザ差対策

## 調査で確認したこと

「同じURLを別ブラウザへ貼り付けるとログインできた」という報告は、FirebaseプロジェクトやGoogleアカウント自体が完全に壊れている状態とは一致しません。
同じ公開URLでも、開いている環境が次のいずれかであるとGoogle認証の動作が変わります。

- ホーム画面へ追加したPWA
- LINE、Instagram、Facebook、Googleアプリ等のアプリ内ブラウザ
- ポップアップを制限するブラウザ
- ローカル保存またはタブ内保存を制限するプライバシーモード
- 認証前後のウィンドウ通信を制限するブラウザ設定

Firebase公式は、Firebase Hosting以外で公開したサイトのリダイレクト認証について、ブラウザのサードパーティストレージ制限の影響を受けるため、ポップアップ方式または認証ヘルパーの同一ドメイン化等が必要と説明しています。
本ゲームはGitHub Pagesのプロジェクトパスで公開しているため、Firebase Hosting用の`/__/auth/`を同一オリジン直下へ置く構成にはできません。v0.10.262では、公式に示されているポップアップ方式を最上位ページで使用しつつ、ブラウザ差への予備経路を追加しています。

## v0.10.262で追加した対策

### 1. 実行環境の判定

認証専用ページで次を判定します。

- 通常ブラウザ
- ホーム画面アプリ（standalone PWA）
- 主なアプリ内ブラウザ・WebView
- localStorageの利用可否
- sessionStorageの利用可否
- オンライン状態

ホーム画面アプリまたはアプリ内ブラウザでは、最初から「通常ブラウザで開く」と「URLをコピー」を表示します。

### 2. 通常ブラウザへの切替導線

Google画面を閉じても認証結果が45秒以内に戻らない場合、止まったままにせず次を表示します。

- 通常ブラウザで開く
- URLをコピー
- この画面でもう一度試す
- ログイン状態を再確認する

URLは現在の公開先から自動生成するため、リポジトリ名や公開URLをコードへ固定していません。

### 3. Google資格情報の一時引き継ぎ

`signInWithPopup()`が成功した場合、`GoogleAuthProvider.credentialFromResult()`で取得したGoogle IDトークンまたはアクセストークンを、同一タブの`sessionStorage`へ最大5分だけ保存します。

ゲーム本体側はFirebaseの永続ログインがまだ見えない場合だけ、この資格情報を`signInWithCredential()`で再交換します。

- URLへトークンを付けない
- localStorageへ長期保存しない
- 成功・失敗・期限切れの時点で削除する
- 既にログイン済みなら使用しない

これにより、認証専用ページでは成功したのに、画面遷移直後のゲーム側で一時的に未ログインと判定される問題を減らします。

### 4. 認証永続化のフォールバック

Firebase公式のブラウザ向け構成に合わせ、`indexedDBLocalPersistence`、`browserLocalPersistence`、`browserSessionPersistence`を候補として初期化します。
利用可能な保存方式をSDKが選択し、localStorageとsessionStorageの両方が使えない環境では、曖昧な待機状態にせず通常ブラウザへの切替を案内します。

### 5. Firebase JavaScript SDK更新

Firebase JavaScript SDKを`11.10.0`から`12.16.0`へ更新しました。
12.15.0では、HTTPリファラー制限付きAPIキーを支援するため、Authentication APIリクエストのリファラーポリシーが`strict-origin-when-cross-origin`へ更新されています。

### 6. iframe権限

ゲーム本体iframeへ`identity-credentials-get`を追加しました。
現在のGoogle認証は最上位の専用ページで行いますが、ブラウザのFedCM対応差を考慮した予防設定です。

## 採用しなかった方式

### signInWithRedirect

GitHub PagesはFirebase Hosting以外のホスティングであり、`authDomain`は`jewelrygame.firebaseapp.com`です。
Firebase公式によると、サードパーティストレージを制限するChrome、Firefox、Safariでリダイレクト認証を安定動作させるには、認証ヘルパーをアプリと同一ドメインにする等の追加構成が必要です。
そのため、単純に`signInWithRedirect()`へ変更するだけの対応は採用していません。

### GitHub Pages上でのFirebase認証ヘルパー自己ホスト

Firebase公式の自己ホスト方式は、`https://<app-domain>/__/auth/handler`へ応答できることが前提です。
現在の公開先はGitHub Pagesのプロジェクトサイトで、ゲームはドメイン直下ではなく`/jewelrygame/`以下にあります。`authDomain`にはパスを設定できないため、現状の公開構成のままではこの方式を正しく適用できません。

## 管理画面で確認が必要な項目

コードで吸収できない設定です。

### Firebase Authentication

- Authentication → Sign-in method → Google：有効
- Authentication → Settings → Authorized domains：`cadgosho-dot.github.io`

パスの`/jewelrygame/`は登録しません。

### Google Cloud APIキー

HTTPリファラー制限を使用する場合：

- `https://cadgosho-dot.github.io/*`

API制限を使用する場合、Firebase Authenticationが必要とするAPIを許可します。

### App Check

`js/security-config.js`では現在App Checkを無効にしています。
Firebase ConsoleでAuthenticationのApp Check強制だけを先に有効化すると、認証できない可能性があります。

## 公開後の確認手順

1. v0.10.262を公開する。
2. GitHub ActionsのPages公開完了を待つ。
3. ブラウザとPWAを完全終了する。
4. 通常ブラウザでURLを直接開き、Googleログインを確認する。
5. ホーム画面アプリからも試す。
6. 止まる場合は認証画面の「通常ブラウザで開く」を押す。
7. 認証画面に表示されたエラーコード、公開元、環境表示を記録する。

## 残る制約

GitHub Pages側では任意のHTTPレスポンスヘッダーやリバースプロキシを設定できません。
したがって、すべてのアプリ内ブラウザでGoogleポップアップを強制的に成功させることはできません。
v0.10.262では、対応できないブラウザを検出またはタイムアウトで判定し、通常ブラウザへ移してゲームを続けられる経路を標準機能として用意しています。
