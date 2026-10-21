import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createPost, deletePost, getPostById, listPosts } from '#api/services/posts.ts';
import { protectedProcedure, router } from './init.ts';

/**
 * Posts router for dashboard internal use.
 */
export const postsRouter = router({
  /**
   * List every post across all users for the public feed, most recent first.
   */
  list: protectedProcedure.query(({ ctx }) => listPosts(ctx)),

  /**
   * Get a post by ID.
   * Only returns the post if the authenticated user owns it.
   */
  getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const post = await getPostById(ctx, input.id);

    if (!post) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      });
    }

    // Ensure user owns this post.
    if (post.createdBy !== ctx.user.id) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      });
    }

    return post;
  }),

  /**
   * Create a post owned by the authenticated user.
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1, 'Title is required').max(200),
        content: z.string().trim().max(20000).nullable().default(null),
      }),
    )
    .mutation(({ ctx, input }) => createPost(ctx, ctx.user.id, input)),

  /**
   * Delete a post owned by the authenticated user.
   */
  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const post = await deletePost(ctx, input.id, ctx.user.id);

    if (!post) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      });
    }

    return post;
  }),
});
