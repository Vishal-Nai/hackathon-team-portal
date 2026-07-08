export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? "Hackathon Admin Portal",
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  },
  firebaseAppCheckSiteKey: import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY ?? "",
  firebaseAppCheckDebugToken: import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN ?? "",
};
