import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function normalizePrivateKey(value = '') {
  return String(value).replace(/\\n/g, '\n');
}

export function createFirebaseAdminService() {
  const authRequired = process.env.FIREBASE_AUTH_REQUIRED === 'true';
  const config = {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || ''),
  };

  const configReady = Boolean(config.projectId && config.clientEmail && config.privateKey);
  let auth = null;
  let db = null;

  if (authRequired && configReady) {
    const app = getApps()[0] || initializeApp({
      credential: cert(config),
      projectId: config.projectId,
    });
    auth = getAuth(app);
    db = getFirestore(app);
  }

  async function verifyIdToken(idToken) {
    if (!authRequired) return null;
    if (!auth || !configReady) {
      throw new Error('Firebase Admin 설정이 완료되지 않았습니다.');
    }
    return auth.verifyIdToken(idToken);
  }

  async function getUserRole(uid) {
    if (!db || !uid) return 'user';
    const snapshot = await db.collection('users').doc(uid).get();
    return snapshot.exists ? snapshot.data()?.role || 'user' : 'user';
  }

  return {
    authRequired,
    configReady,
    verifyIdToken,
    getUserRole,
  };
}

