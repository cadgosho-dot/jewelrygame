import assert from 'node:assert/strict';
import { renderToolBriefMarkup } from '../js/ui/tool-brief.js';

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function legacyRenderToolBrief(tool, guideAction = 'glab-tool-guide') {
  const description = String(tool?.description || '').trim();
  const detail = String(tool?.detail || '').trim();
  return `<section class="tool-brief-card">
    ${description ? `<p>${esc(description)}</p>` : ''}
    ${detail && detail !== description ? `<p class="tool-brief-sub">${esc(detail)}</p>` : ''}
    <div class="tool-brief-actions">
      <button class="secondary-button tool-inline-guide-button" data-action="${esc(guideAction)}" data-id="${esc(tool.id)}">詳しい説明を見る</button>
    </div>
  </section>`;
}

const cases = [
  [{ id: 'file-01', description: ' 基本説明 ', detail: '補足説明' }, undefined],
  [{ id: 'same', description: '同じ説明', detail: '同じ説明' }, 'workshop-tool-guide'],
  [{ id: '<tool&1>', description: '<強調>&説明', detail: '"補足" & 詳細' }, 'guide&action'],
  [{ id: 'empty', description: '', detail: '詳細だけ' }, 'glab-tool-guide'],
];

for (const [tool, guideAction] of cases) {
  const expected = guideAction === undefined
    ? legacyRenderToolBrief(tool)
    : legacyRenderToolBrief(tool, guideAction);
  const actual = guideAction === undefined
    ? renderToolBriefMarkup(tool, 'glab-tool-guide', esc)
    : renderToolBriefMarkup(tool, guideAction, esc);
  assert.equal(actual, expected, `tool brief mismatch: ${tool.id}`);
}

assert.match(renderToolBriefMarkup({ id: '<id>', description: '<x>', detail: '<y>' }, 'a&b', esc), /&lt;x&gt;/);
assert.match(renderToolBriefMarkup({ id: '<id>', description: '<x>', detail: '<y>' }, 'a&b', esc), /data-action="a&amp;b"/);
assert.match(renderToolBriefMarkup({ id: '<id>', description: '<x>', detail: '<y>' }, 'a&b', esc), /data-id="&lt;id&gt;"/);

console.log('TOOL BRIEF TEST: PASS');
