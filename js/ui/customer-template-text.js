export function formatCustomerTemplateText(template, itemLabel = 'ジュエリー') {
  return String(template || '').replace(/\{item\}/g, itemLabel);
}
