import { TRPCError } from '@trpc/server';
import { describe, expect } from 'vitest';
import { posts, users } from '#api/databases/schema.ts';
import { defineTestAppContext, type MockContainer, serverTest } from '#api/lib/testing/utils.ts';
import type { AppContext } from '#api/primitives/app-context.ts';
import * as postsService from '#api/services/posts.ts';
import { getPostById } from '#api/services/posts.ts';

/**
 * Helper to create a user in the test database.
 */
async function createUser(db: MockContainer['db']) {
  const [user] = await db.insert(users).values({ email: 'test@example.com', name: 'Test User' }).returning();
  return user;
}

/**
 * Helper to create a post.
 */
async function createPost(db: MockContainer['db'], userId: string, overrides: Partial<typeof posts.$inferInsert> = {}) {
  const [post] = await db
    .insert(posts)
    .values({
      title: 'Test post',
      createdBy: userId,
      ...overrides,
    })
    .returning();

  return post;
}

/**
 * Builds an authenticated AppContext for a given user.
 */
function buildAuthedContext(
  container: MockContainer,
  user: Awaited<ReturnType<typeof createUser>>,
): AppContext & { user: NonNullable<AppContext['user']> } {
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
  }) as AppContext & { user: NonNullable<AppContext['user']> };
}

/**
 * Simulates TRPC delete procedure logic for testing.
 * This follows the same pattern as the actual procedure.
 */
async function callDelete(ctx: AppContext & { user: NonNullable<AppContext['user']> }, input: { id: string }) {
  const post = await postsService.deletePost(ctx, input.id, ctx.user.id);

  if (!post) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Post not found',
    });
  }

  return post;
}

/**
 * Simulates TRPC getById procedure logic for testing.
 * This follows the same pattern as the actual procedure.
 */
async function callGetById(ctx: AppContext & { user: NonNullable<AppContext['user']> }, input: { id: string }) {
  const post = await getPostById(ctx, input.id);

  if (!post) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Post not found',
    });
  }

  if (post.createdBy !== ctx.user.id) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Post not found',
    });
  }

  return post;
}

describe('posts.getById', () => {
  serverTest('should return post for authenticated owner', async ({ container }) => {
    const user = await createUser(container.db);
    const post = await createPost(container.db, user.id, {
      title: 'TRPC test post',
      content: 'Some content',
    });
    const ctx = defineTestAppContext(container, {
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
    });

    const result = await callGetById(ctx as AppContext & { user: NonNullable<AppContext['user']> }, { id: post.id });

    expect(result.id).toBe(post.id);
    expect(result.title).toBe('TRPC test post');
    expect(result.content).toBe('Some content');
  });

  serverTest('should throw NOT_FOUND for non-owner', async ({ container }) => {
    const owner = await createUser(container.db);
    const post = await createPost(container.db, owner.id);
    const [otherUser] = await container.db
      .insert(users)
      .values({ email: 'other@example.com', name: 'Other User' })
      .returning();
    const ctx = defineTestAppContext(container, {
      session: {
        id: 'session-id',
        userId: otherUser.id,
        token: 'token',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(
      callGetById(ctx as AppContext & { user: NonNullable<AppContext['user']> }, { id: post.id }),
    ).rejects.toThrow(TRPCError);

    try {
      await callGetById(ctx as AppContext & { user: NonNullable<AppContext['user']> }, { id: post.id });
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('NOT_FOUND');
      expect((error as TRPCError).message).toBe('Post not found');
    }
  });

  serverTest('should throw NOT_FOUND for non-existent post', async ({ container }) => {
    const user = await createUser(container.db);
    const ctx = defineTestAppContext(container, {
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
    });

    await expect(
      callGetById(ctx as AppContext & { user: NonNullable<AppContext['user']> }, {
        id: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toThrow(TRPCError);

    try {
      await callGetById(ctx as AppContext & { user: NonNullable<AppContext['user']> }, {
        id: '00000000-0000-0000-0000-000000000000',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('NOT_FOUND');
    }
  });
});

describe('posts.list', () => {
  serverTest('returns every post across all users, newest first, with the author name', async ({ container }) => {
    const user = await createUser(container.db);
    const [otherUser] = await container.db
      .insert(users)
      .values({ email: 'other@example.com', name: 'Other User' })
      .returning();

    const oldest = await createPost(container.db, otherUser.id, { title: "Other user's post" });
    const older = await createPost(container.db, user.id, { title: 'Older post' });
    const newer = await createPost(container.db, user.id, { title: 'Newer post' });

    const ctx = buildAuthedContext(container, user);
    const result = await postsService.listPosts(ctx);

    expect(result.map((post) => post.id)).toEqual([newer.id, older.id, oldest.id]);
    expect(result.find((post) => post.id === oldest.id)?.authorName).toBe('Other User');
  });
});

describe('posts.create', () => {
  serverTest('creates a draft post owned by the user', async ({ container }) => {
    const user = await createUser(container.db);
    const ctx = buildAuthedContext(container, user);

    const post = await postsService.createPost(ctx, user.id, { title: 'Hello world', content: 'Some content' });

    expect(post.title).toBe('Hello world');
    expect(post.content).toBe('Some content');
    expect(post.status).toBe('draft');
    expect(post.createdBy).toBe(user.id);
  });
});

describe('posts.delete', () => {
  serverTest('deletes a post owned by the user', async ({ container }) => {
    const user = await createUser(container.db);
    const post = await createPost(container.db, user.id, { title: 'To delete' });
    const ctx = buildAuthedContext(container, user);

    const result = await callDelete(ctx, { id: post.id });

    expect(result.id).toBe(post.id);
    expect(await postsService.listPosts(ctx)).toHaveLength(0);
  });

  serverTest('throws NOT_FOUND for a post owned by another user', async ({ container }) => {
    const owner = await createUser(container.db);
    const post = await createPost(container.db, owner.id, { title: 'Not yours' });
    const [otherUser] = await container.db
      .insert(users)
      .values({ email: 'other@example.com', name: 'Other User' })
      .returning();
    const ctx = buildAuthedContext(container, otherUser);

    await expect(callDelete(ctx, { id: post.id })).rejects.toThrow(TRPCError);
  });

  serverTest('throws NOT_FOUND for a non-existent post', async ({ container }) => {
    const user = await createUser(container.db);
    const ctx = buildAuthedContext(container, user);

    await expect(callDelete(ctx, { id: '00000000-0000-0000-0000-000000000000' })).rejects.toThrow(TRPCError);
  });
});
