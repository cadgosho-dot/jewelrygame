export function formatLooseDisplayLabel(gemId, gemName, shapeLabel, { suffix = false } = {}) {
  if (gemId === 'pearl') return `${gemName}${suffix ? 'ルース' : ''}`;
  return `${gemName}・${shapeLabel}${suffix ? 'ルース' : ''}`;
}
