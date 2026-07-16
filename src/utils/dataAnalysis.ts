import type { ColumnMapping, CsvRow, DashboardType, TeamMemberInfo, TeamSummary } from "../types/dashboard";
import { isMetadataColumn } from "../constants/registrationSchema";
import {
  extractEmailsFromRow,
  isTeammateEmailColumn,
  parseEmailsFromValue,
  parseUrlsFromValue,
  resolveRowPrimaryEmail,
  resolveSchema,
  suggestColumnMapping,
  type DetectedSchema,
} from "./columnDetection";

export { suggestColumnMapping };

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveTeamLeadColumn(
  columns: string[],
  rows: Record<string, string>[] = [],
  mapping?: ColumnMapping,
): string | undefined {
  const schema = resolveSchema(columns, rows, mapping);
  return schema.teamLeadEmail || undefined;
}

export function resolveTeamNameColumn(
  columns: string[],
  rows: Record<string, string>[] = [],
  mapping?: ColumnMapping,
): string | undefined {
  const schema = resolveSchema(columns, rows, mapping);
  return schema.teamName;
}

function pairMemberColumns(schema: DetectedSchema): Array<{ nameColumn?: string; emailColumn?: string }> {
  const pairs: Array<{ nameColumn?: string; emailColumn?: string }> = [];

  if (schema.memberNameColumns.length > 0) {
    for (const nameColumn of schema.memberNameColumns) {
      const indexMatch = nameColumn.match(/(\d+)/);
      const emailColumn = indexMatch
        ? schema.memberEmailColumns.find((column) => column.includes(indexMatch[1]))
        : schema.memberEmailColumns[0];

      pairs.push({ nameColumn, emailColumn });
    }
    return pairs;
  }

  for (const emailColumn of schema.memberEmailColumns) {
    pairs.push({ emailColumn });
  }

  return pairs;
}

function addMember(
  members: TeamMemberInfo[],
  seen: Set<string>,
  member: TeamMemberInfo,
) {
  const key = `${member.name}|${member.email ?? ""}`.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  members.push(member);
}

function extractMembersFromEmailField(
  members: TeamMemberInfo[],
  seen: Set<string>,
  column: string,
  rawValue: string,
) {
  const emails = parseEmailsFromValue(rawValue);
  for (const email of emails) {
    addMember(members, seen, {
      name: email,
      email,
      sourceColumn: column,
    });
  }
}

function extractMembers(
  fields: Record<string, string>,
  columns: string[],
  schema: DetectedSchema,
): TeamMemberInfo[] {
  const members: TeamMemberInfo[] = [];
  const seen = new Set<string>();
  const processedEmailColumns = new Set<string>();

  for (const column of schema.memberEmailColumns) {
    const rawValue = fields[column]?.trim();
    if (!rawValue) {
      continue;
    }

    const emails = parseEmailsFromValue(rawValue);
    if (emails.length > 1 || isTeammateEmailColumn(column)) {
      extractMembersFromEmailField(members, seen, column, rawValue);
      processedEmailColumns.add(column);
    }
  }

  for (const pair of pairMemberColumns(schema)) {
    if (pair.emailColumn && processedEmailColumns.has(pair.emailColumn)) {
      continue;
    }
    const name = pair.nameColumn ? fields[pair.nameColumn]?.trim() : undefined;
    const rawEmail = pair.emailColumn ? fields[pair.emailColumn]?.trim() : undefined;

    if (!name && !rawEmail) {
      continue;
    }

    if (rawEmail) {
      const emails = parseEmailsFromValue(rawEmail);
      if (emails.length > 1) {
        for (const email of emails) {
          addMember(members, seen, {
            name: name ?? email,
            email,
            sourceColumn: pair.emailColumn ?? pair.nameColumn,
          });
        }
        continue;
      }
    }

    addMember(members, seen, {
      name: name ?? rawEmail ?? "Member",
      email: rawEmail && parseEmailsFromValue(rawEmail).length === 1 ? parseEmailsFromValue(rawEmail)[0] : rawEmail,
      sourceColumn: pair.nameColumn ?? pair.emailColumn,
    });
  }

  const combinedMemberColumn = columns.find((column) => /members?|teammates?|participants?/i.test(column) && !/email/i.test(column));
  if (combinedMemberColumn && fields[combinedMemberColumn]) {
    const parts = fields[combinedMemberColumn]
      .split(/[,;|]/)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      const emails = parseEmailsFromValue(part);
      if (emails.length === 1) {
        addMember(members, seen, { name: emails[0], email: emails[0], sourceColumn: combinedMemberColumn });
      } else {
        addMember(members, seen, { name: part, sourceColumn: combinedMemberColumn });
      }
    }
  }

  return members;
}

export function extractTeamSummary(
  row: CsvRow,
  columns: string[],
  mapping?: ColumnMapping,
  allRows?: Record<string, string>[],
): TeamSummary | null {
  const schema = resolveSchema(columns, allRows ?? [row.fields], mapping);
  const teamLeadEmail = resolveRowPrimaryEmail(row.fields, schema);

  if (!teamLeadEmail) {
    return null;
  }

  return {
    teamLeadEmail,
    teamLeadColumn: schema.teamLeadEmail || "auto",
    teamName: schema.teamName ? row.fields[schema.teamName] : undefined,
    teamLeadName: schema.teamLeadName ? row.fields[schema.teamLeadName]?.trim() || undefined : undefined,
    domain: schema.domainColumn ? row.fields[schema.domainColumn]?.trim() || undefined : undefined,
    projectTitle: schema.projectTitleColumn
      ? row.fields[schema.projectTitleColumn]?.trim() || undefined
      : undefined,
    members: extractMembers(row.fields, columns, schema),
    rowId: row.id,
  };
}

export function analyzeRows(
  type: DashboardType,
  columns: string[],
  rows: Array<{ id: string; rowIndex: number; fields: Record<string, string> }>,
  mapping?: ColumnMapping,
  crossReferenceEmails?: Set<string>,
): CsvRow[] {
  const rowFields = rows.map((row) => row.fields);
  const schema = resolveSchema(columns, rowFields, mapping);

  const primaryEmailCounts = new Map<string, number>();
  const memberEmailToTeams = new Map<string, string[]>();

  for (const row of rows) {
    const primaryEmail = resolveRowPrimaryEmail(row.fields, schema);
    if (primaryEmail) {
      primaryEmailCounts.set(primaryEmail, (primaryEmailCounts.get(primaryEmail) ?? 0) + 1);
    }

    const members = extractMembers(row.fields, columns, schema);
    const teamLabel =
      schema.teamName && row.fields[schema.teamName]
        ? row.fields[schema.teamName]
        : primaryEmail || `Row ${row.rowIndex + 1}`;

    for (const member of members) {
      if (!member.email) {
        continue;
      }
      for (const memberEmail of parseEmailsFromValue(member.email)) {
        const teams = memberEmailToTeams.get(normalizeEmail(memberEmail)) ?? [];
        teams.push(teamLabel);
        memberEmailToTeams.set(normalizeEmail(memberEmail), teams);
      }
    }
  }

  return rows.map((row) => {
    const issues: string[] = [];
    const primaryEmail = resolveRowPrimaryEmail(row.fields, schema);
    const rowEmails = extractEmailsFromRow(row.fields);

    if (!primaryEmail) {
      issues.push("No email found in row");
    } else {
      if (!EMAIL_PATTERN.test(primaryEmail)) {
        issues.push("Invalid primary email format");
      } else if ((primaryEmailCounts.get(primaryEmail) ?? 0) > 1) {
        issues.push("Duplicate primary email");
      }

      if (crossReferenceEmails) {
        const matchesCrossRef =
          crossReferenceEmails.has(primaryEmail) ||
          rowEmails.some((email) => crossReferenceEmails.has(email));

        if (type === "registrations" && !matchesCrossRef) {
          issues.push("No matching project submission found");
        }
        if (type === "submissions" && !matchesCrossRef) {
          issues.push("No matching registration found");
        }
      }
    }

    for (const email of rowEmails) {
      if (!EMAIL_PATTERN.test(email)) {
        issues.push(`Invalid email: ${email}`);
      }
    }

    const members = extractMembers(row.fields, columns, schema);
    for (const member of members) {
      const memberEmails = member.email ? parseEmailsFromValue(member.email) : [];
      for (const memberEmail of memberEmails) {
        if (!EMAIL_PATTERN.test(memberEmail)) {
          issues.push(`Invalid member email: ${memberEmail}`);
          continue;
        }
        if (memberEmail === primaryEmail) {
          continue;
        }
        const teams = memberEmailToTeams.get(normalizeEmail(memberEmail)) ?? [];
        if (teams.length > 1) {
          issues.push(`Member email used in multiple teams: ${memberEmail}`);
        }
      }
    }

    if (type === "submissions") {
      validateSubmissionUrls(row.fields, schema.urlColumns, issues);
    }

    if (type === "registrations") {
      if (schema.domainColumn && !row.fields[schema.domainColumn]?.trim()) {
        issues.push("Missing domain");
      }
      if (schema.teamName && !row.fields[schema.teamName]?.trim()) {
        issues.push("Missing team name");
      }
    }

    for (const column of columns) {
      if (isMetadataColumn(column)) {
        continue;
      }

      const value = row.fields[column] ?? "";
      if (!value) {
        continue;
      }

      if (/email/i.test(column)) {
        const emails = parseEmailsFromValue(value);
        if (emails.length === 0) {
          issues.push(`Invalid email in "${column}"`);
        }
      }
    }

    const hasIssues = issues.length > 0;
    return { ...row, issues, hasIssues };
  });
}

function validateSubmissionUrls(
  fields: Record<string, string>,
  allUrlColumns: DetectedSchema["urlColumns"],
  issues: string[],
) {
  for (const { column } of allUrlColumns) {
    const value = fields[column]?.trim();
    if (!value) {
      continue;
    }

    const urls = parseUrlsFromValue(value);
    if (urls.length === 0) {
      issues.push(`Invalid URL in "${column}"`);
    }
  }
}

export function getCrossReferenceEmails(
  columns: string[],
  rows: CsvRow[],
  mapping?: ColumnMapping,
): Set<string> {
  const schema = resolveSchema(
    columns,
    rows.map((row) => row.fields),
    mapping,
  );

  const emails = new Set<string>();

  for (const row of rows) {
    const primary = resolveRowPrimaryEmail(row.fields, schema);
    if (primary) {
      emails.add(primary);
    }

    for (const email of extractEmailsFromRow(row.fields)) {
      emails.add(email);
    }
  }

  return emails;
}

export function countIssues(rows: CsvRow[]): number {
  return rows.filter((row) => row.issues.length > 0).length;
}

export function buildSearchText(fields: Record<string, string>): string {
  return Object.values(fields).join(" ").toLowerCase();
}
