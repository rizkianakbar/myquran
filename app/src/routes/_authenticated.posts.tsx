import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#assets/components/ui/button.tsx';
import { Card } from '#assets/components/ui/card.tsx';
import { Textarea } from '#assets/components/ui/textarea.tsx';
import { authClient } from '../lib/auth';
import { trpc } from '../lib/trpc';

export const Route = createFileRoute('/_authenticated/posts')({
  component: PostsPage,
});

const MAX_LENGTH = 280;

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground ring-1 ring-border">
      {initialOf(name)}
    </div>
  );
}

function formatRelativeTime(value: string) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));

  if (diffSeconds < 60) return 'now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function PostsPage() {
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const utils = trpc.useUtils();
  const postsQuery = trpc.posts.list.useQuery();
  const [text, setText] = useState('');

  const createPost = trpc.posts.create.useMutation({
    onSuccess: () => {
      setText('');
      utils.posts.list.invalidate();
    },
  });

  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => utils.posts.list.invalidate(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    createPost.mutate({ title: trimmed.slice(0, 200), content: trimmed });
  }

  const posts = postsQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card className="gap-0 divide-y divide-border p-0">
        <form onSubmit={handleSubmit} className="flex gap-3 p-4">
          <Avatar name={session?.user?.name ?? ''} />

          <div className="min-w-0 flex-1 space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={MAX_LENGTH}
              rows={2}
              className="min-h-14 resize-none border-none p-3 text-[15px] leading-snug shadow-none focus-visible:ring-0"
            />

            {createPost.error && <p className="text-sm text-destructive">{createPost.error.message}</p>}

            <div className="flex items-center justify-end gap-3">
              {text.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {text.length}/{MAX_LENGTH}
                </span>
              )}
              <Button
                type="submit"
                size="sm"
                className="rounded-full px-4 pt-1"
                disabled={!text.trim() || createPost.isPending}>
                {createPost.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {createPost.isPending ? 'Posting…' : 'Post'}
              </Button>
            </div>
          </div>
        </form>

        {postsQuery.isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading feed…</div>}

        {postsQuery.isError && (
          <div className="p-8 text-center text-sm text-destructive">
            Couldn't load the feed. Try refreshing the page.
          </div>
        )}

        {postsQuery.isSuccess && posts.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No posts yet — be the first to share something.
          </div>
        )}

        {posts.map((post) => {
          const isOwn = post.createdBy === currentUserId;
          const isDeleting = deletePost.isPending && deletePost.variables?.id === post.id;

          return (
            <article key={post.id} className="flex gap-3 p-4">
              <Avatar name={post.authorName} />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate">
                    <span className="text-sm font-medium text-foreground">{post.authorName}</span>{' '}
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
                  </p>

                  {isOwn && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete post"
                      disabled={isDeleting}
                      onClick={() => deletePost.mutate({ id: post.id })}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  )}
                </div>

                <p className="mt-0.5 text-[15px] leading-snug whitespace-pre-wrap text-foreground">{post.content}</p>
              </div>
            </article>
          );
        })}
      </Card>
    </div>
  );
}
