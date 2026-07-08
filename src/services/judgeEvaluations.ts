import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { getJudgeById, getJudgesConfig, validateJudgeName } from "../config/judges";
import type { JudgeConfig, JudgeEvaluation } from "../types/judge";
import { MAX_JUDGE_NOTES_LENGTH } from "../types/judge";
import { getFirebaseDb } from "./firebase";

function judgeEvaluationDoc(eventId: string, teamId: string, judgeId: string) {
  return doc(getFirebaseDb(), "events", eventId, "evaluations", teamId, "judges", judgeId);
}

function teamEvaluationDoc(eventId: string, teamId: string) {
  return doc(getFirebaseDb(), "events", eventId, "evaluations", teamId);
}

function judgesCollection(eventId: string, teamId: string) {
  return collection(getFirebaseDb(), "events", eventId, "evaluations", teamId, "judges");
}

function normalizeJudgeName(name: string): string {
  return name.trim().toLowerCase();
}

function mapEvaluationDoc(judgeId: string, data: Record<string, unknown>): JudgeEvaluation {
  const updatedAt = data.updatedAt;
  let updatedAtIso = "";
  if (updatedAt && typeof updatedAt === "object" && "toDate" in updatedAt) {
    updatedAtIso = (updatedAt as Timestamp).toDate().toISOString();
  } else if (typeof updatedAt === "string") {
    updatedAtIso = updatedAt;
  }

  return {
    judgeId,
    judgeName: String(data.judgeName ?? ""),
    rating: Number(data.rating ?? 0),
    notes: String(data.notes ?? ""),
    updatedAt: updatedAtIso,
  };
}

/** Match by config id (j1, j2) or by judge name for legacy docs saved under anonymous uid. */
export function findJudgeEvaluation(
  evaluations: JudgeEvaluation[],
  judge: Pick<JudgeConfig, "id" | "name">,
): JudgeEvaluation | undefined {
  const byId = evaluations.find((evaluation) => evaluation.judgeId === judge.id);
  if (byId) {
    return byId;
  }

  const targetName = normalizeJudgeName(judge.name);
  const legacyMatches = evaluations.filter(
    (evaluation) => normalizeJudgeName(evaluation.judgeName) === targetName,
  );

  if (legacyMatches.length === 0) {
    return undefined;
  }

  return legacyMatches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** One evaluation per configured judge — avoids duplicate chips from legacy + new docs. */
export function dedupeTeamEvaluations(evaluations: JudgeEvaluation[]): JudgeEvaluation[] {
  return getJudgesConfig()
    .map((judge) => findJudgeEvaluation(evaluations, judge))
    .filter((evaluation): evaluation is JudgeEvaluation => Boolean(evaluation));
}

function dedupeEvaluationsMap(byTeam: Map<string, JudgeEvaluation[]>): Map<string, JudgeEvaluation[]> {
  const deduped = new Map<string, JudgeEvaluation[]>();
  for (const [teamId, evaluations] of byTeam.entries()) {
    const unique = dedupeTeamEvaluations(evaluations);
    if (unique.length > 0) {
      deduped.set(teamId, unique);
    }
  }
  return deduped;
}

async function deleteStaleJudgeEvaluations(
  eventId: string,
  teamId: string,
  judgeId: string,
  judgeName: string,
): Promise<void> {
  const snapshot = await getDocs(judgesCollection(eventId, teamId));
  const targetName = normalizeJudgeName(judgeName);

  await Promise.all(
    snapshot.docs.map(async (judgeDoc) => {
      if (judgeDoc.id === judgeId) {
        return;
      }

      const data = judgeDoc.data();
      const docName = normalizeJudgeName(String(data.judgeName ?? ""));

      if (docName === targetName) {
        try {
          await deleteDoc(judgeDoc.ref);
        } catch {
          // Best-effort cleanup; canonical save still proceeds.
        }
      }
    }),
  );
}

export async function loadEventEvaluations(eventId: string): Promise<Map<string, JudgeEvaluation[]>> {
  const teamDocs = await getDocs(collection(getFirebaseDb(), "events", eventId, "evaluations"));
  const byTeam = new Map<string, JudgeEvaluation[]>();

  await Promise.all(
    teamDocs.docs.map(async (teamDoc) => {
      const judgesSnap = await getDocs(judgesCollection(eventId, teamDoc.id));
      const evaluations = judgesSnap.docs.map((judgeDoc) =>
        mapEvaluationDoc(judgeDoc.id, judgeDoc.data()),
      );
      if (evaluations.length > 0) {
        byTeam.set(teamDoc.id, evaluations);
      }
    }),
  );

  return dedupeEvaluationsMap(byTeam);
}

export interface SaveJudgeEvaluationInput {
  eventId: string;
  teamId: string;
  judgeId: string;
  judgeName: string;
  rating: number;
  notes: string;
}

export function validateEvaluationInput(
  judgeId: string,
  judgeName: string,
  teamId: string,
  rating: number,
  notes: string,
): string | null {
  const configuredJudge = getJudgeById(judgeId);
  if (!configuredJudge) {
    return "Invalid judge session. Please sign in again.";
  }

  const nameError = validateJudgeName(judgeName);
  if (nameError) {
    return nameError;
  }

  if (configuredJudge.name !== judgeName.trim()) {
    return "Judge name mismatch. Please sign in again.";
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Please select a rating from 1 to 5 stars.";
  }

  const trimmedNotes = notes.trim();
  if (trimmedNotes.length > MAX_JUDGE_NOTES_LENGTH) {
    return `Notes must be ${MAX_JUDGE_NOTES_LENGTH} characters or fewer.`;
  }

  if (!teamId.trim()) {
    return "Invalid team. Refresh the page and try again.";
  }

  return null;
}

export async function saveJudgeEvaluation(input: SaveJudgeEvaluationInput): Promise<void> {
  const validationError = validateEvaluationInput(
    input.judgeId,
    input.judgeName,
    input.teamId,
    input.rating,
    input.notes,
  );
  if (validationError) {
    throw new Error(validationError);
  }

  await deleteStaleJudgeEvaluations(input.eventId, input.teamId, input.judgeId, input.judgeName);

  await setDoc(
    teamEvaluationDoc(input.eventId, input.teamId),
    { teamId: input.teamId },
    { merge: true },
  );

  await setDoc(judgeEvaluationDoc(input.eventId, input.teamId, input.judgeId), {
    judgeName: input.judgeName.trim(),
    rating: input.rating,
    notes: input.notes.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function countEventEvaluations(eventId: string): Promise<number> {
  const evaluations = await loadEventEvaluations(eventId);
  let total = 0;
  for (const teamEvals of evaluations.values()) {
    total += teamEvals.length;
  }
  return total;
}
