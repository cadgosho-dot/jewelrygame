// DOM-only text garbling effect used while the winter cold illness is active.
// Game/event state is injected through isActive so this module never owns or mutates save data.
export function winterColdGarbleText(value) {
  const symbols = ['譁', '縺', '繧', '莠', '蜿', '荳', '螟', '驥', '莉', '咲', '髫', '�'];
  let index = 0;
  return Array.from(String(value || '')).map((character) => {
    if (/\s/u.test(character)) return character;
    const code = character.codePointAt(0) || 0;
    const symbol = symbols[(code + index) % symbols.length];
    index += 1;
    return symbol;
  }).join('');
}

export function createWinterColdTextEffect({
  isActive,
  documentRef = globalThis.document,
  MutationObserverCtor = globalThis.MutationObserver,
  NodeFilterRef = globalThis.NodeFilter,
  ElementCtor = globalThis.Element,
  queueMicrotaskImpl = globalThis.queueMicrotask?.bind(globalThis),
} = {}) {
  if (typeof isActive !== 'function') throw new TypeError('isActive must be a function');
  if (!documentRef?.body || typeof documentRef.createTreeWalker !== 'function') throw new TypeError('documentRef must provide body/createTreeWalker');
  if (typeof MutationObserverCtor !== 'function') throw new TypeError('MutationObserverCtor must be a function');
  if (!NodeFilterRef || NodeFilterRef.SHOW_TEXT === undefined) throw new TypeError('NodeFilterRef.SHOW_TEXT is required');
  if (typeof ElementCtor !== 'function') throw new TypeError('ElementCtor must be a function');
  if (typeof queueMicrotaskImpl !== 'function') throw new TypeError('queueMicrotaskImpl must be a function');

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  let scheduled = false;

  function readableElement(element) {
    const readableControl = element?.closest?.('[data-action="sleep"],[data-action="do-sleep"],[data-action="main"],[data-action="back"],[data-action="next-day"]');
    return Boolean(readableControl || element?.closest?.('[data-illness-readable="true"],script,style,noscript'));
  }

  function apply() {
    const active = Boolean(isActive());
    documentRef.body.toggleAttribute('data-winter-cold-active', active);
    const walker = documentRef.createTreeWalker(documentRef.body, NodeFilterRef.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parent = node.parentElement;
      const readable = readableElement(parent);
      const previousOriginal = originalText.get(node);
      if (!active || readable) {
        if (previousOriginal !== undefined) {
          node.nodeValue = previousOriginal;
          originalText.delete(node);
        }
        return;
      }
      const expected = previousOriginal === undefined ? '' : winterColdGarbleText(previousOriginal);
      const original = previousOriginal !== undefined && node.nodeValue === expected
        ? previousOriginal
        : String(node.nodeValue || '');
      originalText.set(node, original);
      const garbled = winterColdGarbleText(original);
      if (node.nodeValue !== garbled) node.nodeValue = garbled;
    });

    const elements = [documentRef.body, ...documentRef.body.querySelectorAll('[placeholder],[title],[aria-label],[alt],input[type="button"][value],input[type="submit"][value],input[type="reset"][value]')];
    const attributes = ['placeholder', 'title', 'aria-label', 'alt', 'value'];
    elements.forEach((element) => {
      if (!(element instanceof ElementCtor)) return;
      const readable = readableElement(element);
      let originalMap = originalAttributes.get(element);
      attributes.forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const previousOriginal = originalMap?.get(attribute);
        if (!active || readable) {
          if (previousOriginal !== undefined) {
            element.setAttribute(attribute, previousOriginal);
            originalMap.delete(attribute);
          }
          return;
        }
        if (!originalMap) {
          originalMap = new Map();
          originalAttributes.set(element, originalMap);
        }
        const expected = previousOriginal === undefined ? '' : winterColdGarbleText(previousOriginal);
        const current = element.getAttribute(attribute) || '';
        const original = previousOriginal !== undefined && current === expected ? previousOriginal : current;
        originalMap.set(attribute, original);
        const garbled = winterColdGarbleText(original);
        if (current !== garbled) element.setAttribute(attribute, garbled);
      });
      if (originalMap && originalMap.size === 0) originalAttributes.delete(element);
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotaskImpl(() => {
      scheduled = false;
      apply();
    });
  }

  const observer = new MutationObserverCtor(() => schedule());
  observer.observe(documentRef.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label', 'alt', 'value'],
  });

  return Object.freeze({
    apply,
    schedule,
    disconnect() {
      observer.disconnect?.();
    },
  });
}
