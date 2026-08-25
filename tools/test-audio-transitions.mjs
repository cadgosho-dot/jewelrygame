import assert from 'node:assert/strict';

const instances = [];
class FakeAudio {
  constructor(url) {
    this.url = String(url);
    this.loop = false;
    this.preload = 'none';
    this.paused = true;
    this.currentTime = 0;
    this.volume = 1;
    this.dataset = {};
    this.playCount = 0;
    this.pauseCount = 0;
    instances.push(this);
  }
  play() {
    this.paused = false;
    this.playCount += 1;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.pauseCount += 1;
  }
}

Object.defineProperty(globalThis, 'document', { value: { hidden: false }, configurable: true });
Object.defineProperty(globalThis, 'Audio', { value: FakeAudio, configurable: true });
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  value: (callback) => { callback(performance.now() + 1000); return 1; },
  configurable: true,
});

const audio = await import('../js/audio.js');
audio.configureAudio(() => ({
  bgmVolume: 0.35,
  ambientVolume: 0.60,
  sfxVolume: 0.75,
  bgmMuted: false,
  ambientMuted: false,
  sfxMuted: false,
  externalAudioPriority: false,
}));

audio.releaseStartupAudioHold();

audio.updateMainEnvironment({ active: true, weather: '雨', audioKey: 'main' });
await audio.switchAudio('main');
assert.equal(instances.filter((item) => item.url.endsWith('/bgm-main.ogg')).length, 1, 'メインBGMは1本');
assert.equal(instances.filter((item) => item.url.endsWith('/amb-main-rain.ogg')).length, 1, '雨環境音は1本');
await audio.switchAudio('main');
assert.equal(instances.filter((item) => item.url.endsWith('/bgm-main.ogg')).length, 1, '同一音場の再描画でBGMを作り直さない');

await audio.switchAudio('craft');
await audio.switchAudio('polishing');
assert.equal(instances.filter((item) => item.url.endsWith('/bgm-workshop.ogg')).length, 1, '制作→研磨で工房BGMを共有');
assert.equal(instances.filter((item) => item.url.endsWith('/amb-craft.ogg')).length, 1, '制作環境音');
assert.equal(instances.filter((item) => item.url.endsWith('/amb-polishing.ogg')).length, 1, '研磨環境音');

await audio.switchAudio('okachimachi');
await audio.switchAudio('displayShop');
await audio.switchAudio('materialShop');
await audio.switchAudio('looseShop');
await audio.switchAudio('jewelryShop');
await audio.switchAudio('realEstate');
assert.equal(instances.filter((item) => item.url.endsWith('/bgm-okachimachi.ogg')).length, 1, '御徒町→各施設でBGMを共有');

const beforeMeal = instances.length;
audio.updateMainEnvironment({ active: true, weather: '雪', audioKey: 'meal-ramen' });
await audio.switchAudio('meal-ramen');
const mealUrls = instances.slice(beforeMeal).map((item) => item.url);
for (const suffix of ['/bgm-meal-ramen.ogg', '/amb-meal-ramen.ogg', '/amb-street-crowd.ogg', '/amb-main-snow.ogg']) {
  assert(mealUrls.some((url) => url.endsWith(suffix)), `ラーメン屋の音が不足: ${suffix}`);
}

const beforeKaiten = instances.length;
audio.updateMainEnvironment({ active: true, weather: '曇り', audioKey: 'kaitenzushi' });
await audio.switchAudio('kaitenzushi');
const kaitenUrls = instances.slice(beforeKaiten).map((item) => item.url);
for (const suffix of ['/enka_bgm.ogg', '/izakaya_ambient.ogg', '/amb-street-crowd.ogg', '/amb-main-cloudy.ogg']) {
  assert(kaitenUrls.some((url) => url.endsWith(suffix)), `回転寿司の音が不足: ${suffix}`);
}

await audio.switchAudio('silent');
assert(instances.filter((item) => !item.paused).length === 0, '無音場ではすべて停止');

audio.stopAllAudio();
console.log('音声遷移テスト: OK（同一BGM継続・環境音切替・食事4層・回転寿司4層・無音場）');
