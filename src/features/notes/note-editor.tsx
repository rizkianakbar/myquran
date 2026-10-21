import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { useT } from '#/lib/i18n.ts';
import { deleteNoteFn, notesQueries, saveNoteFn } from '#/server/notes.functions.ts';

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
  const queryClient = useQueryClient();
  const [body, setBody] = useState(initialBody);
  const onSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: notesQueries.all });
    onDone();
  };

  const save = useMutation({ mutationFn: useServerFn(saveNoteFn), onSuccess });
  const remove = useMutation({ mutationFn: useServerFn(deleteNoteFn), onSuccess });

  return (
    <form
      className="mt-3 animate-in space-y-2 fade-in slide-in-from-top-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) save.mutate({ data: { surah, verse, body } });
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
            onClick={() => remove.mutate({ data: { surah, verse } })}>
            {t.delete}
          </Button>
        )}
      </div>
    </form>
  );
}
