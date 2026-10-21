import { TRPCError } from '@trpc/server';
import { describe, expect } from 'vitest';
import { users } from '#api/databases/schema.ts';
import { defineTestAppContext, type MockContainer, serverTest } from '#api/lib/testing/utils.ts';
import type { AppContext } from '#api/primitives/app-context.ts';
import * as bookmarksService from '#api/services/bookmarks.ts';
import * as notesService from '#api/services/notes.ts';

type AuthedContext = AppContext & { user: NonNullable<AppContext['user']> };

/**
 * Helper to create a user in the test database.
 */
async function createUser(db: MockContainer['db'], email = 'test@example.com') {
  const [user] = await db.insert(users).values({ email, name: 'Test User' }).returning();
  return user;
}

/**
 * Builds an authenticated AppContext for a given user.
 */
function buildAuthedContext(container: MockContainer, user: Awaited<ReturnType<typeof createUser>>): AuthedContext {
  return defineTestAppContext(container, {
    session: {
      id: 'session-id',
      userId: user.id,
      token: 'token',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: false,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }) as AuthedContext;
}

/**
 * Simulates TRPC delete procedure logic for testing.
 */
async function callDelete(ctx: AuthedContext, input: notesService.VerseRef) {
  const note = await notesService.deleteNote(ctx, ctx.user.id, input);

  if (!note) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Note not found',
    });
  }

  return note;
}

describe('notes.save', () => {
  serverTest('creates a note, then replaces it on the same verse', async ({ container }) => {
    const user = await createUser(container.db);
    const ctx = buildAuthedContext(container, user);

    const first = await notesService.saveNote(ctx, user.id, { surah: 2, verse: 255, body: 'First thought' });
    const second = await notesService.saveNote(ctx, user.id, { surah: 2, verse: 255, body: 'Revised thought' });

    expect(second.id).toBe(first.id);
    expect(second.body).toBe('Revised thought');
    expect(await notesService.listNotes(ctx, user.id)).toHaveLength(1);
  });
});

describe('notes.bySurah', () => {
  serverTest('returns only that surah, in verse order, for the owner only', async ({ container }) => {
    const user = await createUser(container.db);
    const other = await createUser(container.db, 'other@example.com');
    const ctx = buildAuthedContext(container, user);

    await notesService.saveNote(ctx, user.id, { surah: 1, verse: 5, body: 'b' });
    await notesService.saveNote(ctx, user.id, { surah: 1, verse: 2, body: 'a' });
    await notesService.saveNote(ctx, user.id, { surah: 3, verse: 1, body: 'elsewhere' });
    await notesService.saveNote(ctx, other.id, { surah: 1, verse: 1, body: 'not mine' });

    const result = await notesService.listNotesForSurah(ctx, user.id, 1);

    expect(result.map((note) => note.verse)).toEqual([2, 5]);
  });
});

describe('notes.delete', () => {
  serverTest('deletes the note on a verse', async ({ container }) => {
    const user = await createUser(container.db);
    const ctx = buildAuthedContext(container, user);
    await notesService.saveNote(ctx, user.id, { surah: 1, verse: 1, body: 'To delete' });

    await callDelete(ctx, { surah: 1, verse: 1 });

    expect(await notesService.listNotes(ctx, user.id)).toHaveLength(0);
  });

  serverTest("throws NOT_FOUND for another user's note", async ({ container }) => {
    const owner = await createUser(container.db);
    const other = await createUser(container.db, 'other@example.com');
    await notesService.saveNote(buildAuthedContext(container, owner), owner.id, { surah: 1, verse: 1, body: 'x' });

    await expect(callDelete(buildAuthedContext(container, other), { surah: 1, verse: 1 })).rejects.toThrow(TRPCError);
  });
});

describe('bookmarks.toggle', () => {
  serverTest('adds a bookmark, then removes it on the second toggle', async ({ container }) => {
    const user = await createUser(container.db);
    const ctx = buildAuthedContext(container, user);

    expect(await bookmarksService.toggleBookmark(ctx, user.id, { surah: 18, verse: 10 })).toEqual({ bookmarked: true });
    expect(await bookmarksService.listBookmarks(ctx, user.id)).toHaveLength(1);

    expect(await bookmarksService.toggleBookmark(ctx, user.id, { surah: 18, verse: 10 })).toEqual({
      bookmarked: false,
    });
    expect(await bookmarksService.listBookmarks(ctx, user.id)).toHaveLength(0);
  });
});
