import {
  HOME_MOVE_COST,
  homePropertyUnlocked,
  normalizeHomeProperty,
  homePropertyMonthlyRent,
  homePropertyMoveTotal,
  homePropertyBackgroundAsset,
} from './home-property.js?v=0.10.947';

export function createHomePropertyController({
  getState,
  getScreenData,
  shell,
  yen,
  version,
  isPortraitLayout,
  showToast,
  addFinance,
  saveGame,
  gameDate,
  rerender,
  payFixedCost,
  addNotification,
  propertyARent,
  getMinLivingCashReserve,
}) {
  const state = () => getState?.() || null;
  const screenData = () => getScreenData?.() || {};

  function currentProperty() {
    return normalizeHomeProperty(state()?.business?.homeProperty);
  }

  function currentRent() {
    return homePropertyMonthlyRent(currentProperty(), propertyARent);
  }

  function label(propertyId) {
    return normalizeHomeProperty(propertyId) === 'B' ? '物件Ｂ' : '物件A';
  }

  function backgroundAsset() {
    return homePropertyBackgroundAsset(currentProperty(), isPortraitLayout());
  }

  function previewFile(propertyId) {
    const normalized = normalizeHomeProperty(propertyId);
    const asset = homePropertyBackgroundAsset(normalized, isPortraitLayout());
    return normalized === 'B' ? `${asset}.png` : `${asset}.webp`;
  }

  function isUnlocked() {
    return homePropertyUnlocked(state()?.game?.day);
  }

  function renderView() {
    const data = screenData();
    const current = currentProperty();
    const selected = normalizeHomeProperty(data.homeProperty || current);
    data.homeProperty = selected;
    const rent = homePropertyMonthlyRent(selected, propertyARent);
    const preview = previewFile(selected);
    const currentStyle = (id) => id === current
      ? 'box-shadow:0 0 0 2px rgba(232,196,117,.95) inset,0 0 16px rgba(232,196,117,.5);'
      : '';
    const selectedClass = (id) => id === selected ? 'primary-button' : 'secondary-button';
    return shell('自宅', `
      <section class="center-card glass-panel expansion-card" style="max-width:min(820px,94vw);margin-inline:auto;">
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:14px;">
          <button type="button" class="${selectedClass('A')}" data-action="select-home-property" data-property="A" aria-pressed="${selected === 'A'}" style="min-width:110px;${currentStyle('A')}">物件A</button>
          <button type="button" class="${selectedClass('B')}" data-action="select-home-property" data-property="B" aria-pressed="${selected === 'B'}" style="min-width:110px;${currentStyle('B')}">物件Ｂ</button>
        </div>
        <div style="display:grid;place-items:center;min-height:0;margin:0 auto 14px;">
          <img src="./assets/images/${preview}?v=${version}" alt="${label(selected)}" draggable="false" style="display:block;max-width:100%;width:auto;max-height:52vh;object-fit:contain;border-radius:14px;">
        </div>
        <div class="phone-card" style="margin:0 auto 14px;text-align:center;max-width:520px;">
          <strong>引越し費用　${yen(HOME_MOVE_COST)}</strong>
          <span>毎月家賃　${yen(rent)}</span>
        </div>
        ${selected !== current ? '<button type="button" class="primary-button full-button" data-action="move-home-property">引越す</button>' : ''}
        <button type="button" class="secondary-button full-button" data-action="real-estate-menu" style="margin-top:10px;">戻る</button>
      </section>`, { help: '物件を選ぶと画像・引越し費用・毎月家賃を確認できます。現在住んでいる物件は枠の光で示されます。' });
  }

  function open() {
    if (!isUnlocked()) return false;
    const data = screenData();
    data.view = 'home';
    data.homeProperty = currentProperty();
    rerender();
    return true;
  }

  function select(propertyId) {
    const data = screenData();
    if (data.view !== 'home') return false;
    data.homeProperty = normalizeHomeProperty(propertyId);
    rerender();
    return true;
  }

  function move() {
    const currentState = state();
    if (!homePropertyUnlocked(currentState?.game?.day)) {
      showToast('自宅の引越しは351日目から利用できます。', 'error');
      return false;
    }
    const current = currentProperty();
    const destination = normalizeHomeProperty(screenData().homeProperty || current);
    if (destination === current) return false;
    const rent = homePropertyMonthlyRent(destination, propertyARent);
    const total = homePropertyMoveTotal(destination, propertyARent);
    if ((Number(currentState?.game?.money) || 0) < total) {
      showToast(`引越しには合計${yen(total)}が必要です。`, 'error');
      return false;
    }
    currentState.game.money -= total;
    currentState.business.homeProperty = destination;
    const moveDate = gameDate();
    currentState.business.lastProcessedHomeRentMonth = `${moveDate.getFullYear()}-${String(moveDate.getMonth() + 1).padStart(2, '0')}`;
    addFinance(`引越し費用（${label(destination)}）`, 0, HOME_MOVE_COST);
    addFinance(`自宅家賃1ヶ月分（${label(destination)}）`, 0, rent);
    saveGame();
    showToast(`${label(destination)}へ引越しました。${yen(total)}を支払いました。`, 'success', false);
    rerender();
    return true;
  }

  function processRent() {
    const currentState = state();
    const today = gameDate();
    if (today.getDate() !== 15) return null;
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (currentState.business.lastProcessedHomeRentMonth === monthKey) return null;

    if (Math.max(1, Number(currentState.game.day) || 1) <= 30) {
      const report = { month: monthKey, amount: 0, paid: 0, unpaid: 0, grace: true };
      currentState.business.lastProcessedHomeRentMonth = monthKey;
      currentState.business.homeRentReports.push(report);
      currentState.business.homeRentReports = currentState.business.homeRentReports.slice(-24);
      const message = 'ゲーム開始から30日間は、自宅家賃の初回猶予期間です。今月の請求はありません。';
      currentState.tools.morningMessages = [...(currentState.tools.morningMessages || []), message].slice(-10);
      addNotification('自宅家賃の初回猶予', message, 'info');
      return report;
    }

    const homeRent = currentRent();
    const result = payFixedCost(`${monthKey} 自宅家賃`, homeRent, (unpaid) => {
      currentState.business.homeRentUnpaid += unpaid;
    });
    const report = { month: monthKey, amount: homeRent, paid: result.paid, unpaid: result.unpaid };
    currentState.business.lastProcessedHomeRentMonth = monthKey;
    currentState.business.homeRentReports.push(report);
    currentState.business.homeRentReports = currentState.business.homeRentReports.slice(-24);

    const reserve = Math.max(0, Number(getMinLivingCashReserve?.()) || 0);
    const resultMessage = result.unpaid
      ? `自宅家賃 ${yen(homeRent)}のうち${yen(result.paid)}を支払い、${yen(result.unpaid)}が未払いです。生活費${yen(reserve)}は残しています。`
      : `自宅家賃 ${yen(homeRent)}を支払いました。`;
    currentState.tools.morningMessages = [...(currentState.tools.morningMessages || []), resultMessage].slice(-10);
    addNotification('自宅家賃支払日', resultMessage, result.unpaid ? 'warning' : 'info');
    return report;
  }

  return {
    currentProperty,
    currentRent,
    backgroundAsset,
    isUnlocked,
    renderView,
    open,
    select,
    move,
    processRent,
  };
}
