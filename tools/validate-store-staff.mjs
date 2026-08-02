import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'js/game-data.js'), 'utf8');
const checks = [
  ['店舗スタッフ画面', app.includes("return shell('店舗スタッフ'" )],
  ['店舗スタッフボタン', app.includes('data-screen="employee">店舗スタッフ</button>')],
  ['3名の名前', data.includes("name: '青木 ひなた'") && data.includes("name: '白石 真奈'") && data.includes("name: '城戸 涼介'")],
  ['担当制なし', !app.includes('data-action="employee-role"') && !app.includes('得意担当') && !app.includes('制作補助担当')],
  ['勤務日数データ', data.includes('workDays: 0') && app.includes('employee.workDays = Math.max(0, Math.floor(Number(employee.workDays) || 0)) + 1')],
  ['成長判定の一元化', data.includes('export function storeStaffGrowthForWorkDays') && app.includes('storeStaffGrowthForWorkDays(employee?.workDays)')],
  ['5段階成長', data.includes("label: '見習い'") && data.includes("label: '新人'") && data.includes("label: '一人前'") && data.includes("label: 'ベテラン'") && data.includes("label: '熟練'")],
  ['成長日数', data.includes('minWorkDays: 5') && data.includes('minWorkDays: 15') && data.includes('minWorkDays: 30') && data.includes('minWorkDays: 60')],
  ['初期能力が低い', data.includes("level: 1, label: '見習い', minWorkDays: 0, visitorBonus: 0, customerVisitBonus: 0.01, purchaseBonus: 0.01, saleBonus: 0.02")],
  ['来店人数効果', app.includes('visitors += storeStaffVisitorBonus(activeEmployee)')],
  ['来店抽選効果', app.includes('storeStaffCustomerVisitBonus(visitEmployee)')],
  ['購入率効果', app.includes('storeStaffPurchaseBonus(branchNumber)')],
  ['販売率効果', app.includes('chance += storeStaffSaleBonus(activeEmployee)')],
  ['制作時間へ影響なし', !data.includes("employee?.role === 'craft'") && !app.includes('店舗スタッフ補助')],
  ['勤務日数画面表示', app.includes('勤務日数 ${workDays}日') && app.includes('次の成長まであと')],
  ['レベルアップ通知', app.includes("addNotification('店舗スタッフが成長しました'")],
  ['一日の結果表示', app.includes('販売力Lv.${entry.level}') && app.includes('勤務${entry.workDays}日')],
  ['配置トグル', app.includes('店舗に配置する')],
];
let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'NG'}: ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
