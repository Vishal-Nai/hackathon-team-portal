import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  Rocket,
  Upload,
  Users,
} from "lucide-react";
import type { HackathonEvent } from "../types/event";
import type { EventSummaryStats } from "../types/teams";
import { formatUploadTime } from "../services/events";

interface SyncChecklistProps {
  event: HackathonEvent;
  eventId: string;
  summary: EventSummaryStats;
}

type StepId =
  | "registration-form"
  | "export-registration"
  | "upload-registration"
  | "submission-form"
  | "export-submission"
  | "upload-submission"
  | "review-teams";

interface StepConfig {
  id: StepId;
  label: string;
  description: string;
}

const PHASES: Array<{ title: string; subtitle: string; steps: StepConfig[] }> = [
  {
    title: "Registration",
    subtitle: "Collect team sign-ups",
    steps: [
      {
        id: "registration-form",
        label: "Share registration form",
        description: "Add the link to your Luma page or welcome email.",
      },
      {
        id: "export-registration",
        label: "Export registration CSV",
        description: "In Typeform: Results → Export → CSV.",
      },
      {
        id: "upload-registration",
        label: "Upload to portal",
        description: "Import the CSV into the Registrations dashboard.",
      },
    ],
  },
  {
    title: "Submissions",
    subtitle: "Collect project links",
    steps: [
      {
        id: "submission-form",
        label: "Share submission form",
        description: "Send before the submission deadline.",
      },
      {
        id: "export-submission",
        label: "Export submission CSV",
        description: "In Typeform: Results → Export → CSV.",
      },
      {
        id: "upload-submission",
        label: "Upload to portal",
        description: "Import the CSV into the Submissions dashboard.",
      },
    ],
  },
  {
    title: "Review",
    subtitle: "Chase missing teams",
    steps: [
      {
        id: "review-teams",
        label: "Review all teams",
        description: "See matched teams, missing submissions, and export a chase list.",
      },
    ],
  },
];

export function SyncChecklist({ event, eventId, summary }: SyncChecklistProps) {
  const completed: Record<StepId, boolean> = {
    "registration-form": Boolean(event.typeformRegistrationUrl),
    "export-registration": Boolean(summary.regFileName),
    "upload-registration": summary.registeredCount > 0,
    "submission-form": Boolean(event.typeformSubmissionUrl),
    "export-submission": Boolean(summary.subFileName),
    "upload-submission": summary.submittedCount > 0,
    "review-teams": summary.registeredCount > 0 && summary.submittedCount > 0,
  };

  const totalSteps = Object.keys(completed).length;
  const doneCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((doneCount / totalSteps) * 100);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Data sync
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Typeform workflow</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Export CSV from Typeform and upload here. Re-sync anytime for fresh data.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl font-bold text-slate-950 dark:text-white">{doneCount}/{totalSteps}</p>
          <p className="text-xs text-slate-500">steps complete</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!event.typeformRegistrationUrl && !event.typeformSubmissionUrl ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          Add Typeform links via <strong>Edit event</strong> to open forms directly from this checklist.
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {event.typeformRegistrationUrl ? (
            <QuickLink href={event.typeformRegistrationUrl} icon={<ExternalLink size={14} />} label="Registration form" />
          ) : null}
          {event.typeformSubmissionUrl ? (
            <QuickLink href={event.typeformSubmissionUrl} icon={<ExternalLink size={14} />} label="Submission form" />
          ) : null}
          <QuickLink
            icon={<ClipboardList size={14} />}
            label="Registrations"
            to={`/events/${eventId}/registrations`}
          />
          <QuickLink icon={<Rocket size={14} />} label="Submissions" to={`/events/${eventId}/submissions`} />
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {PHASES.map((phase) => (
          <section
            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50"
            key={phase.title}
          >
            <div className="mb-4 border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{phase.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{phase.subtitle}</p>
            </div>

            <ol className="space-y-3">
              {phase.steps.map((step) => {
                const done = completed[step.id];
                return (
                  <li
                    className={`rounded-xl border px-3 py-3 transition ${
                      done
                        ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    }`}
                    key={step.id}
                  >
                    <div className="flex items-start gap-3">
                      {done ? (
                        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={18} />
                      ) : (
                        <Circle className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600" size={18} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {step.description}
                        </p>

                        {step.id === "upload-registration" && summary.lastRegUpload ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Last sync: {formatUploadTime(summary.lastRegUpload)}
                            {summary.regFileName ? (
                              <span className="block truncate" title={summary.regFileName}>
                                {summary.regFileName}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        {step.id === "upload-submission" && summary.lastSubUpload ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Last sync: {formatUploadTime(summary.lastSubUpload)}
                            {summary.subFileName ? (
                              <span className="block truncate" title={summary.subFileName}>
                                {summary.subFileName}
                              </span>
                            ) : null}
                          </p>
                        ) : null}

                        <div className="mt-2">
                          <StepAction done={done} event={event} eventId={eventId} stepId={step.id} />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function StepAction({
  stepId,
  event,
  eventId,
  done,
}: {
  stepId: StepId;
  event: HackathonEvent;
  eventId: string;
  done: boolean;
}) {
  if (stepId === "registration-form" && event.typeformRegistrationUrl) {
    return (
      <ActionLink href={event.typeformRegistrationUrl} label="Open form" />
    );
  }
  if (stepId === "submission-form" && event.typeformSubmissionUrl) {
    return (
      <ActionLink href={event.typeformSubmissionUrl} label="Open form" />
    );
  }
  if (stepId === "upload-registration") {
    return (
      <ActionLink
        label={done ? "View registrations" : "Upload CSV"}
        to={`/events/${eventId}/registrations`}
      />
    );
  }
  if (stepId === "upload-submission") {
    return (
      <ActionLink
        label={done ? "View submissions" : "Upload CSV"}
        to={`/events/${eventId}/submissions`}
      />
    );
  }
  if (stepId === "review-teams") {
    return (
      <ActionLink
        icon={<Users size={12} />}
        label="All teams"
        to={`/events/${eventId}/teams`}
      />
    );
  }
  if (stepId === "export-registration" || stepId === "export-submission") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Upload size={12} />
        Done in Typeform
      </span>
    );
  }
  return null;
}

function QuickLink({
  label,
  href,
  to,
  icon,
}: {
  label: string;
  href?: string;
  to?: string;
  icon: React.ReactNode;
}) {
  const className =
    "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600";

  if (to) {
    return (
      <Link className={className} to={to}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {icon}
      {label}
    </a>
  );
}

function ActionLink({
  label,
  href,
  to,
  icon,
}: {
  label: string;
  href?: string;
  to?: string;
  icon?: React.ReactNode;
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100";

  if (to) {
    return (
      <Link className={className} to={to}>
        {icon}
        {label}
        <ArrowRight size={12} />
      </Link>
    );
  }

  return (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {icon}
      {label}
      <ExternalLink size={12} />
    </a>
  );
}
