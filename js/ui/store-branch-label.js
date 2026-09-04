// Pure presentation helper for store branch number labels.
export function formatStoreBranchLabel(number = 1) {
  const branchNumber = Math.max(1, Number(number) || 1);
  return `店舗${branchNumber}`;
}
