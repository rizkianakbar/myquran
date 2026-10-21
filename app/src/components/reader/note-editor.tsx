import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useT } from '#app/src/lib/i18n.ts';
import { trpc } from '#app/src/lib/trpc.tsx';
import { Button } from '#assets/components/ui/button.tsx';
import { Textarea } from '#assets/components/ui/textarea.tsx';

export function NoteEditor({
  surah,
  verse,
  initialBody,
  onDone,
}: {
  surah: number;
  verse: number;
  initialBody: string;
  onDone: () => void;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const [body, setBody] = useState(initialBody);
  const invalidate = () => Promise.all([utils.notes.bySurah.invalidate({ surah }), utils.notes.list.invalidate()]);

  const save = trpc.notes.save.useMutation({
    onSuccess: async () => {
      await invalidate();
      onDone();
    },
  });
  const remove = trpc.notes.delete.useMutation({
    onSuccess: async () => {
      await invalidate();
      onDone();
    },
  });

  return (
    <form
      className="mt-3 animate-in space-y-2 fade-in slide-in-from-top-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) save.mutate({ surah, verse, body });
      }}>
      <Textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
        placeholder={t.writeNote}
        rows={3}
        maxLength={10000}
      />
      {(save.error || remove.error) && (
        <p className="text-sm text-destructive">{(save.error ?? remove.error)?.message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!body.trim() || save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {save.isPending ? t.saving : t.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {t.cancel}
        </Button>
        {initialBody && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ surah, verse })}>
            {t.delete}
          </Button>
        )}
      </div>
    </form>
  );
}
