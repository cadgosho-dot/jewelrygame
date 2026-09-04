export function formatPhoneItemEffectText(item, beforeHunger, afterHunger) {
  if (Number(item?.effect?.hunger) > 0) return `空腹度 ${beforeHunger} → ${afterHunger}`;
  return '効果が発動しました。';
}
