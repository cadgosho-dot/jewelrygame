from pathlib import Path
import sys

app = Path("js/app.js").read_text(encoding="utf-8")
css = Path("styles.css").read_text(encoding="utf-8")
game_data = Path("js/game-data.js").read_text(encoding="utf-8")

checks = [
    ("reward button action retained", 'class="kappa-jade-reward-button emerald-captain-kebab-reward-button" data-action="emerald-captain-kebab-event-next"' in app),
    ("legacy v753 compatibility retained", 'installEmeraldCaptainKebabTapCompatibility();' in game_data and 'button.click();' in game_data),
    ("v846 direct guard exists", 'activateEmeraldCaptainRewardFromDirectTouch' in app),
    ("direct guard restricted to showcase", "eventState.stage !== 'showcase'" in app),
    ("pointerup direct path", "document.addEventListener('pointerup', activateEmeraldCaptainRewardFromDirectTouch, true);" in app),
    ("touchend fallback path", "document.addEventListener('touchend', activateEmeraldCaptainRewardFromDirectTouch, { capture: true, passive: false });" in app),
    ("direct path advances event without depending on click", 'Promise.resolve(advanceEmeraldCaptainKebabEvent())' in app),
    ("successful reward tap enters purchase result", "eventState.stage = 'purchaseResult';" in app),
    ("purchase result immediately arms next-scene continuation", 'scheduleEmeraldCaptainPurchaseDialogue(1200);' in app),
    ("purchase-result render keeps reload fallback", "eventState.stage === 'purchaseResult'" in app and 'queueMicrotask(() => scheduleEmeraldCaptainPurchaseDialogue());' in app),
    ("next dialogue stage is purchase", "eventState.stage = 'purchase';" in app and "if (eventState.stage === 'purchase')" in app),
    ("purchase dialogue continues to meal scene", 'await startEmeraldCaptainKebabMeal();' in app),
    ("button and image rect fallback", 'button.getBoundingClientRect()' in app and 'image.getBoundingClientRect()' in app),
    ("child hit targets delegated to parent", '.emerald-captain-kebab-reward-button>*' in css and 'pointer-events:none!important' in css.split('v0.10.846 エメラルド班班長', 1)[1]),
]

failed = []
for name, ok in checks:
    print(('PASS' if ok else 'FAIL'), name)
    if not ok:
        failed.append(name)
if failed:
    sys.exit(1)
print('EMERALD CAPTAIN REWARD TAP AUDIT: PASS')
