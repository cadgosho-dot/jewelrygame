# Jewelife v0.1.0

宝石を採掘し、加工・販売するジュエリーシミュレーションゲームの初期実装です。  
スマートフォンを主対象にしつつ、パソコンでも動作するPWA（プログレッシブウェブアプリ）です。

公開予定URL: `https://cadgosho-dot.github.io/jewelife/`

## この版に実装されているもの

- Googleログイン
- メールリンク認証
- Firebase Cloud Firestoreによるクラウド自動セーブ
- スマートフォン・パソコン間のセーブ共有
- 同一アカウントの同時操作防止
- プレイヤー名入力と主人公カスタマイズ
- メイン画面中央のシステムボタン
- 全画面共通ヘッダー（日付・曜日・時刻・所持金・天気・プレイヤー）
- 9:00開始、21:00終了の行動時間制
- 御徒町とg-Lab.の営業時間・休業日判定
- 河原・山道・浅い鉱山の採掘
- 暫定採掘ミニゲーム
- 工房の保管機能
- 通常収納20枠
- ルースボックス10石
- 地金金庫（Pt100g・Gold100g・Silver1000g）
- ジュエリーボックス20点
- g-Lab.での道具・収納・加工設備購入
- 設備購入後の原石カット・簡易ジュエリー作成
- 御徒町の素材屋で原石・地金を売却
- スマホ（プロフィール・通知・カレンダー・g--gle.・スマホゲーム・AI）
- AI相談用の全ゲームデータコピー
- 寝る・1日の結果・翌日9:00への進行
- 収支履歴・折れ線グラフ
- BGM・環境音・効果音・バイブレーション
- 時間帯・天気による背景演出
- PWA用マニフェスト・Service Worker・ホーム画面追加

## まだ実装していないもの

- 本格的な採掘ミニゲーム（この版は暫定方式）
- 店舗物件の契約・開業
- ショーケースとレジの設置
- 接客・顧客自動生成・リピーター
- 店舗評価
- アルバイト・人材紹介
- 外注
- ルース屋・ジュエリー店・空枠屋・キャスト屋・不動産屋
- 本格的なジュエリーデザイン作成ミニゲーム

未実装機能は、ゲーム内で「まだ利用できません」と表示されます。g--gle.には実装済み機能だけが表示されます。

---

# 公開前に必要な設定

## 1. GitHubへアップロード

1. GitHubの `cadgosho-dot` アカウントで `jewelife` リポジトリを作成します。
2. このZIP内のファイルを、フォルダごとリポジトリ直下へアップロードします。
3. GitHubの **Settings → Pages** を開きます。
4. Branchを `main`、フォルダを `/ (root)` にして保存します。
5. 公開後のURLは `https://cadgosho-dot.github.io/jewelife/` です。

## 2. Firebaseプロジェクトを作成

1. Firebase Consoleで新規プロジェクトを作成します。
2. プロジェクトIDは `jewelife-cadgosho` を使用します（空いていない場合は別名で構いません）。
3. Webアプリを追加します。
4. 表示されたFirebase設定値を `js/firebase-config.js` に貼り付けます。

変更する項目:

```js
export const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
};
```

## 3. Authenticationを設定

Firebase Consoleの **Authentication → Sign-in method** で次を有効にします。

- Google
- Email link（パスワードなしメールリンク認証）

Authenticationの承認済みドメインに次を追加します。

- `cadgosho-dot.github.io`
- 開発時のみ `localhost`

メールリンクの遷移先は `https://cadgosho-dot.github.io/jewelife/` です。

## 4. Cloud Firestoreを設定

1. Cloud Firestoreを作成します。
2. 保存地域は東京を選びます。
3. Firebase ConsoleのFirestoreルールへ、同梱の `firestore.rules` の内容を貼り付けて公開します。

ゲームデータは各ユーザーの `users/{uid}` に保存され、履歴は `users/{uid}/history` に保存されます。

## 5. 現実の地金相場を自動更新する場合

初期状態では `assets/data/metal-prices.json` にサンプル値が入っています。  
GitHub ActionsとGoldAPI.ioを使って平日に自動更新できるファイルを同梱しています。

1. GoldAPI.ioでAPIキーを取得します。
2. GitHubリポジトリの **Settings → Secrets and variables → Actions** を開きます。
3. `GOLDAPI_KEY` という名前でAPIキーを登録します。
4. **Actions → Update metal prices → Run workflow** を一度実行します。

その後は平日に自動で `assets/data/metal-prices.json` が更新されます。

APIを使わない場合でもゲームは動作しますが、素材屋にはサンプル相場が表示されます。

---

# PWAについて

- `manifest.webmanifest` と `sw.js` は設定済みです。
- Androidではブラウザメニューから「ホーム画面に追加」できます。
- iPhoneではSafariの共有メニューから「ホーム画面に追加」できます。
- 画面の向きは縦・横の両方に対応し、向きに応じて自動レイアウトされます。
- アプリの画面素材はキャッシュされますが、Jewelifeはログインとクラウドセーブを使用するため、ゲーム操作にはインターネット接続が必要です。

## 開発用UI確認モード

Firebase設定前にローカルで画面だけ確認する場合:

```text
http://localhost:8000/?preview=1
```

例:

```bash
python -m http.server 8000
```

この確認モードは `localhost` または `127.0.0.1` でのみ使用でき、GitHub Pages上では利用できません。公開版にゲストプレイはありません。

---

# 画像・音声

- ユーザー提供画像を各画面の正式背景として組み込んでいます。
- 画像内に操作ボタンは描き込まず、HTML/CSSの実際に押せるシステムボタンを重ねています。
- BGM・環境音・効果音は、この初期版用に生成したオリジナル音源です。
- 設定画面でBGM・環境音・効果音を個別調整・ミュートできます。

# 主なファイル

```text
index.html                    ゲーム起動ページ
styles.css                    全画面UI・レスポンシブ表示
js/app.js                     ゲーム本体
js/game-data.js               ゲーム設定・初期データ・ヘルプ
js/firebase-service.js        ログイン・クラウドセーブ
js/firebase-config.js         Firebaseと地金相場の設定
manifest.webmanifest          PWA設定
sw.js                         PWAキャッシュ
firestore.rules               Firestoreセキュリティルール
assets/images/                画面背景画像
assets/audio/                 BGM・環境音・効果音
.github/workflows/            地金相場自動更新
```

# 更新時の注意

`sw.js` の `CACHE_NAME` を変更すると、PWAに新しいファイルが反映されやすくなります。  
例: `jewelife-v0.1.0` → `jewelife-v0.1.1`
