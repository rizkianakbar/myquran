import type { ReactNode } from 'react';
import { ChoiceSelect } from '#/components/choice-select.tsx';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '#/components/ui/field.tsx';
import { type Prefs, setPref, usePrefs } from '#/lib/prefs.ts';

/**
 * One setting: its name and hint beside the control on wide screens, above
 * it on phones. With `htmlFor` the name is a real label for that control;
 * without (a group of choices) it is a title, and the control names itself.
 */
export function SettingsRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <Field className="gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <FieldContent>
        {htmlFor ? <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel> : <FieldTitle>{label}</FieldTitle>}
        {hint && <FieldDescription className="text-xs">{hint}</FieldDescription>}
      </FieldContent>
      <div className="shrink-0">{children}</div>
    </Field>
  );
}

/**
 * A select bound straight to one preference.
 */
export function SettingsSelect<K extends keyof Prefs>({
  id,
  prefKey,
  options,
  parse,
}: {
  id: string;
  prefKey: K;
  options: { value: string; label: string }[];
  parse: (raw: string) => Prefs[K];
}) {
  const prefs = usePrefs();
  return (
    <ChoiceSelect
      id={id}
      value={String(prefs[prefKey])}
      options={options}
      onChange={(value) => setPref(prefKey, parse(value))}
    />
  );
}
