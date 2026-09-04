const GAME_DATE_WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatGameDateLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${GAME_DATE_WEEKDAYS[date.getDay()]}）`;
}
