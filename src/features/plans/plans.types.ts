import type { ReadingPlan } from '#/server/schemas.ts';

export type { PlanDay, ReadingPlan } from '#/server/schemas.ts';

/**
 * This device's plan. `synced` marks one the account has stored, so a plan
 * that vanishes from the account was ended on another device rather than
 * never uploaded.
 */
export interface PlanState {
  plan: ReadingPlan | null;
  synced: boolean;
}
