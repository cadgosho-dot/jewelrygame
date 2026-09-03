import assert from 'node:assert/strict';
import { installFinishedVideoCacheWarm } from '../js/runtime/finished-video-cache-warm.js';

class FakeVideo {
  constructor({ currentSrc = '', src = '' } = {}) {
    this.currentSrc = currentSrc;
    this.src = src;
  }
}

function fakeDocument() {
  let added = null;
  let removed = null;
  return {
    addEventListener(type, listener, capture) { added = { type, listener, capture }; },
    removeEventListener(type, listener, capture) { removed = { type, listener, capture }; },
    added: () => added,
    removed: () => removed,
  };
}

const doc = fakeDocument();
const fetchCalls = [];
let idleCall = null;
const warmer = installFinishedVideoCacheWarm({
  documentRef: doc,
  windowRef: {
    requestIdleCallback(callback, options) { idleCall = { callback, options }; return 1; },
  },
  videoElementCtor: FakeVideo,
  fetchImpl(url, options) { fetchCalls.push({ url, options }); return Promise.resolve({ ok: true }); },
  setTimeoutImpl() { throw new Error('idle callback path should not use setTimeout'); },
});

assert.equal(doc.added().type, 'ended');
assert.equal(doc.added().capture, true);

const video = new FakeVideo({ currentSrc: 'https://example.test/assets/videos/events/sample.mp4' });
doc.added().listener({ target: video });
assert.ok(idleCall);
assert.equal(idleCall.options.timeout, 2500);
assert.equal(fetchCalls.length, 0);
await idleCall.callback();
assert.equal(fetchCalls.length, 1);
assert.equal(fetchCalls[0].url, video.currentSrc);
assert.deepEqual(fetchCalls[0].options, { cache: 'force-cache', credentials: 'same-origin' });

idleCall = null;
doc.added().listener({ target: new FakeVideo({ src: 'https://example.test/assets/images/not-video.png' }) });
assert.equal(idleCall, null);
doc.added().listener({ target: {} });
assert.equal(idleCall, null);

warmer.uninstall();
assert.equal(doc.removed().type, 'ended');
assert.equal(doc.removed().listener, doc.added().listener);
assert.equal(doc.removed().capture, true);

const fallbackDoc = fakeDocument();
const scheduled = [];
const fallbackFetchCalls = [];
installFinishedVideoCacheWarm({
  documentRef: fallbackDoc,
  windowRef: {},
  videoElementCtor: FakeVideo,
  fetchImpl(url, options) { fallbackFetchCalls.push({ url, options }); return Promise.reject(new Error('network')); },
  setTimeoutImpl(callback, delay) { scheduled.push({ callback, delay }); return 1; },
});
const fallbackVideo = new FakeVideo({ src: '/assets/videos/fallback.mp4' });
fallbackDoc.added().listener({ target: fallbackVideo });
assert.equal(scheduled.length, 1);
assert.equal(scheduled[0].delay, 0);
await scheduled[0].callback();
await Promise.resolve();
assert.equal(fallbackFetchCalls.length, 1);

console.log('FINISHED VIDEO CACHE WARM: PASS');
console.log('video限定・/assets/videos/限定・force-cache/same-origin・idle 2500ms・0ms fallback・capture監視を確認しました。');
