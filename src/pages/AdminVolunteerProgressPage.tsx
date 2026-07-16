import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Download } from "lucide-react";
import { Button } from "../components/Button";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { VolunteerProgressSummary } from "../components/VolunteerProgressSummary";
import { isVolunteerPortalConfigured } from "../config/volunteers";
import { formatEventDate, getEvent } from "../services/events";
import { loadEventTeams } from "../services/eventTeams";
import { loadEventVolunteerProgress } from "../services/volunteerProgress";
import type { HackathonEvent } from "../types/event";
import type { MergedTeam } from "../types/teams";
import type { VolunteerProgressEntry } from "../types/volunteer";
import { getFriendlyError } from "../utils/errors";
import {
  buildVolunteerProgressCsv,
  downloadVolunteerProgressCsv,
} from "../utils/volunteerProgressExport";

export function AdminVolunteerProgressPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<MergedTeam[]>([]);
  const [progressByTeam, setProgressByTeam] = useState<Map<string, VolunteerProgressEntry[]>>(
    new Map(),
  );
  const [entryCount, setEntryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTeams, setShowAllTeams] = useState(true);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const currentEventId = eventId;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [eventData, teamsData, progress] = await Promise.all([
          getEvent(currentEventId),
          loadEventTeams(currentEventId),
          loadEventVolunteerProgress(currentEventId),
        ]);

        if (!eventData) {
          setLoadError("Event not found.");
          return;
        }

        setEvent(eventData);
        setTeams(teamsData.teams);
        setProgressByTeam(progress);
        let total = 0;
        for (const entries of progress.values()) {
          total += entries.length;
        }
        setEntryCount(total);
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load volunteer progress."));
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

  function handleExport() {
    try {
      const csv = buildVolunteerProgressCsv(teams, progressByTeam);
      const safeName = (event?.name ?? "event").replace(/[^\w-]+/g, "-").toLowerCase();
      downloadVolunteerProgressCsv(`${safeName}-volunteer-progress.csv`, csv);
      toast.success("CSV exported.");
    } catch {
      toast.error("Could not export CSV.");
    }
  }

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
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {formatEventDate(event.date)} · Admin view
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Volunteer progress
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Supporting evaluation for the judging panel — not the final score.
              {entryCount > 0
                ? ` ${entryCount} feedback entr${entryCount === 1 ? "y" : "ies"} recorded.`
                : " No volunteer feedback yet."}
            </p>
          </div>
          <Button onClick={handleExport} type="button" variant="secondary">
            <Download size={16} />
            Export CSV
          </Button>
        </div>

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

      {!isVolunteerPortalConfigured() ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Volunteer portal is not configured. Set <code className="font-mono">VITE_VOLUNTEER_CODE</code>{" "}
          in your environment.
        </div>
      ) : (
        <VolunteerProgressSummary
          onSearchQueryChange={setSearchQuery}
          progressByTeam={progressByTeam}
          searchQuery={searchQuery}
          showAllTeams={showAllTeams}
          teams={visibleTeams}
          totalTeamsCount={teams.length}
        />
      )}
    </section>
  );
}
