export function formatBirthdayJapaneseLabel(birthday) {
  if (!birthday) return '';
  return `${Number(birthday.slice(0, 2))}月${Number(birthday.slice(3, 5))}日`;
}
