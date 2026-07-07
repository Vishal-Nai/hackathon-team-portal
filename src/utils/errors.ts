import { FirebaseError } from "firebase/app";
import type { FirestoreAccessDiagnostics } from "../services/firestoreAccess";

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
  "auth/popup-blocked": "Pop-up was blocked by your browser. Allow pop-ups for this site and retry.",
  "auth/cancelled-popup-request": "Another sign-in is already in progress.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/user-disabled": "This Google account has been disabled.",
  "auth/operation-not-allowed": "Google sign-in is not enabled in Firebase. Enable it under Authentication → Sign-in method.",
};

export function getFriendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return "Firestore permission denied. Deploy firestore.rules and verify config/admins contains your signed-in email as an array.";
    }
    if (FIREBASE_AUTH_MESSAGES[error.code]) {
      return FIREBASE_AUTH_MESSAGES[error.code];
    }
    return error.message || fallback;
  }

  if (error instanceof Error) {
    const firebaseCode = extractFirebaseCode(error.message);
    if (firebaseCode && FIREBASE_AUTH_MESSAGES[firebaseCode]) {
      return FIREBASE_AUTH_MESSAGES[firebaseCode];
    }
    return error.message || fallback;
  }

  return fallback;
}

export function formatAccessDiagnostics(diagnostics: FirestoreAccessDiagnostics): string {
  return diagnostics.message;
}

function extractFirebaseCode(message: string): string | null {
  const match = message.match(/\(auth\/[^)]+\)/);
  if (!match) {
    return null;
  }
  return match[0].slice(1, -1);
}
