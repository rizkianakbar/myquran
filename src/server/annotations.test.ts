import { describe, expect } from 'vitest';
import { createTestUser, serverTest } from '#/test/database.ts';
import { listBookmarks, toggleBookmark } from './bookmarks.server.ts';
import { deleteNote, listNotes, listNotesForSurah, saveNote } from './notes.server.ts';

describe('saveNote', () => {
  serverTest('creates a note, then replaces it on the same verse', async ({ db }) => {
    const user = await createTestUser(db);

    const first = await saveNote(db, user.id, { surah: 2, verse: 255, body: 'First thought' });
    const second = await saveNote(db, user.id, { surah: 2, verse: 255, body: 'Revised thought' });

    expect(second.id).toBe(first.id);
    expect(second.body).toBe('Revised thought');
    expect(await listNotes(db, user.id)).toHaveLength(1);
  });
});

describe('listNotesForSurah', () => {
  serverTest('returns only that surah, in verse order, for the owner only', async ({ db }) => {
    const user = await createTestUser(db);
    const other = await createTestUser(db);

    await saveNote(db, user.id, { surah: 1, verse: 5, body: 'b' });
    await saveNote(db, user.id, { surah: 1, verse: 2, body: 'a' });
    await saveNote(db, user.id, { surah: 3, verse: 1, body: 'elsewhere' });
    await saveNote(db, other.id, { surah: 1, verse: 1, body: 'not mine' });

    const result = await listNotesForSurah(db, user.id, 1);

    expect(result.map((note) => note.verse)).toEqual([2, 5]);
  });
});

describe('deleteNote', () => {
  serverTest('deletes the note on a verse', async ({ db }) => {
    const user = await createTestUser(db);
    await saveNote(db, user.id, { surah: 1, verse: 1, body: 'To delete' });

    expect(await deleteNote(db, user.id, { surah: 1, verse: 1 })).not.toBeNull();
    expect(await listNotes(db, user.id)).toHaveLength(0);
  });

  serverTest("returns null for another user's note and leaves it intact", async ({ db }) => {
    const owner = await createTestUser(db);
    const other = await createTestUser(db);
    await saveNote(db, owner.id, { surah: 1, verse: 1, body: 'x' });

    expect(await deleteNote(db, other.id, { surah: 1, verse: 1 })).toBeNull();
    expect(await listNotes(db, owner.id)).toHaveLength(1);
  });
});

describe('toggleBookmark', () => {
  serverTest('adds a bookmark, then removes it on the second toggle', async ({ db }) => {
    const user = await createTestUser(db);

    expect(await toggleBookmark(db, user.id, { surah: 18, verse: 10 })).toEqual({ bookmarked: true });
    expect(await listBookmarks(db, user.id)).toHaveLength(1);

    expect(await toggleBookmark(db, user.id, { surah: 18, verse: 10 })).toEqual({ bookmarked: false });
    expect(await listBookmarks(db, user.id)).toHaveLength(0);
  });
});
