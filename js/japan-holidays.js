const DAY_MS = 24 * 60 * 60 * 1000;

function localDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function keyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nthMonday(year, monthIndex, nth) {
  const first = localDate(year, monthIndex, 1);
  const offset = (8 - first.getDay()) % 7;
  return 1 + offset + (nth - 1) * 7;
}

function vernalEquinoxDay(year) {
  if (year < 2000 || year > 2099) return null;
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnalEquinoxDay(year) {
  if (year < 2000 || year > 2099) return null;
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function addHoliday(map, year, monthIndex, day, name) {
  if (!day) return;
  map.set(keyOf(localDate(year, monthIndex, day)), name);
}

function baseHolidays(year) {
  const holidays = new Map();
  addHoliday(holidays, year, 0, 1, '元日');
  addHoliday(holidays, year, 0, nthMonday(year, 0, 2), '成人の日');
  addHoliday(holidays, year, 1, 11, '建国記念の日');
  addHoliday(holidays, year, 1, 23, '天皇誕生日');
  addHoliday(holidays, year, 2, vernalEquinoxDay(year), '春分の日');
  addHoliday(holidays, year, 3, 29, '昭和の日');
  addHoliday(holidays, year, 4, 3, '憲法記念日');
  addHoliday(holidays, year, 4, 4, 'みどりの日');
  addHoliday(holidays, year, 4, 5, 'こどもの日');
  addHoliday(holidays, year, 6, nthMonday(year, 6, 3), '海の日');
  addHoliday(holidays, year, 7, 11, '山の日');
  addHoliday(holidays, year, 8, nthMonday(year, 8, 3), '敬老の日');
  addHoliday(holidays, year, 8, autumnalEquinoxDay(year), '秋分の日');
  addHoliday(holidays, year, 9, nthMonday(year, 9, 2), 'スポーツの日');
  addHoliday(holidays, year, 10, 3, '文化の日');
  addHoliday(holidays, year, 10, 23, '勤労感謝の日');
  return holidays;
}

const cache = new Map();

export function japaneseHolidaysForYear(year) {
  const normalizedYear = Number(year);
  if (!Number.isInteger(normalizedYear)) return new Map();
  if (cache.has(normalizedYear)) return new Map(cache.get(normalizedYear));

  const nationalHolidays = baseHolidays(normalizedYear);
  const holidays = new Map(nationalHolidays);

  // 日曜日の国民の祝日は、直後の「国民の祝日ではない日」へ振り替える。
  const sundayHolidays = [...nationalHolidays.entries()]
    .filter(([key]) => {
      const [y, m, d] = key.split('-').map(Number);
      return localDate(y, m - 1, d).getDay() === 0;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [key] of sundayHolidays) {
    const [y, m, d] = key.split('-').map(Number);
    const date = localDate(y, m - 1, d);
    do date.setDate(date.getDate() + 1); while (nationalHolidays.has(keyOf(date)));
    if (date.getFullYear() === normalizedYear && !holidays.has(keyOf(date))) holidays.set(keyOf(date), '振替休日');
  }

  // 前後が国民の祝日に挟まれた日は「国民の休日」。
  for (let timestamp = localDate(normalizedYear, 0, 2).getTime(); timestamp <= localDate(normalizedYear, 11, 30).getTime(); timestamp += DAY_MS) {
    const date = new Date(timestamp);
    const key = keyOf(date);
    if (nationalHolidays.has(key)) continue;
    const previous = new Date(timestamp - DAY_MS);
    const next = new Date(timestamp + DAY_MS);
    if (nationalHolidays.has(keyOf(previous)) && nationalHolidays.has(keyOf(next)) && !holidays.has(key)) holidays.set(key, '国民の休日');
  }

  cache.set(normalizedYear, new Map(holidays));
  return new Map(holidays);
}

export function japaneseHolidayName(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return japaneseHolidaysForYear(date.getFullYear()).get(keyOf(date)) || '';
}
