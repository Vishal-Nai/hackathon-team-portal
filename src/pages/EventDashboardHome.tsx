import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Calendar, ClipboardList, ExternalLink, Pencil, Rocket, Star } from "lucide-react";
import { Button } from "../components/Button";
import { EditEventModal } from "../components/EditEventModal";
import { EventSummaryPanel } from "../components/EventSummaryPanel";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { SyncChecklist } from "../components/SyncChecklist";
import { loadEventTeams } from "../services/eventTeams";
import { formatEventDate, getEvent } from "../services/events";
import type { HackathonEvent } from "../types/event";
import type { EventSummaryStats, MergedTeam } from "../types/teams";
import { getFriendlyError } from "../utils/errors";
import { isJudgePortalConfigured } from "../config/judges";
import { countEventEvaluations } from "../services/judgeEvaluations";

interface DashboardSummary {
  rowCount: number;
  issueCount: number;
  fileName: string | null;
  hasData: boolean;
}

const EMPTY_SUMMARY: EventSummaryStats = {
  registeredCount: 0,
  submittedCount: 0,
  completeCount: 0,
  missingSubmissionCount: 0,
  missingRegistrationCount: 0,
  issueCount: 0,
  lastRegUpload: null,
  lastSubUpload: null,
  regFileName: null,
  subFileName: null,
};

export function EventDashboardHome() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [registrations, setRegistrations] = useState<DashboardSummary | null>(null);
  const [submissions, setSubmissions] = useState<DashboardSummary | null>(null);
  const [summary, setSummary] = useState<EventSummaryStats>(EMPTY_SUMMARY);
  const [teams, setTeams] = useState<MergedTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [evaluationCount, setEvaluationCount] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const currentEventId = eventId;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [eventData, teamsData] = await Promise.all([
          getEvent(currentEventId),
          loadEventTeams(currentEventId),
        ]);

        if (!eventData) {
          setLoadError("Event not found.");
          return;
        }

        setEvent(eventData);
        setSummary(teamsData.summary);
        setTeams(teamsData.teams);
        setRegistrations({
          hasData: Boolean(teamsData.regMeta),
          rowCount: teamsData.regMeta?.rowCount ?? 0,
          issueCount: teamsData.regMeta?.issueCount ?? 0,
          fileName: teamsData.regMeta?.fileName ?? null,
        });
        setSubmissions({
          hasData: Boolean(teamsData.subMeta),
          rowCount: teamsData.subMeta?.rowCount ?? 0,
          issueCount: teamsData.subMeta?.issueCount ?? 0,
          fileName: teamsData.subMeta?.fileName ?? null,
        });

        if (isJudgePortalConfigured()) {
          try {
            const count = await countEventEvaluations(currentEventId);
            setEvaluationCount(count);
          } catch {
            setEvaluationCount(0);
          }
        }
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load event."));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [eventId]);

  if (!eventId) {
    return null;
  }

  if (isLoading) {
    return <LoadingSkeleton rows={3} />;
  }

  if (loadError || !event) {
    return (
      <section className="w-full rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        {loadError ?? "Event not found."}{" "}
        <Link className="font-semibold underline" to="/">
          Back to events
        </Link>
      </section>
    );
  }

  const totalIssues = summary.issueCount;

  return (
    <section className="w-full space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <Link className="text-sm font-semibold text-slate-500 hover:underline dark:text-slate-400" to="/">
          ← All events
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{event.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} />
                {formatEventDate(event.date)}
              </span>
              <a
                className="inline-flex items-center gap-1.5 hover:underline"
                href={event.lumaEventLink}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={14} />
                Luma event page
              </a>
            </div>
          </div>
          <Button onClick={() => setShowEditModal(true)} type="button" variant="secondary">
            <Pencil size={16} />
            Edit event
          </Button>
        </div>

        {totalIssues > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 shrink-0" size={16} />
            <span>
              {totalIssues} data issue{totalIssues === 1 ? "" : "s"} detected for this event.
            </span>
          </div>
        ) : null}
      </div>

      <EventSummaryPanel eventId={eventId} eventName={event.name} summary={summary} teams={teams} />

      <SyncChecklist event={event} eventId={eventId} summary={summary} />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Judge portal</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Share this link and a private access code with each judge. Judges can view teams, rate submissions, and see
              each other&apos;s feedback.
            </p>
            <p className="mt-3 break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {typeof window !== "undefined" ? `${window.location.origin}/judge/events/${eventId}` : `/judge/events/${eventId}`}
            </p>
          </div>
          {isJudgePortalConfigured() ? (
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
              to={`/events/${eventId}/judge-scores`}
            >
              <Star size={16} />
              View judge scores
              {evaluationCount !== null && evaluationCount > 0 ? ` (${evaluationCount})` : ""}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          description="Upload Typeform registration CSV for this event. View teams, members, and mismatches."
          icon={<ClipboardList size={22} />}
          issueCount={registrations?.issueCount ?? 0}
          rowCount={registrations?.rowCount ?? 0}
          statusLabel={registrations?.hasData ? registrations.fileName ?? "Uploaded" : "No data"}
          title="Registrations"
          to={`/events/${eventId}/registrations`}
        />
        <DashboardCard
          description="Upload Typeform submission CSV for this event. Cross-check against registrations."
          icon={<Rocket size={22} />}
          issueCount={submissions?.issueCount ?? 0}
          rowCount={submissions?.rowCount ?? 0}
          statusLabel={submissions?.hasData ? submissions.fileName ?? "Uploaded" : "No data"}
          title="Submissions"
          to={`/events/${eventId}/submissions`}
        />
      </div>

      <EditEventModal
        event={event}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdated={setEvent}
      />
    </section>
  );
}

function DashboardCard({
  title,
  description,
  to,
  icon,
  rowCount,
  issueCount,
  statusLabel,
}: {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  rowCount: number;
  issueCount: number;
  statusLabel: string;
}) {
  const hasData = rowCount > 0;

  return (
    <Link
      className="group flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      to={to}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-950 dark:text-white">{rowCount}</p>
          <p className="text-xs text-slate-500">rows</p>
          {issueCount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{issueCount} issues</p>
          ) : hasData ? (
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">No issues</p>
          ) : (
            <p className="mt-1 text-xs text-slate-400">Awaiting upload</p>
          )}
        </div>
      </div>

      <h2 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
        <p className="text-xs font-medium text-slate-500">Current file</p>
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={statusLabel}>
          {hasData ? statusLabel : "No CSV uploaded"}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-950 group-hover:underline dark:text-white">
          {hasData ? "Open dashboard" : "Upload CSV"}
        </span>
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-900 text-white transition group-hover:translate-x-0.5 dark:bg-white dark:text-slate-900">
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
