import { VOLUNTEER_CHECKPOINTS } from "../constants/volunteerCheckpoints";
import type { MergedTeam } from "../types/teams";
import type { VolunteerProgressEntry } from "../types/volunteer";
import { RECOMMENDATION_LABELS } from "../types/volunteer";
import {
  averageScoreForCheckpoint,
  computeTrajectory,
  formatTrajectory,
  latestRecommendation,
  uniqueVolunteerCount,
} from "./volunteerProgressStats";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildVolunteerProgressCsv(
  teams: MergedTeam[],
  progressByTeam: Map<string, VolunteerProgressEntry[]>,
): string {
  const headers = [
    "Team Name",
    "Lead Email",
    "Detected Domain",
    ...VOLUNTEER_CHECKPOINTS.flatMap((checkpoint) => [
      `${checkpoint.id.toUpperCase()} Avg (1-5)`,
      `${checkpoint.id.toUpperCase()} Visits`,
    ]),
    "Trajectory",
    "Volunteer Count",
    "Final Recommendation",
    "Final Label",
    "Latest Feedback",
  ];

  const lines = [headers.join(",")];

  for (const team of teams) {
    const entries = progressByTeam.get(team.id) ?? [];
    const recommendation = latestRecommendation(entries);
    const row = [
      team.teamName,
      team.primaryEmail,
      team.domain || "Not set",
      ...VOLUNTEER_CHECKPOINTS.flatMap((checkpoint) => {
        const avg = averageScoreForCheckpoint(entries, checkpoint.id);
        const visits = entries.filter((entry) => entry.checkpointId === checkpoint.id).length;
        return [avg === null ? "" : avg.toFixed(2), String(visits)];
      }),
      formatTrajectory(computeTrajectory(entries)),
      String(uniqueVolunteerCount(entries)),
      recommendation?.recommendation ? String(recommendation.recommendation) : "",
      recommendation?.recommendation ? RECOMMENDATION_LABELS[recommendation.recommendation] : "",
      recommendation?.feedback ?? "",
    ].map((cell) => csvEscape(cell));

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

export function downloadVolunteerProgressCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
