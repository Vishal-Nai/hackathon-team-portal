import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
} from "lucide-react";
import { VOLUNTEER_CHECKPOINTS } from "../constants/volunteerCheckpoints";
import type { MergedTeam } from "../types/teams";
import type { CheckpointId, Trajectory, VolunteerProgressEntry } from "../types/volunteer";
import { CHECKPOINT_RATING_LABELS, RECOMMENDATION_LABELS } from "../types/volunteer";
import { StarRating } from "./StarRating";
import {
  averageScoreForCheckpoint,
  computeTrajectory,
  detectDomainDrift,
  entriesForCheckpoint,
  formatTrajectory,
  hasConfidenceBadge,
  latestRecommendation,
  uniqueVolunteerCount,
} from "../utils/volunteerProgressStats";
import { cn } from "../utils/cn";

interface VolunteerProgressSummaryProps {
  teams: MergedTeam[];
  progressByTeam: Map<string, VolunteerProgressEntry[]>;
  totalTeamsCount: number;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showAllTeams: boolean;
}

type SummarySort = "unvisited" | "lowest" | "highest" | "name";
type QuickFilter = "all" | "needs_visit" | "has_notes" | "slipping";

interface CheckpointAvg {
  id: Exclude<CheckpointId, "final">;
  label: string;
  avg: number | null;
  count: number;
}

interface TeamRow {
  team: MergedTeam;
  entries: VolunteerProgressEntry[];
  cpAvgs: CheckpointAvg[];
  overall: number | null;
  visitCount: number;
  trajectory: Trajectory;
  confidence: boolean;
  volunteerCount: number;
  domainDrift: boolean;
  recommendation: VolunteerProgressEntry | null;
  domainLabel: string;
  latestNote: VolunteerProgressEntry | null;
}

export function VolunteerProgressSummary({
  teams,
  progressByTeam,
  totalTeamsCount,
  searchQuery,
  onSearchQueryChange,
}: VolunteerProgressSummaryProps) {
  const [sort, setSort] = useState<SummarySort>("unvisited");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = teams.filter((team) => {
      if (!query) {
        return true;
      }
      return (
        team.teamName.toLowerCase().includes(query) ||
        team.primaryEmail.toLowerCase().includes(query) ||
        team.leadName.toLowerCase().includes(query) ||
        team.projectTitle.toLowerCase().includes(query) ||
        team.domain.toLowerCase().includes(query) ||
        team.allEmails.some((email) => email.includes(query))
      );
    });

    const decorated: TeamRow[] = filtered.map((team) => {
      const entries = progressByTeam.get(team.id) ?? [];
      const cpAvgs = VOLUNTEER_CHECKPOINTS.map((checkpoint) => ({
        id: checkpoint.id,
        label: checkpoint.shortLabel.replace(/^CP\d+\s*/, "") || checkpoint.id.toUpperCase(),
        avg: averageScoreForCheckpoint(entries, checkpoint.id),
        count: entries.filter((entry) => entry.checkpointId === checkpoint.id).length,
      }));
      const scoredAvgs = cpAvgs.map((item) => item.avg).filter((value): value is number => value !== null);
      const overall =
        scoredAvgs.length === 0
          ? null
          : scoredAvgs.reduce((sum, value) => sum + value, 0) / scoredAvgs.length;
      const noteEntries = entries.filter((entry) => entry.feedback.trim().length > 0);
      return {
        team,
        entries,
        cpAvgs,
        overall,
        visitCount: entries.length,
        trajectory: computeTrajectory(entries),
        confidence: hasConfidenceBadge(entries),
        volunteerCount: uniqueVolunteerCount(entries),
        domainDrift: detectDomainDrift(entries),
        recommendation: latestRecommendation(entries),
        domainLabel: team.domain || "Domain not set",
        latestNote: noteEntries[0] ?? null,
      };
    });

    const filteredRows = decorated.filter((row) => {
      if (filter === "needs_visit") {
        return row.visitCount === 0;
      }
      if (filter === "has_notes") {
        return row.entries.some((entry) => entry.feedback.trim().length > 0);
      }
      if (filter === "slipping") {
        return row.trajectory === "slipping";
      }
      return true;
    });

    return filteredRows.sort((a, b) => {
      if (sort === "name") {
        return a.team.teamName.localeCompare(b.team.teamName);
      }
      if (sort === "unvisited") {
        if (a.visitCount === 0 && b.visitCount !== 0) {
          return -1;
        }
        if (b.visitCount === 0 && a.visitCount !== 0) {
          return 1;
        }
        return (a.overall ?? -1) - (b.overall ?? -1);
      }
      if (sort === "lowest") {
        return (a.overall ?? Infinity) - (b.overall ?? Infinity);
      }
      return (b.overall ?? -Infinity) - (a.overall ?? -Infinity);
    });
  }, [teams, progressByTeam, searchQuery, sort, filter]);

  const stats = useMemo(() => {
    let unvisited = 0;
    let slipping = 0;
    let withNotes = 0;
    for (const team of teams) {
      const entries = progressByTeam.get(team.id) ?? [];
      if (entries.length === 0) {
        unvisited += 1;
      }
      if (computeTrajectory(entries) === "slipping") {
        slipping += 1;
      }
      if (entries.some((entry) => entry.feedback.trim())) {
        withNotes += 1;
      }
    }
    return { unvisited, slipping, withNotes, total: teams.length };
  }, [teams, progressByTeam]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{stats.total}</span> teams
          </span>
          <span className={stats.unvisited > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>
            {stats.unvisited} need visit
          </span>
          <span>{stats.withNotes} with notes</span>
          <span className={stats.slipping > 0 ? "font-semibold text-red-700 dark:text-red-300" : ""}>
            {stats.slipping} slipping
          </span>
          <span className="text-slate-400">· not final score</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["needs_visit", "Needs visit"],
              ["has_notes", "Has notes"],
              ["slipping", "Slipping"],
            ] as const
          ).map(([id, label]) => (
            <button
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition",
                filter === id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900",
              )}
              key={id}
              onClick={() => setFilter(id)}
              type="button"
            >
              {label}
            </button>
          ))}
          <label className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search…"
              value={searchQuery}
            />
          </label>
          <select
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950"
            onChange={(event) => setSort(event.target.value as SummarySort)}
            value={sort}
          >
            <option value="unvisited">Needs visit first</option>
            <option value="lowest">Lowest score</option>
            <option value="highest">Highest score</option>
            <option value="name">Name</option>
          </select>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {rows.length}/{totalTeamsCount} shown · tap for notes
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
          No teams match this filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          {rows.map((row, index) => {
            const expanded = expandedId === row.team.id;
            return (
              <div
                className={cn(
                  index > 0 ? "border-t border-slate-100 dark:border-slate-900" : "",
                )}
                key={row.team.id}
              >
                <button
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 sm:gap-4 sm:px-4"
                  onClick={() => setExpandedId(expanded ? null : row.team.id)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-950 dark:text-white">
                        {row.team.teamName}
                      </span>
                      {row.team.projectTitle ? (
                        <span className="truncate text-sm text-slate-500">· {row.team.projectTitle}</span>
                      ) : null}
                      {row.visitCount === 0 ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          Needs visit
                        </span>
                      ) : null}
                      {row.confidence ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <BadgeCheck size={11} />
                          {row.volunteerCount}
                        </span>
                      ) : null}
                      {row.domainDrift ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                          <AlertTriangle size={11} />
                          Domain
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {row.domainLabel}
                      {row.team.leadName ? ` · ${row.team.leadName}` : ""}
                      {row.latestNote
                        ? ` · “${row.latestNote.feedback}”`
                        : row.visitCount === 0
                          ? " · no visits yet"
                          : ""}
                    </p>
                  </div>

                  <div className="hidden items-center gap-1 sm:flex">
                    {row.cpAvgs.map((item) => (
                      <CheckpointScorePill
                        avg={item.avg}
                        key={item.id}
                        label={item.id.replace("cp", "")}
                      />
                    ))}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <OverallScore overall={row.overall} />
                    <TrajectoryBadge trajectory={row.trajectory} />
                    {expanded ? (
                      <ChevronUp className="text-slate-400" size={16} />
                    ) : (
                      <ChevronDown className="text-slate-400" size={16} />
                    )}
                  </div>
                </button>

                <div className="flex gap-1 px-3 pb-2 sm:hidden">
                  {row.cpAvgs.map((item) => (
                    <CheckpointScorePill
                      avg={item.avg}
                      key={item.id}
                      label={item.id.replace("cp", "")}
                    />
                  ))}
                </div>

                {expanded ? (
                  <div className="border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-900 sm:px-4">
                    <ExpandedFeedbackPanel
                      entries={row.entries}
                      recommendation={row.recommendation}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverallScore({ overall }: { overall: number | null }) {
  if (overall === null) {
    return <span className="text-xs font-semibold text-slate-400">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white">
      <Star className="fill-amber-400 text-amber-400" size={12} />
      {overall.toFixed(1)}
    </span>
  );
}

function CheckpointScorePill({
  label,
  avg,
}: {
  label: string;
  avg: number | null;
}) {
  const tone =
    avg === null
      ? "bg-slate-100 text-slate-400 dark:bg-slate-900"
      : avg >= 4
        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
        : avg >= 3
          ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          : "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200";

  return (
    <span
      className={cn(
        "inline-flex min-w-9 flex-col items-center rounded-md px-1.5 py-0.5 text-center",
        tone,
      )}
      title={`CP${label}`}
    >
      <span className="text-[9px] font-semibold opacity-70">{label}</span>
      <span className="text-xs font-bold tabular-nums">{avg === null ? "—" : avg.toFixed(0)}</span>
    </span>
  );
}

function TrajectoryBadge({ trajectory }: { trajectory: Trajectory }) {
  const label = formatTrajectory(trajectory);
  const className =
    trajectory === "improving"
      ? "text-emerald-700 dark:text-emerald-300"
      : trajectory === "slipping"
        ? "text-red-700 dark:text-red-300"
        : "text-slate-400";

  const short =
    trajectory === "improving"
      ? "↑ Up"
      : trajectory === "slipping"
        ? "↓ Slip"
        : trajectory === "flat"
          ? "→ Flat"
          : "";

  if (!short) {
    return null;
  }

  return (
    <span className={cn("text-[10px] font-semibold", className)} title={label}>
      {short}
    </span>
  );
}

function ExpandedFeedbackPanel({
  entries,
  recommendation,
}: {
  entries: VolunteerProgressEntry[];
  recommendation: VolunteerProgressEntry | null;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No volunteer feedback yet for this team.</p>;
  }

  const checkpointIds: CheckpointId[] = ["cp1", "cp2", "cp3", "cp4", "final"];

  return (
    <div className="space-y-4">
      {recommendation?.recommendation ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Final recommendation
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StarRating readOnly size="sm" value={recommendation.recommendation} />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {RECOMMENDATION_LABELS[recommendation.recommendation]}
            </p>
          </div>
          {recommendation.feedback ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{recommendation.feedback}</p>
          ) : null}
        </div>
      ) : null}

      {checkpointIds.map((checkpointId) => {
        const checkpointEntries = entriesForCheckpoint(entries, checkpointId);
        if (checkpointEntries.length === 0) {
          return null;
        }

        const title =
          checkpointId === "final"
            ? "Final"
            : VOLUNTEER_CHECKPOINTS.find((item) => item.id === checkpointId)?.shortLabel ??
              checkpointId.toUpperCase();

        return (
          <div key={checkpointId}>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
            <div className="mt-2 space-y-2">
              {checkpointEntries.map((entry) => (
                <EntryHistoryCard entry={entry} key={entry.id} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EntryHistoryCard({ entry }: { entry: VolunteerProgressEntry }) {
  const when = entry.updatedAt
    ? new Date(entry.updatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

  const score =
    entry.checkpointId === "final" ? (entry.recommendation ?? 0) : entry.totalScore;
  const label =
    entry.checkpointId === "final"
      ? entry.recommendation
        ? RECOMMENDATION_LABELS[entry.recommendation]
        : "No recommendation"
      : CHECKPOINT_RATING_LABELS[entry.totalScore] ?? "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.volunteerName}</p>
          <p className="mt-0.5 text-xs text-slate-500">{when}</p>
        </div>
        {score > 0 ? (
          <div className="text-right">
            <StarRating readOnly size="sm" value={score} />
            <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
          </div>
        ) : null}
      </div>
      {!entry.domainAligned ? (
        <p className="mt-2 text-xs font-semibold text-orange-700 dark:text-orange-300">
          Domain alignment concern
        </p>
      ) : null}
      {entry.feedback ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{entry.feedback}</p>
      ) : (
        <p className="mt-2 text-xs italic text-slate-400">No written note</p>
      )}
    </div>
  );
}
