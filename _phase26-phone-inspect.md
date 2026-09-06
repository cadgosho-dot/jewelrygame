# Phase26 phone core inspection

## usePhoneItem (line 20655)
```js
function usePhoneItem(itemId) {
  const item = GENERAL_ITEMS[itemId];
  const owned = Number(state.inventory.items?.[itemId] || 0);
  if (!item || !item.usable || owned <= 0) {
    showToast('使用できるアイテムがありません。', 'error');
    return;
  }
  const beforeHunger = hungerLevel();
  let changed = false;
  if (Number(item.effect?.hunger) > 0) {
    const after = Math.min(7, beforeHunger + Number(item.effect.hunger));
    if (after > beforeHunger) {
      state.wellbeing.hunger = after;
      changed = true;
    }
  }
  if (!changed) {
    showToast('今はこのアイテムを使う必要がありません。', 'error');
    return;
  }
  state.inventory.items[itemId] = owned - 1;
  saveGame();
  playSfx(item.sfx || 'success');
  if (item.id === 'energyDrink') {
    window.setTimeout(() => playSfx('success', { gain: .72 }), 260);
    vibrate([25, 22, 48]);
  }
  setPhoneItemFeedback(`${item.name}を使いました`, phoneItemEffectText(item, beforeHunger, hungerLevel()), item.symbol || '◆');
  render();
}
```

## togglePhoneEquipment (line 20686)
```js
function togglePhoneEquipment(equipmentId) {
  const item = EQUIPMENT_ITEMS[equipmentId];
  const owned = Number(state.inventory.equipment?.[equipmentId] || 0);
  if (!item || owned <= 0) {
    showToast('その装備品を持っていません。', 'error');
    return;
  }
  const currentlyEquipped = state.inventory.equipped?.[item.slot] === equipmentId;
  state.inventory.equipped[item.slot] = currentlyEquipped ? '' : equipmentId;
  saveGame();
  playSfx('success');
  setPhoneItemFeedback(item.name, currentlyEquipped ? '装備を外しました。' : '装備しました。', item.symbol || '◇');
  render();
}
```

## References: usePhoneItem
### lines 20651-20659
```js
20651:     className: 'phone-item-image-modal',
20652:   });
20653: }
20654: 
20655: function usePhoneItem(itemId) {
20656:   const item = GENERAL_ITEMS[itemId];
20657:   const owned = Number(state.inventory.items?.[itemId] || 0);
20658:   if (!item || !item.usable || owned <= 0) {
20659:     showToast('使用できるアイテムがありません。', 'error');
```

### lines 25008-25016
```js
25008:       state.game.financePeriod = validFinancePeriod(button.dataset.period);
25009:       render();
25010:       saveGame();
25011:       break;
25012:     case 'use-phone-item': usePhoneItem(button.dataset.id); break;
25013:     case 'toggle-equipment': togglePhoneEquipment(button.dataset.id); break;
25014:     case 'eat-meal': await eatMeal(button.dataset.id); break;
25015:     case 'meal-eating-finish': finishMealEatingEarly(); break;
25016:     case 'play-kaitenzushi': startKaitenzushi(); break;
```

## References: togglePhoneEquipment
### lines 20682-20690
```js
20682:   setPhoneItemFeedback(`${item.name}を使いました`, phoneItemEffectText(item, beforeHunger, hungerLevel()), item.symbol || '◆');
20683:   render();
20684: }
20685: 
20686: function togglePhoneEquipment(equipmentId) {
20687:   const item = EQUIPMENT_ITEMS[equipmentId];
20688:   const owned = Number(state.inventory.equipment?.[equipmentId] || 0);
20689:   if (!item || owned <= 0) {
20690:     showToast('その装備品を持っていません。', 'error');
```

### lines 25009-25017
```js
25009:       render();
25010:       saveGame();
25011:       break;
25012:     case 'use-phone-item': usePhoneItem(button.dataset.id); break;
25013:     case 'toggle-equipment': togglePhoneEquipment(button.dataset.id); break;
25014:     case 'eat-meal': await eatMeal(button.dataset.id); break;
25015:     case 'meal-eating-finish': finishMealEatingEarly(); break;
25016:     case 'play-kaitenzushi': startKaitenzushi(); break;
25017:     case 'retry-kaitenzushi': retryKaitenzushi(); break;
```
