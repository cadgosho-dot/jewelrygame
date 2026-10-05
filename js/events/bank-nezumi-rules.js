export const BANK_NEZUMI_EVENT_CHANCE = 1 / 30;
export const PURPLE_CAPSULE_PRICE = 1_000_000;
export const PURPLE_CAPSULE_RETEST_RECOVERY_KEY = 'purpleCapsuleRetestRecovery20261006';
export function shouldShowBankNezumi(random = Math.random) { return random() < BANK_NEZUMI_EVENT_CHANCE; }
export function canBuyPurpleCapsule(snapshot) {
  return snapshot?.ok === true && Number(snapshot.event?.totalTriggered) >= 2
    && Number(snapshot.game?.money) >= PURPLE_CAPSULE_PRICE;
}
export function restorePurpleCapsuleForRetest(state) {
  if (!state || typeof state !== 'object') return { handled:false, restored:false, reason:'state-unavailable' };
  if (state.events?.[PURPLE_CAPSULE_RETEST_RECOVERY_KEY]?.handled) return { handled:false, restored:false, reason:'already-handled' };
  const purchased = Array.isArray(state.finance) && state.finance.some((row) =>
    String(row?.label || '') === '紫のカプセルを購入' && Number(row?.expense || 0) >= PURPLE_CAPSULE_PRICE
  );
  if (!purchased) return { handled:false, restored:false, reason:'purchase-not-found' };
  state.inventory = state.inventory && typeof state.inventory === 'object' ? state.inventory : {};
  state.inventory.items = state.inventory.items && typeof state.inventory.items === 'object' ? state.inventory.items : {};
  const count = Math.max(0, Math.floor(Number(state.inventory.items.purpleCapsule) || 0));
  if (count <= 0) state.inventory.items.purpleCapsule = 1;
  return { handled:true, restored:count <= 0, quantity:Math.max(1, count) };
}
export function purchasePurpleCapsule(state, receipt) {
  if (!receipt || typeof receipt !== 'object') return { ok:false, reason:'invalid-receipt' };
  if (receipt.retestRestore) {
    const recovery = restorePurpleCapsuleForRetest(state);
    return { ok:false, ...recovery, reason:recovery.reason || 'retest-recovery' };
  }
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
