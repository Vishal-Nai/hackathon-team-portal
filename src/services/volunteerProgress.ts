import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { validateVolunteerName } from "../config/volunteers";
import type {
  CheckpointId,
  DomainId,
  SaveVolunteerEntryInput,
  VolunteerProgressEntry,
} from "../types/volunteer";
import { MAX_CHECKPOINT_RATING, MAX_VOLUNTEER_FEEDBACK_LENGTH } from "../types/volunteer";
import { getFirebaseDb } from "./firebase";

const CHECKPOINT_IDS: CheckpointId[] = ["cp1", "cp2", "cp3", "cp4", "final"];
const DOMAIN_IDS: Array<DomainId | ""> = ["learning", "health", "cities", "everyday", ""];

function teamProgressDoc(eventId: string, teamId: string) {
  return doc(getFirebaseDb(), "events", eventId, "volunteerProgress", teamId);
}

function entriesCollection(eventId: string, teamId: string) {
  return collection(getFirebaseDb(), "events", eventId, "volunteerProgress", teamId, "entries");
}

function entryDoc(eventId: string, teamId: string, entryId: string) {
  return doc(getFirebaseDb(), "events", eventId, "volunteerProgress", teamId, "entries", entryId);
}

export function buildVolunteerEntryId(sessionId: string, checkpointId: CheckpointId): string {
  return `${sessionId}_${checkpointId}`;
}

function timestampToIso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function mapEntryDoc(
  id: string,
  teamId: string,
  data: Record<string, unknown>,
): VolunteerProgressEntry {
  const recommendationRaw = data.recommendation;
  let recommendation: number | null = null;
  if (typeof recommendationRaw === "number" && Number.isInteger(recommendationRaw)) {
    recommendation = recommendationRaw;
  }

  const checkpointRaw = String(data.checkpointId ?? "cp1");
  const checkpointId = (CHECKPOINT_IDS.includes(checkpointRaw as CheckpointId)
    ? checkpointRaw
    : "cp1") as CheckpointId;

  const domainRaw = String(data.domainId ?? "");
  const domainId = (DOMAIN_IDS.includes(domainRaw as DomainId | "")
    ? domainRaw
    : "") as DomainId | "";

  return {
    id,
    teamId,
    volunteerName: String(data.volunteerName ?? ""),
    volunteerSessionId: String(data.volunteerSessionId ?? ""),
    checkpointId,
    totalScore: Number(data.totalScore ?? 0),
    domainAligned: Boolean(data.domainAligned),
    domainId,
    feedback: String(data.feedback ?? ""),
    recommendation,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export function validateVolunteerEntryInput(input: SaveVolunteerEntryInput): string | null {
  const nameError = validateVolunteerName(input.volunteerName);
  if (nameError) {
    return nameError;
  }

  if (!input.teamId.trim()) {
    return "Invalid team. Refresh the page and try again.";
  }

  if (!input.volunteerSessionId.trim()) {
    return "Invalid volunteer session. Please sign in again.";
  }

  if (!CHECKPOINT_IDS.includes(input.checkpointId)) {
    return "Invalid checkpoint.";
  }

  if (!DOMAIN_IDS.includes(input.domainId)) {
    return "Invalid domain from registration data.";
  }

  if (input.feedback.trim().length > MAX_VOLUNTEER_FEEDBACK_LENGTH) {
    return `Feedback must be ${MAX_VOLUNTEER_FEEDBACK_LENGTH} characters or fewer.`;
  }

  if (input.checkpointId === "final") {
    const recommendation = input.recommendation ?? null;
    if (recommendation === null || !Number.isInteger(recommendation) || recommendation < 1 || recommendation > 5) {
      return "Please select a final recommendation (1–5 stars).";
    }
    return null;
  }

  if (
    !Number.isInteger(input.totalScore) ||
    input.totalScore < 1 ||
    input.totalScore > MAX_CHECKPOINT_RATING
  ) {
    return `Please select a rating from 1 to ${MAX_CHECKPOINT_RATING} stars.`;
  }

  return null;
}

export async function upsertVolunteerEntry(input: SaveVolunteerEntryInput): Promise<void> {
  const validationError = validateVolunteerEntryInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const entryId = buildVolunteerEntryId(input.volunteerSessionId, input.checkpointId);
  const isFinal = input.checkpointId === "final";

  await setDoc(teamProgressDoc(input.eventId, input.teamId), { teamId: input.teamId }, { merge: true });

  const ref = entryDoc(input.eventId, input.teamId, entryId);
  const existing = await getDoc(ref);
  const hadCreatedAt = existing.exists() && Boolean(existing.data()?.createdAt);

  const payload: Record<string, unknown> = {
    volunteerName: input.volunteerName.trim(),
    volunteerSessionId: input.volunteerSessionId,
    checkpointId: input.checkpointId,
    totalScore: isFinal ? 0 : input.totalScore,
    domainAligned: input.domainAligned,
    domainId: input.domainId || "",
    feedback: input.feedback.trim(),
    updatedAt: serverTimestamp(),
  };

  if (isFinal) {
    payload.recommendation = input.recommendation ?? null;
  }

  if (hadCreatedAt && existing.exists()) {
    // Preserve createdAt so update rules pass; overwrite (no merge) clears legacy fields.
    payload.createdAt = existing.data()?.createdAt;
  } else {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(ref, payload);
}

export async function loadEventVolunteerProgress(
  eventId: string,
): Promise<Map<string, VolunteerProgressEntry[]>> {
  const teamDocs = await getDocs(collection(getFirebaseDb(), "events", eventId, "volunteerProgress"));
  const byTeam = new Map<string, VolunteerProgressEntry[]>();

  await Promise.all(
    teamDocs.docs.map(async (teamDoc) => {
      const entriesSnap = await getDocs(entriesCollection(eventId, teamDoc.id));
      const entries = entriesSnap.docs.map((entryDocument) =>
        mapEntryDoc(entryDocument.id, teamDoc.id, entryDocument.data()),
      );
      if (entries.length > 0) {
        byTeam.set(
          teamDoc.id,
          entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      }
    }),
  );

  return byTeam;
}

export async function countVolunteerEntries(eventId: string): Promise<number> {
  const byTeam = await loadEventVolunteerProgress(eventId);
  let total = 0;
  for (const entries of byTeam.values()) {
    total += entries.length;
  }
  return total;
}
