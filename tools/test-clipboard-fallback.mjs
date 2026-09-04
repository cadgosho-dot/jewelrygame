import assert from 'node:assert/strict';
import { fallbackCopyText } from '../js/ui/clipboard-fallback.js';

function createHarness({ commandResult = true, commandThrows = false } = {}) {
  const appended = [];
  const calls = [];
  const textarea = {
    value: '',
    attributes: {},
    style: {},
    removed: false,
    selected: false,
    selectionRange: null,
    setAttribute(name, value) { this.attributes[name] = String(value); },
    select() { this.selected = true; },
    setSelectionRange(start, end) { this.selectionRange = [start, end]; },
    remove() { this.removed = true; },
  };
  const documentRef = {
    body: {
      appendChild(element) {
        appended.push(element);
      },
    },
    createElement(tagName) {
      assert.equal(tagName, 'textarea');
      return textarea;
    },
    execCommand(command) {
      calls.push(command);
      if (commandThrows) throw new Error('blocked');
      return commandResult;
    },
  };
  return { documentRef, textarea, appended, calls };
}

{
  const h = createHarness();
  assert.equal(fallbackCopyText('ABC-123', { documentRef: h.documentRef }), true);
  assert.equal(h.appended.length, 1);
  assert.equal(h.textarea.value, 'ABC-123');
  assert.equal(h.textarea.attributes.readonly, '');
  assert.equal(h.textarea.style.position, 'fixed');
  assert.equal(h.textarea.style.left, '-9999px');
  assert.equal(h.textarea.style.top, '0');
  assert.equal(h.textarea.selected, true);
  assert.deepEqual(h.textarea.selectionRange, [0, 7]);
  assert.deepEqual(h.calls, ['copy']);
  assert.equal(h.textarea.removed, true);
}

{
  const h = createHarness({ commandResult: false });
  assert.equal(fallbackCopyText('x', { documentRef: h.documentRef }), false);
  assert.equal(h.textarea.removed, true);
}

{
  const h = createHarness({ commandThrows: true });
  assert.equal(fallbackCopyText('x', { documentRef: h.documentRef }), false);
  assert.equal(h.textarea.removed, true);
}

console.log('CLIPBOARD FALLBACK TEST: PASS');
