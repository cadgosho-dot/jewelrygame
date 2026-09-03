import assert from 'node:assert/strict';
import { createWinterColdTextEffect, winterColdGarbleText } from '../js/ui/winter-cold-text-effect.js';

assert.equal(winterColdGarbleText('A B'), `${winterColdGarbleText('A')} ${winterColdGarbleText('B')}`);
assert.equal(winterColdGarbleText(''), '');
assert.equal(winterColdGarbleText('  '), '  ');
assert.equal(winterColdGarbleText('宝石'), winterColdGarbleText('宝石'), 'garble must be deterministic');

class FakeElement {
  constructor({ attrs = {}, readable = false } = {}) {
    this.attrs = new Map(Object.entries(attrs));
    this.readable = readable;
    this.toggleState = new Map();
    this.queryResults = [];
  }
  closest() { return this.readable ? this : null; }
  toggleAttribute(name, force) {
    this.toggleState.set(name, Boolean(force));
    if (force) this.attrs.set(name, '');
    else this.attrs.delete(name);
  }
  querySelectorAll() { return this.queryResults; }
  hasAttribute(name) { return this.attrs.has(name); }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
}

class FakeTextNode {
  constructor(value, parentElement) {
    this.nodeValue = value;
    this.parentElement = parentElement;
  }
}

let observerCallback = null;
let observeArgs = null;
let disconnected = false;
class FakeMutationObserver {
  constructor(callback) { observerCallback = callback; }
  observe(target, options) { observeArgs = { target, options }; }
  disconnect() { disconnected = true; }
}

const body = new FakeElement();
const ordinary = new FakeElement({ attrs: { title: '通常タイトル', placeholder: '入力' } });
const readable = new FakeElement({ attrs: { 'aria-label': '寝る' }, readable: true });
body.queryResults = [ordinary, readable];
const ordinaryText = new FakeTextNode('通常 テキスト', ordinary);
const readableText = new FakeTextNode('寝る', readable);
const textNodes = [ordinaryText, readableText];
const documentRef = {
  body,
  createTreeWalker() {
    let index = -1;
    return {
      currentNode: null,
      nextNode() {
        index += 1;
        if (index >= textNodes.length) return false;
        this.currentNode = textNodes[index];
        return true;
      },
    };
  },
};

const microtasks = [];
let active = true;
const effect = createWinterColdTextEffect({
  isActive: () => active,
  documentRef,
  MutationObserverCtor: FakeMutationObserver,
  NodeFilterRef: { SHOW_TEXT: 4 },
  ElementCtor: FakeElement,
  queueMicrotaskImpl: (callback) => microtasks.push(callback),
});

assert.equal(observeArgs.target, body);
assert.deepEqual(observeArgs.options, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['placeholder', 'title', 'aria-label', 'alt', 'value'],
});

effect.schedule();
effect.schedule();
assert.equal(microtasks.length, 1, 'schedule must coalesce repeated requests');
microtasks.shift()();
assert.equal(body.attrs.has('data-winter-cold-active'), true);
assert.notEqual(ordinaryText.nodeValue, '通常 テキスト');
assert.equal(ordinaryText.nodeValue.includes(' '), true, 'whitespace must remain readable');
assert.equal(readableText.nodeValue, '寝る', 'readable controls must remain unchanged');
assert.notEqual(ordinary.getAttribute('title'), '通常タイトル');
assert.notEqual(ordinary.getAttribute('placeholder'), '入力');
assert.equal(readable.getAttribute('aria-label'), '寝る');

const garbledText = ordinaryText.nodeValue;
effect.apply();
assert.equal(ordinaryText.nodeValue, garbledText, 're-applying active effect must be stable');

ordinaryText.nodeValue = '新しい文';
effect.apply();
assert.equal(ordinaryText.nodeValue, winterColdGarbleText('新しい文'), 'changed DOM text must become the new original');

const added = new FakeTextNode('追加', ordinary);
textNodes.push(added);
observerCallback();
assert.equal(microtasks.length, 1, 'MutationObserver must schedule the effect');
microtasks.shift()();
assert.equal(added.nodeValue, winterColdGarbleText('追加'));

active = false;
effect.schedule();
microtasks.shift()();
assert.equal(body.attrs.has('data-winter-cold-active'), false);
assert.equal(ordinaryText.nodeValue, '新しい文');
assert.equal(added.nodeValue, '追加');
assert.equal(ordinary.getAttribute('title'), '通常タイトル');
assert.equal(ordinary.getAttribute('placeholder'), '入力');

effect.disconnect();
assert.equal(disconnected, true);

console.log('WINTER COLD TEXT EFFECT: PASS');
