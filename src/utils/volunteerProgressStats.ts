import { VOLUNTEER_CHECKPOINTS } from "../constants/volunteerCheckpoints";
import type {
  CheckpointId,
  DomainId,
  Trajectory,
  VolunteerProgressEntry,
} from "../types/volunteer";

const SCORE_CHECKPOINTS: Array<Exclude<CheckpointId, "final">> = ["cp1", "cp2", "cp3", "cp4"];

export function entriesForCheckpoint(
  entries: VolunteerProgressEntry[],
  checkpointId: CheckpointId,
): VolunteerProgressEntry[] {
  return entries
    .filter((entry) => entry.checkpointId === checkpointId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function averageScoreForCheckpoint(
  entries: VolunteerProgressEntry[],
  checkpointId: Exclude<CheckpointId, "final">,
): number | null {
  const scored = entriesForCheckpoint(entries, checkpointId);
  if (scored.length === 0) {
    return null;
  }
  const total = scored.reduce((sum, entry) => sum + entry.totalScore, 0);
  return total / scored.length;
}

export function findOwnEntry(
  entries: VolunteerProgressEntry[],
  checkpointId: CheckpointId,
  sessionId: string,
): VolunteerProgressEntry | undefined {
  return entries.find(
    (entry) => entry.checkpointId === checkpointId && entry.volunteerSessionId === sessionId,
  );
}

export function uniqueVolunteerCount(entries: VolunteerProgressEntry[]): number {
  return new Set(entries.map((entry) => entry.volunteerSessionId)).size;
}

export function hasConfidenceBadge(entries: VolunteerProgressEntry[]): boolean {
  return uniqueVolunteerCount(entries) >= 2;
}

export function computeTrajectory(entries: VolunteerProgressEntry[]): Trajectory {
  const averages = SCORE_CHECKPOINTS.map((id) => averageScoreForCheckpoint(entries, id)).filter(
    (value): value is number => value !== null,
  );

  if (averages.length < 2) {
    return "insufficient";
  }

  const first = averages[0];
  const last = averages[averages.length - 1];
  const delta = last - first;

  if (delta >= 0.5) {
    return "improving";
  }
  if (delta <= -0.5) {
    return "slipping";
  }
  return "flat";
}

export function detectDomainDrift(entries: VolunteerProgressEntry[]): boolean {
  const domains = entries
    .map((entry) => entry.domainId)
    .filter((domain): domain is DomainId => Boolean(domain));

  if (domains.length < 2) {
    return false;
  }

  return new Set(domains).size > 1;
}

export function latestRecommendation(entries: VolunteerProgressEntry[]): VolunteerProgressEntry | null {
  const finals = entriesForCheckpoint(entries, "final");
  return finals[0] ?? null;
}

export function checkpointVisitCount(
  entries: VolunteerProgressEntry[],
  checkpointId: CheckpointId,
): number {
  return entriesForCheckpoint(entries, checkpointId).length;
}

export function overallAveragePercent(entries: VolunteerProgressEntry[]): number | null {
  const scores: number[] = [];
  for (const checkpoint of VOLUNTEER_CHECKPOINTS) {
    const avg = averageScoreForCheckpoint(entries, checkpoint.id);
    if (avg !== null) {
      scores.push(avg / checkpoint.maxPoints);
    }
  }
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export function formatTrajectory(trajectory: Trajectory): string {
  switch (trajectory) {
    case "improving":
      return "Improving";
    case "flat":
      return "Flat";
    case "slipping":
      return "Slipping";
    default:
      return "Need more data";
  }
}
