import type { FC, ReactNode } from 'react';

const inputClass = 'input';

type FieldProps = { label: string; htmlFor: string; hint?: string; children: ReactNode };

export const Field: FC<FieldProps> = ({ label, htmlFor, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-500">{hint}</p>}
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
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </Field>
);

type CheckInputProps = { id: string; label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string };

export const CheckInput: FC<CheckInputProps> = ({ id, label, checked, onChange, hint }) => (
  <div className="flex items-start gap-3">
    <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <label htmlFor={id} className="text-sm font-medium text-gray-800">
      {label}
      {hint && <span className="block text-xs font-normal text-gray-500">{hint}</span>}
    </label>
  </div>
);

type ListInputProps = { id: string; label: string; value: string[]; onChange: (value: string[]) => void; hint?: string };

// A comma-separated list as one text field (DNS servers, forwarders).
export const ListInput: FC<ListInputProps> = ({ id, label, value, onChange, hint }) => (
  <TextInput id={id} label={label} value={value.join(', ')} hint={hint ?? 'Comma-separated.'} onChange={(v) => onChange(v.split(',').map((s) => s.trim()).filter(Boolean))} />
);