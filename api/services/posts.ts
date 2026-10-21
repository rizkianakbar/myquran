import { and, desc, eq } from 'drizzle-orm';
import { posts, users } from '#api/databases/schema.ts';
import type { AppContext } from '#api/primitives/app-context.ts';

/**
 * Get a post by ID. Returns the post if found, null otherwise.
 */
export async function getPostById(ctx: AppContext, postId: string) {
  const post = await ctx.container.db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0]);

  return post ?? null;
}

/**
 * List every post across all users for the public feed, most recent first.
 */
export async function listPosts(ctx: AppContext) {
  return ctx.container.db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      createdBy: posts.createdBy,
      authorName: users.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.createdBy, users.id))
    .orderBy(desc(posts.createdAt));
}

/**
 * Create a post owned by a user.
 */
export async function createPost(ctx: AppContext, userId: string, input: { title: string; content: string | null }) {
  const [post] = await ctx.container.db
    .insert(posts)
    .values({
      title: input.title,
      content: input.content,
      createdBy: userId,
    })
    .returning();

  return post;
}

/**
 * Delete a post owned by a user. Returns the deleted post, or null if it
 * didn't exist or wasn't owned by the user.
 */
export async function deletePost(ctx: AppContext, postId: string, userId: string) {
  const [post] = await ctx.container.db
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.createdBy, userId)))
    .returning();

  return post ?? null;
}
