import type { FC, ReactNode } from 'react';

const inputClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

type FieldProps = { label: string; htmlFor: string; hint?: string; children: ReactNode };

export const Field: FC<FieldProps> = ({ label, htmlFor, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

type TextInputProps = { id: string; label: string; value: string; onChange: (value: string) => void; hint?: string };

export const TextInput: FC<TextInputProps> = ({ id, label, value, onChange, hint }) => (
  <Field label={label} htmlFor={id} hint={hint}>
    <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
  </Field>
);

type NumberInputProps = { id: string; label: string; value: number; onChange: (value: number) => void; hint?: string };

export const NumberInput: FC<NumberInputProps> = ({ id, label, value, onChange, hint }) => (
  <Field label={label} htmlFor={id} hint={hint}>
    <input
      id={id}
      type="number"
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      className={inputClass}
    />
  </Field>
);

type SelectInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
};

export const SelectInput: FC<SelectInputProps> = ({ id, label, value, onChange, options, hint }) => (
  <Field label={label} htmlFor={id} hint={hint}>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} bg-white`}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </Field>
);