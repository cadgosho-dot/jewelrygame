// Firebaseコンソール > プロジェクト設定 > マイアプリ > SDKの設定と構成
// に表示される値へ置き換えてください。
export const firebaseConfig = {
  apiKey: 'PASTE_FIREBASE_API_KEY',
  authDomain: 'jewelife-cadgosho.firebaseapp.com',
  projectId: 'jewelife-cadgosho',
  storageBucket: 'jewelife-cadgosho.firebasestorage.app',
  messagingSenderId: 'PASTE_MESSAGING_SENDER_ID',
  appId: 'PASTE_FIREBASE_APP_ID',
};

export const METAL_PRICE_ENDPOINT = './assets/data/metal-prices.json';
// 任意: JSONを返すHTTPSエンドポイント。例:
// { "platinum": 5500, "gold": 16000, "silver": 180, "source": "...", "fetchedAt": "..." }
// 単位は円/g。未設定時はゲーム内参考値を使用します。
