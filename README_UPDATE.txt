JEWELRY×JEWELRY 更新データ

対象: v0.10.811
更新後: v0.10.813
目的: 「お菓子大好き」の破損画像を、ユーザー提供の正式画像へ差し替え。

重要:
- assets/images/events/oyatsu-daisuki.png は、今回ユーザーが渡した 1000020869.png の実データをそのまま収録しています。
- 画像を再生成・再描画していません。
- 画像SHA-256: 13d8ec2951232e47ca9167fdedec8b369da1ec93549aadd8df7233fff7217e1a
- 画像サイズ: 384,674 bytes

適用方法（おすすめ）:
1. このフォルダを展開する。
2. ターミナルでゲームのリポジトリ直下へ移動する。
3. python <この更新フォルダ>/APPLY_UPDATE.py <ゲームのリポジトリ直下>
4. ゲーム側で python scripts/version-sync.py
5. python scripts/check-current.py
6. CURRENT BUILD AUDIT: PASS を確認する。
7. git add -A
8. git commit -m "Fix Oyatsu Daisuki memory image v0.10.813"
9. git push origin main

手動適用:
- FILES フォルダの中身を、ゲームリポジトリ直下へ同じ階層で上書きしても構いません。
- 適用前 VERSION は 0.10.811 を前提としています。

注意:
- v0.10.812 は今回の途中作業版で、GitHub main には正式公開していません。
- 正式な次の公開版として v0.10.813 を使用します。
