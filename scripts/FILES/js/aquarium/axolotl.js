// Shared by the main game's module entry and the aquarium's classic-script entry.
// Source: https://animals.sandiegozoo.org/animals/axolotl
(function (host) {
  'use strict';
  const name = 'ウーパールーパー';
  const image = 'fish-axolotl.png';
  const description = 'メキシコ原産の両生類で、メキシコサラマンダーとも呼ばれます。幼生の特徴を残したまま成長し、頭の左右にある羽毛状の外鰓（がいさい）を使って水中で呼吸します。成体はおよそ20〜30cmになり、底を歩いて生活するほか、水中を泳ぐこともあります。ゲーム内ではコリドラスと同じ床面で、ほとんど動かずじっとしています。';
  const detailSections = Object.freeze([
    ['分類・学名', '学名は Ambystoma mexicanum。両生綱・有尾目・トラフサンショウウオ科の両生類です。メキシコサラマンダーとも呼ばれます。'],
    ['原産地と生息環境', 'メキシコ中央部の湖沼に由来し、ソチミルコの水路などに生息します。水中生活を続け、湖底を歩くための四肢を持っています。'],
    ['外鰓と成長', '幼生の特徴を残したまま成熟する性質があり、成体になっても頭の左右の羽毛状の外鰓（がいさい）や尾びれを保ちます。一般的な成体の大きさはおよそ20〜30cmです。'],
    ['食性と行動', '小さな無脊椎動物や小魚などを吸い込んで食べる肉食性です。自然下では日中は水草などに隠れ、夜間に活動します。'],
    ['この水槽での見どころ', 'コリドラスと同じ床面に表示され、ほとんど動かずじっとしています。淡い体色や赤みのある外鰓、短い四肢を観察できます。'],
  ]);

  function catalogItem() {
    return { name, image: '../../images/tropical-shop/' + image, category: '魚',
      classification: '両生類・メキシコサラマンダー', origin: 'メキシコ中央部の湖沼',
      size: '約20〜30cm', zone: '床面（コリドラスと同じ位置）',
      character: 'ゲーム内ではほとんど動かず、じっとしている',
      temp: '冷涼な水域', water: '淡水', watch: '外鰓と短い四肢を観察する。' };
  }

  function mount(document) {
    const floor = document.querySelector('.floorfish');
    const template = floor?.querySelector('.cory');
    if (!template || floor.querySelector('.axolotl')) return;
    const node = template.cloneNode(true);
    node.className = 'fish mover axolotl';
    node.src = '../../images/tropical-shop/' + image;
    node.alt = name;
    node.dataset.aquariumSpecies = 'axolotl';
    node.dataset.speed = '0';
    node.style.width = '18%';
    node.style.setProperty('display', 'none', 'important');
    floor.appendChild(node);
  }

  function updatePose(sprite, time, floorY) {
    // Keep the same floor contour and center-height offset as Corydoras.
    // No horizontal travel; only an almost imperceptible breathing movement.
    const y = floorY(sprite.x) + 12.25 + Math.sin(time * 0.0003 + sprite.phase) * 0.003;
    sprite.el.style.left = sprite.x + '%';
    sprite.el.style.top = y + '%';
    sprite.el.style.transform = 'translate(-50%,-50%) scaleX(' + (sprite.dir > 0 ? -1 : 1) + ')';
  }

  host.JxjAxolotl = Object.freeze({ name, image, description, detailSections, catalogItem, mount, updatePose });
})(globalThis);
