// Optional local fallback config. The file is git-ignored and may not exist in all
// environments; when present it is merged under VITE_FIREBASE_* env vars.
const jsonModules = import.meta.glob('../../firebase-applet-config.json', {
  eager: true,
  import: 'default',
}) as Record<string, any>;

const defaultConfig: any = Object.values(jsonModules)[0] ?? {};

export function getFirebaseConfig() {
  const env = (import.meta.env || {}) as Record<string, string | undefined>;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId;
  const apiKey = env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain;
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket;
  const firestoreDatabaseId = env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || defaultConfig.firestoreDatabaseId || "";
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId || "";
  const appId = env.VITE_FIREBASE_APP_ID || defaultConfig.appId || "";
  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId || "";
  const oAuthClientId = env.VITE_FIREBASE_OAUTH_CLIENT_ID || defaultConfig.oAuthClientId || "";
  const recaptchaSiteKey = env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || defaultConfig.recaptchaSiteKey || "";

  if (!projectId || !apiKey) {
    throw new Error("Missing required Firebase configuration (VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_API_KEY or firebase-applet-config.json)");
  }

  return {
    projectId,
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
    firestoreDatabaseId,
    messagingSenderId,
    appId,
    measurementId,
    oAuthClientId,
    recaptchaSiteKey,
  };
}

