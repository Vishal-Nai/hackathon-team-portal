import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

const controlClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:focus:ring-slate-800";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, htmlFor, children }: FieldShellProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-900 dark:text-slate-100" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      <div className="mt-2 min-h-5 text-xs">
        {error ? (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextInput({ label, error, hint, id, className, ...props }: TextInputProps) {
  const fieldId = id ?? props.name ?? label;

  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId}>
      <input
        id={fieldId}
        className={cn(controlClass, className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: readonly string[];
}

export function SelectInput({ label, error, hint, id, className, options, ...props }: SelectInputProps) {
  const fieldId = id ?? props.name ?? label;

  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={fieldId}>
      <select
        id={fieldId}
        className={cn(controlClass, "appearance-none", className)}
        aria-invalid={Boolean(error)}
        {...props}
      >
        <option value="">Choose one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface TextareaInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  currentLength?: number;
  maxLength?: number;
}

export function TextareaInput({
  label,
  error,
  hint,
  id,
  className,
  currentLength,
  maxLength,
  ...props
}: TextareaInputProps) {
  const fieldId = id ?? props.name ?? label;

  return (
    <FieldShell
      label={label}
      error={error}
      hint={
        currentLength !== undefined && maxLength
          ? `${currentLength}/${maxLength} characters${hint ? ` - ${hint}` : ""}`
          : hint
      }
      htmlFor={fieldId}
    >
      <textarea
        id={fieldId}
        className={cn(controlClass, "min-h-32 resize-y", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldShell>
  );
}
