// Pure display-name helper for rough gemstones.
export function formatRoughDisplayName(id, gems) {
  const gem = gems[id];
  return gem?.roughName || (gem ? `${gem.name}原石` : '原石');
}
