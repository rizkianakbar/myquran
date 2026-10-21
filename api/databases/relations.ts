import { defineRelations } from 'drizzle-orm';
import * as schema from './schema.ts';

export const relations = defineRelations(schema, (r) => ({
  users: {
    sessions: r.many.sessions({
      from: r.users.id,
      to: r.sessions.userId,
    }),
    accounts: r.many.accounts({
      from: r.users.id,
      to: r.accounts.userId,
    }),
    apiKeys: r.many.apiKeys({
      from: r.users.id,
      to: r.apiKeys.userId,
    }),
    posts: r.many.posts({
      from: r.users.id,
      to: r.posts.createdBy,
    }),
  },
  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),
  },
  accounts: {
    user: r.one.users({
      from: r.accounts.userId,
      to: r.users.id,
    }),
  },
  apiKeys: {
    user: r.one.users({
      from: r.apiKeys.userId,
      to: r.users.id,
    }),
  },
  posts: {
    author: r.one.users({
      from: r.posts.createdBy,
      to: r.users.id,
    }),
  },
  verifications: {},
}));
