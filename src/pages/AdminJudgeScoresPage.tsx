import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { JudgeScoresSummary } from "../components/JudgeScoresSummary";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { isJudgePortalConfigured } from "../config/judges";
import { formatEventDate, getEvent } from "../services/events";
import { loadEventTeams } from "../services/eventTeams";
import { loadEventEvaluations } from "../services/judgeEvaluations";
import type { HackathonEvent } from "../types/event";
import type { JudgeEvaluation } from "../types/judge";
import type { MergedTeam } from "../types/teams";
import { getFriendlyError } from "../utils/errors";

export function AdminJudgeScoresPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<MergedTeam[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, JudgeEvaluation[]>>(new Map());
  const [evaluationCount, setEvaluationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTeams, setShowAllTeams] = useState(false);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const currentEventId = eventId;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [eventData, teamsData, evals] = await Promise.all([
          getEvent(currentEventId),
          loadEventTeams(currentEventId),
          loadEventEvaluations(currentEventId),
        ]);

        if (!eventData) {
          setLoadError("Event not found.");
          return;
        }

        setEvent(eventData);
        setTeams(teamsData.teams);
        setEvaluations(evals);
        let total = 0;
        for (const teamEvals of evals.values()) {
          total += teamEvals.length;
        }
        setEvaluationCount(total);
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load judge scores."));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [eventId]);

  const visibleTeams = useMemo(() => {
    const base = showAllTeams
      ? teams
      : teams.filter((team) => team.status === "complete" || team.submission);
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return base;
    }
    return base.filter(
      (team) =>
        team.teamName.toLowerCase().includes(query) ||
        team.primaryEmail.toLowerCase().includes(query) ||
        team.allEmails.some((email) => email.includes(query)),
    );
  }, [teams, showAllTeams, searchQuery]);

  if (!eventId) {
    return null;
  }

  if (isLoading) {
    return <LoadingSkeleton rows={5} />;
  }

  if (loadError || !event) {
    return (
      <section className="w-full rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        {loadError ?? "Event not found."}{" "}
        <Link className="font-semibold underline" to={`/events/${eventId}`}>
          Back to event
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <Link
          className="text-sm font-semibold text-slate-500 hover:underline dark:text-slate-400"
          to={`/events/${eventId}`}
        >
          ← {event.name}
        </Link>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {formatEventDate(event.date)} · Admin view
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Judge scores</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Read-only summary of all judge ratings and notes for this event.
          {evaluationCount > 0 ? ` ${evaluationCount} evaluation${evaluationCount === 1 ? "" : "s"} recorded.` : " No evaluations yet."}
        </p>

        <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <input
            checked={showAllTeams}
            className="size-4 rounded border-slate-300"
            onChange={(event) => setShowAllTeams(event.target.checked)}
            type="checkbox"
          />
          Show all teams
        </label>
      </div>

      {!isJudgePortalConfigured() ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Judge portal is not configured. Set <code className="font-mono">VITE_JUDGES</code> in your environment.
        </div>
      ) : (
        <JudgeScoresSummary
          evaluations={evaluations}
          onSearchQueryChange={setSearchQuery}
          searchQuery={searchQuery}
          showAllTeams={showAllTeams}
          teams={visibleTeams}
          totalTeamsCount={teams.length}
        />
      )}
    </section>
  );
}
