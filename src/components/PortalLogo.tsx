export function PortalLogo() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-white"
    >
      <svg className="size-6" fill="none" viewBox="0 0 24 24">
        <path
          d="M4.5 3.75 20.25 12 13.5 14.25 11.25 21 4.5 3.75Z"
          fill="currentColor"
        />
        <path
          d="m9.75 9.75 7.65 2.55-4.8 1.6-1.6 4.8-1.25-8.95Z"
          className="fill-white dark:fill-slate-950"
        />
      </svg>
    </span>
  );
}
