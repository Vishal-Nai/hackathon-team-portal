import { isMetadataColumn } from "../constants/registrationSchema";
import { detectSchema } from "./columnDetection";

export interface ColumnPreferences {
  hidden: string[];
  pinned: string[];
}

const STORAGE_PREFIX = "hackathon-portal:columns:";

function storageKey(eventId: string, dashboardType: string): string {
  return `${STORAGE_PREFIX}${eventId}:${dashboardType}`;
}

export function loadColumnPreferences(eventId: string, dashboardType: string): ColumnPreferences {
  try {
    const raw = localStorage.getItem(storageKey(eventId, dashboardType));
    if (!raw) {
      return { hidden: [], pinned: [] };
    }
    const parsed = JSON.parse(raw) as ColumnPreferences;
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
    };
  } catch {
    return { hidden: [], pinned: [] };
  }
}

export function saveColumnPreferences(
  eventId: string,
  dashboardType: string,
  preferences: ColumnPreferences,
): void {
  try {
    localStorage.setItem(storageKey(eventId, dashboardType), JSON.stringify(preferences));
  } catch {
    // Ignore quota errors — table still works with defaults.
  }
}

export function suggestPinnedColumns(
  columns: string[],
  sampleRows: Record<string, string>[] = [],
): string[] {
  const schema = detectSchema(columns, sampleRows);
  const pinned = new Set<string>();

  if (schema.teamName) {
    pinned.add(schema.teamName);
  }
  if (schema.teamLeadName) {
    pinned.add(schema.teamLeadName);
  }
  if (schema.teamLeadEmail) {
    pinned.add(schema.teamLeadEmail);
  }
  if (schema.domainColumn) {
    pinned.add(schema.domainColumn);
  }
  if (schema.projectTitleColumn) {
    pinned.add(schema.projectTitleColumn);
  }
  for (const { column } of schema.urlColumns.slice(0, 3)) {
    pinned.add(column);
  }

  return columns.filter((column) => pinned.has(column));
}

export function suggestHiddenColumns(columns: string[]): string[] {
  return columns.filter((column) => isMetadataColumn(column));
}

export function orderDisplayColumns(
  columns: string[],
  preferences: ColumnPreferences,
  sampleRows: Record<string, string>[] = [],
): string[] {
  const suggested = suggestPinnedColumns(columns, sampleRows);
  const defaultHidden = suggestHiddenColumns(columns);
  const hidden = new Set(
    preferences.hidden.length > 0 || preferences.pinned.length > 0
      ? preferences.hidden
      : defaultHidden,
  );
  const pinned = preferences.pinned.length > 0 ? preferences.pinned : suggested;

  const visible = columns.filter((column) => !hidden.has(column));
  const pinnedVisible = pinned.filter((column) => visible.includes(column));
  const rest = visible.filter((column) => !pinnedVisible.includes(column));

  return [...pinnedVisible, ...rest];
}
