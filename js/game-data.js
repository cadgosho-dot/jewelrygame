// v0.10.732: 正式版のバージョン入口。
// 大容量の既存ゲームデータ本体は game-data-core.js に保持し、内容を変更せず再利用する。
import * as core from './game-data-core.js';

export const VERSION = '0.10.732';
export * from './game-data-core.js';

// 本体側のVERSION依存箇所だけ、732の保存バージョンとして整合させる。
export function initialState(...args) {
  const state = core.initialState(...args);
  if (state && typeof state === 'object') state.version = VERSION;
  return state;
}

export function migrateState(saved) {
  let source = saved;
  // 既存本体は731を基準にした移行条件を持つため、732保存データを再読込する際は
  // 不要な再移行を起こさないよう内部判定だけ731相当として扱う。
  if (saved && typeof saved === 'object' && saved.version === VERSION) {
    source = structuredClone(saved);
    source.version = '0.10.731';
  }
  const state = core.migrateState(source);
  if (state && typeof state === 'object') state.version = VERSION;
  return state;
}
