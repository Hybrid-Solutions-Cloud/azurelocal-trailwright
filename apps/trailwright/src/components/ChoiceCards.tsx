import type { FC } from 'react';

export type Choice = { value: string; label: string; description?: string };

type Props = { name: string; legend: string; value: string; choices: Choice[]; onChange: (value: string) => void; hint?: string };

// A row of selectable cards for a decision with a few clear options. Native radio inputs keep it keyboard and screen-reader friendly.
export const ChoiceCards: FC<Props> = ({ name, legend, value, choices, onChange, hint }) => (
  <fieldset className="space-y-2">
    <legend className="text-sm font-medium text-slate-700">{legend}</legend>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {choices.map((c) => {
        const selected = c.value === value;
        return (
          <label
            key={c.value}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500 ${
              selected ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name={name} value={c.value} checked={selected} aria-label={c.label} onChange={() => onChange(c.value)} className="h-4 w-4 accent-blue-600" />
              <span className="text-sm font-semibold text-slate-900">{c.label}</span>
            </span>
            {c.description && <span className="pl-6 text-xs text-slate-600">{c.description}</span>}
          </label>
        );
      })}
    </div>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </fieldset>
);