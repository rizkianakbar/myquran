import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { db } from './db.server.ts';
import { authMiddleware } from './middleware.ts';
import { deletePlan, getPlan, savePlan } from './plans.server.ts';
import { readingPlanSchema } from './schemas.ts';

// No query options: the plan lives in a device store (`plans.store.ts`) that
// works signed out, and `plans.sync.ts` reconciles it with these.

/**
 * The user's reading plan, or null.
 */
export const getPlanFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => getPlan(db, context.user.id));

/**
 * Store this device's plan; returns the account's copy to adopt.
 */
export const savePlanFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(readingPlanSchema)
  .handler(({ context, data }) => savePlan(db, context.user.id, data));

/**
 * End the user's plan.
 */
export const deletePlanFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: readingPlanSchema.shape.id }))
  .handler(({ context, data }) => deletePlan(db, context.user.id, data.id));
