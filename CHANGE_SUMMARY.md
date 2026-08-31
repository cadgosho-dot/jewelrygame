# JEWELRY×JEWELRY 未公開実装まとめ

基準は **v0.10.814** です。今回のデータでは正式なバージョン番号を上げず、GitHub更新も行いません。

## 1. 水槽・縦画面中央配置

`assets/minigames/aquarium/index.html`

スマートフォン縦画面の旧指定:

```css
@media(max-width:640px){.app{justify-content:flex-start;padding-top:3vh}}
```

を次へ変更:

```css
@media(max-width:640px){.app{justify-content:center;padding-top:0}}
```

これにより水槽＋「観察する」操作領域を縦画面の中央基準へ移し、横画面専用ルールは維持します。

## 2. プレゼント取消の確定操作

`js/app.js`

確認モーダルは `modalEl` に独立したクリックハンドラを持っています。通常画面側には `gift-cancel-confirm` が存在していましたが、確認モーダル側の `switch (action)` には存在しなかったため、確定ボタンのタップは検知しても処理されませんでした。

モーダル側へ次の処理を追加しています。

```js
case 'gift-cancel-confirm': {
  const code = screenData.giftCancelCode || '';
  closeModal();
  await cancelGift(code);
  break;
}
```

## 3. 回帰検査

- `scripts/check-aquarium-portrait-center.py`
- `scripts/check-gift-cancel-modal.py`
- `scripts/check-current.py` へ両検査を登録

## 4. 未実施

- VERSION変更
- Service Workerのバージョン更新
- GitHub commit / push
- GitHub Pages公開

これらは次のまとめ更新時に行います。
