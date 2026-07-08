import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { appConfig } from "../constants/config";

const firebaseConfig = appConfig.firebase;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

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
