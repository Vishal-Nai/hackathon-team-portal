export type DashboardType = "registrations" | "submissions";

export interface ColumnMapping {
  teamLeadEmail?: string;
  teamName?: string;
  autoDetected?: boolean;
  manualOverride?: boolean;
}

export interface CsvRow {
  id: string;
  rowIndex: number;
  fields: Record<string, string>;
  issues: string[];
  importId?: string;
  hasIssues?: boolean;
}

export interface DashboardMeta {
  columns: string[];
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  rowCount: number;
  issueCount: number;
  activeImportId: string;
  columnMapping: ColumnMapping;
}

export interface DashboardDataset {
  meta: DashboardMeta | null;
  rows: CsvRow[];
}

export interface PaginatedRowsResult {
  rows: CsvRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ParsedCsv {
  columns: string[];
  rows: Record<string, string>[];
}

export interface TeamMemberInfo {
  name: string;
  email?: string;
  sourceColumn?: string;
}

export interface TeamSummary {
  teamLeadEmail: string;
  teamLeadColumn: string;
  teamName?: string;
  members: TeamMemberInfo[];
  rowId: string;
}

export const DEFAULT_PAGE_SIZE = 25;
