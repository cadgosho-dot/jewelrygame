import assert from 'node:assert/strict';
import { GEMS, looseShapeIdsForGem } from '../js/game-data-core.js';
import {
  ROBOT_STORE_ASSESSMENT_TRIGGER_CHANCE,
  ROBOT_STORE_ASSESSMENT_DIALOGUE,
  assessRobotStore,
  buildRobotStoreAssessmentDialogue,
} from '../js/events/robot-store-assessment-rules.js';

function emptyLoose() {
  return Object.fromEntries(Object.keys(GEMS).map((gemId) => [
    gemId,
    Object.fromEntries(looseShapeIdsForGem(gemId).map((shapeId) => [shapeId, 0])),
  ]));
}

const tradeableGemIds = Object.entries(GEMS)
  .filter(([, gem]) => !gem?.eventOnly && !gem?.noLooseShopTrade)
  .map(([gemId]) => gemId);

const fullLoose = emptyLoose();
for (const gemId of tradeableGemIds) {
  for (const shapeId of looseShapeIdsForGem(gemId)) fullLoose[gemId][shapeId] = 1;
}

const branch = {
  id:'branch-1',
  name:'JEWEL BOX',
  showcases:[
    { id:'a', slots:[
      { jewelryId:'j1' }, { jewelryId:'j2' }, { jewelryId:'j3' },
      { jewelryId:'j4' }, { jewelryId:'j5' }, null,
    ] },
  ],
};

const strongSnapshot = {
  game:{ day:321 },
  store:{ branches:[branch] },
  inventory:{ loose:fullLoose },
};

assert.equal(ROBOT_STORE_ASSESSMENT_TRIGGER_CHANCE, 1 / 30);

const strong = assessRobotStore(strongSnapshot, 'branch-1');
assert.equal(strong.showcase.totalSlots, 6);
assert.equal(strong.showcase.filledSlots, 5);
assert.equal(strong.showcase.level, 'high');
assert.equal(strong.looseKinds.ownedCount, strong.looseKinds.possibleCount);
assert.equal(strong.looseKinds.level, 'high');
assert.equal(strong.looseCuts.ownedCount, strong.looseCuts.possibleCount);
assert.equal(strong.looseCuts.level, 'high');

const strongBuilt = buildRobotStoreAssessmentDialogue(strongSnapshot, 'branch-1');
assert.deepEqual(strongBuilt.lines, [
  ROBOT_STORE_ASSESSMENT_DIALOGUE.intro,
  ROBOT_STORE_ASSESSMENT_DIALOGUE.showcase.good,
  ROBOT_STORE_ASSESSMENT_DIALOGUE.looseKinds.good,
  ROBOT_STORE_ASSESSMENT_DIALOGUE.looseCuts.good,
  ROBOT_STORE_ASSESSMENT_DIALOGUE.calculating,
  ROBOT_STORE_ASSESSMENT_DIALOGUE.closing,
]);

const weakLoose = emptyLoose();
const firstGemId = tradeableGemIds[0];
const firstShapeId = looseShapeIdsForGem(firstGemId)[0];
weakLoose[firstGemId][firstShapeId] = 1;

const weakSnapshot = {
  game:{ day:322 },
  store:{
    branches:[{
      id:'branch-2',
      name:'SECOND',
      showcases:[{ id:'b', slots:[{ jewelryId:'j1' }, null, null, null, null, null] }],
    }],
  },
  inventory:{ loose:weakLoose },
};

const weak = assessRobotStore(weakSnapshot, 'branch-2');
assert.equal(weak.showcase.level, 'low');
assert.equal(weak.looseKinds.level, 'low');
assert.equal(weak.looseCuts.level, 'low');

const weakBuilt = buildRobotStoreAssessmentDialogue(weakSnapshot, 'branch-2');
assert.equal(weakBuilt.lines[1], ROBOT_STORE_ASSESSMENT_DIALOGUE.showcase.bad);
assert.equal(weakBuilt.lines[2], ROBOT_STORE_ASSESSMENT_DIALOGUE.looseKinds.bad);
assert.equal(weakBuilt.lines[3], ROBOT_STORE_ASSESSMENT_DIALOGUE.looseCuts.bad);
assert.equal(weakBuilt.lines[4], '総合評価を算出中……。');
assert.equal(weakBuilt.lines[5], '評価データを保存しました。次回も確認します。');

const missing = buildRobotStoreAssessmentDialogue(weakSnapshot, 'missing');
assert.deepEqual(missing.lines, []);

console.log('ROBOT STORE ASSESSMENT RULES: PASS');
