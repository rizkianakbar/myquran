import type { ReactNode } from 'react';
import { type Prefs, setPref, usePrefs } from '#/lib/prefs.ts';
import { cn } from '#/lib/utils.ts';

export function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsSegmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <fieldset className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
            option.value === value && 'bg-background text-foreground shadow-sm',
          )}>
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

export function SettingsSelect<K extends keyof Prefs>({
  prefKey,
  label,
  options,
  parse,
}: {
  prefKey: K;
  label: string;
  options: { value: string; label: string }[];
  parse: (raw: string) => Prefs[K];
}) {
  const prefs = usePrefs();
  return (
    <select
      aria-label={label}
      value={String(prefs[prefKey])}
      onChange={(e) => setPref(prefKey, parse(e.target.value))}
      className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
