import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import { appConfig } from "../constants/config";

const firebaseConfig = appConfig.firebase;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let functions: Functions | undefined;
let authReadyPromise: Promise<User> | undefined;

function getFirebaseApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase is not configured. Add your Vite Firebase environment variables.");
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    initializeAppCheckIfConfigured(app);
  }

  return app;
}

function initializeAppCheckIfConfigured(firebaseApp: FirebaseApp) {
  const siteKey = appConfig.firebaseAppCheckSiteKey;
  if (!siteKey) {
    return;
  }

  if (import.meta.env.DEV && appConfig.firebaseAppCheckDebugToken) {
    (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      appConfig.firebaseAppCheckDebugToken;
  }

  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export function getFirebaseAuth() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
}

export function getFirebaseDb() {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }

  return firestore;
}

export function getFirebaseFunctions() {
  if (!functions) {
    functions = getFunctions(getFirebaseApp());
  }

  return functions;
}

export async function ensureAnonymousAuth() {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  if (!authReadyPromise) {
    authReadyPromise = signInAnonymously(firebaseAuth).then((credential) => credential.user);
  }

  return authReadyPromise;
}

interface UpdateHackathonConfigRequest {
  portalId: string;
  adminToken: string;
  title: string;
  tagline: string;
}

export async function updateHackathonConfigViaFunction(input: UpdateHackathonConfigRequest) {
  const callable = httpsCallable<UpdateHackathonConfigRequest, { ok: boolean }>(
    getFirebaseFunctions(),
    "updateHackathonConfig",
  );
  await callable(input);
}
