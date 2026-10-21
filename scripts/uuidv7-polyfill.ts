/**
 * Defines `public.uuidv7()` on servers older than Postgres 18 (e.g. Supabase
 * on 17), where the built-in the schema's id defaults call doesn't exist yet.
 * Runs before `bun db:migrate`; a no-op on 18+, where the built-in is used.
 */
import { sql } from 'drizzle-orm';
import { db } from '#/server/db.server.ts';

const { rows } = await db.execute<{ server_version_num: string }>(sql`show server_version_num`);

if (Number(rows[0].server_version_num) < 180000) {
  await db.execute(sql`
    create or replace function public.uuidv7() returns uuid
    language sql volatile parallel safe as $$
      select encode(
        set_bit(set_bit(
          overlay(uuid_send(gen_random_uuid())
            placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
            from 1 for 6),
          52, 1), 53, 1),
        'hex')::uuid
    $$
  `);
  console.log('Defined public.uuidv7() polyfill (server is older than Postgres 18)');
}

await db.$client.end();
