// Pure presentation helper for the shared workshop/g-Lab tool brief card.
export function renderToolBriefMarkup(tool, guideAction = 'glab-tool-guide', escapeHtml) {
  const description = String(tool?.description || '').trim();
  const detail = String(tool?.detail || '').trim();
  const esc = escapeHtml;
  return `<section class="tool-brief-card">
    ${description ? `<p>${esc(description)}</p>` : ''}
    ${detail && detail !== description ? `<p class="tool-brief-sub">${esc(detail)}</p>` : ''}
    <div class="tool-brief-actions">
      <button class="secondary-button tool-inline-guide-button" data-action="${esc(guideAction)}" data-id="${esc(tool.id)}">詳しい説明を見る</button>
    </div>
  </section>`;
}
