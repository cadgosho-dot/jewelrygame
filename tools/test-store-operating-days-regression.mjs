import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME_DATA_PATH = path.join(ROOT, 'js', 'game-data.js');
const source = fs.readFileSync(GAME_DATA_PATH, 'utf8');

function extractFunction(name) {
  const matcher = new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`, 'g');
  const match = matcher.exec(source);
  if (!match) throw new Error(`${name}: function not found`);
  const start = match.index;
  const bodyStart = source.indexOf('{', matcher.lastIndex);
  if (bodyStart < 0) throw new Error(`${name}: body not found`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let templateDepth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (quote === '`' && char === '$' && next === '{') {
        templateDepth += 1;
        index += 1;
        continue;
      }
      if (quote === '`' && char === '}' && templateDepth > 0) {
        templateDepth -= 1;
        continue;
      }
      if (char === quote && templateDepth === 0) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '/' && next === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
      continue;
    }
    if (char === '/' && next === '*') {
      const endComment = source.indexOf('*/', index + 2);
      index = endComment < 0 ? source.length : endComment + 1;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1).replace(/^export\s+/, '');
    }
  }
  throw new Error(`${name}: closing brace not found`);
}

const runtimeSource = [
  extractFunction('maxPossibleStoreOperatingDays'),
  extractFunction('clampStoreOperatingDays'),
  extractFunction('repairStoreOperatingDaysState'),
].join('\n\n');

const context = {};
vm.createContext(context);
vm.runInContext(runtimeSource, context, { filename: 'store-operating-days-runtime.js' });

const { maxPossibleStoreOperatingDays, repairStoreOperatingDaysState } = context;

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`OK: ${label}`);
}

assertEqual(maxPossibleStoreOperatingDays(408, 1), 408, 'day 408 from day 1 caps at 408');
assertEqual(maxPossibleStoreOperatingDays(408, 101), 308, 'later lease uses elapsed lease days');
assertEqual(maxPossibleStoreOperatingDays(408, 500), 0, 'future/corrupt lease date permits no operating days');

const impossible = {
  game: { day: 408 },
  store: {
    rented: true,
    rentedDay: 1,
    operatingDays: 1428,
    level: 16,
    branches: [
      { number: 1, rentedDay: 1, operatingDays: 1428, level: 16 },
      { number: 2, rentedDay: 101, operatingDays: 900, level: 7 },
    ],
  },
};
repairStoreOperatingDaysState(impossible);
assertEqual(impossible.store.branches[0].operatingDays, 408, 'impossible branch-1 total is clamped');
assertEqual(impossible.store.operatingDays, 408, 'legacy top-level total follows repaired branch-1');
assertEqual(impossible.store.branches[1].operatingDays, 308, 'branch-2 total is capped from its own lease date');
assertEqual(impossible.store.level, 16, 'existing store level is preserved');
assertEqual(impossible.store.branches[0].level, 16, 'existing branch level is preserved');

const valid = {
  game: { day: 408 },
  store: {
    rented: true,
    rentedDay: 1,
    operatingDays: 142,
    branches: [{ number: 1, rentedDay: 1, operatingDays: 142 }],
  },
};
repairStoreOperatingDaysState(valid);
assertEqual(valid.store.branches[0].operatingDays, 142, 'valid historical total is unchanged');
assertEqual(valid.store.operatingDays, 142, 'valid top-level total remains synchronized');

const fallback = {
  game: { day: 30 },
  store: { rented: true, rentedDay: 11, operatingDays: 999, branches: [] },
};
repairStoreOperatingDaysState(fallback);
assertEqual(fallback.store.operatingDays, 20, 'legacy save without branches is repaired safely');

if (!source.includes('const state = core.migrateState(source);')) {
  throw new Error('migrateState core call missing');
}
const migrateTail = source.slice(source.indexOf('const state = core.migrateState(source);'));
if (!migrateTail.includes('repairStoreOperatingDaysState(state);')) {
  throw new Error('repair is not wired after core migration');
}
console.log('OK: repair runs after core migration');
console.log('STORE OPERATING DAYS REGRESSION: PASS');
