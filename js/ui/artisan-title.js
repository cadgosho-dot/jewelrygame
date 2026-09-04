export function formatArtisanTitle(level, titles) {
  const value = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
  return titles[value] || titles[1];
}
