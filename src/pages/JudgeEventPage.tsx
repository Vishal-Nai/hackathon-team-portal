import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LogOut,
  Search,
} from "lucide-react";
import { Button } from "../components/Button";
import { LoadingSkeleton } from "../components/ConfirmDialog";
import { JudgeScoresSummary } from "../components/JudgeScoresSummary";
import { JudgeFeedbackChips } from "../components/JudgeFeedbackChips";
import { TeamsTabRatingFilters } from "../components/TeamRatingFilters";
import { StarRating } from "../components/StarRating";
import { useAuth } from "../hooks/useAuth";
import { useJudgeSession } from "../hooks/useJudgeSession";
import { formatEventDate, getEvent } from "../services/events";
import { loadEventTeams } from "../services/eventTeams";
import { loadEventEvaluations, saveJudgeEvaluation, findJudgeEvaluation } from "../services/judgeEvaluations";
import type { HackathonEvent } from "../types/event";
import type { JudgeEvaluation } from "../types/judge";
import { MAX_JUDGE_NOTES_LENGTH } from "../types/judge";
import type { MergedTeam } from "../types/teams";
import { getFriendlyError } from "../utils/errors";
import {
  getTeamAverageRating,
  getTeamJudgeRating,
  matchesAverageRatingFilter,
  matchesMyRatingFilter,
  sortTeamsByRating,
  type AverageRatingFilter,
  type MyRatingFilter,
  type TeamRatingSort,
} from "../utils/teamRatingFilters";

type TabId = "teams" | "summary";

const PAGE_SIZE = 20;

export function JudgeEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { session, clearSession } = useJudgeSession();
  const [event, setEvent] = useState<HackathonEvent | null>(null);
  const [teams, setTeams] = useState<MergedTeam[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, JudgeEvaluation[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [teamsMyRatingFilter, setTeamsMyRatingFilter] = useState<MyRatingFilter>("all");
  const [teamsAverageFilter, setTeamsAverageFilter] = useState<AverageRatingFilter>("all");
  const [teamsSort, setTeamsSort] = useState<TeamRatingSort>("name");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const judgeConfigId = session?.id ?? "";

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
      } catch (error) {
        setLoadError(getFriendlyError(error, "Failed to load event data."));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [eventId]);

  const visibleTeams = useMemo(() => {
    const base = showAllTeams ? teams : teams.filter((team) => team.status === "complete" || team.submission);
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

  const teamsTabTeams = useMemo(() => {
    const currentJudge = session ? { id: session.id, name: session.name } : undefined;
    const filtered = visibleTeams.filter((team) => {
      const teamEvals = evaluations.get(team.id) ?? [];
      const averageRating = getTeamAverageRating(teamEvals);
      const myRating = currentJudge ? getTeamJudgeRating(teamEvals, currentJudge) : null;
      return (
        matchesAverageRatingFilter(averageRating, teamsAverageFilter) &&
        matchesMyRatingFilter(myRating, teamsMyRatingFilter)
      );
    });

    return sortTeamsByRating(filtered, evaluations, teamsSort, currentJudge);
  }, [
    visibleTeams,
    evaluations,
    teamsAverageFilter,
    teamsMyRatingFilter,
    teamsSort,
    session,
  ]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, showAllTeams, activeTab, teamsMyRatingFilter, teamsAverageFilter, teamsSort]);

  const totalPages = Math.max(1, Math.ceil(teamsTabTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTeams = teamsTabTeams.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      clearSession();
      await signOut();
      toast.success("Signed out.");
      navigate(`/judge/login?eventId=${encodeURIComponent(eventId ?? "")}`, { replace: true });
    } catch {
      toast.error("Could not sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function refreshEvaluations() {
    if (!eventId) {
      return;
    }
    const evals = await loadEventEvaluations(eventId);
    setEvaluations(evals);
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
              {formatEventDate(event.date)} · Judge portal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{event.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Review teams, rate submissions, and see feedback from all judges.
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
        <TeamsTab
          allTeamsCount={teams.length}
          averageFilter={teamsAverageFilter}
          evaluations={evaluations}
          eventId={eventId}
          expandedId={expandedId}
          judgeConfigId={judgeConfigId}
          judgeName={session.name}
          myRatingFilter={teamsMyRatingFilter}
          onAverageFilterChange={setTeamsAverageFilter}
          onMyRatingFilterChange={setTeamsMyRatingFilter}
          onRefreshEvaluations={refreshEvaluations}
          onSortChange={setTeamsSort}
          onToggleExpand={(teamId) => setExpandedId(expandedId === teamId ? null : teamId)}
          page={currentPage}
          pageTeams={pageTeams}
          searchQuery={searchQuery}
          setPage={setPage}
          setSearchQuery={setSearchQuery}
          setShowAllTeams={setShowAllTeams}
          showAllTeams={showAllTeams}
          sort={teamsSort}
          totalPages={totalPages}
          totalTeams={teamsTabTeams.length}
        />
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

function TeamsTab({
  eventId,
  allTeamsCount,
  pageTeams,
  totalTeams,
  totalPages,
  page,
  setPage,
  searchQuery,
  setSearchQuery,
  showAllTeams,
  setShowAllTeams,
  myRatingFilter,
  onMyRatingFilterChange,
  averageFilter,
  onAverageFilterChange,
  sort,
  onSortChange,
  expandedId,
  onToggleExpand,
  evaluations,
  judgeConfigId,
  judgeName,
  onRefreshEvaluations,
}: {
  eventId: string;
  allTeamsCount: number;
  pageTeams: MergedTeam[];
  totalTeams: number;
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showAllTeams: boolean;
  setShowAllTeams: (value: boolean) => void;
  myRatingFilter: MyRatingFilter;
  onMyRatingFilterChange: (value: MyRatingFilter) => void;
  averageFilter: AverageRatingFilter;
  onAverageFilterChange: (value: AverageRatingFilter) => void;
  sort: TeamRatingSort;
  onSortChange: (value: TeamRatingSort) => void;
  expandedId: string | null;
  onToggleExpand: (teamId: string) => void;
  evaluations: Map<string, JudgeEvaluation[]>;
  judgeConfigId: string;
  judgeName: string;
  onRefreshEvaluations: () => Promise<void>;
}) {
  const emptyMessage =
    allTeamsCount === 0
      ? "No teams yet. Ask the organizer to upload registration and submission data."
      : !showAllTeams
        ? "No teams with submissions yet. Enable “Show all teams” to see registered teams."
        : searchQuery.trim() && totalTeams === 0
          ? "No teams match your search."
          : totalTeams === 0
            ? "No teams match the selected rating filters."
            : "No teams to show.";
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search team name or email..."
              type="search"
              value={searchQuery}
            />
          </div>
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
        <TeamsTabRatingFilters
          averageFilter={averageFilter}
          myRatingFilter={myRatingFilter}
          onAverageFilterChange={onAverageFilterChange}
          onMyRatingFilterChange={onMyRatingFilterChange}
          onSortChange={onSortChange}
          sort={sort}
        />
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {totalTeams} teams · page {page + 1} of {totalPages}
      </p>

      <div className="mt-4 space-y-3">
        {pageTeams.map((team) => (
          <JudgeTeamCard
            evaluations={evaluations.get(team.id) ?? []}
            eventId={eventId}
            expanded={expandedId === team.id}
            judgeConfigId={judgeConfigId}
            judgeName={judgeName}
            key={team.id}
            onRefreshEvaluations={onRefreshEvaluations}
            onToggle={() => onToggleExpand(team.id)}
            team={team}
          />
        ))}
        {pageTeams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800">
            {emptyMessage}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-800"
            disabled={page === 0}
            onClick={() => setPage(Math.max(0, page - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-800"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function JudgeTeamCard({
  eventId,
  team,
  expanded,
  onToggle,
  evaluations,
  judgeConfigId,
  judgeName,
  onRefreshEvaluations,
}: {
  eventId: string;
  team: MergedTeam;
  expanded: boolean;
  onToggle: () => void;
  evaluations: JudgeEvaluation[];
  judgeConfigId: string;
  judgeName: string;
  onRefreshEvaluations: () => Promise<void>;
}) {
  const ownEvaluation = findJudgeEvaluation(evaluations, { id: judgeConfigId, name: judgeName });
  const [rating, setRating] = useState(ownEvaluation?.rating ?? 0);
  const [notes, setNotes] = useState(ownEvaluation?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRating(ownEvaluation?.rating ?? 0);
    setNotes(ownEvaluation?.notes ?? "");
  }, [ownEvaluation?.rating, ownEvaluation?.notes, team.id]);

  async function handleSave() {
    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating from 1 to 5 stars.");
      return;
    }

    setIsSaving(true);
    try {
      await saveJudgeEvaluation({
        eventId,
        teamId: team.id,
        judgeId: judgeConfigId,
        judgeName,
        rating,
        notes,
      });
      toast.success("Evaluation saved.");
    } catch (error) {
      toast.error(getFriendlyError(error, "Could not save evaluation."));
      return;
    }

    try {
      await onRefreshEvaluations();
    } catch {
      toast.error("Saved, but could not refresh the latest ratings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-800">
      <button
        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-950 dark:text-white">
            {team.teamName || "Unnamed team"}
          </h3>
          <p className="mt-1 truncate text-sm text-slate-500">{team.primaryEmail}</p>
          {team.links.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {team.links.slice(0, 3).map((link) => (
                <a
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-900"
                  href={link.url}
                  key={link.url}
                  onClick={(event) => event.stopPropagation()}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={12} />
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <span className="shrink-0 text-slate-500">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamFieldsPanel
              emptyLabel="No registration data"
              fields={team.registration?.fields ?? null}
              title="Registration"
            />
            <TeamFieldsPanel
              emptyLabel="No submission data"
              fields={team.submission?.fields ?? null}
              links={team.links}
              title="Submission"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your evaluation</p>
            <div className="mt-3">
              <StarRating onChange={setRating} value={rating} />
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notes</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
                maxLength={MAX_JUDGE_NOTES_LENGTH}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Strengths, concerns, questions…"
                value={notes}
              />
              <span className="mt-1 block text-xs text-slate-500">
                {notes.length}/{MAX_JUDGE_NOTES_LENGTH}
              </span>
            </label>
            <Button className="mt-3" isLoading={isSaving} onClick={() => void handleSave()} type="button">
              Save evaluation
            </Button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Other judges</p>
            <div className="mt-2">
              <JudgeFeedbackChips
                currentJudgeId={judgeConfigId}
                currentJudgeName={judgeName}
                evaluations={evaluations}
                excludeCurrentJudge
              />
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function TeamFieldsPanel({
  title,
  fields,
  emptyLabel,
  links,
}: {
  title: string;
  fields: Record<string, string> | null;
  emptyLabel: string;
  links?: MergedTeam["links"];
}) {
  if (!fields) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  const entries = Object.entries(fields).filter(([, value]) => value.trim());

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <dl className="mt-2 space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <div className="grid grid-cols-[minmax(0,40%)_1fr] gap-2" key={key}>
            <dt className="truncate text-slate-500" title={key}>
              {key}
            </dt>
            <dd className="truncate text-slate-800 dark:text-slate-100" title={value}>
              {/^https?:\/\//i.test(value) ? (
                <a className="text-blue-600 hover:underline dark:text-blue-400" href={value} rel="noreferrer" target="_blank">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {links && links.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-slate-100 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-slate-900"
              href={link.url}
              key={link.url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={12} />
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
