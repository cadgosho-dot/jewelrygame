#!/usr/bin/env python3
"""Protect save loading, migration, validation, and recovery behavior."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-load-game-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase41-sync-v010930.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


load = section('loadGame')
preferred = 'const preferred = preferredSavedState();'
missing = 'if (!preferred.state) return null;'
migrate = 'const loaded = migrateState(preferred.state);'
validate = "if (!isSaveStateCandidate(loaded)) throw new Error('移行後のセーブデータが不正です。');"
schema = 'loaded.saveSchemaVersion = SAVE_SCHEMA_VERSION;'
filter_note = 'loaded.notifications = loaded.notifications.filter((note) => !isUnneededHungerNotification(note));'
notice = "saveRecoveryNotice = saveRecoveryNotice || 'セーブデータの移行または整合性確認に失敗しました。';"
details = 'saveRecoveryDetails = String(error?.message || error);'

checks = {
    'loadGame definition exists once': APP.count('function loadGame(') == 1,
    'preferred saved state selection retained': preferred in load,
    'missing saved state returns null retained': missing in load,
    'migration retained': migrate in load,
    'migrated state validation retained': validate in load,
    'current save schema assignment retained': schema in load,
    'unneeded hunger notification filtering retained': filter_note in load,
    'recovery notice fallback retained': notice in load,
    'recovery details retained': details in load,
    'failure returns null retained': load.count('return null;') >= 2,
    'critical load order retained': all(token in load for token in [preferred, missing, migrate, validate, schema, filter_note]) and load.index(preferred) < load.index(missing) < load.index(migrate) < load.index(validate) < load.index(schema) < load.index(filter_note),
    'dynamic test extracts current production function': all(token in TEST for token in [
        "extractFunction('loadGame')",
        'vm.runInContext(source, ctx',
        'loadGame()',
    ]),
    'registered in audit or pending formal sync': 'check-load-game-regression.py' in CURRENT or (SYNC.is_file() and 'check-load-game-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testMissingPreferredStateReturnsNullWithoutMigration',
    'testValidStateMigratesAndForcesCurrentSchemaVersion',
    'testUnneededHungerNotificationsAreFilteredAfterMigration',
    'testStateWithoutNotificationsLoadsNormally',
    'testInvalidMigratedStateReturnsNullAndRecordsRecovery',
    'testMigrationFailureReturnsNullAndRecordsMessage',
    'testExistingRecoveryNoticeIsNotOverwritten',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('LOAD GAME PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-load-game-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('LOAD GAME PROTECTION: PASS')
