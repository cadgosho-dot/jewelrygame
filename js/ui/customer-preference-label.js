export function formatCustomerPreferenceLabel(preference = {}, resolvedName = '') {
  if (preference?.label) return String(preference.label);
  if (preference?.type === 'metal') return resolvedName || '地金指定';
  if (preference?.type === 'design') return resolvedName || 'デザイン指定';
  if (preference?.type === 'color') return String(preference?.value || '色指定');
  return resolvedName || '石指定';
}
