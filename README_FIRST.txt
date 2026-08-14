JEWELRY×JEWELRY 更新まとめパッケージ
作成日: 2026-08-14

【このパッケージの目的】
このチャットで進めた更新内容を、GitHub Desktop で反映しやすいように 1 個にまとめたものです。

【内容】
1. project_latest/
   - 現時点での最新実装済みプロジェクト一式です。
   - ベースは jxj700 です。
   - これをそのまま作業中のリポジトリへ上書きコピーしてください。

2. post_jxj700_approved_checks/
   - jxj700 作成後に確認・調整した「承認済みイベント確認HTML」です。
   - 以下の 2 件を入れています。
     a. JEWELRYxJEWELRY_MOBILE_CHECK_OKACHIMACHI_INVASIVE_TURTLES_v0_10_700_REAL_ASSETS_VIDEO_UI_FIX2.html
     b. JEWELRYxJEWELRY_MOBILE_CHECK_WRIST_FOUND_v0_10_701_REAL_ASSETS_DARK_AUDIO_FIX6.html
   - これらは単体確認用HTMLです。必要に応じて project_latest 側へ内容を移植してください。

【推奨手順】
1) まず project_latest/ の中身を GitHub Desktop で管理しているローカルリポジトリへ上書き
2) 動作確認
3) その後、post_jxj700_approved_checks/ の 2 イベントを参照しながら本体へ組み込み
4) GitHub Desktop で差分確認 → commit → push

【このチャットで確定した共通ルール（実装時メモ）】
- キャラクター画像は透けさせない
- 輪郭トリミング時は髪や黒い服を誤認識しない
- 背景不要PNGは透明背景で使う
- 横画面の下部セリフバーは「画面横いっぱい」を使う
- 下部セリフバーは下詰め
- 枠内は透明感を維持し、不要な塗りつぶしをしない
- MOVIEスキップボタンは全イベント共通で右上寄せ・小さめ表示
- イベント終了ボタンも小さめ表示
- 動画イベントは横画面で縦方向最大表示を優先
- 手首イベントは暗いBGM・環境音・効果音を使う

【補足】
- 重複を避けるため、ベース実装は最新一式 (project_latest) のみ同梱しています。
- 途中版や古い差し替えファイルは入れていません。
