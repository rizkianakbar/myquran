import { z } from 'zod';
import { defineOpenAPI, defineOpenAPIEndpoint } from '#api/primitives/openapi.ts';

const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.literal('post.status_changed'),
  data: z.object({
    postId: z.string(),
    newStatus: z.enum(['published', 'archived']),
    previousStatus: z.enum(['draft', 'published']),
  }),
});

/**
 * Webhook handler for post status updates from an external provider.
 */
export default defineOpenAPI({
  POST: defineOpenAPIEndpoint({
    summary: 'Handle post status webhook',
    requestBody: WebhookEventSchema,
    responses: {
      200: {
        description: 'Webhook processed',
        schema: z.object({ received: z.boolean() }),
      },
      401: {
        description: 'Invalid signature',
        schema: z.object({ error: z.string() }),
      },
    },
    async handler({ ctx, body, request, response }) {
      return response.ok({ received: true });
    },
  }),
});
