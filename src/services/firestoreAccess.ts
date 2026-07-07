import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

export interface FirestoreAccessDiagnostics {
  ok: boolean;
  signedInEmail: string | null;
  configExists: boolean;
  configEmails: string[];
  message: string;
}

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

export async function verifyFirestoreAccess(signedInEmail: string | null): Promise<FirestoreAccessDiagnostics> {
  const email = signedInEmail?.trim().toLowerCase() ?? null;

  if (!email) {
    return {
      ok: false,
      signedInEmail: email,
      configExists: false,
      configEmails: [],
      message: "Google sign-in succeeded but no email was returned. Try another Google account.",
    };
  }

  try {
    const configSnapshot = await getDoc(doc(getFirebaseDb(), "config", "admins"));

    if (!configSnapshot.exists()) {
      return {
        ok: false,
        signedInEmail: email,
        configExists: false,
        configEmails: [],
        message:
          'Firestore document config/admins was not found. Create it with field emails: ["your@gmail.com"] (array type).',
      };
    }

    const configEmails = normalizeEmails(configSnapshot.data());
    const emailAllowed = configEmails.includes(email);

    if (!emailAllowed) {
      return {
        ok: false,
        signedInEmail: email,
        configExists: true,
        configEmails,
        message: `Signed in as ${email}, but config/admins contains: ${
          configEmails.length > 0 ? configEmails.join(", ") : "(no emails found — use an array field named emails)"
        }. Add your exact Gmail to the emails array.`,
      };
    }

    // Probe events collection read permission (rules must be deployed).
    try {
      await getDoc(doc(getFirebaseDb(), "events", "_access_probe"));
    } catch (probeError) {
      const code =
        probeError instanceof Error && "code" in probeError
          ? String((probeError as { code: string }).code)
          : "";

      if (code === "permission-denied") {
        return {
          ok: false,
          signedInEmail: email,
          configExists: true,
          configEmails,
          message:
            `Your email (${email}) is in config/admins, but Firestore rules are not deployed yet. ` +
            "Open Firebase Console → Firestore → Rules, paste firestore.rules from this repo, and click Publish. " +
            "Or run: npx firebase-tools deploy --only firestore:rules",
        };
      }

      throw probeError;
    }

    return {
      ok: true,
      signedInEmail: email,
      configExists: true,
      configEmails,
      message: "Firestore access verified.",
    };
  } catch (error) {
    return {
      ok: false,
      signedInEmail: email,
      configExists: false,
      configEmails: [],
      message: error instanceof Error ? error.message : "Failed to verify Firestore access.",
    };
  }
}
