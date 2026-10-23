import { authClient } from '#/lib/auth-client.ts';
import { deletePlanFn, getPlanFn, savePlanFn } from '#/server/plans.functions.ts';
import { mergePlans } from './plans.lib.ts';
import { accountStore, planStore } from './plans.store.ts';
import type { PlanState, ReadingPlan } from './plans.types.ts';

/**
 * Keeps the device's plan in step with the account. Loaded on demand (see
 * `usePlanSync`), so the auth client stays off the first page load.
 */

/**
 * Hint that this device was signed in last time, so sync starts on load for
 * a reader with no plan here yet (one started on another device).
 */
const ACCOUNT_HINT_KEY = 'quran:account';
const PUSH_DELAY_MS = 3000;

let running = false;
let applying = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let teardown = () => {};

export function hasAccountHint(): boolean {
  try {
    return localStorage.getItem(ACCOUNT_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function setAccountHint(signedIn: boolean) {
  accountStore.set({ signedIn });
  try {
    if (signedIn) localStorage.setItem(ACCOUNT_HINT_KEY, '1');
    else localStorage.removeItem(ACCOUNT_HINT_KEY);
  } catch {
    // Storage blocked: sync then starts only once there is a plan here.
  }
}

/**
 * Take the account's copy. Reading done on this device while the request
 * was out is kept by merging it back in.
 */
function adopt(remote: ReadingPlan | null) {
  const { plan: local } = planStore.get();
  const plan = remote && local?.id === remote.id ? mergePlans(local, remote) : remote;
  applying = true;
  planStore.set({ plan, synced: plan !== null });
  applying = false;
}

async function push(plan: ReadingPlan) {
  adopt(await savePlanFn({ data: plan }));
}

/**
 * Bring this device and the account together. A plan that was synced but is
 * gone from the account was ended on another device, so it ends here too.
 */
async function reconcile() {
  const remote = await getPlanFn();
  const { plan: local, synced } = planStore.get();
  if (local && (remote || !synced)) await push(local);
  else adopt(remote);
}

function schedulePush(delay = PUSH_DELAY_MS) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    const { plan } = planStore.get();
    if (plan) void push(plan).catch(() => {});
  }, delay);
}

function onStoreChange(prev: PlanState) {
  const next = planStore.get();
  if (applying) return;
  if (prev.plan && prev.synced && next.plan?.id !== prev.plan.id) {
    // Ended here (a newly started plan instead replaces it on push).
    if (!next.plan) void deletePlanFn({ data: { id: prev.plan.id } }).catch(() => {});
  }
  if (next.plan) schedulePush();
}

/**
 * Start syncing if this device is signed in; safe to call again (it then
 * just reconciles, e.g. right after signing in).
 */
export async function startPlanSync() {
  if (running) {
    await reconcile().catch(() => {});
    return;
  }
  const { data: session } = await authClient.getSession();
  setAccountHint(!!session);
  if (!session || running) return;
  running = true;

  let prev = planStore.get();
  const unsubscribe = planStore.subscribe(() => {
    onStoreChange(prev);
    prev = planStore.get();
  });
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void reconcile().catch(() => {});
    else if (pushTimer) schedulePush(0);
  };
  document.addEventListener('visibilitychange', onVisibility);
  teardown = () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onVisibility);
    clearTimeout(pushTimer);
  };

  await reconcile().catch(() => {});
}

/**
 * On sign-out: stop syncing and drop the account's plan from this device.
 * A plan never uploaded stays, since it was this device's own.
 */
export function stopPlanSync() {
  teardown();
  teardown = () => {};
  running = false;
  setAccountHint(false);
  if (planStore.get().synced) planStore.set({ plan: null, synced: false });
}
