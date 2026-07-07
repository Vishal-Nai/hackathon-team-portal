import type { CsvRow, DashboardMeta } from "./dashboard";

export type TeamMatchStatus = "complete" | "registered_only" | "submitted_only";

export interface TeamLink {
  label: string;
  url: string;
  column: string;
}

export interface MergedTeam {
  id: string;
  primaryEmail: string;
  teamName: string;
  status: TeamMatchStatus;
  allEmails: string[];
  registration: CsvRow | null;
  submission: CsvRow | null;
  links: TeamLink[];
  issues: string[];
}

export interface EventSummaryStats {
  registeredCount: number;
  submittedCount: number;
  completeCount: number;
  missingSubmissionCount: number;
  missingRegistrationCount: number;
  issueCount: number;
  lastRegUpload: string | null;
  lastSubUpload: string | null;
  regFileName: string | null;
  subFileName: string | null;
}

export interface EventTeamsData {
  teams: MergedTeam[];
  summary: EventSummaryStats;
  regMeta: DashboardMeta | null;
  subMeta: DashboardMeta | null;
}
