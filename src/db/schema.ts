import { sql } from 'drizzle-orm';
import { pgTable, uniqueIndex } from 'drizzle-orm/pg-core';
import type { PlanDay } from '#/server/schemas.ts';

/**
 * Users table for authentication.
 */
export const users = pgTable('auth_users', (t) => ({
  id: t.text('id').primaryKey().default(sql`uuidv7()`),
  email: t.text('email').notNull().unique(),
  emailVerified: t.boolean('email_verified').notNull().default(false),
  name: t.text('name').notNull(),
  image: t.text('image'),
  createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}));

/**
 * Sessions table for Better Auth.
 */
export const sessions = pgTable('auth_sessions', (t) => ({
  id: t.text('id').primaryKey().default(sql`uuidv7()`),
  userId: t
    .text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: t.text('token').notNull().unique(),
  expiresAt: t.timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  ipAddress: t.text('ip_address'),
  userAgent: t.text('user_agent'),
  createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}));

/**
 * Accounts table for Better Auth.
 */
export const accounts = pgTable('auth_accounts', (t) => ({
  id: t.text('id').primaryKey().default(sql`uuidv7()`),
  userId: t
    .text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: t.text('account_id').notNull(),
  providerId: t.text('provider_id').notNull(),
  accessToken: t.text('access_token'),
  refreshToken: t.text('refresh_token'),
  idToken: t.text('id_token'),
  accessTokenExpiresAt: t.timestamp('access_token_expires_at', {
    withTimezone: true,
    mode: 'string',
  }),
  refreshTokenExpiresAt: t.timestamp('refresh_token_expires_at', {
    withTimezone: true,
    mode: 'string',
  }),
  scope: t.text('scope'),
  password: t.text('password'),
  createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}));

/**
 * Verifications table for Better Auth.
 */
export const verifications = pgTable('auth_verifications', (t) => ({
  id: t.text('id').primaryKey().default(sql`uuidv7()`),
  identifier: t.text('identifier').notNull(),
  value: t.text('value').notNull(),
  expiresAt: t.timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}));

/**
 * Personal notes (reflections) on a verse. One note per user per verse;
 * saving again replaces the body.
 */
export const notes = pgTable(
  'quran_notes',
  (t) => ({
    id: t.text('id').primaryKey().default(sql`uuidv7()`),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    surah: t.integer('surah').notNull(),
    verse: t.integer('verse').notNull(),
    body: t.text('body').notNull(),
    createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: t.timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  }),
  (t) => [uniqueIndex('quran_notes_user_verse_idx').on(t.userId, t.surah, t.verse)],
);

/**
 * Bookmarked verses.
 */
export const bookmarks = pgTable(
  'quran_bookmarks',
  (t) => ({
    id: t.text('id').primaryKey().default(sql`uuidv7()`),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    surah: t.integer('surah').notNull(),
    verse: t.integer('verse').notNull(),
    createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  }),
  (t) => [uniqueIndex('quran_bookmarks_user_verse_idx').on(t.userId, t.surah, t.verse)],
);

/**
 * A reader's khatam plan, synced from their devices. One per user: starting
 * a new plan replaces the old one. `planId` is made on the device that
 * started the plan, so two devices can tell whether they hold the same one.
 */
export const readingPlans = pgTable(
  'quran_reading_plans',
  (t) => ({
    id: t.text('id').primaryKey().default(sql`uuidv7()`),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: t.uuid('plan_id').notNull(),
    startDate: t.date('start_date', { mode: 'string' }).notNull(),
    endDate: t.date('end_date', { mode: 'string' }).notNull(),
    /**
     * Verses read, as the base64 bitset from `src/lib/quran/verse-set.ts`.
     */
    read: t.text('read').notNull(),
    today: t.jsonb('today').$type<PlanDay>(),
    completedAt: t.timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    createdAt: t.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
    updatedAt: t.timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  }),
  (t) => [uniqueIndex('quran_reading_plans_user_idx').on(t.userId)],
);
