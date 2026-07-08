import type { JudgeConfig } from "../types/judge";

const MAX_JUDGE_NAME_LENGTH = 80;
const JUDGE_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/;

function parseJudgesConfig(): JudgeConfig[] {
  const raw = import.meta.env.VITE_JUDGES;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("VITE_JUDGES must be a JSON array.");
      return [];
    }

    const judges: JudgeConfig[] = [];
    const seenIds = new Set<string>();

    for (const entry of parsed) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as JudgeConfig).id === "string" &&
        typeof (entry as JudgeConfig).name === "string" &&
        typeof (entry as JudgeConfig).code === "string"
      ) {
        const judge = entry as JudgeConfig;
        const id = judge.id.trim();
        const name = judge.name.trim();
        const code = judge.code.trim();

        if (!id || !name || !code) {
          continue;
        }

        if (!isValidJudgeConfigId(id)) {
          console.warn(`Skipping judge with invalid id "${id}". Use letters, numbers, hyphens, or underscores.`);
          continue;
        }

        if (name.length > MAX_JUDGE_NAME_LENGTH) {
          console.warn(`Skipping judge "${name}" — name exceeds ${MAX_JUDGE_NAME_LENGTH} characters.`);
          continue;
        }

        if (seenIds.has(id)) {
          console.warn(`Skipping duplicate judge id "${id}".`);
          continue;
        }

        seenIds.add(id);
        judges.push({ id, name, code });
      }
    }

    return judges;
  } catch {
    console.warn("Failed to parse VITE_JUDGES. Expected a JSON array.");
    return [];
  }
}

const judges = parseJudgesConfig();

export function getJudgesConfig(): JudgeConfig[] {
  return judges;
}

export function isValidJudgeConfigId(id: string): boolean {
  return JUDGE_ID_PATTERN.test(id.trim());
}

export function isCanonicalJudgeDocId(docId: string): boolean {
  return judges.some((judge) => judge.id === docId);
}

export function getJudgeById(id: string): JudgeConfig | null {
  return judges.find((judge) => judge.id === id) ?? null;
}

export function validateJudgeCode(code: string): { id: string; name: string } | null {
  const normalized = code.trim();
  if (!normalized) {
    return null;
  }

  const match = judges.find((judge) => judge.code === normalized);
  if (!match) {
    return null;
  }

  return { id: match.id, name: match.name };
}

export function isJudgePortalConfigured(): boolean {
  return judges.length > 0;
}

export function validateJudgeName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Judge name is required.";
  }
  if (trimmed.length > MAX_JUDGE_NAME_LENGTH) {
    return `Judge name must be ${MAX_JUDGE_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}
