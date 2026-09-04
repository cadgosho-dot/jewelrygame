// Pure display formatter for workshop-staff quality probabilities.
export function formatWorkshopStaffQualityDescription(definition) {
  const good = Math.round((Number(definition?.goodChance) || 0) * 100);
  const premium = Math.round((Number(definition?.premiumChance) || 0) * 100);
  if (!good && !premium) return '品質：標準のみ';
  return `品質：良品${good}%${premium ? `・上質${premium}%` : ''}`;
}
