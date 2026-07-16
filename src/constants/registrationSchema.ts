/**
 * Known Typeform registration export columns for Cursor Ahmedabad Hackathon 2026.
 * Detection still works for other headers, but these are preferred when present.
 */
export const TYPEFORM_REGISTRATION_COLUMNS = {
  responseId: "#",
  teamLeadName: "Team Lead Name",
  teamLeadEmail: "Team Lead Email Address",
  teammateEmails: "Teammate Email Addresses",
  teamName: "Team Name",
  domain: "Select Domain on which you would love to build",
  projectTitle: "Project Idea Title",
  projectDescription: "Project Idea Description",
  cursorMobile: "Are you using Cursor Mobile App During Hackathon?",
  responseType: "Response Type",
  startDate: "Start Date (UTC)",
  stageDate: "Stage Date (UTC)",
  submitDate: "Submit Date (UTC)",
  networkId: "Network ID",
  tags: "Tags",
  ending: "Ending",
} as const;

/** Exact domain labels from the Typeform registration form. */
export const TYPEFORM_DOMAIN_LABELS = [
  "Next-Gen Learning",
  "Digital Health & Wellness",
  "Future Cities & Civic Innovation",
  "AI For Everyday Experiences",
] as const;

/** Columns that are metadata / not participant data — skip email/URL validation. */
export const TYPEFORM_METADATA_COLUMN_PATTERNS = [
  /^#$/,
  /^response\s*type$/i,
  /start\s*date/i,
  /stage\s*date/i,
  /submit\s*date/i,
  /network\s*id/i,
  /^tags$/i,
  /^ending$/i,
  /cursor\s*mobile/i,
  /response\s*id/i,
];

export function isMetadataColumn(column: string): boolean {
  return TYPEFORM_METADATA_COLUMN_PATTERNS.some((pattern) => pattern.test(column.trim()));
}

export function findColumn(columns: string[], exactName: string, patterns: RegExp[] = []): string | undefined {
  const exact = columns.find((column) => column === exactName);
  if (exact) {
    return exact;
  }
  return columns.find((column) => patterns.some((pattern) => pattern.test(column)));
}
