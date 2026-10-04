export const BANK_NEZUMI_EVENT_CHANCE = 1 / 30;
export const PURPLE_CAPSULE_PRICE = 1_000_000;
export function shouldShowBankNezumi(random = Math.random) { return random() < BANK_NEZUMI_EVENT_CHANCE; }
export function canBuyPurpleCapsule(snapshot) {
  return snapshot?.ok === true && Number(snapshot.event?.totalTriggered) >= 2
    && Number(snapshot.game?.money) >= PURPLE_CAPSULE_PRICE;
}
export function purchasePurpleCapsule(state, receipt) {
  if (!receipt || typeof receipt !== 'object') return { ok:false, reason:'invalid-receipt' };
  if (receipt.purchased) return { ok:false, reason:'already-purchased' };
  if (!canBuyPurpleCapsule({ok:Boolean(state),game:state?.game,event:state?.events?.bluesJukeEvent})) {
    return { ok:false, reason:'conditions-not-met' };
  }
  state.inventory = state.inventory || {};
  state.inventory.items = state.inventory.items || {};
  state.game.money -= PURPLE_CAPSULE_PRICE;
  state.inventory.items.purpleCapsule = Math.max(0,Math.floor(Number(state.inventory.items.purpleCapsule)||0)) + 1;
  receipt.purchased = true;
  return {ok:true,amount:PURPLE_CAPSULE_PRICE,money:state.game.money,quantity:state.inventory.items.purpleCapsule};
}
