import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const minigame = fs.readFileSync(path.join(root, 'assets/minigames/kaitenzushi/game/index.html'), 'utf8');
const assert = (value, message) => { if (!value) throw new Error(message); };

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  if (start < 0) throw new Error(`${name}が見つかりません`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name}の終端が見つかりません`);
}

const functionSource = extractFunction(sw, 'kaitenzushiDocumentNetworkFirst');
const scope = 'https://example.test/jewelry/';
const canonicalUrl = `${scope}assets/minigames/kaitenzushi/game/index.html`;
const request = new Request(`${canonicalUrl}?v=0.10.487&attempt=offline`);

async function buildFunction({ fetchImpl, matchImpl, putImpl = async () => {} }) {
  const context = {
    APP_CACHE: 'test-cache',
    caches: { open: async () => ({ match: matchImpl, put: putImpl }) },
    self: { registration: { scope } },
    fetch: fetchImpl,
    URL,
    Response,
    Request,
    Promise,
  };
  vm.createContext(context);
  vm.runInContext(`${functionSource}; globalThis.testFunction = kaitenzushiDocumentNetworkFirst;`, context);
  return context.testFunction;
}

// オフライン時は検索文字列を無視して回転寿司のキャッシュを返す。
{
  const fn = await buildFunction({
    fetchImpl: async () => { throw new Error('offline'); },
    matchImpl: async (key) => {
      const url = typeof key === 'string' ? key : key.url;
      if (url === canonicalUrl) return new Response(minigame, { status: 200, headers: { 'Content-Type': 'text/html' } });
      return null;
    },
  });
  const response = await fn(request);
  const text = await response.text();
  assert(response.status === 200, 'オフライン時にキャッシュ済み回転寿司を返せません');
  assert(text.includes('data-jxj-kaitenzushi="1"'), 'オフライン時にメイン画面へ誤フォールバックしています');
}

// 回転寿司のキャッシュ自体がない場合も、メインindex.htmlではなく専用503文書を返す。
{
  const fn = await buildFunction({
    fetchImpl: async () => { throw new Error('offline'); },
    matchImpl: async () => null,
  });
  const response = await fn(request);
  const text = await response.text();
  assert(response.status === 503, 'キャッシュ未取得時に専用エラー文書を返していません');
  assert(text.includes('回転寿司を読み込めませんでした'), '専用エラー文書の内容がありません');
  assert(!text.includes('JEWELRY×JEWELRY'), 'メイン画面の文書を返しています');
}

// オンライン取得時は要求URLと正規URLの両方をキャッシュする。
{
  const puts = [];
  const fn = await buildFunction({
    fetchImpl: async () => new Response(minigame, { status: 200, headers: { 'Content-Type': 'text/html' } }),
    matchImpl: async () => null,
    putImpl: async (key) => { puts.push(typeof key === 'string' ? key : key.url); },
  });
  const response = await fn(request);
  assert(response.status === 200, 'オンライン取得に失敗しました');
  assert(puts.includes(request.url), '検索文字列付き要求URLをキャッシュしていません');
  assert(puts.includes(canonicalUrl), '正規回転寿司URLをキャッシュしていません');
}

console.log('v0.10.487 回転寿司Service Worker経路検査: OK');
console.log('- オフライン時も回転寿司キャッシュを返し、メインindex.htmlへフォールバックしない');
console.log('- キャッシュ未取得時は専用503画面を返す');
console.log('- オンライン取得時は要求URLと正規URLを保存');
