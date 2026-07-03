import { Check } from "lucide-react";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
}

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <ol aria-label="Progress" className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const completed = index < currentStep;
        const active = index === currentStep;

        return (
          <li
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950"
            key={step}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-300 text-xs font-bold dark:border-slate-700">
              {completed ? <Check aria-hidden="true" size={14} /> : index + 1}
            </span>
            <span className={active ? "font-semibold text-slate-950 dark:text-white" : "text-slate-500"}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
