import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BadgeCheck, ChevronDown, ChevronUp, LogOut, Search } from "lucide-react";
import { Button } from "../components/Button";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { EntryHistoryCard, VolunteerProgressSummary } from "../components/VolunteerProgressSummary";
import { StarRating } from "../components/StarRating";
import {
  FINAL_CHECKPOINT,
  VOLUNTEER_CHECKPOINTS,
} from "../constants/volunteerCheckpoints";
import { useAuth } from "../hooks/useAuth";
import { useVolunteerSession } from "../hooks/useVolunteerSession";
import { formatEventDate, getEvent } from "../services/events";
import { loadEventTeams } from "../services/eventTeams";
import {
  loadEventVolunteerProgress,
  upsertVolunteerEntry,
} from "../services/volunteerProgress";
import type { HackathonEvent } from "../types/event";
import type { MergedTeam } from "../types/teams";
import type { CheckpointId, DomainId, VolunteerProgressEntry } from "../types/volunteer";
import {
  CHECKPOINT_RATING_LABELS,
  MAX_VOLUNTEER_FEEDBACK_LENGTH,
  RECOMMENDATION_LABELS,
} from "../types/volunteer";
import { getTeamDomainInfo } from "../utils/teamDomain";
import { getFriendlyError } from "../utils/errors";
import {
  averageScoreForCheckpoint,
  entriesForCheckpoint,
  findOwnEntry,
  hasConfidenceBadge,
  uniqueVolunteerCount,
} from "../utils/volunteerProgressStats";
import { cn } from "../utils/cn";

type TabId = "teams" | "summary";
const PAGE_SIZE = 20;

export function VolunteerEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { session, clearSession } = useVolunteerSession();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<MergedTeam[]>([]);
  const [progressByTeam, setProgressByTeam] = useState<Map<string, VolunteerProgressEntry[]>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTeams, setShowAllTeams] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [focusCheckpoint, setFocusCheckpoint] = useState<Exclude<CheckpointId, "final">>("cp1");

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
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load event data."));
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
        team.leadName.toLowerCase().includes(query) ||
        team.projectTitle.toLowerCase().includes(query) ||
        team.domain.toLowerCase().includes(query) ||
        team.allEmails.some((email) => email.includes(query)),
    );
  }, [teams, showAllTeams, searchQuery]);

  const sortedTeams = useMemo(() => {
    return [...visibleTeams].sort((a, b) => {
      const aVisits = (progressByTeam.get(a.id) ?? []).filter(
        (entry) => entry.checkpointId === focusCheckpoint,
      ).length;
      const bVisits = (progressByTeam.get(b.id) ?? []).filter(
        (entry) => entry.checkpointId === focusCheckpoint,
      ).length;
      if (aVisits === 0 && bVisits !== 0) {
        return -1;
      }
      if (bVisits === 0 && aVisits !== 0) {
        return 1;
      }
      return a.teamName.localeCompare(b.teamName);
    });
  }, [visibleTeams, progressByTeam, focusCheckpoint]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, showAllTeams, activeTab, focusCheckpoint]);

  const totalPages = Math.max(1, Math.ceil(sortedTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTeams = sortedTeams.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      clearSession();
      await signOut();
      toast.success("Signed out.");
      navigate(`/volunteer/login?eventId=${encodeURIComponent(eventId ?? "")}`, { replace: true });
    } catch {
      toast.error("Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function refreshProgress() {
    if (!eventId) {
      return;
    }
    const progress = await loadEventVolunteerProgress(eventId);
    setProgressByTeam(progress);
  }

  if (!eventId || !session) {
    return null;
  }

  if (isLoading) {
    return <LoadingSkeleton rows={5} />;
  }

  if (loadError || !event) {
    return (
      <section className="w-full rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        {loadError ?? "Event not found."}
      </section>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {formatEventDate(event.date)} · Volunteer progress
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {event.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Quick check-ins: pick a team, tap stars, add a short note.{" "}
              <span className="font-semibold">Supporting evaluation — not the final score.</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
              {session.name}
            </span>
            <Button isLoading={isSigningOut} onClick={() => void handleSignOut()} type="button" variant="secondary">
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <TabButton active={activeTab === "teams"} label="Teams" onClick={() => setActiveTab("teams")} />
          <TabButton active={activeTab === "summary"} label="Summary" onClick={() => setActiveTab("summary")} />
        </div>
      </div>

      {activeTab === "teams" ? (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-[16rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search teams…"
                  value={searchQuery}
                />
              </label>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Focus{" "}
                <select
                  className="ml-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  onChange={(event) =>
                    setFocusCheckpoint(event.target.value as Exclude<CheckpointId, "final">)
                  }
                  value={focusCheckpoint}
                >
                  {VOLUNTEER_CHECKPOINTS.map((checkpoint) => (
                    <option key={checkpoint.id} value={checkpoint.id}>
                      {checkpoint.shortLabel} (unvisited first)
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <input
                  checked={showAllTeams}
                  className="size-4 rounded border-slate-300"
                  onChange={(event) => setShowAllTeams(event.target.checked)}
                  type="checkbox"
                />
                Show all teams
              </label>
            </div>
          </div>

          {pageTeams.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              {teams.length === 0
                ? "No teams yet. Ask the organizer to upload registration data."
                : "No teams match your filters."}
            </div>
          ) : (
            <div className="space-y-3">
              {pageTeams.map((team) => (
                <VolunteerTeamCard
                  eventId={eventId}
                  expanded={expandedId === team.id}
                  key={team.id}
                  onRefresh={refreshProgress}
                  onToggle={() => setExpandedId(expandedId === team.id ? null : team.id)}
                  progress={progressByTeam.get(team.id) ?? []}
                  sessionId={session.sessionId}
                  team={team}
                  volunteerName={session.name}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                type="button"
                variant="secondary"
              >
                Previous
              </Button>
              <p className="text-sm text-slate-500">
                Page {currentPage + 1} of {totalPages}
              </p>
              <Button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage(currentPage + 1)}
                type="button"
                variant="secondary"
              >
                Next
              </Button>
            </div>
          ) : null}
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

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function VolunteerTeamCard({
  eventId,
  team,
  progress,
  expanded,
  onToggle,
  sessionId,
  volunteerName,
  onRefresh,
}: {
  eventId: string;
  team: MergedTeam;
  progress: VolunteerProgressEntry[];
  expanded: boolean;
  onToggle: () => void;
  sessionId: string;
  volunteerName: string;
  onRefresh: () => Promise<void>;
}) {
  const domainInfo = getTeamDomainInfo(team);
  const volunteerCount = uniqueVolunteerCount(progress);
  const confidence = hasConfidenceBadge(progress);
  const [activeCheckpoint, setActiveCheckpoint] = useState<CheckpointId>("cp1");

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        className="flex w-full items-start justify-between gap-3 p-5 text-left sm:p-6"
        onClick={onToggle}
        type="button"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">{team.teamName}</h2>
            {confidence ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <BadgeCheck size={12} />
                {volunteerCount}+ volunteers
              </span>
            ) : null}
          </div>
          {(team.projectTitle || team.projectDescription) ? (
            <div className="mt-2">
              {team.projectTitle ? (
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{team.projectTitle}</p>
              ) : null}
              {team.projectDescription ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {team.projectDescription}
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="mt-2 text-sm text-slate-500">
            {team.leadName ? `${team.leadName} · ` : ""}
            {team.primaryEmail}
          </p>
          <p className="mt-1 text-xs text-slate-500">Domain: {domainInfo.label}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VOLUNTEER_CHECKPOINTS.map((checkpoint) => {
              const avg = averageScoreForCheckpoint(progress, checkpoint.id);
              return (
                <span
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  key={checkpoint.id}
                >
                  {checkpoint.id.toUpperCase()} {avg === null ? "—" : `${avg.toFixed(1)}★`}
                </span>
              );
            })}
          </div>
        </div>
        {expanded ? <ChevronUp className="shrink-0" size={18} /> : <ChevronDown className="shrink-0" size={18} />}
      </button>

      {expanded ? (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-800 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap gap-2">
            {VOLUNTEER_CHECKPOINTS.map((checkpoint) => (
              <button
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  activeCheckpoint === checkpoint.id
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
                )}
                key={checkpoint.id}
                onClick={() => setActiveCheckpoint(checkpoint.id)}
                type="button"
              >
                {checkpoint.shortLabel}
              </button>
            ))}
            <button
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                activeCheckpoint === "final"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
              )}
              onClick={() => setActiveCheckpoint("final")}
              type="button"
            >
              Final
            </button>
          </div>

          <div className="mt-4">
            {activeCheckpoint === "final" ? (
              <SimpleRatingForm
                domainId={domainInfo.id}
                domainLabel={domainInfo.label}
                eventId={eventId}
                existing={findOwnEntry(progress, "final", sessionId)}
                mode="final"
                onSaved={onRefresh}
                sessionId={sessionId}
                teamId={team.id}
                volunteerName={volunteerName}
              />
            ) : (
              <SimpleRatingForm
                checkpointId={activeCheckpoint}
                domainId={domainInfo.id}
                domainLabel={domainInfo.label}
                eventId={eventId}
                existing={findOwnEntry(progress, activeCheckpoint, sessionId)}
                mode="checkpoint"
                onSaved={onRefresh}
                sessionId={sessionId}
                teamId={team.id}
                volunteerName={volunteerName}
              />
            )}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Previous feedback
            </h3>
            <div className="mt-2 space-y-2">
              {entriesForCheckpoint(progress, activeCheckpoint).length === 0 ? (
                <p className="text-sm text-slate-500">None yet — you can be the first.</p>
              ) : (
                entriesForCheckpoint(progress, activeCheckpoint).map((entry) => (
                  <EntryHistoryCard entry={entry} key={entry.id} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SimpleRatingForm({
  eventId,
  teamId,
  sessionId,
  volunteerName,
  domainId,
  domainLabel,
  existing,
  onSaved,
  mode,
  checkpointId,
}: {
  eventId: string;
  teamId: string;
  sessionId: string;
  volunteerName: string;
  domainId: DomainId | "";
  domainLabel: string;
  existing?: VolunteerProgressEntry;
  onSaved: () => Promise<void>;
  mode: "checkpoint" | "final";
  checkpointId?: Exclude<CheckpointId, "final">;
}) {
  const checkpoint =
    mode === "checkpoint" && checkpointId
      ? VOLUNTEER_CHECKPOINTS.find((item) => item.id === checkpointId)
      : null;

  const [rating, setRating] = useState(
    mode === "final" ? (existing?.recommendation ?? 0) : (existing?.totalScore ?? 0),
  );
  const [domainAligned, setDomainAligned] = useState(existing?.domainAligned ?? true);
  const [feedback, setFeedback] = useState(existing?.feedback ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRating(mode === "final" ? (existing?.recommendation ?? 0) : (existing?.totalScore ?? 0));
    setDomainAligned(existing?.domainAligned ?? true);
    setFeedback(existing?.feedback ?? "");
  }, [existing, mode, checkpointId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (mode === "final") {
        await upsertVolunteerEntry({
          eventId,
          teamId,
          volunteerName,
          volunteerSessionId: sessionId,
          checkpointId: "final",
          totalScore: 0,
          domainAligned,
          domainId,
          feedback,
          recommendation: rating,
        });
        toast.success("Recommendation saved.");
      } else if (checkpointId) {
        await upsertVolunteerEntry({
          eventId,
          teamId,
          volunteerName,
          volunteerSessionId: sessionId,
          checkpointId,
          totalScore: rating,
          domainAligned,
          domainId,
          feedback,
        });
        toast.success("Saved.");
      }
      await onSaved();
    } catch (error) {
      toast.error(getFriendlyError(error, "Could not save."));
    } finally {
      setIsSaving(false);
    }
  }

  const ratingLabel =
    rating > 0
      ? mode === "final"
        ? RECOMMENDATION_LABELS[rating]
        : CHECKPOINT_RATING_LABELS[rating]
      : null;

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div>
        <h3 className="text-base font-bold text-slate-950 dark:text-white">
          {mode === "final" ? FINAL_CHECKPOINT.label : checkpoint?.label}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "final"
            ? FINAL_CHECKPOINT.description
            : `${checkpoint?.timeWindow ?? ""} · ${checkpoint?.description ?? ""}`}
        </p>
        {checkpoint ? (
          <p className="mt-2 text-xs text-slate-400">
            Look for: {checkpoint.checklist.slice(0, 3).join(" · ")}
            {checkpoint.checklist.length > 3 ? "…" : ""}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mode === "final" ? "Your recommendation" : "Overall rating"}
        </p>
        <div className="mt-2">
          <StarRating onChange={setRating} value={rating} />
        </div>
        {ratingLabel ? <p className="mt-1 text-xs text-slate-500">{ratingLabel}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Domain (from registration)</p>
        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{domainLabel}</p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <input
          checked={domainAligned}
          className="size-4 rounded border-slate-300"
          onChange={(event) => setDomainAligned(event.target.checked)}
          type="checkbox"
        />
        Still aligned with this domain
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Quick note <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
          maxLength={MAX_VOLUNTEER_FEEDBACK_LENGTH}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Strength, blocker, or anything judges should know…"
          rows={2}
          value={feedback}
        />
      </label>

      <Button className="w-full sm:w-auto" isLoading={isSaving} type="submit">
        {existing ? "Update" : "Save"}
      </Button>
    </form>
  );
}
