// Pure display formatter for loose names shown in the workshop.
export function formatWorkshopLooseDisplayName(gem, shape) {
  if (!gem) return 'ルース';
  if (gem.originalLoose) return gem.name;
  if (gem.id === 'pearl') return gem.name;
  return `${gem.name}・${shape?.name || ''}`;
}
