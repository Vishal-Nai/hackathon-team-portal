export type CheckpointId = "cp1" | "cp2" | "cp3" | "cp4" | "final";

export type DomainId = "learning" | "health" | "cities" | "everyday";

export type Trajectory = "improving" | "flat" | "slipping" | "insufficient";

export interface VolunteerSession {
  /** Firebase anonymous uid — used as ownership key for entries. */
  sessionId: string;
  name: string;
  eventId: string;
}

export interface VolunteerProgressEntry {
  id: string;
  teamId: string;
  volunteerName: string;
  volunteerSessionId: string;
  checkpointId: CheckpointId;
  /** Single rating 1–5 for checkpoints; 0 for final. */
  totalScore: number;
  domainAligned: boolean;
  domainId: DomainId | "";
  feedback: string;
  recommendation: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveVolunteerEntryInput {
  eventId: string;
  teamId: string;
  volunteerName: string;
  volunteerSessionId: string;
  checkpointId: CheckpointId;
  totalScore: number;
  domainAligned: boolean;
  domainId: DomainId | "";
  feedback: string;
  recommendation?: number | null;
}

export const MAX_VOLUNTEER_NAME_LENGTH = 80;
export const MAX_VOLUNTEER_FEEDBACK_LENGTH = 2000;

export const MAX_CHECKPOINT_RATING = 5;

export const RECOMMENDATION_LABELS: Record<number, string> = {
  5: "Strong Finalist",
  4: "Recommended for Final Judging",
  3: "Good Project",
  2: "Needs Improvement",
  1: "Not Ready",
};

export const CHECKPOINT_RATING_LABELS: Record<number, string> = {
  5: "Excellent progress",
  4: "On track",
  3: "Making progress",
  2: "Behind / needs support",
  1: "At risk",
};
