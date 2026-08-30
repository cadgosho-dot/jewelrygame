JEWELRY×JEWELRY v0.10.814 累積更新データ

対象:
  - v0.10.811
  - v0.10.813

更新内容:
  1. 「お菓子大好き」の画像をユーザー提供の正式画像へ差し替え（v0.10.813分を含む）
  2. 熱帯魚屋の「魚 / 水草 / ディスプレイ」をスクロール中も固定表示
  3. 左右スワイプでもカテゴリ切替可能
  4. 入店時・カテゴリ切替時に一覧を先頭へ戻す
  5. スマホ縦横の2段ヘッダーと商品一覧の余白競合を修正
  6. 専用回帰検査を追加

推奨適用方法:
  1. このZIPを展開する
  2. ゲーム本体フォルダをバックアップする
  3. ターミナルでこの更新フォルダへ移動する
  4. 次を実行する
       python APPLY_UPDATE.py /path/to/jewelrygame
  5. 次を実行する
       python VERIFY_UPDATE.py /path/to/jewelrygame
  6. ゲーム本体側で総合監査する
       cd /path/to/jewelrygame
       python scripts/check-current.py
  7. CURRENT BUILD AUDIT: PASS を確認してGitHubへcommit/pushする

手動適用:
  FILESフォルダの中身を、ゲーム本体の同じ相対パスへ上書きしてください。
  DELETE_FILES.txt に記載された旧資料が残っている場合だけ削除してください。

注意:
  - セーブ形式 SAVE_SCHEMA_VERSION は変更していません。
  - プレイヤーのセーブデータを削除する処理はありません。
  - assets/images/events/oyatsu-daisuki.png はユーザー提供画像の実データをそのまま収録しています。
