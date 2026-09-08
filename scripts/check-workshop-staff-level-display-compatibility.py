#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
helper = (ROOT / 'js/ui/workshop-staff-quality-description.js').read_text(encoding='utf-8')
game_data = (ROOT / 'js/game-data.js').read_text(encoding='utf-8')
app = (ROOT / 'js/app.js').read_text(encoding='utf-8')

expected_thresholds = [
    (1, '見習い職人', 0),
    (2, '若手職人', 60),
    (3, '一人前職人', 180),
    (4, '熟練職人', 360),
    (5, '匠', 720),
]

for level, label, days in expected_thresholds:
    game_data_marker = f"level: {level}, label: '{label}', minWorkDays: {days}"
    helper_marker = f"level: {level}, label: '{label}', minWorkDays: {days}"
    assert game_data_marker in game_data, f'game-data threshold drift: {game_data_marker}'
    assert helper_marker in helper, f'display guard threshold drift: {helper_marker}'

assert 'workshopStaffDisplayGrowthForWorkDays' in helper
assert 'repairWorkshopStaffLegacyLevelDisplay' in helper
assert '実働制作日数' in helper
assert '制作力 Lv.${growth.level}/5' in helper
assert '/20' not in re.sub(r'旧プレイヤー.*?\n', '', helper), 'runtime display guard must not emit /20'

# The main runtime must continue deriving workshop-staff progression from workDays.
assert 'return workshopStaffGrowthForWorkDays(staff?.workDays);' in app
assert 'const workDays = Math.max(0, Math.floor(Number(source.workDays) || 0));' in app

# This compatibility module is display-only. It must not gain persistence/auth/cloud responsibilities.
for forbidden in (
    'saveGame(', 'saveState(', 'loadState(', 'firebase', 'firestore',
    'localStorage', 'indexedDB', 'state.workshopStaff =',
):
    assert forbidden not in helper, f'display guard must remain persistence-free: {forbidden}'

print('PASS: workshop staff legacy 20-level display compatibility guard')
