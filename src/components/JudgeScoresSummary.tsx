import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AverageRatingDisplay } from "./AverageRatingDisplay";
import { SummaryRatingFilters } from "./TeamRatingFilters";
import { StarRating } from "./StarRating";
import { getJudgesConfig } from "../config/judges";
import { findJudgeEvaluation } from "../services/judgeEvaluations";
import type { JudgeEvaluation } from "../types/judge";
import type { MergedTeam } from "../types/teams";
import {
  getTeamAverageRating,
  matchesAverageRatingFilter,
  sortTeamsByRating,
  type AverageRatingFilter,
  type TeamRatingSort,
} from "../utils/teamRatingFilters";

interface JudgeScoresSummaryProps {
  teams: MergedTeam[];
  evaluations: Map<string, JudgeEvaluation[]>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showAllTeams?: boolean;
  totalTeamsCount?: number;
}

export function JudgeScoresSummary({
  teams,
  evaluations,
  searchQuery,
  onSearchQueryChange,
  showAllTeams = true,
  totalTeamsCount,
}: JudgeScoresSummaryProps) {
  const configuredJudges = getJudgesConfig();
  const [averageFilter, setAverageFilter] = useState<AverageRatingFilter>("all");
  const [sort, setSort] = useState<TeamRatingSort>("name");

  const filteredAndSortedTeams = useMemo(() => {
    const filtered = teams.filter((team) => {
      const teamEvals = evaluations.get(team.id) ?? [];
      const averageRating = getTeamAverageRating(teamEvals);
      return matchesAverageRatingFilter(averageRating, averageFilter);
    });

    return sortTeamsByRating(filtered, evaluations, sort);
  }, [teams, evaluations, averageFilter, sort]);

  const emptyMessage =
    (totalTeamsCount ?? teams.length) === 0
      ? "No teams yet. Upload registration and submission data first."
      : !showAllTeams
        ? "No teams with submissions. Enable “Show all teams” to see more."
        : searchQuery.trim() && teams.length === 0
          ? "No teams match your search."
          : teams.length > 0 && filteredAndSortedTeams.length === 0
            ? "No teams match the selected rating filters."
            : "No teams to show.";

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-slate-950 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-white"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search team name or email..."
            type="search"
            value={searchQuery}
          />
        </div>
        <SummaryRatingFilters
          averageFilter={averageFilter}
          onAverageFilterChange={setAverageFilter}
          onSortChange={setSort}
          sort={sort}
        />
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        {filteredAndSortedTeams.length} teams · ratings from all judges
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3">Team</th>
              {configuredJudges.map((judge) => (
                <th className="px-4 py-3" key={judge.id}>
                  {judge.name}
                </th>
              ))}
              <th className="px-4 py-3">Avg rating</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTeams.map((team) => {
              const teamEvals = evaluations.get(team.id) ?? [];
              const averageRating = getTeamAverageRating(teamEvals);

              return (
                <tr className="border-b border-slate-100 dark:border-slate-900" key={team.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-slate-900 dark:text-white">{team.teamName || "Unnamed team"}</p>
                    <p className="text-xs text-slate-500">{team.primaryEmail}</p>
                  </td>
                  {configuredJudges.map((judge) => {
                    const match = findJudgeEvaluation(teamEvals, judge);
                    return (
                      <td className="px-4 py-3 align-top" key={`${team.id}-${judge.id}`}>
                        {match ? (
                          <div>
                            <StarRating readOnly size="sm" value={match.rating} />
                            {match.notes ? (
                              <p className="mt-1 max-w-xs text-xs text-slate-600 dark:text-slate-300">{match.notes}</p>
                            ) : (
                              <p className="mt-1 text-xs italic text-slate-400">No notes</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 align-top">
                    <AverageRatingDisplay averageRating={averageRating} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredAndSortedTeams.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">{emptyMessage}</div>
        ) : null}
      </div>
    </div>
  );
}
