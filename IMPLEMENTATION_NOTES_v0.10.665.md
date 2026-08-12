# v0.10.665 実装メモ

## 目的
起動高速化に着手する前に、実際のAndroid/PWA環境でボトルネックを数値化する。

## 実装
- `game.html` のCSP許可済みnonce付き最小スクリプトで、モジュール読み込み前の `performance.now()` を記録。
- `js/app.js` で起動工程へ計測マーカーを追加。
- Firebase初期化、認証状態確定、クラウドセーブ取得、端末/クラウド比較、セッション取得、必要時の端末セーブ同期を別々に記録。
- スタートボタン押下後は、`loadGame()` と `processAutopilotIfDue()` を別々に記録し、メイン画面表示までの時間を取得。
- Performance Navigation Timing / Resource Timingから、HTMLロードと起動時の遅いリソースを記録。
- `navigator.connection`、`hardwareConcurrency`、`deviceMemory` が利用可能な端末では参考値を記録。
- 診断データにはメールアドレス、UID、セーブ内容、所持金などのゲーム個人データを含めない。
- 設定画面に「起動診断」を追加し、全文をクリップボードへコピー可能。

## 非変更
- Firebaseの初期化順・認証順・クラウドセーブ取得順。
- `loadState()` → `claimSession()` の直列順。
- ローカルセーブが新しい場合のクラウド同期。
- `loadMetalMarket()` の起動時呼び出し。
- Service Workerの `register()` → `update()` の順。
- ゲームバランス、イベント、UI配置、セーブスキーマ。

この版では高速化そのものは行わず、v0.10.666以降の改善前ベースラインを取得する。
