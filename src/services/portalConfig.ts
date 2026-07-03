import { doc, getDoc, serverTimestamp, setDoc, updateDoc, type Timestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import type { PortalConfig, PortalConfigInput } from "../types/portal";
import { sha256 } from "../utils/crypto";
import {
  ensureAnonymousAuth,
  getFirebaseDb,
  updateHackathonConfigViaFunction,
} from "./firebase";

interface HackathonDocument {
  adminTokenHash: string;
  createdAt?: Timestamp;
  organizerUid: string;
  tagline: string;
  title: string;
}

const MAX_PORTAL_ID_ATTEMPTS = 5;

function createPortalId() {
  return crypto.randomUUID();
}

function mapHackathonDocument(
  portalId: string,
  data: HackathonDocument,
  adminToken?: string,
  currentUserUid?: string,
): PortalConfig {
  return {
    portalId,
    title: data.title,
    tagline: data.tagline,
    createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
    adminToken,
    organizerUid: data.organizerUid,
    canEdit: Boolean(adminToken) || (currentUserUid ? data.organizerUid === currentUserUid : false),
  };
}

async function getUniquePortalRef() {
  const db = getFirebaseDb();

  for (let attempt = 0; attempt < MAX_PORTAL_ID_ATTEMPTS; attempt += 1) {
    const portalId = createPortalId();
    const ref = doc(db, "hackathons", portalId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      return { portalId, ref };
    }
  }

  throw new Error("Could not allocate a unique portal ID. Please try again.");
}

export class PortalConfigService {
  async createPortalConfig(input: PortalConfigInput): Promise<PortalConfig> {
    const user = await ensureAnonymousAuth();
    const adminToken = crypto.randomUUID();
    const adminTokenHash = await sha256(adminToken);
    const { portalId, ref } = await getUniquePortalRef();

    await setDoc(ref, {
      adminTokenHash,
      createdAt: serverTimestamp(),
      organizerUid: user.uid,
      tagline: input.tagline.trim(),
      title: input.title.trim(),
    });

    return {
      portalId,
      title: input.title.trim(),
      tagline: input.tagline.trim(),
      createdAt: new Date().toISOString(),
      adminToken,
      organizerUid: user.uid,
      canEdit: true,
    };
  }

  async updatePortalConfig(
    portalId: string,
    input: PortalConfigInput,
    adminToken?: string,
  ): Promise<PortalConfig> {
    const user = await ensureAnonymousAuth();
    const db = getFirebaseDb();
    const ref = doc(db, "hackathons", portalId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      throw new Error("Hackathon portal not found.");
    }

    const data = snapshot.data() as HackathonDocument;
    const trimmedTitle = input.title.trim();
    const trimmedTagline = input.tagline.trim();
    const isOrganizer = data.organizerUid === user.uid;
    const tokenIsValid = adminToken ? (await sha256(adminToken)) === data.adminTokenHash : false;

    if (!isOrganizer && !tokenIsValid) {
      throw new Error("You do not have permission to update this portal.");
    }

    if (isOrganizer) {
      await updateDoc(ref, {
        title: trimmedTitle,
        tagline: trimmedTagline,
      });
    } else if (adminToken && tokenIsValid) {
      try {
        await updateHackathonConfigViaFunction({
          portalId,
          adminToken,
          title: trimmedTitle,
          tagline: trimmedTagline,
        });
      } catch (error) {
        const message =
          error instanceof FirebaseError && error.code === "functions/not-found"
            ? "Admin recovery requires deploying the updateHackathonConfig Cloud Function."
            : error instanceof FirebaseError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Could not update portal settings.";
        throw new Error(message);
      }
    }

    return mapHackathonDocument(
      portalId,
      {
        ...data,
        title: trimmedTitle,
        tagline: trimmedTagline,
      },
      tokenIsValid ? adminToken : undefined,
      user.uid,
    );
  }

  async getPortalConfig(portalId: string, adminToken?: string): Promise<PortalConfig> {
    const user = await ensureAnonymousAuth();
    const db = getFirebaseDb();
    const snapshot = await getDoc(doc(db, "hackathons", portalId));

    if (!snapshot.exists()) {
      throw new Error("Hackathon portal not found.");
    }

    const data = snapshot.data() as HackathonDocument;
    const tokenIsValid = adminToken ? (await sha256(adminToken)) === data.adminTokenHash : false;

    return mapHackathonDocument(
      portalId,
      data,
      tokenIsValid ? adminToken : undefined,
      user.uid,
    );
  }
}

export const portalConfigService = new PortalConfigService();
