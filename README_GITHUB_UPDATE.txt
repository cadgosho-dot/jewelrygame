JEWELRY×JEWELRY GitHub 一括更新データ

対象: GitHub main v0.10.799 → v0.10.811
このパッケージには、このチャットで行った v0.10.800〜v0.10.811 の変更を最終状態へ統合してあります。

推奨手順
1. GitHubリポジトリ jewelrygame の main が v0.10.799 であることを確認する。
2. リポジトリをローカルへ取得し、未コミット変更がないことを確認する。
3. このZIPを展開する。
4. リポジトリの親フォルダ等から以下を実行する。
   python3 apply_update.py /path/to/jewelrygame
5. リポジトリ内で以下を確認する。
   python3 scripts/version-sync.py --check
   python3 scripts/check-current.py
6. VERSION が 0.10.811 であることを確認し、GitHubへcommit/pushする。

注意
- PATCH_FILES/ は上書き・新規追加する最終ファイルです。
- DELETE_FILES.txt は削除対象です。履歴資料の移動も含むため、削除だけを省略しないでください。
- apply_update.py は VERSION=0.10.799 のリポジトリだけを対象にします。
- ゲームのセーブデータそのものはこの更新ZIPには含まれません。
