import { z } from 'zod';
import { defineOpenAPI, defineOpenAPIEndpoint } from '#api/primitives/openapi.ts';
import { getPostById } from '#api/services/posts.ts';

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  createdAt: z.string(),
});

/**
 * Single post endpoint.
 */
export default defineOpenAPI({
  GET: defineOpenAPIEndpoint({
    summary: 'Get post by ID',
    params: z.object({ id: z.string().uuid() }),
    responses: {
      200: { description: 'Post found', schema: PostSchema },
      401: {
        description: 'Unauthorized',
        schema: z.object({ error: z.string() }),
      },
      404: {
        description: 'Post not found',
        schema: z.object({ error: z.string() }),
      },
    },
    async handler({ ctx, params, response }) {
      if (!ctx.apiKey) {
        return response.unauthorized({ error: 'API key required' });
      }

      const post = await getPostById(ctx, params.id);

      if (!post) {
        return response.notFound({ error: 'Post not found' });
      }

      // Ensure user owns this post.
      if (post.createdBy !== ctx.apiKey.userId) {
        return response.notFound({ error: 'Post not found' });
      }

      return response.ok(post);
    },
  }),
});
