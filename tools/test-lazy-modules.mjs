import assert from 'node:assert/strict';

import { createLazyModuleManager } from '../js/runtime/lazy-modules.js';

let resolveDailyGems;
let dailyGemsLoadCount = 0;
const dailyGemsModule = { dailyGemForDate: () => ({ id: 'test-gem' }) };
const dailyGemsPending = new Promise((resolve) => {
  resolveDailyGems = resolve;
});

let looseProfessionalLoadCount = 0;
const looseProfessionalModule = { COMMON_LOOSE_PROFESSIONAL_SECTIONS: ['test-section'] };

let kaitenzushiLoadCount = 0;
const manager = createLazyModuleManager({
  loadDailyGems: () => {
    dailyGemsLoadCount += 1;
    return dailyGemsPending;
  },
  loadLooseProfessional: () => {
    looseProfessionalLoadCount += 1;
    if (looseProfessionalLoadCount === 1) return Promise.reject(new Error('first load failed'));
    return Promise.resolve(looseProfessionalModule);
  },
  loadKaitenzushiEmbedded: () => {
    kaitenzushiLoadCount += 1;
    return Promise.resolve({ KAITENZUSHI_EMBEDDED_HTML: '<main>test</main>' });
  },
});

assert.equal(manager.getDailyGemsModule(), null, 'daily gems must start unloaded');
const firstDailyLoad = manager.ensureDailyGemsLoaded();
const concurrentDailyLoad = manager.ensureDailyGemsLoaded();
assert.strictEqual(concurrentDailyLoad, firstDailyLoad, 'concurrent daily-gems loads must share one promise');
assert.equal(dailyGemsLoadCount, 1, 'daily-gems loader must run once while pending');
resolveDailyGems(dailyGemsModule);
assert.strictEqual(await firstDailyLoad, dailyGemsModule, 'daily-gems load result changed');
assert.strictEqual(manager.getDailyGemsModule(), dailyGemsModule, 'daily-gems module was not cached');
assert.strictEqual(await manager.ensureDailyGemsLoaded(), dailyGemsModule, 'cached daily-gems module was not returned');
assert.equal(dailyGemsLoadCount, 1, 'cached daily-gems module triggered another load');

await assert.rejects(manager.ensureLooseProfessionalLoaded(), /first load failed/, 'first rejected load must propagate');
assert.equal(manager.getLooseProfessionalModule(), null, 'failed loose-professional load must not create a cache value');
assert.strictEqual(await manager.ensureLooseProfessionalLoaded(), looseProfessionalModule, 'rejected load was not retryable');
assert.equal(looseProfessionalLoadCount, 2, 'loose-professional retry count changed');

assert.equal(manager.getKaitenzushiEmbeddedHtml(), '', 'kaitenzushi HTML must start empty');
const firstKaitenzushiLoad = manager.ensureKaitenzushiModuleLoaded();
const concurrentKaitenzushiLoad = manager.ensureKaitenzushiModuleLoaded();
assert.strictEqual(concurrentKaitenzushiLoad, firstKaitenzushiLoad, 'concurrent kaitenzushi loads must share one promise');
assert.equal(await firstKaitenzushiLoad, '<main>test</main>', 'kaitenzushi export conversion changed');
assert.equal(manager.getKaitenzushiEmbeddedHtml(), '<main>test</main>', 'kaitenzushi HTML was not cached');
assert.equal(kaitenzushiLoadCount, 1, 'kaitenzushi loader ran more than once');

let emptyKaitenzushiLoadCount = 0;
const emptyKaitenzushiManager = createLazyModuleManager({
  loadDailyGems: () => Promise.resolve({}),
  loadLooseProfessional: () => Promise.resolve({}),
  loadKaitenzushiEmbedded: () => {
    emptyKaitenzushiLoadCount += 1;
    return Promise.resolve({ KAITENZUSHI_EMBEDDED_HTML: '' });
  },
});
assert.equal(await emptyKaitenzushiManager.ensureKaitenzushiModuleLoaded(), '', 'empty kaitenzushi export changed');
assert.equal(await emptyKaitenzushiManager.ensureKaitenzushiModuleLoaded(), '', 'resolved empty export must reuse its promise');
assert.equal(emptyKaitenzushiLoadCount, 1, 'resolved empty kaitenzushi export unexpectedly retried');

const integrationManager = createLazyModuleManager({
  loadDailyGems: () => import('../js/daily-gems.js'),
  loadLooseProfessional: () => import('../js/loose-gem-professional.js'),
  loadKaitenzushiEmbedded: () => import('../js/kaitenzushi-embedded.js'),
});
const [realDailyGems, realLooseProfessional, realKaitenzushiHtml] = await Promise.all([
  integrationManager.ensureDailyGemsLoaded(),
  integrationManager.ensureLooseProfessionalLoaded(),
  integrationManager.ensureKaitenzushiModuleLoaded(),
]);
assert.equal(typeof realDailyGems.dailyGemForDate, 'function', 'daily-gems real export is unavailable');
assert.equal(typeof realLooseProfessional.looseGemAdvancedData, 'function', 'loose-professional real export is unavailable');
assert.match(realKaitenzushiHtml, /data-jxj-kaitenzushi="1"/, 'kaitenzushi real HTML export is unavailable');

console.log('LAZY MODULE MANAGER: PASS');
console.log('同時読込の一本化・成功キャッシュ・失敗時再試行・空文字互換・実データ読込を確認しました。');
