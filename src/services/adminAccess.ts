import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

function normalizeEmails(data: Record<string, unknown> | undefined): string[] {
  if (!data) {
    return [];
  }

  const emails = data.emails;
  if (Array.isArray(emails)) {
    return emails.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof emails === "string") {
    return [emails.trim().toLowerCase()];
  }

  if (typeof data.email === "string") {
    return [data.email.trim().toLowerCase()];
  }

  return [];
}

export async function fetchAdminEmails(): Promise<string[]> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "config", "admins"));
  if (!snapshot.exists()) {
    return [];
  }
  return normalizeEmails(snapshot.data());
}

export async function isFirestoreAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) {
    return false;
  }
  const admins = await fetchAdminEmails();
  return admins.includes(email.trim().toLowerCase());
}
