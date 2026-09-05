# Phase16 core candidates
protected known: ['buyDisplayProduct', 'buyMetal', 'buyWorkshopTool', 'confirmJewelryShopTrade', 'confirmOrder', 'craft', 'createWorkshopToolRecord', 'customerBuy', 'deliverOrder', 'finishMiningRock', 'polishRough', 'purchase', 'repairWorkshopTool', 'sellLoose', 'sellMetal', 'sellRough', 'settleDay', 'workshopToolRepairPrice']

## runEventEmergencySettlement line 698 score 145
```js

function runEventEmergencySettlement(key, eventState) {
  if (!key || !eventState) return false;
  const stage = String(eventState.stage || '');
  let changed = false;

  switch (key) {
    case 'westernUnionEvent':
      // 「いいえ」を選んだ場合や、まだ名前確認中の場合は報酬を付与しない。
      if (['gift', 'explain1', 'explain2', 'explain3'].includes(stage) && !eventState.rewardGranted) {
        grantWesternUnionAntiqueDiamond(eventState);
        changed = true;
      }
      break;

    case 'miningPazupanEvent':
      if (!eventState.rewardGranted) { grantPazupan(eventState); changed = true; }
      break;

    case 'mermaidEvent':
      if (!eventState.rewardGranted) { grantMermaidPearl(eventState); changed = true; }
      break;

    case 'tattooWomanAmberEvent':
      if (!eventState.rewardGranted) {
        adjustLooseInventory(TATTOO_WOMAN_AMBER_EVENT_GEM_ID, TATTOO_WOMAN_AMBER_EVENT_SHAPE_ID, 1);
        eventState.rewardGranted = true;
        addNotification('琥珀を手に入れました', '工房のルースへ追加されました。', 'special');
        changed = true;
      }
      break;

    case 'kappaJadeEvent':
      changed = grantEmergencyRough(eventState, 'jade', '翡翠原石を手に入れました', '工房の原石へ追加されました。研磨すると翡翠のルースになります。') || changed;
      break;

    case 'workshopKappaJadeEvent':
      changed = grantEmergencyRough(eventState, 'jade', '翡翠原石を手に入れました', '工房の原石へ追加されました。研磨すると翡翠のルースになります。') || changed;
      break;

    case 'okachimachiTollEvent': {
      const rewardStages = ['jadeReward', 'paymentDemand', 'paymentNotice', 'farewell'];
      if (rewardStages.includes(stage) && !eventState.rewardGranted) {
        changed = grantEmergencyRough(eventState, 'jade', '翡翠原石を手に入れました', 'キャベツ野郎から渡された翡翠原石を工房へ追加しました。') || changed;
      }
      if ((eventState.rewardGranted || rewardStages.includes(stage)) && !eventState.paymentApplied) {
        state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - OKACHIMACHI_TOLL_EVENT_COST);
        addFinance('御徒町の通行費', 0, OKACHIMACHI_TOLL_EVENT_COST);
        eventState.paymentApplied = true;
        changed = true;
      }
      break;
    }

    case 'cyclopsEvent':
      changed = grantEmergencyItem(eventState, 'energyDrink', '栄養ドリンクを手に入れました', 'コンビニのサイクロプスから、キャンペーン中の栄養ドリンクを1本受け取りました。') || changed;
      break;

    case 'ganeshaTuskEvent':
      changed = grantEmergencyRough(eventState, GANESHA_TUSK_GEM_ID, 'ガネーシャの牙を手に入れました', '工房の原石へ追加されました。研磨すると象牙のルースになります。') || changed;
      break;

    case 'yowamushiRoseQuartzEvent':
      if (!eventState.rewardGranted) {
        state.inventory.loose = state.inventory.loose && typeof state.inventory.loose === 'object' ? state.inventory.loose : {};
        state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] = state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] && typeof state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] === 'object' ? state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] : {};
        state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID][YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID] = Math.max(0, Math.floor(Number(state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID][YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID]) || 0)) + 1;
        eventState.rewardGranted = true;
        addNotification('ローズクォーツを手に入れました', '工房のルースへ追加されました。', 'special');
        changed = true;
      }
      break;

    case 'touristWoodSwordEvent':
      changed = grantEmergencyItem(eventState, 'bokuto', '木刀を手に入れました', '観光客から木刀を受け取りました。持っている間は強盗の発生率が半分になります。') || changed;
      eventState.triggered = true;
      break;

    case 'diamondPolishingLapEvent':
      if (!eventState.rewardGranted || !toolOwned('diamondPolishingLap')) {
        grantDiamondPolishingLap(eventState);
        changed = true;
      }
      break;

    case 'clockTowerDonationEvent':
      if (!eventState.donationApplied) {
        state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - 100000);
        eventState.donationApplied = true;
        addFinance('時計台募金', 0, 100000);
        addNotification('時計台募金で100,000円を支払いました', '御徒町パンダ広場の時計台建設へ寄付しました。', 'special');
        changed = true;
      }
      break;

    case 'mysteryChineseMealEvent':
      changed = settleMysteryChineseMealEmergency(eventState) || changed;
      eventState.selectedDish = '';
      break;

    case 'hauntingEvent':
      if (!eventState.paymentApplied) {
        state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - HAUNTING_EVENT_COST);
        addFinance('お祓い', 0, HAUNTING_EVENT_COST);
        eventState.paymentApplied = true;
        changed = true;
      }
      break;

    case 'cinemaVisitEvent':
      // 招待画面で終了した場合はキャンセル扱い。上映開始後だけ料金と時間を確定する。
      if (stage === 'playing' && !eventState.settled) {
        eventState.settled = true;
        eventState.lastVideo = eventState.selectedVideo;
        state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - CINEMA_VISIT_EVENT_COST);
        spendHours(CINEMA_VISIT_EVENT_HOURS);
        addFinance('映画館で映画鑑賞', 0, CINEMA_VISIT_EVENT_COST);
        addNotification('映画を観ました', `${CINEMA_VISIT_EVENT_HOURS}時間が経過し、${yen(CINEMA_VISIT_EVENT_COST)}を支払いました。`, 'special');
        changed = true;
      }
// ... truncated ...
```

## autopilotDeliverCompletedOrders line 22965 score 109
```js

function autopilotDeliverCompletedOrders(summary) {
  const completed = state.orders
    .filter((order) => order.status === '完成')
    .sort((a, b) => Number(a.deadlineDay) - Number(b.deadlineDay));
  for (const order of completed) {
    const item = state.inventory.jewelry.find((entry) => entry.id === order.jewelryId);
    const branch = storeBranchByNumber(order.branchNumber);
    if (!item || !storeBranchOperating(branch) || state.game.day > Number(order.deadlineDay)) continue;
    order.status = '完了';
    order.closedDay = state.game.day;
    order.deliveredDay = state.game.day;
    item.status = 'sold';
    item.removedDay = state.game.day;
    item.soldDay = state.game.day;
    item.soldPrice = Math.round(Number(order.price) || 0);
    item.soldProfit = Math.round((Number(order.price) || 0) - Math.max(0, Number(item.cost) || 0));
    item.soldBranchNumber = Math.max(1, Number(order.branchNumber) || 1);
    item.soldChannel = 'order-autopilot';
    state.game.money += order.price;
    state.store.salesCount += 1;
    state.store.totalRevenue += order.price;
    state.store.totalProfit += order.price - item.cost;
    state.store.deliveredOrderCount = Math.max(0, Math.floor(Number(state.store.deliveredOrderCount) || 0)) + 1;
    addStoreProgress({ branchNumber: order.branchNumber, rating: 1, orderDelivery: true });
    const customerState = state.customers[order.customerId];
    if (customerState) {
      customerState.purchases += 1;
      customerState.relation = customerState.purchases >= 3 ? '常連客' : 'リピーター';
    }
    addFinance(`自動操縦：${order.customerName}さんへ注文品を納品`, order.price, 0);
    consumeStoreCase(branch);
    summary.ordersCompleted += 1;
    summary.sold += 1;
    summary.income += order.price;
  }
}
```

## rentNextStore line 22228 score 99
```js

function rentNextStore() {
  const branchNumber = nextStoreBranchNumber();
  if (branchNumber > MAX_STORE_BRANCHES) return showToast('現在契約できる店舗はありません。', 'error');

  const firstStore = branchNumber === 1;
  const input = document.querySelector('#store-name-input');
  const currentStoreName = String(state.store.name || '').trim().slice(0, 30);
  const storeName = currentStoreName || String(input?.value || '').trim().slice(0, 30);

  if (!storeName) {
    showToast('店舗名を入力してください。', 'error');
    input?.focus();
    return;
  }
  const leaseCost = storeLeaseCost(branchNumber);
  if (state.game.money < leaseCost) return showToast('店舗の契約費が足りません。', 'error');

  state.game.money -= leaseCost;
  startMoneyFeedback(-leaseCost);

  if (!currentStoreName) {
    state.store.name = storeName;
    state.store.branches = contractedStoreBranches().map((branch) => ({ ...branch, name: storeName }));
  }
  if (firstStore) {
    state.store.branchNumber = 1;
    state.store.rented = true;
    state.store.rentedDay = state.game.day;
    state.store.showcases = [];
    state.store.showcaseCount = 0;
    state.store.displaySuppliesInstalled = 0;
    state.store.casesInstalled = 0;
    state.store.level = 1;
    state.store.points = 0;
    state.store.rating = 50;
  }

  const branchLabel = storeBranchLabel(branchNumber);
  state.store.branches = contractedStoreBranches().filter((branch) => Number(branch.number) !== branchNumber);
  state.store.branches.push({
    id: `branch-${branchNumber}`,
    number: branchNumber,
    label: branchLabel,
    name: storeName,
    rentedDay: state.game.day,
    suspended: false,
    unpaidRent: 0,
    points: 0,
    level: 1,
    peakLevel: 1,
    paidThroughLevel: 1,
    operatingDays: 0,
    totalRevenue: 0,
    serviceSuccesses: 0,
    openMinutesToday: 0,
    visitorsToday: 0,
    rating: 50,
    salesCount: 0,
    orderDeliveries: 0,
    displaySuppliesInstalled: 0,
    casesInstalled: 0,
    showcases: [],
    showcaseCount: 0,
    employee: storeEmployeeDefaults(branchNumber),
  });
  state.store.rented = true;
  state.facilities.realEstate = true;

  addFinance(`${storeName} ${branchLabel}を契約`, 0, leaseCost);
  addNotification('店舗を契約しました', `${branchLabel}が店舗画面から選択できるようになりました。`);
  saveGame();
  showToast(`${branchLabel}を契約しました。`, 'info', false);
  setScreen('realEstate', {}, false);
}
```

## contractedStoreBranches line 4624 score 89
```js

function contractedStoreBranches() {
  const branches = Array.isArray(state?.store?.branches) ? state.store.branches : [];
  const normalized = branches
    .filter((branch) => branch && Number(branch.number) >= 1 && Number(branch.number) <= MAX_STORE_BRANCHES)
    .map((branch) => ({
      ...branch,
      id: branch.id || `branch-${Math.max(1, Number(branch.number) || 1)}`,
      number: Math.max(1, Number(branch.number) || 1),
      label: storeBranchLabel(branch.number),
      name: String(branch.name || state.store.name || '').trim().slice(0, 30),
      rentedDay: Math.max(1, Number(branch.rentedDay) || state.store.rentedDay || state.game.day),
      suspended: Boolean(branch.suspended),
      unpaidRent: Math.max(0, Number(branch.unpaidRent) || 0),
      points: Math.max(0, Math.floor(Number(branch.points) || 0)),
      level: Math.max(1, Math.min(20, Math.floor(Number(branch.level) || 1))),
      peakLevel: Math.max(1, Math.min(20, Math.floor(Number(branch.peakLevel) || Number(branch.level) || 1))),
      paidThroughLevel: Math.max(1, Math.min(20, Math.floor(Number(branch.paidThroughLevel) || Number(branch.level) || 1))),
      operatingDays: Math.max(0, Math.floor(Number(branch.operatingDays) || 0)),
      totalRevenue: Math.max(0, Math.floor(Number(branch.totalRevenue) || 0)),
      serviceSuccesses: Math.max(0, Math.floor(Number(branch.serviceSuccesses) || 0)),
      openMinutesToday: Math.max(0, Math.floor(Number(branch.openMinutesToday) || 0)),
      visitorsToday: Math.max(0, Math.floor(Number(branch.visitorsToday) || 0)),
      rating: Math.max(0, Math.min(100, Number.isFinite(Number(branch.rating)) ? Math.round(Number(branch.rating)) : 50)),
      salesCount: Math.max(0, Math.floor(Number(branch.salesCount) || 0)),
      orderDeliveries: Math.max(0, Math.floor(Number(branch.orderDeliveries) || 0)),
      displaySuppliesInstalled: Math.max(0, Math.floor(Number(branch.displaySuppliesInstalled) || 0)),
      casesInstalled: Math.min(50, Math.max(0, Math.floor(Number(branch.casesInstalled) || 0))),
      showcases: Array.isArray(branch.showcases) ? branch.showcases : [],
      showcaseCount: Array.isArray(branch.showcases) ? branch.showcases.length : 0,
      employee: normalizedStoreEmployee(branch.employee, branch.number, Number(branch.number) === 1 ? state?.employee : null),
    }))
    .sort((left, right) => left.number - right.number);
  if (state?.store?.rented && !normalized.some((branch) => branch.number === 1)) {
    normalized.unshift({
      id: 'branch-1', number: 1, label: storeBranchLabel(1), name: String(state.store.name || '').trim().slice(0, 30),
      rentedDay: Math.max(1, Number(state.store.rentedDay) || 1), suspended: false, unpaidRent: 0,
      points: Math.max(0, Math.floor(Number(state.store.points) || 0)), level: Math.max(1, Math.min(20, Math.floor(Number(state.store.level) || 1))), peakLevel: Math.max(1, Math.min(20, Math.floor(Number(state.store.peakLevel) || Number(state.store.level) || 1))), paidThroughLevel: Math.max(1, Math.min(20, Math.floor(Number(state.store.paidThroughLevel) || Number(state.store.level) || 1))), operatingDays: Math.max(0, Math.floor(Number(state.store.operatingDays) || 0)), totalRevenue: Math.max(0, Math.floor(Number(state.store.totalRevenue) || 0)), serviceSuccesses: Math.max(0, Math.floor(Number(state.store.serviceSuccesses) || 0)), openMinutesToday: 0, visitorsToday: 0,
      rating: Math.max(0, Math.min(100, Number.isFinite(Number(state.store.rating)) ? Math.round(Number(state.store.rating)) : 50)), salesCount: 0, orderDeliveries: 0,
      displaySuppliesInstalled: Math.max(0, Math.floor(Number(state.store.displaySuppliesInstalled) || 0)),
      casesInstalled: Math.min(50, Math.max(0, Math.floor(Number(state.store.casesInstalled) || 0))),
      showcases: Array.isArray(state.store.showcases) ? state.store.showcases : [],
      showcaseCount: Array.isArray(state.store.showcases) ? state.store.showcases.length : 0,
      employee: normalizedStoreEmployee(state?.employee, 1),
    });
  }
  if (state?.store) state.store.branches = normalized;
  return normalized;
}
```

## buyTerryCaliforniaBenitoite line 9446 score 68
```js

function buyTerryCaliforniaBenitoite() {
  const eventState = terryCaliforniaEventState();
  if (!eventState.active || eventState.stage !== 'offer') return;
  if (state.game.money < TERRY_CALIFORNIA_BENITOITE_PRICE) {
    eventState.stage = 'insufficientFunds';
    saveGame();
    playSfx('alarm', { gain: 0.52, rate: 0.92 });
    vibrate(38);
    render();
    return;
  }
  state.game.money -= TERRY_CALIFORNIA_BENITOITE_PRICE;
  addFinance('テリー・カリフォルニアからベニトアイト購入', 0, TERRY_CALIFORNIA_BENITOITE_PRICE);
  startMoneyFeedback(-TERRY_CALIFORNIA_BENITOITE_PRICE, 1400);
  state.inventory.loose = state.inventory.loose && typeof state.inventory.loose === 'object' ? state.inventory.loose : {};
  state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] = state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] && typeof state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] === 'object' ? state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] : {};
  state.inventory.loose[TERRY_CALIFORNIA_GEM_ID][TERRY_CALIFORNIA_GEM_SHAPE] = Math.max(0, Math.floor(Number(state.inventory.loose[TERRY_CALIFORNIA_GEM_ID][TERRY_CALIFORNIA_GEM_SHAPE]) || 0)) + 1;
  eventState.rewardGranted = true;
  eventState.lastOutcome = 'purchased';
  eventState.stage = 'purchased';
  addNotification('ベニトアイトを手に入れた', '工房のルースにベニトアイトを追加しました。テリー・カリフォルニアから特別価格で購入した希少石です。', 'special');
  saveGame();
  showToast('ベニトアイトを手に入れた', 'success', false);
  playSfx('coin', { gain: 0.92, rate: 1.02 });
  setTimeout(() => playSfx('loose-sparkle', { gain: 1.08 }), 120);
  vibrate([24, 24, 52]);
  render();
}
```

## autopilotPrepareStore line 23037 score 64
```js

function autopilotPrepareStore(summary) {
  if (!state.store.rented) return;
  const branch = salesStoreBranch() || currentStoreBranch();
  if (!branch || !storeBranchOperating(branch)) return;
  if (installedShowcaseCount(branch) === 0 && okachimachiFacilityAvailability('displayShop').open) {
    const product = DISPLAY_SHOP_PRODUCTS.showcase;
    if (state.game.money >= product.price + 10000 && autopilotCanSpendHours(1, summary)) {
      state.game.money -= product.price;
      spendHours(1);
      branchShowcases(branch).push({ id: `showcase-auto-${Date.now()}-${state.game.day}`, slots: [null, null, null, null, null] });
      branch.showcaseCount = installedShowcaseCount(branch);
      mirrorCurrentStoreDisplay(branch);
      syncFinishedJewelryCapacity();
      addFinance('自動操縦：ショーケースを購入・設置', 0, product.price);
      summary.expense += product.price;
      summary.notes.push('ショーケースを設置');
    }
  }
  if (installedShowcaseCount(branch) > 0 && storeCaseRemaining(branch) === 0 && okachimachiFacilityAvailability('displayShop').open) {
    const quantity = 10;
    const price = DISPLAY_SHOP_PRODUCTS.case.price * quantity;
    if (state.game.money >= price + 2000 && autopilotCanSpendHours(1, summary)) {
      state.game.money -= price;
      spendHours(1);
      branch.casesInstalled = Math.min(storeMaximumCases(), storeCaseRemaining(branch) + quantity);
      state.store.casesInstalled = storeCaseRemaining(branch);
      syncStoreLevel(branch);
      addFinance(`自動操縦：ケースを${quantity}個購入・設置`, 0, price);
      summary.expense += price;
    }
  }
}
```

## render line 12547 score 52
```js

function render() {
  if (state) {
    const coldBlackoutRepaired = cancelWinterColdDuringBlackout();
    const alienDeadlockRepaired = repairAlienSpaceDeadlockV463();
    const legacyDeadlockRepaired = repairLegacyTransientEventDeadlocksV462();
    const deadlockRepaired = repairIllnessBirthdayDeadlock();
    const illnessOverlapRepaired = repairIllnessPaymentBirthdayOverlapV481();
    const ramenDeadlockRepaired = repairChildhoodFriendEventDeadlock();
    const morningOverlapRepaired = repairMorningOverlapDeadlockV475();
    if (coldBlackoutRepaired || alienDeadlockRepaired || legacyDeadlockRepaired || deadlockRepaired || illnessOverlapRepaired || ramenDeadlockRepaired || morningOverlapRepaired) queueMicrotask(() => saveGame());
  }
  if (state && illnessEventSuppressionActive()) {
    const birthdaySuppressed = suppressBirthdaySleepEventForIllness();
    const otherEventsSuppressed = suppressAllTransientEventsForIllness();
    if (birthdaySuppressed || otherEventsSuppressed > 0) queueMicrotask(() => saveGame());
  }
  if (state && illnessEventSuppressionActive() && ILLNESS_SUPPRESSED_EVENT_SCREENS.has(screen)) {
    screen = 'main';
    screenData = {};
    navigation = [];
    state.game.screen = 'main';
  }
  const settingsScrollState = captureSettingsScrollState();
  const pendingGiftScrollState = giftControlScrollSnapshot
    && performance.now() - Number(giftControlScrollSnapshot.capturedAt || 0) < 2000
    ? giftControlScrollSnapshot
    : null;
  giftControlScrollSnapshot = null;
  const giftSendScrollState = pendingGiftScrollState || captureGiftSendScrollState();
  try {
    if (!['robberyReport', 'speedStarEvent'].includes(screen)) stopPoliceSiren();
    document.body.dataset.screen = screen;
    if (usesTwoBarHeader(screen)) document.body.dataset.headerMode = 'two-bar';
    else delete document.body.dataset.headerMode;
    delete document.body.dataset.textSize;
    applyCurrentBackground();
    if (state) {
      const repairedEvents = repairEventProgressStates();
      if (repairedEvents > 0) queueMicrotask(() => saveGame());
      syncFinishedJewelryCapacity();
      const hour = Math.floor(state.game.minutes / 60);
      document.body.dataset.timeperiod = hour < 11 ? 'morning' : hour < 17 ? 'day' : hour < 20 ? 'evening' : 'night';
    }
    const currentAudioKey = audioFor(screen);
    if (screen === 'wristFoundEvent') startWristFoundDarkDrone();
    else stopWristFoundDarkDrone();
    if (screen === 'okachimachiInvasiveTurtlesEvent') {
      if (okachimachiInvasiveTurtlesEventAudio) okachimachiInvasiveTurtlesEventAudio.volume = okachimachiInvasiveTurtlesEventAudioVolume();
      else playOkachimachiInvasiveTurtlesEventAudio();
    } else {
      stopOkachimachiInvasiveTurtlesEventAudio();
    }
    if (screen === 'pandaMusicEvent') {
      if (pandaMusicEventAudio) pandaMusicEventAudio.volume = pandaMusicEventAudioVolume();
    } else {
      stopPandaMusicEventAudio();
    }
    if (screen === 'whiteBunnyIceEvent') {
      if (whiteBunnyEventBgmAudio) whiteBunnyEventBgmAudio.volume = whiteBunnyEventBgmVolume();
    } else {
      stopWhiteBunnyEventBgm();
    }
    if (backgroundFor(screen) !== 'meal') stopMealAudio();
    // 天気を使うかどうかはaudio-scene-map.jsの場面定義だけで判定する。
    // 画面側に重複した条件を持たせないことで、将来の変更時の戻りを防ぐ。
    updateMainEnvironment({
      active: Boolean(state),
      weather: state?.game?.weather || '晴れ',
      minutes: state?.game?.minutes ?? 9 * 60,
      audioKey: currentAudioKey,
    });
    const audioSwitchResult = switchAudio(currentAudioKey);
    if (screen === 'whiteBunnyIceEvent') {
      stopMealAudio();
      stopIceMealAudio();
      playWhiteBunnyEventBgm();
      Promise.resolve(audioSwitchResult).finally(() => {
        if (screen === 'whiteBunnyIceEvent') syncWhiteBunnyEventBgm();
      });
    } else if (screen === 'meal' && screenData?.eating === true && screenData?.mealId === 'ice') {
      stopMealAudio();
      startIceMealAudio();
      Promise.resolve(audioSwitchResult).finally(() => {
        if (screen === 'meal' && screenData?.eating === true && screenData?.mealId === 'ice') syncIceMealAudio();
      });
    } else {
      stopIceMealAudio();
    }

    const renderers = {
      loading: renderLoading,
      login: renderLogin,
      emailVerification: renderEmailVerification,
      title: renderTitle,
      nameSetup: renderNameSetup,
      settingsTitle: () => renderSettings(true),
      main: renderMain,
      oyatsuDaisukiEvent: renderOyatsuDaisukiEvent,
      speedStarEvent: renderSpeedStarEvent,
      storytellerEvent: renderStorytellerEvent,
      tropicalFishShop: renderTropicalFishShop,
      bluesJukeEvent: renderBluesJukeEvent,
      winterColdEvent: renderWinterColdEvent,
      birthdaySleepEvent: renderBirthdaySleepEvent,
      westernUnionEvent: renderWesternUnionEvent,
      mermaidEvent: renderMermaidEvent,
      tattooWomanAmberEvent: renderTattooWomanAmberEvent,
      clockTowerDonationEvent: renderClockTowerDonationEvent,
      cinemaVisitEvent: renderCinemaVisitEvent,
      apprenticeCinemaEvent: renderApprenticeCinemaEvent,
      mysteryChineseMealEvent: renderMysteryChineseMealEvent,
      ridleyOkazakiSobaEvent: renderRidleyOkazakiSobaEvent,
      emeraldCaptainKebabEvent: renderEmeraldCaptainKebabEvent,
      whiteBunnyIceEvent: renderWhiteBunnyIceEvent,
      kappaJadeEvent: renderKappaJadeEvent,
      workshopKappaJadeEvent: renderWorkshopKappaJadeEvent,
      oneLoveEvent: renderOneLoveEvent,
      hospitalEvent: renderHospitalEvent,
      yowamushiRoseQuartzEvent: renderYowamushiRoseQuartzEvent,
// ... truncated ...
```

## eatMeal line 19881 score 48
```js

async function eatMeal(mealId, { skipEventCheck = false, priceOverride = null } = {}) {
  const meal = MEALS[mealId];
  if (!meal || mealTransitioning) return;

  // v0.10.654: 途中イベントの復帰は、満腹・同一食事・所持金・時間制限より先に判定する。
  if (!skipEventCheck && resumeActiveMealEvent(mealId)) return;

  const before = hungerLevel();
  if (before >= 7) return showToast('空腹度は満タンです。', 'error');
  if (mealId !== 'ice' && state.wellbeing.mealsEaten > 0 && state.wellbeing.lastMeal === mealId) return showToast('栄養が片寄るので違うものを食べましょう', 'error');
  const actualPrice = Math.max(0, Math.floor(Number(priceOverride ?? meal.price) || 0));
  if (state.game.money < actualPrice) return showToast('所持金が足りません。', 'error');
  if (!canSpendMealTime()) return showToast(mealTimeUnavailableMessage(), 'error');
  if (mealId === 'convenience' && !skipEventCheck && maybeStartCyclopsEvent()) return;
  if (mealId === 'ice' && !skipEventCheck && maybeStartWhiteBunnyIceEvent()) return;
  if (mealId === 'kebab' && !skipEventCheck && maybeStartEmeraldCaptainKebabEvent()) return;
  if (mealId === 'hamburger' && !skipEventCheck && tryRandomEventStarters([
    () => maybeStartTouristWoodSwordEvent(),
    () => maybeStartTerryCaliforniaEvent(),
  ])) return;
  if (mealId === 'indian' && !skipEventCheck && tryRandomEventStarters([
    () => maybeStartDiamondPolishingLapEvent(),
    () => maybeStartGaneshaTuskEvent(),
  ])) return;
  if (mealId === 'ramen' && !skipEventCheck && maybeStartChildhoodFriendEvent()) return;
  if (mealId === 'soba' && !skipEventCheck && maybeStartRidleyOkazakiSobaEvent()) return;
  if (mealId === 'chinese' && !skipEventCheck && maybeStartMysteryChineseMealEvent()) return;
  if (mealId === 'korean' && !skipEventCheck && maybeStartGrayHoodAquariumEvent()) return;

  mealTransitioning = true;
  const stateBeforeMeal = structuredClone(state);
  let mealCommitted = false;
  try {
    selectedMeal = mealId;
    if (mealId === 'ice') startIceMealAudio();
    else stopIceMealAudio();
    await preloadMealAssets(mealId);

    // v0.10.654: 支払い・時間・空腹回復・履歴を一括確定してから食事演出へ入る。
    // 演出中にPWAを閉じても「代金だけ支払い済み」の中間セーブを作らない。
    state.game.money -= actualPrice;
    addFinance(`${meal.name}で食事`, 0, actualPrice);
    spendMealTime();
    state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery);
    state.wellbeing.lastMeal = mealId;
    state.wellbeing.mealsEaten += 1;
    state.daily.meals.push({ id: mealId, name: meal.name, price: actualPrice, recovery: state.wellbeing.hunger - before });
    saveGame();
    mealCommitted = true;
    startMoneyFeedback(-actualPrice, 1200);

    setScreen('meal', { mealId, eating: true }, false);
    const eatingCompletion = waitForMealEatingCompletion();
    await waitForNextPaintWithTimeout();
    await eatingCompletion;

    hungerFeedback = { before, after: state.wellbeing.hunger, mealName: meal.name };
    clearTimeout(hungerFeedbackTimer);
    if (mealId === 'ice' && startOyatsuIceReturnAfterMeal()) {
      showToast('ごちそうさまでした', 'meal-complete', false);
      playSfx('levelup');
      hungerFeedbackTimer = setTimeout(() => { hungerFeedback = null; }, 1550);
      return;
    }
    setScreen('main', {}, false);
    showToast('ごちそうさまでした', 'meal-complete', false);
    playSfx('levelup');
    hungerFeedbackTimer = setTimeout(() => {
      hungerFeedback = null;
      if (screen === 'main') render();
    }, 1550);
  } catch (error) {
    console.error('食事処理エラー', error);
    stopIceMealAudio();
    if (!mealCommitted) {
      state = stateBeforeMeal;
      screen = 'main';
      screenData = {};
      navigation = [];
      pendingDayMoneyDelta = 0;
      saveGame();
      render();
      try { showToast('食事処理を中断し、直前の状態へ戻しました。', 'error'); } catch (_) {}
    } else {
      // ゲーム上の食事は確定済み。演出だけ失敗した時は二重返金せず画面のみ復旧する。
      screen = 'main';
      screenData = {};
      navigation = [];
      pendingDayMoneyDelta = 0;
      if (state?.game) state.game.screen = 'main';
      saveGame();
      render();
      try { showToast('食事は完了しています。画面を復旧しました。', 'warning'); } catch (_) {}
    }
  } finally {
    mealEatingCompletionController = null;
    mealTransitioning = false;
  }
}
```

## renderStore line 18848 score 46
```js

function renderStore() {
  const branches = Array.isArray(state.store.branches)
    ? state.store.branches.filter((branch) => branch && Number(branch.number) >= 1).sort((a, b) => a.number - b.number)
    : [];

  if (!branches.length) {
    return shell('店舗', '<div class="empty-state store-empty-state"><strong>現在店舗はありません</strong></div>');
  }

  const branchId = screenData.branchId;
  if (!branchId) {
    return shell('店舗', `
      <section class="center-card glass-panel store-branch-menu">
        <h1>${esc(state.store.name || '店舗')}</h1>
        <div class="button-stack">
          ${branches.map((branch) => {
            const customerWaiting = storeBranchHasWaitingCustomer(branch);
            const statusLabel = branch.suspended ? '（休業中）' : !storeBusinessOpen() ? '（営業時間外）' : '';
            const accessibleVisitLabel = customerWaiting ? '・お客様が来店中' : '';
            return `<button class="primary-button full-button store-branch-button${customerWaiting ? ' has-waiting-customer' : ''}" data-action="open-store-branch" data-id="${esc(branch.id)}" aria-label="${esc(`${storeBranchLabel(branch.number)}${statusLabel}${accessibleVisitLabel}`)}"><span class="store-branch-button-title"><strong>${esc(storeBranchLabel(branch.number))}${statusLabel}</strong>${customerWaiting ? '<span class="store-visit-dot" role="img" aria-label="お客様が来店中" title="お客様が来店中"></span>' : ''}</span><small>Lv.${storeLevel(branch)}・評価 ${storeRating(branch)}/100・陳列 ${storeShowcaseUsedSlots(branch)}点</small></button>`;
          }).join('')}
        </div>
      </section>`, { help: '店舗1、店舗2、店舗3から、開く店舗を選択してください。' });
  }

  const branch = branches.find((entry) => entry.id === branchId) || branches[0];
  state.store.branchNumber = Math.max(1, Number(branch.number) || 1);
  mirrorCurrentStoreDisplay(branch);
  const displayName = storeBranchDisplayName(branch);
  const businessOpen = storeBusinessOpen();
  const activeVisitors = canServeCustomers() ? Object.keys(CUSTOMERS).filter((id) => state.customers[id].visiting && Number(state.customers[id].visitingBranchNumber || branch.number) === Number(branch.number)) : [];
  const isFirstBranch = Number(branch.number) === 1;
  const canExpand = isFirstBranch && expansionEligible();
  const displayInventory = state.store.displayInventory || {};
  const showcasesOwned = Math.max(0, Math.floor(Number(displayInventory.showcase) || 0));
  const displaySuppliesOwned = Math.max(0, Math.floor(Number(displayInventory.displaySupplies) || 0));
  const casesOwned = Math.max(0, Math.floor(Number(displayInventory.case) || 0));
  const casesRemaining = storeCaseRemaining(branch);
  const caseInstallMaximum = displayCaseInstallMaximum(branch);
  const caseInstallQuantity = displayCaseInstallQuantity(branch);
  const canInstallShowcase = showcasesOwned > 0 && installedShowcaseCount(branch) < storeMaximumShowcases(branch);
  const displaySuppliesMaximum = storeMaximumDisplaySupplies(branch);
  const canInstallDisplaySupplies = displaySuppliesOwned > 0 && storeDisplaySuppliesInstalled(branch) < displaySuppliesMaximum;
  const canInstallCase = casesOwned > 0 && casesRemaining < storeMaximumCases();
  const expansionConditions = isFirstBranch ? storeExpansionConditions(branch) : [];
  const levelStatus = storeUpgradeStatus(branch);
  return shell('店舗', `
    <div class="store-layout">
      <section class="store-scene"></section>
      <section class="store-panel glass-panel">
        ${activeVisitors.length ? `<section class="store-service-section store-service-section-top">
          <div class="section-heading"><h2>接客</h2></div>
          <section class="visitor-box"><h2>お客様が来店しています。</h2>${activeVisitors.map((id) => `<div><strong>${esc(CUSTOMERS[id].name)}</strong><button class="primary-button" data-action="customer" data-id="${id}">接客する</button><button class="text-button" data-action="ignore-customer" data-id="${id}">今回は対応しない</button></div>`).join('')}</section>
        </section>` : ''}
        <h1 class="store-name-title">${esc(displayName)}</h1>
        ${storeBranchOperating(branch) ? '' : `<section class="tool-break-alert"><strong>この店舗は休業中です</strong><span>未払い家賃 ${yen(branch.unpaidRent)}を収支画面から支払ってください。</span></section>`}
        ${storeBranchOperating(branch) && !businessOpen ? '<section class="tool-break-alert"><strong>本日の店舗営業は終了しました</strong><span>営業時間は9:00～19:00です。</span></section>' : ''}
        <div class="store-showcase-heading"><h2>ショーケース</h2><small>${installedShowcaseCount(branch)}/${storeMaximumShowcases(branch)}台・${storeShowcaseUsedSlots(branch)}/${storeShowcaseCapacity(branch)}点</small></div>
        ${installedShowcaseCount(branch) ? `<div class="showcase-units">${branchShowcases(branch).map((showcase, showcaseIndex) => renderShowcaseUnit(showcase, showcaseIndex, branch)).join('')}</div>` : '<section class="empty-state showcase-empty-state"><strong>ショーケースがありません。</strong><p>御徒町のディスプレイ屋でショーケースを購入し、下の「店頭設備」から設置してください。</p></section>'}
        <section class="store-install-section storefront-equipment-section">
          <div class="section-heading"><h2>店頭設備</h2><button class="secondary-button" data-action="nav" data-screen="displayShop">ディスプレイ屋へ</button></div>
          <article class="store-install-row store-case-install-row" data-store-case-install-card>
            <div class="store-install-info">
              ${renderDisplayProductVisual(DISPLAY_SHOP_PRODUCTS.case, 'display-product-visual-store')}
              <div><strong>ケース</strong><small class="store-case-remaining ${casesRemaining === 0 ? 'is-empty' : ''}">残数 ${casesRemaining}/${storeMaximumCases()}個</small></div>
            </div>
            <div class="store-case-install-controls">
              <span class="store-case-install-label">設置数</span>
              <span class="metal-vertical-stepper" aria-label="ケース設置数を増減">
                <button type="button" class="metal-stepper-button metal-stepper-up" data-action="store-case-install-qty-step" data-delta="1" aria-label="ケースを1個増やす。長押しで連続増加" ${canInstallCase && caseInstallQuantity < caseInstallMaximum ? '' : 'disabled'}>▲</button>
                <span class="metal-input-wrap"><output class="quantity-readout" data-store-case-install-quantity-value aria-live="polite" aria-label="ケースの設置数">${caseInstallQuantity}</output><b>個</b></span>
                <button type="button" class="metal-stepper-button metal-stepper-down" data-action="store-case-install-qty-step" data-delta="-1" aria-label="ケースを1個減らす。長押しで連続減少" ${canInstallCase && caseInstallQuantity > 0 ? '' : 'disabled'}>▼</button>
              </span>
              <button class="primary-button" data-action="install-display-product" data-id="case" ${canInstallCase && caseInstallQuantity > 0 ? '' : 'disabled'}>店頭に設置</button>
            </div>
          </article>
          <article class="store-install-row">
            <div class="store-install-info">
              ${renderDisplayProductVisual(DISPLAY_SHOP_PRODUCTS.showcase, 'display-product-visual-store')}
              <div><strong>ショーケース</strong><small>設置済み ${installedShowcaseCount(branch)}/${storeMaximumShowcases(branch)}台</small></div>
            </div>
            <button class="primary-button" data-action="install-display-product" data-id="showcase" ${canInstallShowcase ? '' : 'disabled'}>店頭に設置</button>
          </article>
          <article class="store-install-row">
            <div class="store-install-info">
              ${renderDisplayProductVisual(DISPLAY_SHOP_PRODUCTS.displaySupplies, 'display-product-visual-store')}
              <div><strong>ディスプレイ用品</strong><small>設置済み ${storeDisplaySuppliesInstalled(branch)}/${displaySuppliesMaximum}個</small></div>
            </div>
            <button class="primary-button" data-action="install-display-product" data-id="displaySupplies" ${canInstallDisplaySupplies ? '' : 'disabled'}>店頭に設置</button>
          </article>
          <p class="small-note">店舗設備は販売環境を整えます。店舗レベルは、店舗ごとの営業日数・販売数・売上・接客成功数と改装によって上がります。</p>
        </section>
        ${storeEmployeeAvailable(branch) ? '<div class="button-grid store-employee-link"><button class="secondary-button" data-action="nav" data-screen="employee">店舗スタッフ</button></div>' : ''}
        <section class="store-evaluation-section">
          <div class="section-heading"><h2>店舗レベル</h2></div>
          <div class="store-summary">
            <div><small>現在レベル</small><strong>Lv.${storeLevel(branch)}</strong></div>
            <div><small>過去最高</small><strong>Lv.${Math.max(storeLevel(branch), Number(branch.peakLevel) || 1)}</strong></div>
            <div><small>累計営業日</small><strong>${Math.max(0, Number(branch.operatingDays) || 0)}日</strong></div>
            <div><small>店舗評価</small><strong>${storeRating(branch)} / 100</strong></div>
            <div><small>累計販売</small><strong>${Math.max(0, Number(branch.salesCount) || 0)}点</strong></div>
            <div><small>累計売上</small><strong>${yen(Math.max(0, Number(branch.totalRevenue) || 0))}</strong></div>
            <div><small>接客成功</small><strong>${Math.max(0, Number(branch.serviceSuccesses) || 0)}件</strong></div>
          </div>
          ${levelStatus.requirement ? `<h3>Lv.${levelStatus.requirement.level}への改装条件</h3><ul class="condition-list">${levelStatus.conditions.map((condition) => `<li class="${condition.met ? 'condition-met' : 'condition-unmet'}"><strong>${condition.met ? '達成' : '未達成'}</strong><span>${esc(condition.label)}</span><em>${condition.money ? yen(condition.current) : Number(condition.current).toLocaleString('ja-JP')}／${condition.money ? yen(condition.target) : Number(condition.target).toLocaleString('ja-JP')}</em></li>`).join('')}</ul><p>改装費：${yen(levelStatus.cost)}</p><button class="primary-button full-button" data-action="upgrade-store-level" ${levelStatus.complete ? '' : 'disabled'}>店舗をLv.${levelStatus.requirement.level}へ改装</button>` : '<p class="success-text">店舗は最大レベルです。</p>'}
        </section>
        <div class="store-order-sheet-link">
          <button class="secondary-button" data-action="nav" data-screen="orders" ${activeOrderCount() > 0 ? '' : 'disabled'}>工房の注文書</button>
        </div>
        ${isFirstBranch ? `<section class="store-expansion-section">
          <div class="section-heading"><h2>拡大条件</h2></div>
          ${state.store.expanded ? '<p class="success-text">店舗の拡大は完了しています。</p><p>ショーケースを最大3台まで設置でき、店舗スタッフを1人雇えます。</p>' : `
            <ul class="condition-list">
              ${expansionConditions.map((condition) => `<li class="${condition.met ? 'condition-met' : 'condition-unmet'}"><strong>${condition.met ? '達成' : '未達成'}</strong><span>${esc(condition.label)}</span><em>${esc(condition.progress)}</em></li>`).join('')}
            </ul>
            <p>拡大費：${yen(STORE_EXPANSION_REQUIREMENTS.cost)}</p>
            ${canExpand ? '<p class="success-text">すべての拡大条件を満たしています。</p>' : ''}
            <button class="primary-button full-button" data-action="expand-store" ${canExpand ? '' : 'disabled'}>店舗を拡大する</button>
            <p class="small-note">条件を満たしても、拡大するかどうかは自由です。</p>`}
// ... truncated ...
```

## autopilotCraftJewelry line 22923 score 42
```js

function autopilotCraftJewelry(draft, summary) {
  if (!workshopOperating() || !toolUsable('jewelryBench')) return null;
  const hours = productionHours(draft);
  if (!autopilotCanSpendHours(hours, summary)) return null;
  const requirements = materialRequirementsFor(draft);
  if (!requirements.enoughLoose || !requirements.enoughMetal) return null;
  if (state.inventory.jewelry.filter((item) => item.status !== 'sold').length >= state.inventory.capacity) return null;
  if (draft.useLoose !== false) adjustLooseInventory(draft.gem, draft.looseShape, -requirements.requiredLooseQuantity);
  state.inventory.metals[draft.metal] = roundedMetalWeight(requirements.ownedMetalWeight - requirements.requiredMetalWeight);
  spendHours(hours);
  const quality = qualityRoll();
  const craftsmanship = craftProductionProfile(draft);
  const jewelry = {
    id: uid(),
    ...draft,
    name: itemName(draft),
    quality,
    cost: productionCost(draft),
    recommendedPrice: craftsmanshipRecommendedPrice(draft, quality, craftsmanship),
    ...craftsmanshipSnapshot(craftsmanship),
    xp: 5,
    status: draft.orderId ? 'order' : 'stored',
    createdDay: state.game.day,
    autopilot: true,
  };
  state.inventory.jewelry.push(jewelry);
  state.daily.crafted.push(jewelry.id);
  // 自動操縦による制作ではプレイヤーの職人経験値は増えない。
  if (draft.orderId) {
    const order = state.orders.find((entry) => entry.id === draft.orderId);
    if (order) {
      order.status = '完成';
      order.jewelryId = jewelry.id;
      addNotification('注文品が自動制作されました', `${order.customerName}さんの注文品を納品できます。`);
    }
  }
  const brokenToolName = checkWorkshopToolFailure();
  if (brokenToolName) addNotification(`${brokenToolName}が故障しました`, '自動操縦中の作業後に故障しました。次回以降、修理可能なら自動で修理へ出します。', 'warning');
  summary.crafted += 1;
  return jewelry;
}
```

## installDisplayProduct line 22418 score 40
```js

function installDisplayProduct(productId) {
  const storeScrollSnapshot = captureStoreScrollSnapshot();
  if (!state.store.rented) return showToast('店舗を契約してから設置できます。', 'error');
  const product = DISPLAY_SHOP_PRODUCTS[productId];
  const owned = Math.max(0, Number(state.store.displayInventory?.[productId]) || 0);
  const branch = currentStoreBranch();
  const installQuantity = productId === 'case' ? displayCaseInstallQuantity(branch) : 1;
  if (!product || owned <= 0) return showToast('設置できる商品を所持していません。', 'error');
  if (productId === 'case' && installQuantity < 1) return showToast('設置するケース数を選択してください。', 'error');
  if (productId === 'showcase') {
    if (installedShowcaseCount(branch) >= storeMaximumShowcases(branch)) return showToast(`この店舗にはショーケースを${storeMaximumShowcases(branch)}台まで設置できます。`, 'error');
    branchShowcases(branch).push({ id: `showcase-${Date.now()}-${installedShowcaseCount(branch) + 1}`, slots: [null, null, null, null, null] });
    branch.showcaseCount = installedShowcaseCount(branch);
    mirrorCurrentStoreDisplay(branch);
    syncFinishedJewelryCapacity();
  } else if (productId === 'displaySupplies') {
    const maximum = storeMaximumDisplaySupplies(branch);
    if (maximum < 1) return showToast('先にショーケースを設置してください。', 'error');
    if (storeDisplaySuppliesInstalled(branch) >= maximum) return showToast(`ディスプレイ用品はショーケースの台数と同じ${maximum}点まで設置できます。`, 'error');
    if (branch) branch.displaySuppliesInstalled = storeDisplaySuppliesInstalled(branch) + 1;
    state.store.displaySuppliesInstalled = storeDisplaySuppliesInstalled(branch);
  } else if (productId === 'case') {
    const maximum = displayCaseInstallMaximum(branch);
    if (maximum < 1) return showToast(`この店舗にはケースを${storeMaximumCases()}個まで設置できます。`, 'error');
    if (installQuantity > maximum) return showToast(`設置できるケースは最大${maximum}個です。`, 'error');
    if (branch) branch.casesInstalled = storeCaseRemaining(branch) + installQuantity;
    state.store.casesInstalled = storeCaseRemaining(branch);
  }
  state.store.displayInventory[productId] = owned - installQuantity;
  mirrorCurrentStoreDisplay(branch);
  syncStoreLevel(branch);
  saveGame();
  if (productId === 'case') displayCaseInstallDraft = 1;
  showToast(productId === 'case'
    ? `${product.name}を${installQuantity}個、店舗へ設置しました。`
    : productId === 'showcase'
      ? `${product.name}を店舗へ設置しました。完成品の保管上限は${state.inventory.capacity}個です。`
      : `${product.name}を店舗へ設置しました。`);
  render();
  restoreStoreScrollSnapshot(storeScrollSnapshot);
}
```

## completeKaitenzushi line 19699 score 39
```js

function completeKaitenzushi(totalValue, plateValue) {
  clearKaitenzushiLoadWatch();
  const session = kaitenzushiSession;
  if (!session || session.settled || screen !== 'kaitenzushi') return;
  session.settled = true;

  const total = Math.max(0, Math.floor(Number(totalValue) || 0));
  const plates = Math.max(0, Math.floor(Number(plateValue) || 0));
  const totalsMatchProgress = total === session.total && plates === session.plates;
  const plateTotalsArePlausible = session.free
    ? total === 0
    : (plates === 0 ? total === 0 : total >= plates * 190 && total <= plates * 850);
  if (!totalsMatchProgress || !plateTotalsArePlausible || (!session.free && (total > session.budget || total > state.game.money))) {
    session.settled = false;
    showToast('お会計金額を確認できませんでした。もう一度お試しください。', 'error');
    return;
  }

  const before = hungerLevel();
  if (total > 0) {
    state.game.money -= total;
    addFinance('回転寿司で食事', 0, total);
    startMoneyFeedback(-total, 1200);
  }

  const maxHunger = Math.max(1, Number(state.wellbeing.maxHunger) || 7);
  if (plates > 0) spendMealTime();
  state.wellbeing.hunger = Math.min(maxHunger, hungerLevel() + plates);
  const recovery = state.wellbeing.hunger - before;
  if (plates > 0) {
    state.wellbeing.lastMeal = 'kaitenzushi';
    state.wellbeing.mealsEaten = Math.max(0, Number(state.wellbeing.mealsEaten) || 0) + 1;
    state.daily.meals.push({
      id: 'kaitenzushi',
      name: '回転寿司',
      price: total,
      recovery,
      plates,
    });
  }
  if (session.free) {
    const eventState = sushiChefEventState();
    eventState.active = true;
    eventState.stage = 'farewell';
    eventState.lastPlates = plates;
    eventState.lastHungerBefore = before;
    eventState.lastHungerAfter = state.wellbeing.hunger;
    state.game.screen = 'sushiChefEvent';
    saveGame();
    kaitenzushiSession = null;
    // 会計ボタン側で無料会計の成功音を鳴らすため、ここでは振動だけにして二重再生を防ぐ。
    vibrate([32, 28, 55]);
    setScreen('sushiChefEvent', {}, false);
    return;
  }

  state.game.screen = 'main';
  saveGame();

  kaitenzushiSession = null;
  if (plates > 0) {
    hungerFeedback = { before, after: state.wellbeing.hunger, mealName: `回転寿司（${plates}皿）` };
    clearTimeout(hungerFeedbackTimer);
    goMain();
    showToast(`ごちそうさまでした　${plates}皿・${yen(total)}`, 'meal-complete', false);
    playSfx('levelup');
    hungerFeedbackTimer = setTimeout(() => {
      hungerFeedback = null;
      if (screen === 'main') render();
    }, 1550);
  } else {
    goMain();
    showToast('何も食べずにお店を出ました。', 'info', false);
  }
}
```

## saveLocalBackup line 4014 score 38
```js

function saveLocalBackup({ fingerprint = null, createCloudSnapshot = true, updateFingerprint = true } = {}) {
  if (!state || !currentUser || sessionTakenOver) return { saved: false, skipped: true };

  let nextRaw = '';
  let snapshot = null;
  let quotaRecoveryUsed = false;
  try {
    state.saveRevision = Math.max(0, Math.floor(Number(state.saveRevision) || 0)) + 1;
    state.updatedAt = new Date().toISOString();
    // 廃止済みの旧在庫を保存データへ戻さない。
    if (state.inventory && Object.prototype.hasOwnProperty.call(state.inventory, 'general')) delete state.inventory.general;
    if (state.inventory && Object.prototype.hasOwnProperty.call(state.inventory, 'gems')) delete state.inventory.gems;
    state.migrations = state.migrations && typeof state.migrations === 'object' && !Array.isArray(state.migrations) ? state.migrations : {};
    state.migrations.looseInventoryCanonicalV231 = true;
    state.saveSchemaVersion = SAVE_SCHEMA_VERSION;

    const key = localSaveKey();
    nextRaw = JSON.stringify(state);
    // 端末書き込みに失敗してもクラウド保存を続けられるよう、
    // 書き込み前に切り離し済みスナップショットを確保する。
    snapshot = createCloudSnapshot ? JSON.parse(nextRaw) : null;

    let currentRaw = null;
    try { currentRaw = localStorage.getItem(key); } catch (_) {}
    let singleCopyMode = localSingleCopyModeEnabled();

    if (!singleCopyMode && currentRaw && currentRaw !== nextRaw) {
      try {
        parseSaveText(currentRaw);
        localStorage.setItem(localSaveBackupKey(), currentRaw);
      } catch (error) {
        if (isLocalStorageQuotaError(error)) {
          // バックアップ複製だけで上限に達した場合は、クラウドを第2バックアップとして
          // 端末側を1コピー運用へ自動移行する。
          enableLocalSingleCopyMode();
          singleCopyMode = true;
          quotaRecoveryUsed = true;
        } else {
          // currentRawのJSON自体が壊れていた場合のみ診断情報を残す。
          try { parseSaveText(currentRaw); } catch (parseError) { preserveCorruptLocalSave(currentRaw, parseError); }
        }
      }
    }

    const writePrimary = () => localStorage.setItem(key, nextRaw);
    try {
      writePrimary();
    } catch (error) {
      if (!isLocalStorageQuotaError(error)) throw error;
      // 既存の巨大バックアップ／旧移行コピーを解放してから、最新セーブを再試行する。
      enableLocalSingleCopyMode();
      singleCopyMode = true;
      quotaRecoveryUsed = true;
      writePrimary();
    }

    // 本体セーブが成功した後の補助データはbest-effort。
    // 設定や時刻の数KBが書けなくても「本体セーブ失敗」にはしない。
    try { localStorage.setItem(`${SAVE_KEY}-settings`, JSON.stringify(state.settings)); } catch (_) {}
    lastSuccessfulSaveAt = state.updatedAt;
    try { localStorage.setItem(localLastSaveAtKey(), lastSuccessfulSaveAt); } catch (_) {}
    if (updateFingerprint) lastSavedFingerprint = fingerprint || saveStateFingerprint(state);
    if (singleCopyMode) {
      removeLocalStorageItemQuietly(localSaveBackupKey());
      removeLocalStorageItemQuietly(localSavePreMigrationKey());
    }
    return {
      saved: true,
      savedAt: lastSuccessfulSaveAt,
      snapshot,
      raw: nextRaw,
      storageMode: singleCopyMode ? 'single-copy' : 'normal',
      quotaRecoveryUsed,
    };
  } catch (error) {
    console.error('端末保存に失敗しました', error);
    return {
      saved: false,
      error,
      quota: isLocalStorageQuotaError(error),
      snapshot,
      raw: nextRaw,
      quotaRecoveryUsed,
    };
  }
}
```

## purchaseTropicalShopItem line 11048 score 38
```js
function purchaseTropicalShopItem(){
  const modal=screenData?.tropicalModal; if(!modal)return; const product=tropicalShopFindProduct(modal.category,modal.id); if(!product)return;
  const max=tropicalShopMaxQuantity(product); const qty=Math.max(0,Math.min(max,Math.floor(Number(modal.qty)||0))); if(qty<1)return showToast('購入できません。','error');
  const total=product.price*qty; if(state.game.money<total)return showToast('所持金が足りません。','error');
  const aquarium=aquariumState();
  if(product.category==='fish'){const row=aquarium.fish[product.id];ensureAquariumFishIndividuals(aquarium,state.game.day);row.owned+=qty;row.inTank+=qty;addAquariumFishIndividuals(product.id,qty,aquarium,state.game.day);refreshAquariumLoad(aquarium);}
  else if(product.category==='plant'){const row=aquarium.plants[product.id];ensureAquariumPlantIndividuals(aquarium,state.game.day);row.owned+=qty;row.inTank+=qty;addAquariumPlantIndividuals(product.id,qty,aquarium,state.game.day);}
  else {const row=aquarium.displayItems[product.id];row.owned+=qty;row.installed+=qty;}
  aquarium.lastSyncRevision+=1; state.game.money-=total; addFinance(`熱帯魚屋 ${product.name}`,0,total); addNotification(`${product.name}を購入しました`, product.category==='fish'?`${qty}匹を水槽へ入れました。`:product.category==='plant'?`${qty}株を水槽へ入れました。`:`${qty}個を水槽へ設置しました。`,'special');
  delete screenData.tropicalModal; saveGame(); startMoneyFeedback(-total,1200); playSfx('coin',{gain:.86}); vibrate(28); render();
}
```

## processMonthlyFixedCosts line 22521 score 37
```js

function processMonthlyFixedCosts() {
  const today = gameDate();
  if (today.getDate() !== 1) return null;
  const targetKey = previousMonthKey(today);
  if (state.business.lastProcessedMonth === targetKey) return null;

  const start = parseGameStartDate();
  const targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0, 0);
  const report = { month: targetKey, workshop: 0, rents: [], paid: 0, unpaid: 0 };

  if (monthIndex(targetDate) - monthIndex(start) >= 2) {
    report.workshop = WORKSHOP_MONTHLY_COST;
    const result = payFixedCost(`${targetKey} 工房維持費`, WORKSHOP_MONTHLY_COST, (unpaid) => {
      state.business.workshopUnpaid += unpaid;
      state.business.workshopSuspended = true;
    });
    report.paid += result.paid;
    report.unpaid += result.unpaid;
  }

  for (const branch of [...(state.store.branches || [])].sort((a, b) => Number(a.number) - Number(b.number))) {
    const contractDate = gameDateForDay(branch.rentedDay || 1);
    if (monthIndex(targetDate) - monthIndex(contractDate) < 1) continue;
    const rent = storeMonthlyRent(Number(branch.number));
    const result = payFixedCost(`${targetKey} ${storeBranchLabel(branch.number)}家賃`, rent, (unpaid) => {
      branch.unpaidRent = Math.max(0, Number(branch.unpaidRent) || 0) + unpaid;
      branch.suspended = true;
    });
    report.rents.push({ branchNumber: Number(branch.number), amount: rent, paid: result.paid, unpaid: result.unpaid });
    report.paid += result.paid;
    report.unpaid += result.unpaid;
  }

  state.business.lastProcessedMonth = targetKey;
  state.business.monthlyReports.push(report);
  state.business.monthlyReports = state.business.monthlyReports.slice(-24);
  const summary = report.unpaid
    ? `${targetKey}分の固定費を処理しました。生活費${yen(MIN_LIVING_CASH_RESERVE)}を残し、未払いは${yen(report.unpaid)}です。`
    : `${targetKey}分の固定費 ${yen(report.paid)}を支払いました。`;
  addNotification('月初の固定費', summary, report.unpaid ? 'warning' : 'info');
  const paymentMessages = [];
  if (report.workshop) {
    paymentMessages.push(report.unpaid && state.business.workshopUnpaid
      ? `工房維持費 ${yen(report.workshop)}の支払い後、未払い残高は${yen(state.business.workshopUnpaid)}です。`
      : `工房維持費 ${yen(report.workshop)}を支払いました。`);
  }
  if (report.rents.length) {
    const rentTotal = report.rents.reduce((sum, row) => sum + row.amount, 0);
    const rentUnpaid = report.rents.reduce((sum, row) => sum + row.unpaid, 0);
    paymentMessages.push(rentUnpaid
      ? `店舗家賃 ${yen(rentTotal)}のうち${yen(rentTotal - rentUnpaid)}を支払い、${yen(rentUnpaid)}が未払いです。`
      : `店舗家賃 ${yen(rentTotal)}を支払いました。`);
  }
  state.tools.morningMessages = [...(state.tools.morningMessages || []), ...paymentMessages].slice(-10);
  return report;
}
```

## startEmeraldCaptainKebabMeal line 16156 score 36
```js

async function startEmeraldCaptainKebabMeal() {
  const eventState = emeraldCaptainKebabEventState();
  if (!eventState.active || !['purchase', 'eating'].includes(eventState.stage) || mealTransitioning) return;
  const meal = MEALS[EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID];
  mealTransitioning = true;
  let stateBeforeMeal = null;
  try {
    stateBeforeMeal = structuredClone(state);
    await preloadEmeraldCaptainMealAssets();
    if (!eventState.mealPaid) {
      const before = hungerLevel();
      if (before >= 7) throw new Error('空腹度は満タンです。');
      if (state.wellbeing.mealsEaten > 0 && state.wellbeing.lastMeal === EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID) throw new Error('同じ食事は連続で選べません。');
      if (state.game.money < meal.price) throw new Error('所持金が足りません。');
      if (!eventState.hungerBefore) eventState.hungerBefore = before;
      state.game.money -= meal.price;
      addFinance(`${meal.name}で食事`, 0, meal.price);
      startMoneyFeedback(-meal.price, 1200);
      eventState.mealPaid = true;
    }
    eventState.stage = 'eating';
    state.game.screen = 'emeraldCaptainKebabEvent';
    saveGame();
    render();
    scheduleEmeraldCaptainMealWatchdog();
    await waitForNextPaintWithTimeout();
    await wait(420);
    if (emeraldCaptainKebabEventState().stage !== 'eating') return;
    playSfx('emerald-captain-eat');
    await wait(2080);
    finishEmeraldCaptainKebabMeal();
  } catch (error) {
    console.error('エメラルド班班長ケバブイベント食事処理エラー', error);
    clearEmeraldCaptainMealWatchdog();
    if (stateBeforeMeal) state = stateBeforeMeal;
    const e = emeraldCaptainKebabEventState();
    e.active = false;
    e.stage = 'completed';
    saveGame();
    goMain();
    render();
    showToast('ケバブイベントを安全に終了し、メイン画面へ戻りました。', 'warning');
  } finally {
    mealTransitioning = false;
  }
}
```

## runAutopilotDay line 23177 score 36
```js

function runAutopilotDay() {
  const summary = createAutopilotDaySummary();
  state.game.minutes = Math.max(DAY_START_MINUTES, Math.min(DAY_END_MINUTES, Number(state.game.minutes) || DAY_START_MINUTES));
  autopilotPayOutstandingCosts(summary);
  autopilotDeliverCompletedOrders(summary);
  autopilotRepairTools(summary);
  if (!toolOwned('jewelryBench')) autopilotBuyTool('jewelryBench', summary, 2000);
  autopilotFulfillOrders(summary);
  autopilotPrepareStore(summary);
  autopilotDisplayStoredItems(summary);
  autopilotWholesaleStoredItems(summary);
  autopilotSellRough(summary);

  let safety = 0;
  while (safety < 12 && canSpendHours(1)) {
    safety += 1;
    const beforeMinutes = state.game.minutes;
    const beforeMoney = state.game.money;
    const beforeJewelry = state.inventory.jewelry.filter((item) => item.status !== 'sold').length;

    autopilotFulfillOrders(summary);
    autopilotPrepareStore(summary);
    autopilotDisplayStoredItems(summary);
    if (autopilotWholesaleStoredItems(summary)) continue;
    if (autopilotCraftStock(summary)) {
      autopilotDisplayStoredItems(summary);
      continue;
    }
    if (autopilotSellRough(summary)) continue;
    if (autopilotMineOnce(summary)) {
      if (state.game.minutes < OKACHIMACHI_CLOSE_MINUTES) autopilotSellRough(summary);
      continue;
    }

    const afterJewelry = state.inventory.jewelry.filter((item) => item.status !== 'sold').length;
    if (state.game.minutes === beforeMinutes && state.game.money === beforeMoney && afterJewelry === beforeJewelry) break;
  }

  autopilotDisplayStoredItems(summary);
  autopilotWholesaleStoredItems(summary);
  summary.income = Math.max(summary.income, Math.max(0, Number(state.daily.income) || 0));
  summary.expense = Math.max(summary.expense, Math.max(0, Number(state.daily.expense) || 0));
  return summary;
}
```

## receiveYowamushiRoseQuartzReward line 8156 score 35
```js

function receiveYowamushiRoseQuartzReward() {
  const eventState = yowamushiRoseQuartzEventState();
  if (!eventState.active || eventState.stage !== 'reward') return;
  if (!eventState.rewardGranted) {
    state.inventory.loose = state.inventory.loose && typeof state.inventory.loose === 'object' ? state.inventory.loose : {};
    state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] = state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] && typeof state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] === 'object' ? state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID] : {};
    state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID][YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID] = Math.max(0, Math.floor(Number(state.inventory.loose[YOWAMUSHI_ROSE_QUARTZ_EVENT_GEM_ID][YOWAMUSHI_ROSE_QUARTZ_EVENT_SHAPE_ID]) || 0)) + 1;
    eventState.rewardGranted = true;
    addNotification('ローズクォーツを手に入れました', '工房のルースへ追加されました。', 'special');
  }
  eventState.stage = 'outro1';
  saveGame();
  playSfx('success', { gain: 0.78, rate: 1.08 });
  vibrate([24, 36, 54]);
  render();
}
```

## finishRetroBattleEvent line 11426 score 35
```js

function finishRetroBattleEvent(detail, session = retroBattleSession) {
  if (!session || session !== retroBattleSession || session.settled) return false;
  const result = String(detail?.result || '');
  if (!['victory', 'defeat', 'escaped'].includes(result)) return false;
  session.settled = true;
  if (typeof session.cleanup === 'function') session.cleanup();
  syncRetroBattleInventoryFromResult(detail?.inventory);

  const baseMoney = Math.max(0, Math.floor(Number(state?.game?.money) || 0));
  const amount = retroBattleMoneyChange(baseMoney);
  if (result === 'victory') {
    state.game.money = baseMoney + amount;
    if (amount > 0) addFinance('御徒町・戦闘ミニゲーム勝利', amount, 0);
    if (amount !== 0) startMoneyFeedback(amount, 1600);
  } else if (result === 'defeat') {
    state.game.money = Math.max(0, baseMoney - amount);
    if (amount > 0) addFinance('御徒町・戦闘ミニゲーム敗北', 0, amount);
    if (amount !== 0) startMoneyFeedback(-amount, 1600);
    state.wellbeing.hunger = 0;
    state.game.minutes = DAY_END_MINUTES;
  }

  saveGame();
  retroBattleSession = null;
  if (result === 'defeat') goMain();
  else setScreen('okachimachi', {}, false);
  return true;
}
```

## completeApprenticeCinemaPlayback line 14806 score 34
```js

async function completeApprenticeCinemaPlayback() {
  const eventState = apprenticeCinemaEventState();
  if (!eventState.active || eventState.stage !== 'playing') return;
  if (!eventState.settled) {
    eventState.settled = true;
    eventState.lastVideo = eventState.selectedVideo;
    state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - APPRENTICE_CINEMA_EVENT_COST);
    spendHours(APPRENTICE_CINEMA_EVENT_HOURS);
    addFinance('見習い職人と映画鑑賞', 0, APPRENTICE_CINEMA_EVENT_COST);
    addNotification('見習い職人と映画を観ました', `${APPRENTICE_CINEMA_EVENT_HOURS}時間が経過し、${yen(APPRENTICE_CINEMA_EVENT_COST)}を支払いました。`, 'special');
  }
  eventState.stage = 'outro1';
  saveGame();
  await resumeAudio();
  playSfx('success', { gain: 0.72 });
  vibrate([18, 24, 42]);
  render();
}
```

## applyMysteryChineseMeal line 15220 score 34
```js

function applyMysteryChineseMeal() {
  const eventState = mysteryChineseMealEventState();
  const meal = MEALS.chinese;
  if (!eventState.active || !meal) return false;
  if (eventState.mealApplied) return true;
  if (Math.max(0, Math.floor(Number(state?.game?.money) || 0)) < MYSTERY_CHINESE_MEAL_EVENT_COST) {
    showToast('所持金が足りません。', 'warning');
    return false;
  }
  const before = hungerLevel();
  eventState.mealApplied = true;
  eventState.hungerBefore = before;
  eventState.lastDish = eventState.selectedDish;
  state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - MYSTERY_CHINESE_MEAL_EVENT_COST);
  addFinance('謎の中華料理', 0, MYSTERY_CHINESE_MEAL_EVENT_COST);
  startMoneyFeedback(-MYSTERY_CHINESE_MEAL_EVENT_COST, 1200);
  spendMealTime();
  state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery);
  state.wellbeing.lastMeal = meal.id;
  state.wellbeing.mealsEaten = Math.max(0, Math.floor(Number(state.wellbeing.mealsEaten) || 0)) + 1;
  eventState.hungerAfter = state.wellbeing.hunger;
  state.daily.meals = Array.isArray(state.daily.meals) ? state.daily.meals : [];
  state.daily.meals.push({ id: meal.id, name: '謎の中華料理', price: MYSTERY_CHINESE_MEAL_EVENT_COST, recovery: state.wellbeing.hunger - before });
  addNotification('謎の中華料理を食べた', `${yen(MYSTERY_CHINESE_MEAL_EVENT_COST)}を支払い、空腹度が回復しました。`, 'special');
  saveGame();
  return true;
}
```

## applySpeedStarWalletLoss line 10927 score 33
```js

function applySpeedStarWalletLoss() {
  const e = speedStarEventState(); if (e.lossApplied) return e.lossAmount;
  const loss = Math.floor(Math.max(0, Number(state.game.money) || 0) / 3);
  e.lossApplied = true; e.lossAmount = loss;
  if (loss > 0) { state.game.money = Math.max(0, state.game.money - loss); addFinance('スピード・スターに財布を盗まれた', 0, loss); startMoneyFeedback(-loss, 1600); }
  addNotification('財布を持っていかれました', `${yen(loss)}を失いました。`, 'warning'); saveGame(); return loss;
}
```

## advanceHauntingEvent line 8775 score 31
```js

async function advanceHauntingEvent() {
  const eventState = hauntingEventState();
  if (!eventState.active) {
    await beginSleepTransition();
    return;
  }
  if (eventState.stage === 'intro1') {
    eventState.stage = 'intro2';
    saveGame();
    playSfx('haunting-whisper', { gain: .88 });
    setTimeout(() => playSfx('impact', { gain: .34, rate: 1.28 }), 120);
    vibrate([26, 20, 36]);
    render();
    return;
  }
  if (eventState.stage === 'intro2') {
    if (!eventState.paymentApplied) {
      state.game.money = Math.max(0, Number(state.game.money || 0) - HAUNTING_EVENT_COST);
      addFinance('お祓い', 0, HAUNTING_EVENT_COST);
      startMoneyFeedback(-HAUNTING_EVENT_COST, 1400);
      eventState.paymentApplied = true;
    }
    eventState.stage = 'processing';
    saveGame();
    playSfx('haunting-whisper', { gain: .94, rate: .82 });
    setTimeout(() => playSfx('alarm', { gain: .62, rate: .72 }), 90);
    setTimeout(() => playSfx('impact', { gain: .70, rate: .70 }), 150);
    vibrate([24, 22, 62, 30, 92]);
    render();
    await wait(180);
    await finalizeHauntingEventSleepTransition();
    return;
  }
  if (eventState.stage === 'processing') {
    await finalizeHauntingEventSleepTransition();
  }
}
```

## advanceClockTowerDonationEvent line 14967 score 31
```js

function advanceClockTowerDonationEvent() {
  const eventState = clockTowerDonationEventState();
  if (!eventState.active) {
    setScreen('okachimachi', {}, false);
    return;
  }
  if (eventState.stage === 'intro1') eventState.stage = 'intro2';
  else if (eventState.stage === 'intro2') eventState.stage = 'intro3';
  else if (eventState.stage === 'intro3') {
    if (!eventState.donationApplied) {
      state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - 100000);
      eventState.donationApplied = true;
      addFinance('時計台募金', 0, 100000);
      startMoneyFeedback(-100000, 1800);
      showToast('時計台募金　−100,000円', 'clock-tower-donation', false);
      toastEl.innerHTML = '<strong>時計台募金　−100,000円</strong><small>御徒町パンダ広場の時計台建設へ寄付しました。</small>';
      addNotification('時計台募金で100,000円を支払いました', '御徒町パンダ広場の時計台建設へ寄付しました。', 'special');
    }
    eventState.active = false;
    eventState.stage = 'completed';
    saveGame();
    playSfx('western-union-handover', { gain: 0.88, rate: 0.84 });
    setTimeout(() => playSfx('success', { gain: 0.78 }), 110);
    vibrate([26, 34, 68]);
    setScreen('okachimachi', {}, false);
    return;
  }
  saveGame();
  playSfx('select', { gain: 0.82 });
  render();
}
```

## syncRetroBattleInventoryFromResult line 11405 score 30
```js

function syncRetroBattleInventoryFromResult(inventory) {
  if (!inventory || typeof inventory !== 'object') return false;
  state.inventory.items = state.inventory.items && typeof state.inventory.items === 'object' ? state.inventory.items : {};
  let changed = false;
  RETRO_BATTLE_ITEM_KEYS.forEach((itemKey) => {
    if (!Object.prototype.hasOwnProperty.call(inventory, itemKey)) return;
    const owned = retroBattleOwnedItemCount(itemKey);
    const reported = Math.max(0, Math.floor(Number(inventory[itemKey]) || 0));
    const next = Math.min(owned, reported);
    if (next === owned) return;
    state.inventory.items[itemKey] = next;
    changed = true;
  });
  return changed;
}
```
