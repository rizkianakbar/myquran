import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx';
import { cn } from '#/lib/utils.ts';

export interface ChoiceOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface ChoiceGroupProps<T extends string | number> {
  /**
   * Names the group for assistive tech; the visible label is the caller's.
   */
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Pick one of a few options, all in view: shadcn's toggle group, single
 * choice. Pressing the chosen option again keeps it (Base UI would clear it).
 */
export function ChoiceGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: ChoiceGroupProps<T>) {
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      size="sm"
      spacing={1.5}
      value={[String(value)]}
      onValueChange={(next) => {
        const picked = options.find((option) => String(option.value) === next[0]);
        if (picked) onChange(picked.value);
      }}
      className={cn('flex-wrap', className)}>
      {options.map((option) => (
        <ToggleGroupItem
          key={String(option.value)}
          value={String(option.value)}
          className="rounded-full px-3 tabular-nums">
          {option.icon}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
