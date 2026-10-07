import type { FC } from 'react';

export type Choice = { value: string; label: string; description?: string; disabled?: boolean; disabledReason?: string };

type Props = { name: string; legend: string; value: string; choices: Choice[]; onChange: (value: string) => void; hint?: string };

// A row of selectable cards for a decision with a few clear options. Native radio inputs keep it keyboard and screen-reader friendly.
export const ChoiceCards: FC<Props> = ({ name, legend, value, choices, onChange, hint }) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-medium text-gray-700">{legend}</legend>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {choices.map((c) => {
        const selected = c.value === value;
        return (
          <label
            key={c.value}
            className={`flex flex-col gap-1 rounded-lg border p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-brand-500 ${c.disabled ? 'cursor-not-allowed opacity-50 ' : 'cursor-pointer '}${
              selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name={name} value={c.value} checked={selected} disabled={c.disabled} aria-label={c.label} onChange={() => onChange(c.value)} className="h-4 w-4 accent-brand-600" />
              <span className="text-sm font-semibold text-gray-900">{c.label}</span>
            </span>
            {c.description && <span className="pl-6 text-xs text-gray-600">{c.description}</span>}
            {c.disabled && c.disabledReason && <span className="pl-6 text-xs font-medium text-amber-700">{c.disabledReason}</span>}
          </label>
        );
      })}
    </div>
    {hint && <p className="text-xs text-gray-500">{hint}</p>}
  </fieldset>
);