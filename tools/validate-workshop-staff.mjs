import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const audioMap = fs.readFileSync(path.join(root, 'js/audio-scene-map.js'), 'utf8');
const checks = [
  ['原石研磨の下に職人スタッフ', app.indexOf('data-screen="polishing"') >= 0 && app.indexOf('data-screen="workshopStaff"') > app.indexOf('data-screen="polishing"')],
  ['休日表示', app.includes("職人スタッフ${workshopStaffHoliday(gameDate()) ? '（おやすみ）' : ''}")],
  ['土日祝休み判定', app.includes("date.getDay() === 0 || date.getDay() === 6 || Boolean(japaneseHolidayName(date))")],
  ['休日は設定不可', app.includes("土日祝日は職人スタッフを設定できません。") && app.includes("data-screen=\"workshopStaff\" ${workshopStaffHoliday(gameDate()) ? 'disabled' : ''}")],
  ['初日当25,000円', data.includes("dailyWage: 25000")],
  ['日当段階上昇', data.includes("dailyWage: 30000") && data.includes("dailyWage: 40000") && data.includes("dailyWage: 55000") && data.includes("dailyWage: 75000")],
  ['勤務日数成長', data.includes('workshopStaffGrowthForWorkDays') && app.includes('staff.workDays += 1')],
  ['出勤中の時間処理', app.includes('processWorkshopStaffElapsedTime(beforeMinutes, state.game.minutes)') && app.includes('WORKSHOP_STAFF_SHIFT_START_MINUTES') && app.includes('WORKSHOP_STAFF_SHIFT_END_MINUTES')],
  ['材料範囲内', app.includes('materialRequirementsFor(looseDraft)') && app.includes('materialRequirementsFor(plainDraft)')],
  ['注文材料を保護', app.includes('注文用に確保した材料は使用しません') && app.includes('looseAvailableQuantity(gemId, shapeId)')],
  ['完成品上限を保護', app.includes('storedCount >= state.inventory.capacity')],
  ['自動制作を完成品在庫へ追加', app.includes("status: 'stored'") && app.includes("madeBy: 'workshopStaff'")],
  ['プレイヤー職人経験値を加算しない', app.includes('xp: 0')],
  ['職人スタッフ専用品質', app.includes('workshopStaffQualityRoll') && data.includes('goodChance') && data.includes('premiumChance')],
  ['日当支払い', app.includes('職人スタッフの日当（Lv.${beforeDefinition.level}）') && app.includes('state.game.money = Math.max(0, state.game.money - wage)')],
  ['一日の結果', app.includes('<div><span>職人スタッフ</span>') && app.includes('自動制作${result.workshopStaff.crafted}点')],
  ['セーブ互換', data.includes('workshopStaffSource') && data.includes('workMinutesBank') && data.includes('workedMinutesToday')],
  ['工房のBGM・環境音を共有', audioMap.includes("workshopStaff: 'workshop'")],
];
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'NG'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
