import type { CursorUsage, Domain } from "../types/forms";

export const DOMAINS = [
  "AI / ML",
  "Developer Tools",
  "Productivity",
  "Education",
  "Healthcare",
  "FinTech",
  "Open Innovation",
  "Web",
  "Mobile",
  "Gaming",
  "Climate",
  "Social Impact",
  "Other",
] as const satisfies readonly Domain[];

export const CURSOR_USAGE_OPTIONS = [
  "Cursor Desktop",
  "Cursor Mobile (iOS)",
  "Cursor Web",
] as const satisfies readonly CursorUsage[];

export const DESCRIPTION_MIN_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;
export const MAX_TEAM_MEMBERS = 6;
