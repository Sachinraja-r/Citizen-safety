import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth, UserCredential } from 'firebase/auth';

const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'AIzaSyC41d7lrf5z42qVURYZOEFMSLomnTLS4W8'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'safety-citizens.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'safety-citizens'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'safety-citizens.firebasestorage.app'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '194299394748'),
  appId: getEnv('VITE_FIREBASE_APP_ID', '1:194299394748:web:8c037c992034678437eeb9'),
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes('your-api-key')
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (isFirebaseConfigured()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
}

export { auth, googleProvider };

export const signInWithFirebaseGoogle = async (): Promise<{ user: UserCredential['user'] | null; error: Error | null }> => {
  if (!isFirebaseConfigured() || !auth) {
    return {
      user: null,
      error: new Error('Firebase is not yet configured. Please supply VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment variables.'),
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (err: unknown) {
    return { user: null, error: err as Error };
  }
};
