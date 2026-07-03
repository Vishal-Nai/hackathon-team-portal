import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import type { FinalSubmission, IdeaRegistration, SubmissionResult } from "../types/forms";
import { emailToDocumentId, normalizeEmail } from "../utils/email";
import { ensureAnonymousAuth, getFirebaseDb } from "./firebase";

export interface SubmissionService {
  submitIdeaRegistration(data: IdeaRegistration, portalId: string): Promise<SubmissionResult>;
  submitFinalSubmission(data: FinalSubmission, portalId: string): Promise<SubmissionResult>;
}

function assertPortalId(portalId: string) {
  if (!portalId) {
    throw new Error("Hackathon portal is not configured yet.");
  }
}

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedValues(item)) as T;
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([entryKey, entryValue]) => [entryKey, removeUndefinedValues(entryValue)]),
    ) as T;
  }

  return value;
}

function duplicateSubmissionMessage(type: "idea" | "final") {
  return type === "idea"
    ? "This team lead email has already registered an idea for this hackathon."
    : "This team lead email has already submitted a final project for this hackathon.";
}

function mapSubmissionError(error: unknown, type: "idea" | "final"): Error {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return new Error(duplicateSubmissionMessage(type));
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Could not submit. Please try again.");
}

export class FirebaseSubmissionService implements SubmissionService {
  async submitIdeaRegistration(data: IdeaRegistration, portalId: string): Promise<SubmissionResult> {
    assertPortalId(portalId);
    await ensureAnonymousAuth();

    const db = getFirebaseDb();
    const teamLeadEmail = normalizeEmail(data.teamLeadEmail);
    const cleanData = removeUndefinedValues({
      ...data,
      teamLeadEmail,
    });

    try {
      await setDoc(doc(db, "hackathons", portalId, "ideaRegistrations", emailToDocumentId(teamLeadEmail)), {
        ...cleanData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      throw mapSubmissionError(error, "idea");
    }

    return { ok: true, message: "Team registered successfully." };
  }

  async submitFinalSubmission(data: FinalSubmission, portalId: string): Promise<SubmissionResult> {
    assertPortalId(portalId);
    await ensureAnonymousAuth();

    const db = getFirebaseDb();
    const teamLeadEmail = normalizeEmail(data.teamLeadEmail);
    const cleanData = removeUndefinedValues({
      ...data,
      teamLeadEmail,
    });

    try {
      await setDoc(doc(db, "hackathons", portalId, "finalSubmissions", emailToDocumentId(teamLeadEmail)), {
        ...cleanData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      throw mapSubmissionError(error, "final");
    }

    return { ok: true, message: "Project submitted successfully." };
  }
}

export const submissionService: SubmissionService = new FirebaseSubmissionService();
