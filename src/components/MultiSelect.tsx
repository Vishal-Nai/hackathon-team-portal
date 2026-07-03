import { cn } from "../utils/cn";

interface MultiSelectProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T[];
  error?: string;
  onChange: (nextValue: T[]) => void;
}

export function MultiSelect<T extends string>({
  label,
  options,
  value,
  error,
  onChange,
}: MultiSelectProps<T>) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);

          return (
            <button
              aria-pressed={selected}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-white dark:focus:ring-offset-slate-950",
                selected
                  ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-500",
              )}
              key={option}
              onClick={() => toggle(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="mt-2 min-h-5 text-xs">
        {error ? (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">Select every Cursor surface your team used.</p>
        )}
      </div>
    </fieldset>
  );
}
