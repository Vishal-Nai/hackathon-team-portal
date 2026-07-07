import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFriendlyError } from "../utils/errors";
import { isFirestoreAdmin } from "./adminAccess";
import { verifyFirestoreAccess } from "./firestoreAccess";
import { getFirebaseAuth } from "./firebase";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();

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

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    if (!user) {
      callback(null);
      return;
    }

    void isFirestoreAdmin(user.email).then((allowed) => {
      if (!allowed) {
        void signOut(getFirebaseAuth());
        callback(null);
        return;
      }
      callback(user);
    });
  });
}
