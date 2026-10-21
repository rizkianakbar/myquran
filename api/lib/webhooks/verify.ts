import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a webhook signature using HMAC-SHA256.
 *
 * @param payload - Raw request body (Buffer or string)
 * @param signature - Signature from X-Webhook-Signature header (format: "sha256=...")
 * @param secret - Webhook secret for this endpoint
 * @returns true if signature is valid
 *
 * Usage:
 * ```typescript
 * const isValid = verifyWebhookSignature(
 *   request.rawBody,
 *   request.headers["x-webhook-signature"],
 *   ctx.container.config.WEBHOOK_SECRET
 * );
 * if (!isValid) {
 *   return response.unauthorized({ error: "Invalid signature" });
 * }
 * ```
 */
export function verifyWebhookSignature(
  payload: Buffer | string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSig = signature.slice(7); // Remove "sha256=" prefix
  const computedSig = createHmac('sha256', secret).update(payload).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(computedSig, 'hex'));
  } catch {
    return false;
  }
}
