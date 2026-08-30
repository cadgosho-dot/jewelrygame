JEWELRY×JEWELRY
GitHub Desktop 更新データ
作成日: 2026-08-23

【最重要】
このZIPは「現在のGitHub DesktopでPullした最新リポジトリ」に対して使う差分データです。
古い game.html / app.js を丸ごと上書きしないでください。

基準として確認済みの remote main:
23f929d0a529fd4417b9252b886b0c3ff139fd1a

今回の最終目標:
1. 3Dメガネの最新透明PNGを「思い出」と「イベント本編」の両方で使用
2. ストーリーテラーの最新透明PNGを「思い出」と「イベント本編」の両方で使用
3. 彩度・タッチ・色味は変更しない
4. 背景透明PNGのまま使用
5. 以前のv750一時的なdata URI上書き方式を整理し、通常のassets参照に統一
6. 3Dメガネ縦画面の旧Android/WebView互換修正(v0.10.749)は維持
7. 思い出背景・カワハラ判定などv0.10.748までの変更を壊さない

【おすすめ手順】
1. GitHub Desktopで cadgosho-dot/jewelrygame を開く
2. Fetch origin / Pull origin で最新mainにする
3. 念のため現在の変更がないことを確認
4. このフォルダをリポジトリ外に置く
5. リポジトリのルートをターミナルで開く
6. 以下を実行
   python "<このフォルダ>/scripts/apply_update.py"
7. GitHub DesktopでChangesを確認
8. 次を確認してからCommit
   - js/app.js
   - js/memories-screen.js
   - js/game-data.js
   - game.html
   - index.html
   - sw.js
   - hosting-origin-guard.js
   - assets/images/events/loose-shop-original-quiz-v751.png
   - assets/images/events/storyteller-v751.png
9. Commit例:
   v0.10.751 3Dメガネとストーリーテラー画像を最新化
10. Push origin

【注意】
以前作成された /mnt/data/jxj_v0.10.751_patch_only/game.html は
v0.10.737系のローカル基準から作られたため、
現在のmainへ丸ごと上書きする用途には使用しません。
この新しい更新データの apply_update.py を使用してください。
