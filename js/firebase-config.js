// Firebaseコンソール > プロジェクト設定 > マイアプリ > SDKの設定と構成
// に表示される値へ置き換えてください。
export const firebaseConfig = {
  apiKey: 'AIzaSyCxuJaHMK7fHuuK0QEmIiNlNT81dI81Qsw',
  authDomain: 'jewelrygame.firebaseapp.com',
  projectId: 'jewelrygame',
  storageBucket: 'jewelrygame.firebasestorage.app',
  messagingSenderId: '87277704756',
  appId: '1:87277704756:web:96daef44c12c7cdc099c61',
};

export const METAL_PRICE_ENDPOINT = './assets/data/metal-prices.json';
// 任意: JSONを返すHTTPSエンドポイント。例:
// { "platinum": 5500, "gold": 16000, "silver": 180, "source": "...", "fetchedAt": "..." }
// 単位は円/g。未設定時はゲーム内参考値を使用します。
