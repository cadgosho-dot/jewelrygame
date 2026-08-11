# JEWELRY×JEWELRY v0.10.638 実装メモ

## 変更内容
- g-Lab. の **カワハラ加工知識イベントに当選した時だけ**、会話開始前にユーザー提供動画 `1000020290.mp4` を再生するよう実装。
- 専用動画の配置先: `assets/videos/events/glab-kawahara-intro.mp4`
- カワハライベントの新規開始順: `video → intro1 → intro2 → intro3 → reward → farewell → g-Lab.`
- 動画終了時は自動で従来の最初のセリフへ進む。
- 動画が再生できない場合の「動画を再生する」ボタンと「MOVIEスキップ」を用意。
- カワハラ動画は元動画の音声を使用する。g-Lab. のBGM・環境音設定はイベント画面の従来仕様を維持。
- 既存の **g-Lab. 1/30 ランダム訪問動画イベントは変更なし**。カワハラ動画とは完全に別管理。
- イベント動画表示は既存の全画面containルールに追加し、横画面では縦幅基準、縦画面では横幅基準で全フレームを表示。余白は黒。

## バージョン同期
- `js/game-data.js`: 0.10.638
- `js/app.js`: UI build / dynamic import query 0.10.638
- `game.html`: styles/app query 0.10.638
- `sw.js`: cache version / query 0.10.638

## 変更ファイル
- `game.html`
- `js/app.js`
- `js/game-data.js`
- `sw.js`
- `assets/videos/events/glab-kawahara-intro.mp4`
