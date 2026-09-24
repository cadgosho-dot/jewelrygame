import assert from 'node:assert/strict';
import {
  BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE,
  assessStoreAssortment,
  chooseAssessmentComments,
  buildBulldogStoreAssessmentDialogue,
} from '../js/events/bulldog-store-assessment-rules.js';

const jewelry = [
  { id:'j1', item:'ring', gem:'ruby', metal:'gold', looseShape:'round', design:'simple', finish:'mirror', recommendedPrice:50000 },
  { id:'j2', item:'pendant', gem:'sapphire', metal:'platinum', looseShape:'oval', design:'natural', finish:'matte', recommendedPrice:90000 },
  { id:'j3', item:'earrings', gem:'emerald', metal:'gold', looseShape:'emerald', design:'gorgeous', finish:'decorated', recommendedPrice:150000 },
  { id:'j4', item:'ring', gem:'ruby', metal:'platinum', looseShape:'pear', design:'simple', finish:'mirror-decorated', recommendedPrice:70000 },
  { id:'j5', item:'pendant', gem:'sapphire', metal:'gold', looseShape:'round', design:'natural', finish:'matte', recommendedPrice:120000 },
  { id:'j6', item:'ring', gem:'ruby', metal:'gold', looseShape:'round', design:'simple', finish:'mirror', recommendedPrice:50000 },
];

const showcase = (...ids) => ({
  id:'showcase',
  slots:ids.map((id, index) => id ? { jewelryId:id, sellingPrice:[50000,90000,150000,70000,120000,50000][index] } : null),
});

const snapshot = {
  game:{ day:321 },
  store:{
    name:'JEWEL BOX',
    branches:[
      { id:'branch-1', number:1, name:'JEWEL BOX', showcases:[showcase('j1','j2','j3','j4','j5')] },
      { id:'branch-2', number:2, name:'SECOND', showcases:[showcase('j6')] },
    ],
  },
  inventory:{ jewelry },
};

assert.equal(BULLDOG_STORE_ASSESSMENT_TRIGGER_CHANCE, 1 / 30);

const strong = assessStoreAssortment(snapshot, 'branch-1');
assert.equal(strong.rows.length, 5);
assert.equal(strong.metrics.jewelryTypes, 3);
assert.equal(strong.metrics.gemTypes, 3);
assert.equal(strong.metrics.metalTypes, 2);
assert.equal(strong.metrics.cuts, 4);
assert.equal(strong.metrics.designs, 3);
assert.ok(strong.goodCount > strong.badCount);

const strongComments = chooseAssessmentComments(strong, () => 0.25);
assert.equal(strongComments.length, 3);
assert.equal(strongComments.filter((entry) => entry.polarity === 'good').length, 2);
assert.equal(strongComments.filter((entry) => entry.polarity === 'bad').length, 1);
assert.equal(new Set(strongComments.map((entry) => entry.key)).size, 3);

const weak = assessStoreAssortment(snapshot, 'branch-2');
assert.equal(weak.rows.length, 1);
assert.ok(weak.goodCount <= weak.badCount);
const weakComments = chooseAssessmentComments(weak, () => 0.75);
assert.equal(weakComments.length, 3);
assert.equal(weakComments.filter((entry) => entry.polarity === 'good').length, 1);
assert.equal(weakComments.filter((entry) => entry.polarity === 'bad').length, 2);
assert.equal(new Set(weakComments.map((entry) => entry.key)).size, 3);

const built = buildBulldogStoreAssessmentDialogue(snapshot, 'branch-1', () => 0);
assert.equal(built.lines.length, 5);
assert.match(built.lines[0], /JEWEL BOX/);
assert.equal(built.comments.length, 3);

const otherStore = buildBulldogStoreAssessmentDialogue(snapshot, 'branch-2', () => 0);
assert.match(otherStore.lines[0], /SECOND/);
assert.equal(otherStore.assessment.rows.length, 1);

console.log('BULLDOG STORE ASSESSMENT RULES: PASS');
