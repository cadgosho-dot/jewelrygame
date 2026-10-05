export const PURPLE_CAPSULE_ITEM_ID = 'purpleCapsule';
export const PURPLE_CAPSULE_REQUIRED_MINUTES = 180;
export const PURPLE_CAPSULE_DAY_END_MINUTES = 22 * 60;
export const PURPLE_CAPSULE_BLOCK_MESSAGE = '今日はこれは使わずに寝たほうがいいです';

export function canUsePurpleCapsule({ minutes = 0, count = 0 } = {}) {
  const currentMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
  const owned = Math.max(0, Math.floor(Number(count) || 0));
  const remainingMinutes = Math.max(0, PURPLE_CAPSULE_DAY_END_MINUTES - currentMinutes);
  if (owned <= 0) return { ok:false, reason:'no-item', remainingMinutes };
  if (remainingMinutes < PURPLE_CAPSULE_REQUIRED_MINUTES) {
    return { ok:false, reason:'insufficient-time', remainingMinutes, message:PURPLE_CAPSULE_BLOCK_MESSAGE };
  }
  return { ok:true, remainingMinutes };
}

export function purpleCapsuleBluesmanLines(name = 'あなた') {
  const playerName = String(name || '').trim() || 'あなた';
  return [
    `「おう、、また来たな！${playerName}様々！、、、、いっつもこの店はオマエのブルースで盛り上がってるぜ！、、、」`,
    '「サイコーだぜ、まったく！、オマエはサイコー！、、、」',
    '「今日も好きなだけ楽しんでってくれよな、兄弟！、、、、、」',
  ];
}
