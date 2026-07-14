import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyDczghe5VLmhp9wFKKZZVzZOWO196B1jmE',
  authDomain: 'portfolio-coach-92074.firebaseapp.com',
  projectId: 'portfolio-coach-92074',
  storageBucket: 'portfolio-coach-92074.firebasestorage.app',
  messagingSenderId: '392407025745',
  appId: '1:392407025745:web:9e918b517c29b306c51070',
  measurementId: 'G-VGG1KH4L93',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
};

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];

export const firebaseConfigIssues = requiredConfigKeys.filter((key) => !firebaseConfig[key]);
const authFlag = String(import.meta.env.VITE_FIREBASE_AUTH_ENABLED || '').trim().toLowerCase();
const hasRequiredFirebaseConfig = firebaseConfigIssues.length === 0;

export const isFirebaseAuthEnabled = authFlag === 'true' || (authFlag !== 'false' && hasRequiredFirebaseConfig);
export const isFirebaseClientReady = !isFirebaseAuthEnabled || firebaseConfigIssues.length === 0;

let firebaseApp = null;
let firebaseAuth = null;
let firestoreClientPromise = null;
let storageClientPromise = null;

if (isFirebaseAuthEnabled && firebaseConfigIssues.length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
}

export async function loadFirebaseFirestore() {
  if (!firebaseApp) return null;
  if (!firestoreClientPromise) {
    firestoreClientPromise = import('firebase/firestore')
      .then((firestore) => ({
        addDoc: firestore.addDoc,
        collection: firestore.collection,
        db: firestore.getFirestore(firebaseApp),
        doc: firestore.doc,
        getDoc: firestore.getDoc,
        serverTimestamp: firestore.serverTimestamp,
        setDoc: firestore.setDoc,
      }))
      .catch((error) => {
        firestoreClientPromise = null;
        throw error;
      });
  }
  return firestoreClientPromise;
}

export async function loadFirebaseStorage() {
  if (!firebaseApp) return null;
  if (!storageClientPromise) {
    storageClientPromise = import('firebase/storage')
      .then((storageModule) => ({
        getDownloadURL: storageModule.getDownloadURL,
        ref: storageModule.ref,
        storage: storageModule.getStorage(firebaseApp),
        uploadBytes: storageModule.uploadBytes,
      }))
      .catch((error) => {
        storageClientPromise = null;
        throw error;
      });
  }
  return storageClientPromise;
}

export {
  firebaseAuth,
};
