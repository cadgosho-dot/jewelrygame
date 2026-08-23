// v0.10.752: 正式版のバージョン入口。
// 大容量の既存ゲームデータ本体は game-data-core.js に保持し、内容を変更せず再利用する。
import * as core from './game-data-core.js';

export const VERSION = '0.10.752';
export * from './game-data-core.js';

// 本体側のVERSION依存箇所だけ、752の保存バージョンとして整合させる。
export function initialState(...args) {
  const state = core.initialState(...args);
  if (state && typeof state === 'object') state.version = VERSION;
  return state;
}

export function migrateState(saved) {
  let source = saved;

  // v0.10.732 hotfix:
  // 「おやつ大好き」アイスルートで、食事中に再読込・アプリ復帰が入ると
  // 食事完了用の実行中処理だけが失われ、保存状態が iceEating のまま残ることがある。
  // 食事代・1時間・空腹回復は再実行せず、御徒町へ戻るフェードから安全に再開する。
  const savedOyatsu = saved?.events?.oyatsuDaisukiEvent;
  if (saved && typeof saved === 'object' && savedOyatsu?.active && savedOyatsu?.stage === 'iceEating') {
    source = structuredClone(saved);
    source.events.oyatsuDaisukiEvent.stage = 'iceFade';
  }

  const state = core.migrateState(source);
  if (state && typeof state === 'object') state.version = VERSION;
  return state;
}
