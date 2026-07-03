import { createHash } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();

interface UpdateHackathonConfigRequest {
  portalId?: string;
  adminToken?: string;
  title?: string;
  tagline?: string;
}

function hashAdminToken(adminToken: string) {
  return createHash("sha256").update(adminToken).digest("hex");
}

export const updateHackathonConfig = onCall(async (request) => {
  const { portalId, adminToken, title, tagline } = request.data as UpdateHackathonConfigRequest;

  if (!portalId || !adminToken || !title?.trim() || !tagline?.trim()) {
    throw new HttpsError("invalid-argument", "portalId, adminToken, title, and tagline are required.");
  }

  if (title.trim().length > 120 || tagline.trim().length > 220) {
    throw new HttpsError("invalid-argument", "Title or tagline is too long.");
  }

  const docRef = getFirestore().doc(`hackathons/${portalId}`);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Hackathon portal not found.");
  }

  const storedHash = snapshot.get("adminTokenHash");
  if (typeof storedHash !== "string" || hashAdminToken(adminToken) !== storedHash) {
    throw new HttpsError("permission-denied", "Invalid admin token.");
  }

  await docRef.update({
    title: title.trim(),
    tagline: tagline.trim(),
  });

  return { ok: true };
});
