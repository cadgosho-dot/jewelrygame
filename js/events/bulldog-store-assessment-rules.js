const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const BULLDOG_STORE_ASSESSMENT_EVENT_KEY = 'bulldogStoreAssessment';
export const BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE = 1 / 50;

export const INTRO_LINES = Object.freeze([
  'ふぅん、、ここが○○○かい？、、どれ、、品揃えを見せてもらおうじゃないか、、、、',
  '○○○ねぇ、、名前だけ立派なんてことはないだろうね？、、アタシが見てやるよ、、、、',
  'ここが○○○かい、、さて、、どれだけ客のこと考えて並べてるのか見せてもらおうかねぇ、、、、',
  '○○○の品揃えがどんなもんか、、今日はじっくり見させてもらうよ、、、、',
  'へぇ、、○○○ねぇ、、アタシを退屈させないくらいの物は置いてあるんだろうね？、、、、',
]);

export const CLOSING_LINES = Object.freeze([
  'まぁ、、良いところはあるよ、、調子に乗るほどじゃないけどねぇ、、、、',
  'アタシが言ったところ、次に来るまでに直しときな、、、、',
  '今日はこれくらいにしといてやるよ、、次はもっとちゃんと見させてもらうからねぇ、、、、',
  '褒めたからって満足するんじゃないよ、、店なんて油断したらすぐつまらなくなるんだから、、、、',
  '次に来た時も同じ品揃えだったら、、その時はもっと言わせてもらうよ、、、、',
]);

export const ASSESSMENT_COMMENTS = Object.freeze({
  productCount: Object.freeze({
    good: Object.freeze([
      'へぇ、、ちゃんと商品は並べてるじゃないか、、これくらい無きゃ店とは呼べないからねぇ、、、、',
      '棚がスカスカじゃないのは感心したよ、、最低限は分かってるみたいだねぇ、、、、',
      '見るものがちゃんとあるねぇ、、客を退屈させないってのは大事だよ、、、、',
    ]),
    bad: Object.freeze([
      '商品が少なすぎるよ、、これで客に選べってのかい？、、、、',
      'ずいぶん寂しい店だねぇ、、売る物がないなら店開けててもしょうがないだろ、、',
      'ショーケースの余白を売るつもりかい？、、もっと商品を並べな、、、、',
    ]),
  }),
  jewelryType: Object.freeze({
    good: Object.freeze([
      'リングばっかりかと思ったけど、、ちゃんと種類を揃えてるじゃないか、、悪くないねぇ、、、、',
      'いろんな種類を置いてるねぇ、、客の目的が一つじゃないってことくらいは分かってるようだね、、、、',
      '選択肢はちゃんと作ってあるねぇ、、そこは褒めてやるよ、、、、',
    ]),
    bad: Object.freeze([
      '同じ種類ばっかりじゃないか、、専門店でもやってるつもりかい？、、、、',
      'またこれかい、、って商品が多いねぇ、、もう少し頭使って並べなよ、、、、',
      '客全員が同じ物を欲しがると思ってるなら、、ずいぶん都合のいい商売だねぇ、、、、',
    ]),
  }),
  gemType: Object.freeze({
    good: Object.freeze([
      '石はいろいろ揃ってるねぇ、、見てて飽きないのはいいことだよ、、、、',
      '色石もちゃんと選べるじゃないか、、一種類だけ並べてないのはいいねぇ、、、、',
      '宝石の選択肢は悪くないよ、、客の好みを少しは分かってるじゃないか、、、、',
    ]),
    bad: Object.freeze([
      '使ってる石が偏りすぎだよ、、好きな石だけ並べるのはアンタのコレクションでやんな、、、、',
      'またこの石かい？、、客はアンタほど同じ石ばっかり見たくないよ、、、、',
      '色が単調だねぇ、、宝石屋ならもう少し目を楽しませなよ、、、、',
    ]),
  }),
  metalType: Object.freeze({
    good: Object.freeze([
      '地金も選べるんだねぇ、、客の好みくらいは考えてるようだね、、、、',
      '色味の違う地金が揃ってるのはいいねぇ、、着ける人のことを考えてるじゃないか、、、、',
      '素材を一つに決めつけてないところは悪くないよ、、、、',
    ]),
    bad: Object.freeze([
      '地金が偏ってるねぇ、、アンタは好きでも客まで同じとは限らないよ、、、、',
      '素材の選択肢が少なすぎるよ、、客に選ばせる気あるのかい？、、、、',
      '同じ色ばっかりで景色まで単調だねぇ、、もう少し考えな、、、、',
    ]),
  }),
  priceRange: Object.freeze({
    good: Object.freeze([
      '安いのから高いのまであるじゃないか、、客の財布は一つじゃないからねぇ、、、、',
      'ちゃんと価格に幅を持たせてるねぇ、、そういうところは商売人らしいじゃないか、、、、',
      '予算で選べるようにはなってるねぇ、、そこは分かってるじゃないか、、、、',
    ]),
    bad: Object.freeze([
      '値段が似たようなのばっかりだねぇ、、客の財布が全員同じだと思ってるのかい？、、、、',
      '高いか安いかどっちかしかない店ってのも困るんだよ、、間を作りな、、、、',
      '価格の選択肢が狭いねぇ、、これじゃ買える客を自分で減らしてるよ、、、、',
    ]),
  }),
  cutType: Object.freeze({
    good: Object.freeze([
      'カットはいろいろ揃ってるねぇ、、丸い石だけ並べてないのは褒めてやるよ、、、、',
      '石の形に変化があるじゃないか、、こういう店は眺めてるだけでも面白いんだよ、、、、',
      'ラウンドだけで済ませてないところを見ると、、少しは石を分かってるみたいだねぇ、、、、',
    ]),
    bad: Object.freeze([
      'また同じカットかい？、、石の世界がそれだけだと思ってないだろうね、、、、',
      '形が似たものばっかりだねぇ、、せっかく宝石扱ってるのにもったいないよ、、、、',
      'ラウンド並べときゃ安心って顔してるねぇ、、もっと違うカットも仕入れな、、、、',
    ]),
  }),
  designType: Object.freeze({
    good: Object.freeze([
      'シンプルも派手なのも揃ってるじゃないか、、客の好みを決めつけてないのはいいねぇ、、、、',
      'ナチュラルからゴージャスまであるのかい、、ちゃんと幅を持たせてるじゃないか、、、、',
      'いろんな雰囲気の商品があるねぇ、、こういう店なら選ぶ楽しみはあるよ、、、、',
    ]),
    bad: Object.freeze([
      'アンタの好みが丸見えだねぇ、、店は自己満足の展示会じゃないんだよ、、、、',
      '似た雰囲気のものばっかりだよ、、シンプルも派手なのも欲しい客はいるんだからねぇ、、、、',
      'デザインが片寄りすぎだねぇ、、客をアンタの趣味に付き合わせるんじゃないよ、、、、',
    ]),
  }),
  finishType: Object.freeze({
    good: Object.freeze([
      '仕上げにちゃんと変化があるねぇ、、全部ピカピカじゃないところは分かってるよ、、、、',
      '鏡面も艶消しも装飾もあるじゃないか、、見た目に変化があるのはいいねぇ、、、、',
      '表面の見せ方まで考えてるんだねぇ、、そこはちょっと感心したよ、、、、',
    ]),
    bad: Object.freeze([
      'どれも似たような仕上げだねぇ、、全部ピカピカにすりゃいいってもんじゃないよ、、、、',
      '艶消しも装飾も使いなよ、、せっかく作ってるのに表情が足りないねぇ、、、、',
      '仕上げが単調だよ、、遠目で見たら全部同じに見えるじゃないか、、、、',
    ]),
  }),
  overallBalance: Object.freeze({
    good: Object.freeze([
      'ふぅん、、種類も石もデザインもちゃんと散らしてあるねぇ、、思ったより考えてるじゃないか、、、、',
      '悔しいけど、、全体の品揃えは悪くないねぇ、、客が選ぶ余地をちゃんと残してるよ、、、、',
      'アンタにしちゃ上出来じゃないか、、何を見ても同じって店にはなってないねぇ、、、、',
    ]),
    bad: Object.freeze([
      '一個一個は悪くないのにねぇ、、並べてみると全部似たような顔してるよ、、、、',
      '数だけ揃えて安心したのかい？、、品揃えってのは違うものを揃えて初めて品揃えって言うんだよ、、、、',
      'アンタねぇ、、作りたい物ばっかり作るんじゃなくて、売る店だってことも思い出しな、、、、',
    ]),
  }),
});

const uniqCount = (items, getter) => new Set(items.map(getter).filter((value) => value !== '' && value != null)).size;

function displayedRows(snapshot, branchId) {
  const branches = Array.isArray(snapshot?.store?.branches) ? snapshot.store.branches : [];
  const branch = branches.find((entry) => String(entry?.id || '') === String(branchId || '')) || null;
  if (!branch) return { branch:null, rows:[] };
  const jewelry = Array.isArray(snapshot?.inventory?.jewelry) ? snapshot.inventory.jewelry : [];
  const byId = new Map(jewelry.map((item) => [String(item?.id || ''), item]));
  const rows = [];
  for (const showcase of Array.isArray(branch.showcases) ? branch.showcases : []) {
    for (const slot of Array.isArray(showcase?.slots) ? showcase.slots : []) {
      if (!slot?.jewelryId) continue;
      const item = byId.get(String(slot.jewelryId));
      if (!item) continue;
      rows.push({
        item,
        sellingPrice: Math.max(0, Number(slot.sellingPrice) || Number(item.recommendedPrice) || Number(item.cost) || 0),
      });
    }
  }
  return { branch, rows };
}

function priceRangeScore(rows) {
  const prices = rows.map((row) => Number(row.sellingPrice) || 0).filter((value) => value > 0).sort((a, b) => a - b);
  if (prices.length < 2) return 0;
  const low = prices[0];
  const high = prices[prices.length - 1];
  if (!low || high <= low) return 0;
  return clamp01((high / low - 1) / 0.8);
}

function criterion(key, score, good) {
  return Object.freeze({ key, score:clamp01(score), good:Boolean(good) });
}

export function assessStoreAssortment(snapshot, branchId) {
  const { branch, rows } = displayedRows(snapshot, branchId);
  if (!branch) return { branch:null, rows:[], criteria:[], goodCount:0, badCount:0 };

  const count = rows.length;
  const jewelryTypes = uniqCount(rows, (row) => row.item?.item);
  const gemTypes = uniqCount(rows, (row) => row.item?.useLoose === false ? '' : row.item?.gem);
  const metalTypes = uniqCount(rows, (row) => row.item?.metal);
  const cuts = uniqCount(rows, (row) => row.item?.useLoose === false ? '' : row.item?.looseShape);
  const designs = uniqCount(rows, (row) => row.item?.design);
  const finishes = uniqCount(rows, (row) => row.item?.finish);
  const priceScore = priceRangeScore(rows);

  const base = [
    criterion('productCount', count / 5, count >= 5),
    criterion('jewelryType', jewelryTypes / 2, jewelryTypes >= 2),
    criterion('gemType', gemTypes / 3, gemTypes >= 3),
    criterion('metalType', metalTypes / 2, metalTypes >= 2),
    criterion('priceRange', priceScore, priceScore >= 1),
    criterion('cutType', cuts / 2, cuts >= 2),
    criterion('designType', designs / 2, designs >= 2),
    criterion('finishType', finishes / 2, finishes >= 2),
  ];
  const baseGoodCount = base.filter((entry) => entry.good).length;
  const overallScore = baseGoodCount / base.length;
  const criteria = [...base, criterion('overallBalance', overallScore, baseGoodCount >= 5)];
  return {
    branch,
    rows,
    criteria,
    goodCount:criteria.filter((entry) => entry.good).length,
    badCount:criteria.filter((entry) => !entry.good).length,
    metrics:Object.freeze({ count, jewelryTypes, gemTypes, metalTypes, cuts, designs, finishes, priceScore }),
  };
}

function randomIndex(length, rng) {
  if (length <= 1) return 0;
  const value = Number(rng?.());
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : Math.random();
  return Math.floor(normalized * length);
}

function chooseOne(items, rng) {
  return items[randomIndex(items.length, rng)] || items[0] || null;
}

function shuffled(items, rng) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1, rng);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function selectCriteria(criteria, desiredGood, desiredBad, rng) {
  const good = shuffled(criteria.filter((entry) => entry.good), rng);
  const bad = shuffled(criteria.filter((entry) => !entry.good), rng);
  const selected = [];
  const used = new Set();

  const take = (pool, count, polarity, fallbackSort) => {
    for (const entry of pool) {
      if (selected.filter((row) => row.polarity === polarity).length >= count) break;
      if (used.has(entry.key)) continue;
      selected.push({ criterion:entry, polarity });
      used.add(entry.key);
    }
    while (selected.filter((row) => row.polarity === polarity).length < count) {
      const fallback = [...criteria]
        .filter((entry) => !used.has(entry.key))
        .sort(fallbackSort)[0];
      if (!fallback) break;
      selected.push({ criterion:fallback, polarity });
      used.add(fallback.key);
    }
  };

  take(good, desiredGood, 'good', (a, b) => b.score - a.score);
  take(bad, desiredBad, 'bad', (a, b) => a.score - b.score);
  return shuffled(selected, rng);
}

export function chooseAssessmentComments(assessment, rng = Math.random) {
  const criteria = Array.isArray(assessment?.criteria) ? assessment.criteria : [];
  if (!criteria.length) return [];
  const goodMajority = Number(assessment.goodCount) > Number(assessment.badCount);
  const desiredGood = goodMajority ? 2 : 1;
  const desiredBad = goodMajority ? 1 : 2;
  return selectCriteria(criteria, desiredGood, desiredBad, rng).map(({ criterion:entry, polarity }) => {
    const variants = ASSESSMENT_COMMENTS[entry.key]?.[polarity] || [];
    return {
      key:entry.key,
      polarity,
      text:String(chooseOne(variants, rng) || ''),
    };
  }).filter((entry) => entry.text);
}

export function buildBulldogStoreAssessmentDialogue(snapshot, branchId, rng = Math.random) {
  const assessment = assessStoreAssortment(snapshot, branchId);
  if (!assessment.branch) return { assessment, lines:[] };
  const storeName = String(assessment.branch.name || snapshot?.store?.name || '店舗').trim() || '店舗';
  const intro = String(chooseOne(INTRO_LINES, rng) || INTRO_LINES[0]).replaceAll('○○○', storeName);
  const comments = chooseAssessmentComments(assessment, rng);
  const closing = String(chooseOne(CLOSING_LINES, rng) || CLOSING_LINES[0]);
  return {
    assessment,
    comments,
    lines:[intro, ...comments.map((entry) => entry.text), closing],
  };
}
