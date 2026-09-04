// Pure mapping helpers for the craft surface-selection UI.
export function craftSurfaceParts(finishId = 'mirror') {
  switch (finishId) {
    case 'matte': return { base: 'matte', decorated: false };
    case 'decorated': return { base: null, decorated: true };
    case 'mirrorDecorated': return { base: 'mirror', decorated: true };
    case 'matteDecorated': return { base: 'matte', decorated: true };
    case 'mirror':
    default: return { base: 'mirror', decorated: false };
  }
}

export function craftSurfaceFinishId(base, decorated) {
  if (decorated && base === 'mirror') return 'mirrorDecorated';
  if (decorated && base === 'matte') return 'matteDecorated';
  if (decorated) return 'decorated';
  if (base === 'matte') return 'matte';
  return 'mirror';
}
