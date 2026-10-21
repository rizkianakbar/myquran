import crypto from 'node:crypto';
import { describe, expect } from 'vitest';
import { apiKeys, posts, users } from '#api/databases/schema.ts';
import { defineTestAppContext, serverTest } from '#api/lib/testing/utils.ts';
import { getPostById } from '#api/services/posts.ts';

/**
 * Helper to create a user in the test database.
 */
async function createUser(db: Parameters<typeof defineTestAppContext>[0]['db']) {
  const [user] = await db.insert(users).values({ email: 'test@example.com', name: 'Test User' }).returning();

  return user;
}

/**
 * Helper to create an API key for a user.
 */
async function createApiKey(db: Parameters<typeof defineTestAppContext>[0]['db'], userId: string) {
  const rawKey = `test_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      name: 'Test Key',
      keyHash,
      prefix: rawKey.slice(0, 8),
      userId,
    })
    .returning();

  return { apiKey, rawKey };
}

/**
 * Helper to create a post.
 */
async function createPost(
  db: Parameters<typeof defineTestAppContext>[0]['db'],
  userId: string,
  overrides: Partial<typeof posts.$inferInsert> = {},
) {
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
 * Simulates OpenAPI GET /v1/posts/:id handler logic for testing.
 * This follows the same pattern as the actual endpoint handler.
 */
async function callGetPostEndpoint(ctx: ReturnType<typeof defineTestAppContext>, params: { id: string }) {
  if (!ctx.apiKey) {
    return { status: 401 as const, data: { error: 'API key required' } };
  }

  const post = await getPostById(ctx, params.id);
  if (!post) {
    return { status: 404 as const, data: { error: 'Post not found' } };
  }

  if (post.createdBy !== ctx.apiKey.userId) {
    return { status: 404 as const, data: { error: 'Post not found' } };
  }

  return { status: 200 as const, data: post };
}

describe('GET /v1/posts/:id', () => {
  serverTest('should return post for owner', async ({ container }) => {
    const user = await createUser(container.db);
    const { apiKey } = await createApiKey(container.db, user.id);
    const post = await createPost(container.db, user.id, {
      title: 'Test post title',
      content: 'Test post content',
    });
    const ctx = defineTestAppContext(container, {
      apiKey: { id: apiKey.id, name: apiKey.name, userId: user.id },
    });
    const result = await callGetPostEndpoint(ctx, { id: post.id });

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.data.id).toBe(post.id);
      expect(result.data.title).toBe('Test post title');
      expect(result.data.content).toBe('Test post content');
    }
  });

  serverTest('should return 404 for non-owner', async ({ container }) => {
    const owner = await createUser(container.db);
    const post = await createPost(container.db, owner.id);
    const [otherUser] = await container.db
      .insert(users)
      .values({ email: 'other@example.com', name: 'Other User' })
      .returning();
    const { apiKey } = await createApiKey(container.db, otherUser.id);
    const ctx = defineTestAppContext(container, {
      apiKey: { id: apiKey.id, name: apiKey.name, userId: otherUser.id },
    });
    const result = await callGetPostEndpoint(ctx, { id: post.id });

    expect(result.status).toBe(404);
    if (result.status === 404) {
      expect(result.data.error).toBe('Post not found');
    }
  });

  serverTest('should return 401 without API key', async ({ container }) => {
    const user = await createUser(container.db);
    const post = await createPost(container.db, user.id);
    const ctx = defineTestAppContext(container);
    const result = await callGetPostEndpoint(ctx, { id: post.id });

    expect(result.status).toBe(401);
    if (result.status === 401) {
      expect(result.data.error).toBe('API key required');
    }
  });

  serverTest('should return 404 for non-existent post', async ({ container }) => {
    const user = await createUser(container.db);
    const { apiKey } = await createApiKey(container.db, user.id);
    const ctx = defineTestAppContext(container, {
      apiKey: { id: apiKey.id, name: apiKey.name, userId: user.id },
    });
    const result = await callGetPostEndpoint(ctx, {
      id: '00000000-0000-0000-0000-000000000000',
    });

    expect(result.status).toBe(404);
    if (result.status === 404) {
      expect(result.data.error).toBe('Post not found');
    }
  });
});
