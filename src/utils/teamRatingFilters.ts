import type { JudgeConfig } from "../types/judge";
import type { JudgeEvaluation } from "../types/judge";
import type { MergedTeam } from "../types/teams";
import { findJudgeEvaluation } from "../services/judgeEvaluations";

export type AverageRatingFilter =
  | "all"
  | "unrated"
  | "rated"
  | "min-1"
  | "min-2"
  | "min-3"
  | "min-4"
  | "min-5";

export type MyRatingFilter = "all" | "unrated" | "rated" | "1" | "2" | "3" | "4" | "5";

export type TeamRatingSort = "name" | "avg-desc" | "avg-asc" | "my-desc" | "my-asc";

export function getTeamAverageRating(evaluations: JudgeEvaluation[]): number | null {
  const ratings = evaluations
    .map((evaluation) => evaluation.rating)
    .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);

  if (ratings.length === 0) {
    return null;
  }

  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return sum / ratings.length;
}

export function getTeamJudgeRating(
  evaluations: JudgeEvaluation[],
  judge: Pick<JudgeConfig, "id" | "name">,
): number | null {
  const match = findJudgeEvaluation(evaluations, judge);
  if (!match || match.rating < 1 || match.rating > 5) {
    return null;
  }
  return match.rating;
}

export function matchesAverageRatingFilter(
  averageRating: number | null,
  filter: AverageRatingFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unrated":
      return averageRating === null;
    case "rated":
      return averageRating !== null;
    case "min-1":
      return averageRating !== null && averageRating >= 1;
    case "min-2":
      return averageRating !== null && averageRating >= 2;
    case "min-3":
      return averageRating !== null && averageRating >= 3;
    case "min-4":
      return averageRating !== null && averageRating >= 4;
    case "min-5":
      return averageRating !== null && averageRating >= 5;
  }
}

export function matchesMyRatingFilter(myRating: number | null, filter: MyRatingFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unrated":
      return myRating === null;
    case "rated":
      return myRating !== null;
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
      return myRating === Number(filter);
  }
}

function teamLabel(team: MergedTeam): string {
  return team.teamName || team.primaryEmail;
}

function ratingSortValue(rating: number | null): number {
  return rating ?? -1;
}

export function sortTeamsByRating(
  teams: MergedTeam[],
  evaluations: Map<string, JudgeEvaluation[]>,
  sort: TeamRatingSort,
  currentJudge?: Pick<JudgeConfig, "id" | "name">,
): MergedTeam[] {
  const sorted = [...teams];

  sorted.sort((teamA, teamB) => {
    const evalsA = evaluations.get(teamA.id) ?? [];
    const evalsB = evaluations.get(teamB.id) ?? [];
    const avgA = getTeamAverageRating(evalsA);
    const avgB = getTeamAverageRating(evalsB);

    let comparison = 0;

    switch (sort) {
      case "name":
        comparison = teamLabel(teamA).localeCompare(teamLabel(teamB));
        break;
      case "avg-desc":
        comparison = ratingSortValue(avgB) - ratingSortValue(avgA);
        break;
      case "avg-asc":
        comparison = ratingSortValue(avgA) - ratingSortValue(avgB);
        break;
      case "my-desc":
      case "my-asc": {
        if (!currentJudge) {
          comparison = teamLabel(teamA).localeCompare(teamLabel(teamB));
          break;
        }
        const myA = getTeamJudgeRating(evalsA, currentJudge);
        const myB = getTeamJudgeRating(evalsB, currentJudge);
        comparison =
          sort === "my-desc"
            ? ratingSortValue(myB) - ratingSortValue(myA)
            : ratingSortValue(myA) - ratingSortValue(myB);
        break;
      }
    }

    if (comparison === 0) {
      return teamLabel(teamA).localeCompare(teamLabel(teamB));
    }

    return comparison;
  });

  return sorted;
}

export function formatAverageRating(averageRating: number): string {
  return averageRating.toFixed(1);
}
