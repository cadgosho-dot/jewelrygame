# v0.10.666 実装メモ

## 実機診断の基準値（v0.10.665）
- HTML開始→タイトル: 4.62秒
- Firebase初期化: 2.48秒
- クラウドセーブ: 843ms
- セッション取得: 485ms
- スタート→メイン: 129ms
- Firebase Auth iframe: 1.73秒

## 変更
1. Firebase Authの`initializeAuth()`で`popupRedirectResolver`を通常起動時に無効化。Googleアカウント削除の再認証時だけ`browserPopupRedirectResolver`を渡す。
2. `loadState()`と`claimSession()`を並列開始。
3. 起動直後の`loadMetalMarket()`を削除。地金屋画面遷移時の既存lazy loadは維持。
4. Service Workerの明示`registration.update()`をidle/遅延実行。
5. Service WorkerのCORE_SHELLから大型イベント画像・クイズJSON（合計19,959,333 bytes）を除外。これらは既存fetch handlerで初回利用時にランタイムキャッシュする。

## 非変更
- セーブ選択ルール、クラウド/ローカル優先判定
- セッション排他、heartbeat、watchSession
- Google資格情報handoff
- Emailログイン/登録
- ゲームUI、イベント、価格、確率、バランス
- 工房・店舗の表示修正
