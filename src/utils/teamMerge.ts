import type { ColumnMapping, CsvRow } from "../types/dashboard";
import type { EventSummaryStats, MergedTeam, TeamLink, TeamMatchStatus } from "../types/teams";
import {
  detectSchema,
  extractEmailsFromRow,
  isUrlValue,
  parseUrlsFromValue,
  resolveRowPrimaryEmail,
  resolveSchema,
} from "./columnDetection";

const URL_PATTERN = /^https?:\/\/.+/i;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolveTeamName(
  fields: Record<string, string>,
  columns: string[],
  rows: Record<string, string>[],
  mapping?: ColumnMapping,
): string {
  const schema = resolveSchema(columns, rows, mapping);
  if (schema.teamName && fields[schema.teamName]?.trim()) {
    return fields[schema.teamName].trim();
  }
  return "";
}

function extractLinks(
  fields: Record<string, string>,
  columns: string[],
  rows: Record<string, string>[],
): TeamLink[] {
  const schema = detectSchema(columns, rows);
  const links: TeamLink[] = [];
  const seen = new Set<string>();

  for (const { column, kind } of schema.urlColumns) {
    const value = fields[column]?.trim();
    if (!value || !URL_PATTERN.test(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    const label =
      kind === "github" ? "GitHub" : kind === "demo" ? "Demo" : kind === "video" ? "Video" : column;
    links.push({ label, url: value, column });
  }

  for (const column of columns) {
    const value = fields[column]?.trim();
    if (!value || !isUrlValue(value) || seen.has(value)) {
      continue;
    }
    if (schema.urlColumns.some((entry) => entry.column === column)) {
      continue;
    }
    const urls = parseUrlsFromValue(value);
    for (const url of urls) {
      if (!seen.has(url)) {
        seen.add(url);
        links.push({ label: column, url, column });
      }
    }
  }

  return links;
}

function rowIdentity(
  row: CsvRow,
  columns: string[],
  rows: Record<string, string>[],
  mapping?: ColumnMapping,
): { primaryEmail: string; allEmails: string[]; teamName: string } {
  const schema = resolveSchema(columns, rows, mapping);
  const primaryEmail = normalizeEmail(resolveRowPrimaryEmail(row.fields, schema));
  const allEmails = extractEmailsFromRow(row.fields).map(normalizeEmail);
  const uniqueEmails = [...new Set(allEmails)];
  const teamName = resolveTeamName(row.fields, columns, rows, mapping);

  return {
    primaryEmail: primaryEmail || uniqueEmails[0] || `row-${row.rowIndex}`,
    allEmails: uniqueEmails,
    teamName,
  };
}

function emailsOverlap(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  return a.some((email) => setB.has(email));
}

export function buildMergedTeams(
  regRows: CsvRow[],
  subRows: CsvRow[],
  regColumns: string[],
  subColumns: string[],
  regMapping?: ColumnMapping,
  subMapping?: ColumnMapping,
): MergedTeam[] {
  const regFields = regRows.map((row) => row.fields);
  const subFields = subRows.map((row) => row.fields);

  const regIdentities = regRows.map((row) => ({
    row,
    ...rowIdentity(row, regColumns, regFields, regMapping),
  }));

  const subIdentities = subRows.map((row) => ({
    row,
    ...rowIdentity(row, subColumns, subFields, subMapping),
  }));

  const matchedSubIds = new Set<string>();
  const teams: MergedTeam[] = [];

  for (const reg of regIdentities) {
    const match = subIdentities.find(
      (sub) => !matchedSubIds.has(sub.row.id) && emailsOverlap(reg.allEmails, sub.allEmails),
    );

    if (match) {
      matchedSubIds.add(match.row.id);
    }

    const primaryEmail = reg.primaryEmail;
    const teamName = reg.teamName || match?.teamName || primaryEmail;
    const links = match ? extractLinks(match.row.fields, subColumns, subFields) : [];
    const issues = [...reg.row.issues, ...(match?.row.issues ?? [])];

    teams.push({
      id: primaryEmail,
      primaryEmail,
      teamName,
      status: match ? "complete" : "registered_only",
      allEmails: [...new Set([...reg.allEmails, ...(match?.allEmails ?? [])])],
      registration: reg.row,
      submission: match?.row ?? null,
      links,
      issues,
    });
  }

  for (const sub of subIdentities) {
    if (matchedSubIds.has(sub.row.id)) {
      continue;
    }

    const links = extractLinks(sub.row.fields, subColumns, subFields);
    teams.push({
      id: `sub-${sub.primaryEmail}`,
      primaryEmail: sub.primaryEmail,
      teamName: sub.teamName || sub.primaryEmail,
      status: "submitted_only",
      allEmails: sub.allEmails,
      registration: null,
      submission: sub.row,
      links,
      issues: sub.row.issues,
    });
  }

  teams.sort((a, b) => {
    const statusOrder: Record<TeamMatchStatus, number> = {
      registered_only: 0,
      submitted_only: 1,
      complete: 2,
    };
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" });
  });

  return teams;
}

export function computeEventSummary(
  teams: MergedTeam[],
  regMeta: { uploadedAt: string; fileName: string; issueCount: number; rowCount: number } | null,
  subMeta: { uploadedAt: string; fileName: string; issueCount: number; rowCount: number } | null,
): EventSummaryStats {
  const completeCount = teams.filter((team) => team.status === "complete").length;
  const missingSubmissionCount = teams.filter((team) => team.status === "registered_only").length;
  const missingRegistrationCount = teams.filter((team) => team.status === "submitted_only").length;

  return {
    registeredCount: regMeta?.rowCount ?? 0,
    submittedCount: subMeta?.rowCount ?? 0,
    completeCount,
    missingSubmissionCount,
    missingRegistrationCount,
    issueCount: (regMeta?.issueCount ?? 0) + (subMeta?.issueCount ?? 0),
    lastRegUpload: regMeta?.uploadedAt ?? null,
    lastSubUpload: subMeta?.uploadedAt ?? null,
    regFileName: regMeta?.fileName ?? null,
    subFileName: subMeta?.fileName ?? null,
  };
}

export function buildChaseListRows(teams: MergedTeam[]): Record<string, string>[] {
  return teams
    .filter((team) => team.status === "registered_only")
    .map((team) => ({
      primary_email: team.primaryEmail,
      team_name: team.teamName,
      all_emails: team.allEmails.join("; "),
      status: "missing_submission",
      registration_issues: team.registration?.issues.join("; ") ?? "",
    }));
}
