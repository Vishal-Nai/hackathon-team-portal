import type { DomainId } from "../types/volunteer";
import { VOLUNTEER_DOMAINS, getDomainLabel } from "../constants/volunteerCheckpoints";
import { TYPEFORM_REGISTRATION_COLUMNS, findColumn } from "../constants/registrationSchema";
import type { MergedTeam } from "../types/teams";

export interface TeamDomainInfo {
  id: DomainId | "";
  /** Display text from CSV when available, otherwise mapped label. */
  label: string;
}

const DOMAIN_ALIASES: Array<{ id: DomainId; patterns: RegExp[] }> = [
  {
    id: "learning",
    patterns: [/next[- ]?gen\s*learning/i, /\blearning\b/i, /\beducation\b/i],
  },
  {
    id: "health",
    patterns: [/digital\s*health/i, /\bwellness\b/i, /\bhealth(care)?\b/i],
  },
  {
    id: "cities",
    patterns: [/future\s*cities/i, /\bcivic\b/i, /\burban\b/i],
  },
  {
    id: "everyday",
    patterns: [/ai\s*for\s*everyday/i, /everyday\s*experiences?/i, /\beveryday\b/i],
  },
];

function matchDomainValue(value: string): DomainId | "" {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  for (const domain of VOLUNTEER_DOMAINS) {
    if (trimmed.toLowerCase() === domain.label.toLowerCase() || trimmed.toLowerCase() === domain.id) {
      return domain.id;
    }
  }

  for (const alias of DOMAIN_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(trimmed))) {
      return alias.id;
    }
  }

  return "";
}

function rawDomainFromFields(fields: Record<string, string>): string {
  const columns = Object.keys(fields);
  const domainColumn =
    findColumn(columns, TYPEFORM_REGISTRATION_COLUMNS.domain, [/select\s*domain/i, /\bdomain\b/i]) ??
    "";
  if (domainColumn) {
    return fields[domainColumn]?.trim() ?? "";
  }
  return "";
}

/** Best-effort domain from registration/submission CSV fields. */
export function detectTeamDomain(team: MergedTeam): DomainId | "" {
  return getTeamDomainInfo(team).id;
}

/** Domain id + display label — prefers enriched MergedTeam.domain from registration CSV. */
export function getTeamDomainInfo(team: MergedTeam): TeamDomainInfo {
  const rawFromTeam = team.domain?.trim() ?? "";
  if (rawFromTeam) {
    const id = matchDomainValue(rawFromTeam);
    return { id: id || "", label: rawFromTeam };
  }

  const fieldSets = [team.registration?.fields, team.submission?.fields].filter(Boolean) as Array<
    Record<string, string>
  >;

  for (const fields of fieldSets) {
    const raw = rawDomainFromFields(fields);
    if (!raw) {
      continue;
    }
    const id = matchDomainValue(raw);
    return { id: id || "", label: raw };
  }

  for (const fields of fieldSets) {
    for (const value of Object.values(fields)) {
      const id = matchDomainValue(value);
      if (id) {
        return { id, label: getDomainLabel(id) };
      }
    }
  }

  return { id: "", label: "Not set in registration" };
}
