import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFriendlyError } from "../utils/errors";
import { isFirestoreAdmin } from "./adminAccess";
import { verifyFirestoreAccess } from "./firestoreAccess";
import { getFirebaseAuth } from "./firebase";

const googleProvider = new GoogleAuthProvider();

export type AuthRole = "admin" | "judge" | null;

export interface AuthState {
  user: User | null;
  role: AuthRole;
  resolving: boolean;
}

export function clearJudgeSessionStorage(): void {
  sessionStorage.removeItem("judgeSession");
}

export function clearVolunteerSessionStorage(): void {
  sessionStorage.removeItem("volunteerSession");
}

export function clearPortalSessionStorage(): void {
  clearJudgeSessionStorage();
  clearVolunteerSessionStorage();
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  clearPortalSessionStorage();

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const access = await verifyFirestoreAccess(user.email);
    if (!access.ok) {
      await signOut(auth);
      throw new Error(access.message);
    }

    return user;
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new Error(getFriendlyError(error));
    }
    throw error;
  }
}

export async function signInAsJudge(options?: { forceFresh?: boolean }): Promise<User> {
  const auth = getFirebaseAuth();

  try {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      await signOut(auth);
    } else if (options?.forceFresh && auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }

    if (auth.currentUser?.isAnonymous) {
      return auth.currentUser;
    }

    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new Error(getFriendlyError(error));
    }
    throw error;
  }
}

/** Anonymous Firebase auth for volunteer portal (same provider as judges). */
export async function signInAsVolunteer(options?: { forceFresh?: boolean }): Promise<User> {
  return signInAsJudge(options);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuth(callback: (state: AuthState) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    if (!user) {
      callback({ user: null, role: null, resolving: false });
      return;
    }

    if (user.isAnonymous) {
      callback({ user, role: "judge", resolving: false });
      return;
    }

    callback({ user: null, role: null, resolving: true });

    void isFirestoreAdmin(user.email).then((allowed) => {
      if (!allowed) {
        void signOut(getFirebaseAuth());
        callback({ user: null, role: null, resolving: false });
        return;
      }
      callback({ user, role: "admin", resolving: false });
    });
  });
}
