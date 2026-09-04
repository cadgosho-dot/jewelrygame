export function formatLooseShapeLabel(shapeId, shapes) {
  return shapes[shapeId]?.name || shapeId || 'カット不明';
}
