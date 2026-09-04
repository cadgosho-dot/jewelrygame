// Pure display labels for the gift UI. Game state, inventory and gift processing stay in app.js.
const CATEGORY_LABELS = Object.freeze({
  rough: '原石',
  loose: 'ルース',
  item: 'アイテム',
  metal: '地金',
  jewelry: '完成品',
});

const STATUS_LABELS = Object.freeze({
  pending: '未受取',
  claimed: '受取済み',
  cancelled: '取消済み',
});

export function giftCategoryLabel(category) {
  return CATEGORY_LABELS[category] || 'プレゼント';
}

export function giftStatusLabel(status) {
  return STATUS_LABELS[status] || status || '不明';
}
