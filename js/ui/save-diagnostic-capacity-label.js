export function formatSaveDiagnosticCapacityLabel(projectedCount, maxCount) {
  if (maxCount <= 0) return '確認不能';
  if (projectedCount > maxCount) return 'クラウド上限超過';
  if (projectedCount === maxCount) return '上限付近';
  if (projectedCount >= Math.ceil(maxCount * 0.8)) return '注意';
  return '余裕あり';
}
