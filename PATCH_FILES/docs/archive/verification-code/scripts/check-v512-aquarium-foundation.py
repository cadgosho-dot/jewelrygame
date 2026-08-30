#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
app = (root/'js/app.js').read_text()
data = (root/'js/game-data.js').read_text()
styles = (root/'styles.css').read_text()
checks = {
    'initial aquarium state': 'aquarium: {' in data and 'unlocked: false' in data and 'items: {}' in data,
    'aquarium migration normalization': 'state.aquarium.unlocked = Boolean' in data and 'savedAquariumItems' in data,
    'unlock helper': 'function unlockAquariumFeature' in app,
    'quantity sync helper': 'function setAquariumItemQuantity' in app and 'function addAquariumItem' in app,
    'conditional phone tab': "data-tab=\"aquarium\"" in app and 'aquariumUnlocked()' in app,
    'phone aquarium renderer': 'function renderPhoneAquarium' in app,
    'emergency feature hook': 'unlockFeaturesOnEmergency' in app and 'applyEmergencyFeatureUnlocks' in app,
    'aquarium styling': '.phone-aquarium-placeholder' in styles,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    raise SystemExit('FAILED: ' + ', '.join(failed))
print('RESULT: PASS')
