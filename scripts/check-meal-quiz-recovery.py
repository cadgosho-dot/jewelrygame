#!/usr/bin/env python3
"""JEWELRY×JEWELRY v0.10.654 meal/quiz recovery audit.

Guards regressions found by reload/crash review:
- active meal events must resume before normal hunger/same-meal/money/time gates
- normal meal state is committed atomically before the eating animation screen
- active sushi-chef/free-kaitenzushi must resume before normal kaitenzushi gates
- Okachimachi Quiz King and loose-shop 3D-glasses quiz sessions survive JSON save + migrateState()
- quiz runtime helpers are wired to save, restore, and clear persisted sessions

Run: python scripts/check-meal-quiz-recovery.py
Exits 0 on PASS, 1 on failure.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
GAME_DATA = ROOT / 'js' / 'game-data.js'
GAME_DATA_CORE = ROOT / 'js' / 'game-data-core.js'

errors: list[str] = []
notes: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def function_block(source: str, name: str) -> str:
    match = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{', source)
    if not match:
        return ''
    brace = match.end() - 1
    depth = 0
    quote = ''
    escaped = False
    for i in range(brace, len(source)):
        ch = source[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            continue
        if ch in "'\"`":
            quote = ch
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return source[match.start():i + 1]
    return ''


app = APP.read_text(encoding='utf-8')

# 1) Normal meal event recovery must happen before normal meal gates.
eat = function_block(app, 'eatMeal')
if not eat:
    fail('eatMeal() could not be parsed')
else:
    resume_pos = eat.find('resumeActiveMealEvent(mealId)')
    gate_markers = [
        'const before = hungerLevel()',
        "state.wellbeing.lastMeal === mealId",
        'state.game.money < actualPrice',
        '!canSpendMealTime()',
    ]
    gate_positions = [eat.find(marker) for marker in gate_markers]
    if resume_pos < 0 or any(pos < 0 for pos in gate_positions):
        fail('eatMeal() recovery/gate markers are incomplete')
    elif not all(resume_pos < pos for pos in gate_positions):
        fail('eatMeal(): active meal-event resume is not before every normal meal gate')
    else:
        notes.append('eatMeal active-event resume precedes hunger/same-meal/money/time gates')

    # 2) Commit all gameplay effects in one saved state before the animation screen.
    preload_pos = eat.find('await preloadMealAssets(mealId)')
    save_pos = eat.find('saveGame()', preload_pos + 1) if preload_pos >= 0 else -1
    animation_pos = eat.find("setScreen('meal', { mealId, eating: true }", preload_pos + 1) if preload_pos >= 0 else -1
    commit_markers = [
        'state.game.money -= actualPrice',
        'addFinance(`${meal.name}で食事`, 0, actualPrice)',
        'spendMealTime()',
        'state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery)',
        'state.wellbeing.lastMeal = mealId',
        'state.wellbeing.mealsEaten += 1',
        'state.daily.meals.push(',
    ]
    commit_positions = [eat.find(marker, preload_pos + 1) if preload_pos >= 0 else -1 for marker in commit_markers]
    if preload_pos < 0 or save_pos < 0 or animation_pos < 0 or any(pos < 0 for pos in commit_positions):
        fail('eatMeal(): atomic commit markers are incomplete')
    elif not (all(preload_pos < pos < save_pos for pos in commit_positions) and save_pos < animation_pos):
        fail('eatMeal(): payment/time/hunger/history are not atomically saved before eating animation')
    else:
        notes.append('normal meal payment/time/hunger/history commit before eating animation')

# 3) Specific trigger functions previously put new-trigger prerequisites before active resume.
for name, prerequisites in {
    'maybeStartRidleyOkazakiSobaEvent': ['state.game.money < eventCost', 'Math.floor(Math.random()'],
    'maybeStartWhiteBunnyIceEvent': ['!state?.store?.rented', 'Math.floor(Math.random()'],
    'maybeStartEmeraldCaptainKebabEvent': ['totalRequired', 'Math.floor(Math.random()'],
}.items():
    block = function_block(app, name)
    active_pos = block.find('if (eventState.active)')
    if not block or active_pos < 0:
        fail(f'{name}(): active-resume branch missing')
        continue
    bad = []
    for marker in prerequisites:
        pos = block.find(marker)
        if pos >= 0 and active_pos > pos:
            bad.append(marker)
    if bad:
        fail(f'{name}(): active resume occurs after new-trigger prerequisite(s): {bad}')
    else:
        notes.append(f'{name} active resume precedes new-trigger prerequisites')

# 4) Sushi-chef free event must recover before kaitenzushi normal gates.
kaiten = function_block(app, 'startKaitenzushi')
if not kaiten:
    fail('startKaitenzushi() could not be parsed')
else:
    resume_pos = kaiten.find('savedSushiEvent.active')
    normal_gate_positions = [
        kaiten.find('const current = hungerLevel()'),
        kaiten.find("state.wellbeing.lastMeal === 'kaitenzushi'"),
        kaiten.find('state.game.money < 190'),
        kaiten.find('!canSpendMealTime()'),
    ]
    if resume_pos < 0 or any(pos < 0 for pos in normal_gate_positions):
        fail('startKaitenzushi(): active-event recovery/gate markers are incomplete')
    elif not all(resume_pos < pos for pos in normal_gate_positions):
        fail('startKaitenzushi(): active sushi-chef recovery is not before normal gates')
    else:
        notes.append('sushi-chef/free-kaitenzushi recovery precedes normal gates')

# 5) App lifecycle wiring for persisted quiz sessions.
required_app_snippets = [
    'function persistQuizSession(',
    'function clearPersistedQuizSession(',
    'function restorePersistedQuizSessionsAfterLoad()',
    'const restoredQuizScreen = restorePersistedQuizSessionsAfterLoad()',
    "persistQuizSession('okachimachi'",
    "persistQuizSession('looseShop'",
    "clearPersistedQuizSession('okachimachi'",
    "clearPersistedQuizSession('looseShop'",
]
for snippet in required_app_snippets:
    if snippet not in app:
        fail(f'Quiz persistence app wiring missing: {snippet}')

# 6) Executable JSON save + migrateState quiz-session round-trip for every stage.
node = shutil.which('node')
if not node:
    fail('Node.js is required for quiz session migrateState() round-trip audit')
else:
    runner = r'''import { initialState, migrateState, GEMS } from './game-data-under-test.mjs';
import fs from 'node:fs';
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const failures = [];
let checked = 0;
const allGemIds = Object.keys(GEMS);
const originalGemIds = Object.values(GEMS).filter(g => g?.originalLoose).map(g => g.id);
const genericGem = allGemIds[0] || '';
const originalGem = originalGemIds[0] || genericGem;
const makeQuestion = (tag) => ({
  id: 17,
  question: `persist-${tag}`,
  choices: ['A','B','C','D'],
  answerIndex: 2,
  explanation: `explanation-${tag}`,
  difficultyLabel: '監査',
  auditExtra: { keep: true },
});
for (const spec of payload.specs) {
  for (const stage of spec.stages) {
    const save = initialState();
    const question = makeQuestion(`${spec.key}-${stage}`);
    const session = {
      stage,
      questionIndex: 9,
      question,
      selectedIndex: ['correct','incorrect','incorrectAnswer','reward','farewell'].includes(stage) ? 2 : null,
      rewardGemId: stage === 'reward' || stage === 'farewell' ? (spec.original ? originalGem : genericGem) : '',
    };
    if (spec.returnData) session.returnData = { tab: 'buy', audit: 'keep' };
    save.events[spec.field] = session;
    const migrated = migrateState(JSON.parse(JSON.stringify(save)));
    const actual = migrated?.events?.[spec.field];
    checked += 1;
    if (!actual) {
      failures.push(`${spec.field}:${stage} -> missing`);
      continue;
    }
    if (actual.stage !== stage || actual.questionIndex !== 9 || actual.question?.question !== question.question
        || actual.question?.answerIndex !== 2 || actual.question?.explanation !== question.explanation
        || actual.question?.auditExtra?.keep !== true) {
      failures.push(`${spec.field}:${stage} -> core payload changed`);
      continue;
    }
    const expectedSelected = session.selectedIndex;
    if (actual.selectedIndex !== expectedSelected) {
      failures.push(`${spec.field}:${stage} -> selectedIndex=${String(actual.selectedIndex)} expected=${String(expectedSelected)}`);
    }
    if (session.rewardGemId && actual.rewardGemId !== session.rewardGemId) {
      failures.push(`${spec.field}:${stage} -> rewardGemId lost`);
    }
    if (spec.returnData && (actual.returnData?.tab !== 'buy' || actual.returnData?.audit !== 'keep')) {
      failures.push(`${spec.field}:${stage} -> returnData changed`);
    }
  }
}
process.stdout.write(JSON.stringify({ checked, failures }));
'''
    specs = [
        {
            'key': 'okachimachi',
            'field': 'okachimachiQuizSession',
            'stages': ['video', 'intro1', 'intro2', 'question', 'correct', 'incorrect', 'incorrectAnswer', 'reward'],
            'original': False,
            'returnData': False,
        },
        {
            'key': 'looseShop',
            'field': 'looseShopOriginalQuizSession',
            'stages': ['intro1', 'intro2', 'intro3', 'intro4', 'question', 'correct', 'incorrect', 'incorrectAnswer', 'reward', 'farewell'],
            'original': True,
            'returnData': True,
        },
    ]
    with tempfile.TemporaryDirectory(prefix='jj-meal-quiz-recovery-') as temp_name:
        temp = Path(temp_name)
        shutil.copy2(GAME_DATA, temp / 'game-data-under-test.mjs')
        shutil.copy2(GAME_DATA_CORE, temp / 'game-data-core.js')
        (temp / 'runner.mjs').write_text(runner, encoding='utf-8')
        payload = temp / 'payload.json'
        payload.write_text(json.dumps({'specs': specs}, ensure_ascii=False), encoding='utf-8')
        proc = subprocess.run([node, str(temp / 'runner.mjs'), str(payload)], cwd=temp, text=True, capture_output=True)
    if proc.returncode != 0:
        fail('Quiz session Node round-trip runner failed: ' + (proc.stderr.strip() or proc.stdout.strip()))
    else:
        try:
            result = json.loads(proc.stdout)
            failures = result.get('failures') or []
            if failures:
                for failure in failures:
                    fail(f'Quiz session round-trip: {failure}')
            else:
                notes.append(f'quiz session JSON+migrateState round-trip: {result.get("checked", 0)} stages checked')
        except Exception as exc:
            fail(f'Quiz session round-trip output parse failed: {exc}')

if errors:
    print('MEAL / QUIZ RECOVERY AUDIT: FAIL')
    for error in errors:
        print(f'ERROR: {error}')
    for note in notes:
        print(f'OK: {note}')
    sys.exit(1)

print('MEAL / QUIZ RECOVERY AUDIT: PASS')
for note in notes:
    print(f'OK: {note}')
