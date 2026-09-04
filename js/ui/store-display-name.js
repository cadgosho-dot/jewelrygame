export function formatStoreDisplayName(name) {
  const value = String(name || '').trim();
  return value || '店舗';
}
