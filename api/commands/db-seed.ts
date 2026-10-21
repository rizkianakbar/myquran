import { createHash, randomBytes } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { reset } from 'drizzle-seed';
import * as schema from '#api/databases/schema.ts';
import { defineCommand } from '#api/primitives/cli.ts';

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'ak_test';
  const random = randomBytes(24).toString('hex');
  const key = `${prefix}_${random}`;
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

export const dbSeed = defineCommand({
  name: 'db:seed',
  description: 'Seed database with test data',
  async run(_args, container) {
    const db = container.db;

    await reset(db, schema);

    const [user] = await db
      .insert(schema.users)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
      })
      .returning();

    const [otherUser] = await db
      .insert(schema.users)
      .values({
        email: 'priya@example.com',
        name: 'Priya Shah',
        emailVerified: true,
      })
      .returning();

    await db.insert(schema.accounts).values({
      userId: user.id,
      accountId: user.id,
      providerId: 'credential',
      password: await hashPassword('password123'),
    });

    const { key, prefix, hash } = generateApiKey();
    await db.insert(schema.apiKeys).values({
      name: 'Test API Key',
      keyHash: hash,
      prefix,
      userId: user.id,
    });

    const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    await db.insert(schema.posts).values([
      {
        title: 'Finally got db:gen and db:migrate playing nicely together',
        content: 'Finally got db:gen and db:migrate playing nicely together. No more hand-written SQL.',
        createdBy: user.id,
        createdAt: hoursAgo(1),
      },
      {
        title: 'Trying out the new posts feed, seems to work',
        content: 'Trying out the new posts feed, seems to work.',
        createdBy: otherUser.id,
        createdAt: hoursAgo(3),
      },
      {
        title: 'Reminder: check the webhook idempotency key before merging',
        content: 'Reminder to self: check the webhook idempotency key before merging.',
        createdBy: user.id,
        createdAt: hoursAgo(20),
      },
      {
        title: "Deleting only works on your own posts, good, that's the point",
        content: "Deleting only works on your own posts. Good, that's the point.",
        createdBy: otherUser.id,
        createdAt: hoursAgo(30),
      },
      {
        title: 'First post',
        content: 'First post.',
        createdBy: user.id,
        createdAt: hoursAgo(96),
      },
    ]);

    console.log(`Seeded: user=test@example.com pass=password123 api_key=${key} posts=5`);

    await db.$client.end();
  },
});
