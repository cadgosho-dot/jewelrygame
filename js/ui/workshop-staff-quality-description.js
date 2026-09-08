// Pure display formatter for workshop-staff quality probabilities.

const WORKSHOP_STAFF_DISPLAY_GROWTH_LEVELS = Object.freeze([
  Object.freeze({ level: 1, label: '見習い職人', minWorkDays: 0 }),
  Object.freeze({ level: 2, label: '若手職人', minWorkDays: 60 }),
  Object.freeze({ level: 3, label: '一人前職人', minWorkDays: 180 }),
  Object.freeze({ level: 4, label: '熟練職人', minWorkDays: 360 }),
  Object.freeze({ level: 5, label: '匠', minWorkDays: 720 }),
]);

export function workshopStaffDisplayGrowthForWorkDays(workDays = 0) {
  const days = Math.max(0, Math.floor(Number(workDays) || 0));
  return [...WORKSHOP_STAFF_DISPLAY_GROWTH_LEVELS].reverse()
    .find((entry) => days >= entry.minWorkDays)
    || WORKSHOP_STAFF_DISPLAY_GROWTH_LEVELS[0];
}

function displayedWorkshopStaffWorkDays(card) {
  if (!card?.querySelectorAll) return null;
  for (const row of card.querySelectorAll('.workshop-staff-status > div')) {
    const heading = row.querySelector('strong')?.textContent?.trim();
    if (heading !== '実働制作日数') continue;
    const text = row.querySelector('span')?.textContent || '';
    const match = text.replaceAll(',', '').match(/\d+/);
    return match ? Math.max(0, Math.floor(Number(match[0]) || 0)) : null;
  }
  return null;
}

// v0.10.936 compatibility guard:
// 旧プレイヤーの画面に「職人スタッフ 13/20」など主人公用20段階表示が残っても、
// 保存データには触れず、現行の実働制作日数からLv.1〜5を再判定して表示だけを修復する。
export function repairWorkshopStaffLegacyLevelDisplay(root = globalThis.document) {
  if (!root?.querySelector) return false;
  const card = root.querySelector('.workshop-staff-card');
  if (!card) return false;

  const workDays = displayedWorkshopStaffWorkDays(card);
  if (workDays === null) return false;

  const levelText = [...card.querySelectorAll('.success-text')]
    .find((element) => /制作力\s*Lv\./.test(element.textContent || ''));
  if (!levelText) return false;

  const growth = workshopStaffDisplayGrowthForWorkDays(workDays);
  const expected = `制作力 Lv.${growth.level}/5（${growth.label}）`;
  if (levelText.textContent !== expected) levelText.textContent = expected;
  return true;
}

function scheduleWorkshopStaffLegacyLevelRepair() {
  if (typeof globalThis.document === 'undefined') return;
  const repair = () => repairWorkshopStaffLegacyLevelDisplay(globalThis.document);
  if (typeof globalThis.queueMicrotask === 'function') globalThis.queueMicrotask(repair);
  else Promise.resolve().then(repair);
}

export function formatWorkshopStaffQualityDescription(definition) {
  // This formatter is called while the workshop-staff card is being rendered.
  // Run the compatibility guard immediately after that synchronous render finishes.
  scheduleWorkshopStaffLegacyLevelRepair();

  const good = Math.round((Number(definition?.goodChance) || 0) * 100);
  const premium = Math.round((Number(definition?.premiumChance) || 0) * 100);
  if (!good && !premium) return '品質：標準のみ';
  return `品質：良品${good}%${premium ? `・上質${premium}%` : ''}`;
}
