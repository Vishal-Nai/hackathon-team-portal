import type { ColumnMapping } from "../types/dashboard";
import { TYPEFORM_REGISTRATION_COLUMNS, findColumn } from "../constants/registrationSchema";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const URL_PATTERN = /^https?:\/\/.+/i;

const SAMPLE_SIZE = 120;

const TEAM_LEAD_HEADER_PATTERNS = [
  /team\s*lead.*email/i,
  /lead\s*email/i,
  /email.*lead/i,
  /primary.*email/i,
  /^your\s*email$/i,
  /^email$/i,
  /^contact\s*email$/i,
];
const TEAM_LEAD_NAME_HEADER_PATTERNS = [/team\s*lead.*name/i, /lead\s*name/i];
const TEAM_NAME_HEADER_PATTERNS = [/team\s*name/i, /^team$/i, /group\s*name/i];
const DOMAIN_HEADER_PATTERNS = [/select\s*domain/i, /\bdomain\b/i];
const PROJECT_TITLE_HEADER_PATTERNS = [/project\s*idea\s*title/i, /project\s*title/i, /^title$/i];
const PROJECT_DESCRIPTION_HEADER_PATTERNS = [
  /project\s*idea\s*description/i,
  /project\s*description/i,
  /^description$/i,
];
const MEMBER_NAME_HEADER_PATTERNS = [/member.*name/i, /teammate.*name/i, /participant.*name/i, /^member\s*\d+/i];
const MEMBER_EMAIL_HEADER_PATTERNS = [
  /member.*email/i,
  /teammate.*email/i,
  /teammates.*email/i,
  /participant.*email/i,
  /team.*email.*id/i,
  /email.*id/i,
];
const GITHUB_HEADER_PATTERNS = [/github/i, /repo/i, /repository/i, /source\s*code/i];
const DEMO_HEADER_PATTERNS = [/demo/i, /live.*link/i, /deployment/i, /website/i, /app\s*url/i, /project\s*url/i];
const VIDEO_HEADER_PATTERNS = [/video/i, /loom/i, /youtube/i];

export type UrlColumnKind = "github" | "demo" | "video" | "url";

export interface DetectedSchema {
  teamLeadEmail: string;
  teamName?: string;
  teamLeadName?: string;
  domainColumn?: string;
  projectTitleColumn?: string;
  projectDescriptionColumn?: string;
  emailColumns: string[];
  urlColumns: Array<{ column: string; kind: UrlColumnKind }>;
  memberNameColumns: string[];
  memberEmailColumns: string[];
}

function matchesAny(column: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(column));
}

function sampleValues(rows: Record<string, string>[], column: string): string[] {
  const values: string[] = [];
  const limit = Math.min(rows.length, SAMPLE_SIZE);

  for (let index = 0; index < limit; index += 1) {
    const value = rows[index]?.[column]?.trim();
    if (value) {
      values.push(value);
    }
  }

  return values;
}

export function parseEmailsFromValue(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return [trimmed.toLowerCase()];
  }

  const emails: string[] = [];
  const parts = trimmed.split(/[,;|\n]+/).map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (EMAIL_PATTERN.test(part)) {
      emails.push(part.toLowerCase());
    }
  }

  return emails;
}

function emailScore(column: string, values: string[]): number {
  if (values.length === 0) {
    return matchesAny(column, TEAM_LEAD_HEADER_PATTERNS) ? 0.15 : 0;
  }

  let rowsWithEmail = 0;
  const allEmails: string[] = [];

  for (const value of values) {
    const emails = parseEmailsFromValue(value);
    if (emails.length > 0) {
      rowsWithEmail += 1;
      allEmails.push(...emails);
    }
  }

  const emailRatio = rowsWithEmail / values.length;
  if (emailRatio < 0.4) {
    return matchesAny(column, TEAM_LEAD_HEADER_PATTERNS) ? 0.1 : 0;
  }

  const uniqueEmails = new Set(allEmails);
  const uniqueness = allEmails.length > 0 ? uniqueEmails.size / allEmails.length : 0;
  let score = emailRatio * 0.55 + uniqueness * 0.35;

  if (matchesAny(column, TEAM_LEAD_HEADER_PATTERNS)) {
    score += 0.25;
  } else if (/email/i.test(column) && !matchesAny(column, MEMBER_EMAIL_HEADER_PATTERNS)) {
    score += 0.12;
  } else if (matchesAny(column, MEMBER_EMAIL_HEADER_PATTERNS)) {
    score -= 0.35;
  }

  const multiEmailRows = values.filter((value) => parseEmailsFromValue(value).length > 1).length;
  if (values.length > 0 && multiEmailRows / values.length > 0.2) {
    score -= 0.25;
  }

  return score;
}

function urlKind(column: string, values: string[]): UrlColumnKind {
  const joined = values.join(" ").toLowerCase();
  if (matchesAny(column, GITHUB_HEADER_PATTERNS) || joined.includes("github.com")) {
    return "github";
  }
  if (matchesAny(column, VIDEO_HEADER_PATTERNS) || joined.includes("youtube.com") || joined.includes("youtu.be") || joined.includes("loom.com")) {
    return "video";
  }
  if (matchesAny(column, DEMO_HEADER_PATTERNS)) {
    return "demo";
  }
  return "url";
}

function urlScore(column: string, values: string[]): number {
  if (values.length === 0) {
    return matchesAny(column, [...GITHUB_HEADER_PATTERNS, ...DEMO_HEADER_PATTERNS, ...VIDEO_HEADER_PATTERNS]) ? 0.12 : 0;
  }

  let rowsWithUrl = 0;

  for (const value of values) {
    if (parseUrlsFromValue(value).length > 0) {
      rowsWithUrl += 1;
    }
  }

  const urlRatio = rowsWithUrl / values.length;
  if (urlRatio < 0.35) {
    return matchesAny(column, [...GITHUB_HEADER_PATTERNS, ...DEMO_HEADER_PATTERNS, ...VIDEO_HEADER_PATTERNS])
      ? 0.08
      : 0;
  }

  let score = urlRatio * 0.7;
  if (matchesAny(column, [...GITHUB_HEADER_PATTERNS, ...DEMO_HEADER_PATTERNS, ...VIDEO_HEADER_PATTERNS, /url/i, /link/i])) {
    score += 0.15;
  }

  return score;
}

function nameScore(column: string, values: string[]): number {
  if (values.length === 0) {
    return matchesAny(column, TEAM_NAME_HEADER_PATTERNS) ? 0.2 : matchesAny(column, MEMBER_NAME_HEADER_PATTERNS) ? 0.15 : 0;
  }

  const nameLike = values.filter((value) => {
    if (EMAIL_PATTERN.test(value) || URL_PATTERN.test(value)) {
      return false;
    }
    const words = value.split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 6 && value.length <= 80;
  });

  const ratio = nameLike.length / values.length;
  if (ratio < 0.35) {
    return 0;
  }

  let score = ratio * 0.65;
  if (matchesAny(column, TEAM_NAME_HEADER_PATTERNS)) {
    score += 0.25;
  } else if (matchesAny(column, MEMBER_NAME_HEADER_PATTERNS)) {
    score += 0.18;
  } else if (/name/i.test(column)) {
    score += 0.1;
  }

  return score;
}

export function detectSchema(columns: string[], rows: Record<string, string>[]): DetectedSchema {
  const preferredLeadEmail = findColumn(columns, TYPEFORM_REGISTRATION_COLUMNS.teamLeadEmail, TEAM_LEAD_HEADER_PATTERNS);
  const preferredTeamName = findColumn(columns, TYPEFORM_REGISTRATION_COLUMNS.teamName, TEAM_NAME_HEADER_PATTERNS);
  const preferredLeadName = findColumn(
    columns,
    TYPEFORM_REGISTRATION_COLUMNS.teamLeadName,
    TEAM_LEAD_NAME_HEADER_PATTERNS,
  );
  const preferredDomain = findColumn(columns, TYPEFORM_REGISTRATION_COLUMNS.domain, DOMAIN_HEADER_PATTERNS);
  const preferredProjectTitle = findColumn(
    columns,
    TYPEFORM_REGISTRATION_COLUMNS.projectTitle,
    PROJECT_TITLE_HEADER_PATTERNS,
  );
  const preferredProjectDescription = findColumn(
    columns,
    TYPEFORM_REGISTRATION_COLUMNS.projectDescription,
    PROJECT_DESCRIPTION_HEADER_PATTERNS,
  );
  const preferredTeammateEmails = findColumn(
    columns,
    TYPEFORM_REGISTRATION_COLUMNS.teammateEmails,
    MEMBER_EMAIL_HEADER_PATTERNS,
  );

  const emailScores = columns
    .map((column) => ({ column, score: emailScore(column, sampleValues(rows, column)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const teamLeadEmail =
    preferredLeadEmail
    ?? emailScores.find((entry) => !matchesAny(entry.column, MEMBER_EMAIL_HEADER_PATTERNS))?.column
    ?? emailScores[0]?.column
    ?? "";
  const emailColumns = emailScores.map((entry) => entry.column);

  const nameScores = columns
    .map((column) => ({ column, score: nameScore(column, sampleValues(rows, column)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const teamName =
    preferredTeamName
    ?? nameScores.find((entry) => matchesAny(entry.column, TEAM_NAME_HEADER_PATTERNS))?.column
    ?? nameScores[0]?.column;

  const teamLeadName = preferredLeadName;

  const memberEmailColumns = [
    ...new Set(
      [
        preferredTeammateEmails,
        ...emailColumns.filter((column) => column !== teamLeadEmail),
      ].filter((column): column is string => Boolean(column)),
    ),
  ];
  const memberNameColumns = nameScores
    .map((entry) => entry.column)
    .filter(
      (column) =>
        column !== teamName &&
        column !== teamLeadName &&
        matchesAny(column, MEMBER_NAME_HEADER_PATTERNS),
    );

  const urlColumns = columns
    .map((column) => {
      const values = sampleValues(rows, column);
      const score = urlScore(column, values);
      if (score <= 0) {
        return null;
      }
      return { column, kind: urlKind(column, values), score };
    })
    .filter((entry): entry is { column: string; kind: UrlColumnKind; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score)
    .map(({ column, kind }) => ({ column, kind }));

  return {
    teamLeadEmail,
    ...(teamName ? { teamName } : {}),
    ...(teamLeadName ? { teamLeadName } : {}),
    ...(preferredDomain ? { domainColumn: preferredDomain } : {}),
    ...(preferredProjectTitle ? { projectTitleColumn: preferredProjectTitle } : {}),
    ...(preferredProjectDescription ? { projectDescriptionColumn: preferredProjectDescription } : {}),
    emailColumns,
    urlColumns,
    memberNameColumns,
    memberEmailColumns,
  };
}

export function resolveSchema(
  columns: string[],
  rows: Record<string, string>[],
  mapping?: ColumnMapping,
): DetectedSchema {
  const detected = detectSchema(columns, rows);

  const teamLeadEmail =
    mapping?.teamLeadEmail && columns.includes(mapping.teamLeadEmail)
      ? mapping.teamLeadEmail
      : detected.teamLeadEmail;

  const teamName =
    mapping?.teamName && columns.includes(mapping.teamName) ? mapping.teamName : detected.teamName;

  return {
    ...detected,
    teamLeadEmail,
    ...(teamName ? { teamName } : {}),
  };
}

export function suggestColumnMapping(
  columns: string[],
  rows: Record<string, string>[] = [],
): ColumnMapping {
  const detected = detectSchema(columns, rows);
  return {
    teamLeadEmail: detected.teamLeadEmail,
    ...(detected.teamName ? { teamName: detected.teamName } : {}),
    autoDetected: true,
  };
}

export function extractEmailsFromRow(fields: Record<string, string>): string[] {
  const emails = new Set<string>();

  for (const value of Object.values(fields)) {
    for (const email of parseEmailsFromValue(value)) {
      emails.add(email);
    }
  }

  return [...emails];
}

export function isTeammateEmailColumn(column: string): boolean {
  return matchesAny(column, MEMBER_EMAIL_HEADER_PATTERNS);
}

export function resolveRowPrimaryEmail(
  fields: Record<string, string>,
  schema: DetectedSchema,
): string {
  const preferred = fields[schema.teamLeadEmail]?.trim();
  if (preferred) {
    const emails = parseEmailsFromValue(preferred);
    if (emails.length > 0) {
      return emails[0];
    }
  }

  const teammateColumns = new Set(schema.memberEmailColumns);

  for (const column of Object.keys(fields)) {
    if (column === schema.teamLeadEmail || teammateColumns.has(column) || isTeammateEmailColumn(column)) {
      continue;
    }
    const emails = parseEmailsFromValue(fields[column] ?? "");
    if (emails.length === 1) {
      return emails[0];
    }
  }

  return extractEmailsFromRow(fields)[0] ?? "";
}

export function isEmailValue(value: string): boolean {
  return parseEmailsFromValue(value).length > 0;
}

export function parseUrlsFromValue(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (URL_PATTERN.test(trimmed)) {
    return [trimmed];
  }

  const urls: string[] = [];
  const parts = trimmed.split(/[,;|\n]+/).map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (URL_PATTERN.test(part)) {
      urls.push(part);
    }
  }

  return urls;
}

export function isUrlValue(value: string): boolean {
  return parseUrlsFromValue(value).length > 0;
}
