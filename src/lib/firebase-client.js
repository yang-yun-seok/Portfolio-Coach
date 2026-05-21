import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];

export const firebaseConfigIssues = requiredConfigKeys.filter((key) => !firebaseConfig[key]);
const authFlag = String(import.meta.env.VITE_FIREBASE_AUTH_ENABLED || '').trim().toLowerCase();
const hasRequiredFirebaseConfig = firebaseConfigIssues.length === 0;

export const isFirebaseAuthEnabled = authFlag === 'true' || (authFlag !== 'false' && hasRequiredFirebaseConfig);
export const isFirebaseClientReady = !isFirebaseAuthEnabled || firebaseConfigIssues.length === 0;

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;

if (isFirebaseAuthEnabled && firebaseConfigIssues.length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
  firebaseStorage = getStorage(firebaseApp);
}

export {
  firebaseApp,
  firebaseAuth,
  firebaseDb,
  firebaseStorage,
};
