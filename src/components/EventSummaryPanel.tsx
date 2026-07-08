import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  Rocket,
  Users,
} from "lucide-react";
import { Button } from "./Button";
import type { EventSummaryStats, MergedTeam } from "../types/teams";
import { buildChaseListRows } from "../utils/teamMerge";
import { downloadCsv, rowsToCsv } from "../utils/csv";
import { formatUploadTime } from "../services/events";

interface EventSummaryPanelProps {
  eventId: string;
  eventName: string;
  summary: EventSummaryStats;
  teams: MergedTeam[];
}

export function EventSummaryPanel({ eventId, eventName, summary, teams }: EventSummaryPanelProps) {
  function handleExportChaseList() {
    const chaseRows = buildChaseListRows(teams);
    if (chaseRows.length === 0) {
      toast.error("No teams missing submissions.");
      return;
    }

    const columns = ["primary_email", "team_name", "all_emails", "status", "registration_issues"];
    const csv = rowsToCsv(columns, chaseRows);
    const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    downloadCsv(`${slug}-chase-list-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast.success(`Exported ${chaseRows.length} teams.`);
  }

  const isEmpty = summary.registeredCount === 0 && summary.submittedCount === 0;
  const matchRate =
    summary.registeredCount > 0
      ? Math.round((summary.completeCount / summary.registeredCount) * 100)
      : 0;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Event summary
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Operations overview</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/events/${eventId}/registrations`}>
            <Button type="button" variant="secondary">
              <ClipboardList size={16} />
              Registrations
            </Button>
          </Link>
          <Link to={`/events/${eventId}/submissions`}>
            <Button type="button" variant="secondary">
              <Rocket size={16} />
              Submissions
            </Button>
          </Link>
          <Link to={`/events/${eventId}/teams`}>
            <Button type="button" variant="secondary">
              <Users size={16} />
              All teams
            </Button>
          </Link>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">No data uploaded yet</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Upload registration and submission CSVs to see team counts and missing submissions here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to={`/events/${eventId}/registrations`}>
              <Button type="button">
                Upload registrations
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to={`/events/${eventId}/submissions`}>
              <Button type="button" variant="secondary">
                Upload submissions
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              accent="blue"
              hint={summary.lastRegUpload ? `Synced ${formatUploadTime(summary.lastRegUpload)}` : undefined}
              label="Registered"
              value={summary.registeredCount}
            />
            <MetricCard
              accent="violet"
              hint={summary.lastSubUpload ? `Synced ${formatUploadTime(summary.lastSubUpload)}` : undefined}
              label="Submitted"
              value={summary.submittedCount}
            />
            <MetricCard
              accent={summary.missingSubmissionCount > 0 ? "amber" : "emerald"}
              hint={
                summary.missingSubmissionCount > 0
                  ? "Teams to chase"
                  : summary.registeredCount > 0
                    ? "All registered teams submitted"
                    : undefined
              }
              label="Missing submission"
              value={summary.missingSubmissionCount}
            />
            <MetricCard
              accent={summary.issueCount > 0 ? "amber" : "emerald"}
              hint={summary.issueCount > 0 ? "Review in dashboards" : "Data looks clean"}
              label="Data issues"
              value={summary.issueCount}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Submission rate</p>
                <span className="text-lg font-bold text-slate-950 dark:text-white">{matchRate}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${matchRate}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {summary.completeCount} of {summary.registeredCount} registered teams matched
              </p>
            </div>

            <MetricCard
              compact
              icon={<CheckCircle2 size={16} />}
              label="Matched teams"
              value={summary.completeCount}
            />
            <MetricCard
              compact
              icon={<AlertTriangle size={16} />}
              label="Submission only"
              value={summary.missingRegistrationCount}
            />
          </div>
        </>
      )}

      {summary.missingSubmissionCount > 0 ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/60 dark:bg-amber-950/20">
          <div>
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              {summary.missingSubmissionCount} team{summary.missingSubmissionCount === 1 ? "" : "s"} need a submission
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200/90">
              Export the chase list and follow up before judging.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportChaseList} type="button" variant="secondary">
              <Download size={16} />
              Export chase list
            </Button>
            <Link to={`/events/${eventId}/teams`}>
              <Button type="button">
                View teams
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      ) : !isEmpty && summary.registeredCount > 0 && summary.submittedCount > 0 ? (
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">
          <CheckCircle2 size={16} />
          All registered teams have a matching submission.
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  accent = "slate",
  compact = false,
  icon,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "slate" | "blue" | "violet" | "amber" | "emerald";
  compact?: boolean;
  icon?: React.ReactNode;
}) {
  const accentStyles = {
    slate: "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
    blue: "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20",
    violet: "border-violet-200 bg-violet-50/50 dark:border-violet-900/40 dark:bg-violet-950/20",
    amber: "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20",
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
  };

  return (
    <div className={`rounded-2xl border p-4 ${accentStyles[accent]} ${compact ? "" : "min-h-[7.5rem]"}`}>
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
        {icon}
        {label}
      </p>
      <p className={`mt-2 font-bold text-slate-950 dark:text-white ${compact ? "text-2xl" : "text-3xl"}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
