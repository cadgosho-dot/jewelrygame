import { writeFile } from 'node:fs/promises';

const apiKey = process.env.GOLDAPI_KEY;
if (!apiKey) { console.log('GOLDAPI_KEYが未設定のため更新をスキップします。'); process.exit(0); }

const ounceToGram = 31.1034768;
async function fetchMetal(symbol) {
  const response = await fetch(`https://www.goldapi.io/api/${symbol}/JPY`, {
    headers: { 'x-access-token': apiKey, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`${symbol}: HTTP ${response.status}`);
  const data = await response.json();
  if (!Number.isFinite(Number(data.price))) throw new Error(`${symbol}: priceが取得できません。`);
  return Number(data.price) / ounceToGram;
}

const [gold, silver, platinum] = await Promise.all([
  fetchMetal('XAU'), fetchMetal('XAG'), fetchMetal('XPT'),
]);
const result = {
  platinum: Math.round(platinum),
  gold: Math.round(gold),
  silver: Math.round(silver * 10) / 10,
  source: 'GoldAPI.io 現物相場（JPY/g）',
  fetchedAt: new Date().toISOString(),
};
await writeFile(new URL('../assets/data/metal-prices.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(result);
