import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PRIVATE_KEY_BEGIN = '-----BEGIN PRIVATE KEY-----';
const PRIVATE_KEY_END = '-----END PRIVATE KEY-----';

function stripWrappingQuotes(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function decodeBase64Pem(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.includes(PRIVATE_KEY_BEGIN)) return trimmed;

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8').trim();
    return decoded.includes(PRIVATE_KEY_BEGIN) ? decoded : trimmed;
  } catch {
    return trimmed;
  }
}

function formatPemPrivateKey(value) {
  if (!value.includes(PRIVATE_KEY_BEGIN) || !value.includes(PRIVATE_KEY_END)) {
    return value;
  }

  const body = value
    .replace(PRIVATE_KEY_BEGIN, '')
    .replace(PRIVATE_KEY_END, '')
    .replace(/\s+/g, '');

  if (!body) return value;

  const lines = body.match(/.{1,64}/g) || [];
  return `${PRIVATE_KEY_BEGIN}\n${lines.join('\n')}\n${PRIVATE_KEY_END}\n`;
}

export function normalizePrivateKey(value = '') {
  const decoded = decodeBase64Pem(stripWrappingQuotes(value));
  const normalized = decoded
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  return formatPemPrivateKey(normalized);
}

function parseServiceAccountJson(rawValue) {
  const value = stripWrappingQuotes(rawValue);
  if (!value) return null;

  const candidates = [value];
  try {
    candidates.push(Buffer.from(value, 'base64').toString('utf-8'));
  } catch {
    // Ignore invalid base64 candidates.
  }

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('{')) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function loadServiceAccountFromEnv() {
  return parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    || parseServiceAccountJson(process.env.FIREBASE_ADMIN_CREDENTIALS)
    || parseServiceAccountJson(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
}

function buildFirebaseConfig() {
  const serviceAccount = loadServiceAccountFromEnv() || {};
  const envPrivateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');
  const serviceAccountPrivateKey = normalizePrivateKey(serviceAccount.private_key || serviceAccount.privateKey || '');
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || serviceAccount.projectId || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || serviceAccount.client_email || serviceAccount.clientEmail || '',
    privateKey: envPrivateKey || serviceAccountPrivateKey,
    privateKeyCandidates: [...new Set([envPrivateKey, serviceAccountPrivateKey].filter(Boolean))],
  };
}

function serializeFirestoreValue(value) {
  if (value == null) return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeFirestoreValue(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeFirestoreValue(entryValue)]),
    );
  }
  return value;
}

function sortBySubmittedAtDesc(left, right) {
  const leftTime = new Date(left.submittedAtIso || left.createdAt || 0).getTime();
  const rightTime = new Date(right.submittedAtIso || right.createdAt || 0).getTime();
  return rightTime - leftTime;
}

export function createFirebaseAdminService() {
  const authRequired = process.env.FIREBASE_AUTH_REQUIRED === 'true';
  const config = buildFirebaseConfig();
  let configReady = Boolean(config.projectId && config.clientEmail && config.privateKeyCandidates.length > 0);
  let initError = '';
  let auth = null;
  let db = null;

  if (configReady) {
    for (const privateKey of config.privateKeyCandidates) {
      try {
        const app = getApps()[0] || initializeApp({
          credential: cert({
            projectId: config.projectId,
            clientEmail: config.clientEmail,
            privateKey,
          }),
          projectId: config.projectId,
        });
        auth = getAuth(app);
        db = getFirestore(app);
        initError = '';
        break;
      } catch (error) {
        initError = error.message || 'Firebase Admin initialization failed.';
      }
    }

    if (!auth || !db) {
      configReady = false;
      console.error(`[Firebase Admin] Initialization failed: ${initError}`);
    }
  }

  async function verifyIdToken(idToken, { force = false } = {}) {
    if (!authRequired && !force) return null;
    if (!auth || !configReady) {
      throw new Error(initError || 'Firebase Admin is not configured.');
    }
    return auth.verifyIdToken(idToken);
  }

  async function getUserRole(uid) {
    if (!db || !uid) return 'user';
    const snapshot = await db.collection('users').doc(uid).get();
    return snapshot.exists ? snapshot.data()?.role || 'user' : 'user';
  }

  function requireFirestore() {
    if (!db || !configReady) {
      throw new Error(initError || 'Firebase Admin Firestore is not configured.');
    }
    return db;
  }

  async function listAdminUsers({ limit = 200 } = {}) {
    const firestore = requireFirestore();
    const snapshot = await firestore.collection('users').limit(limit).get();
    return snapshot.docs.map((entry) => {
      const data = serializeFirestoreValue(entry.data()) || {};
      return {
        id: entry.id,
        uid: entry.id,
        email: data.email || '',
        studentName: data.studentName || '',
        displayName: data.displayName || '',
        role: data.role || 'user',
        active: data.active !== false,
        trackDefault: data.trackDefault || '',
        createdAt: data.createdAt || '',
        lastLoginAt: data.lastLoginAt || '',
        nameUpdatedAt: data.nameUpdatedAt || '',
        authProvider: data.authProvider || '',
      };
    });
  }

  async function listAdminSubmissions({ limit = 100 } = {}) {
    const firestore = requireFirestore();
    const submissionsRef = firestore.collection('portfolioSubmissions');
    let snapshot;

    try {
      snapshot = await submissionsRef.orderBy('submittedAtIso', 'desc').limit(limit).get();
    } catch {
      snapshot = await submissionsRef.limit(limit).get();
    }

    return snapshot.docs
      .map((entry) => {
        const data = serializeFirestoreValue(entry.data()) || {};
        return {
          id: entry.id,
          ...data,
          status: data.status || 'submitted',
          userId: data.userId || '',
          userEmail: data.userEmail || '',
          userDisplayName: data.userDisplayName || '',
          accountStudentName: data.accountStudentName || '',
          applicantName: data.applicantName || '',
          track: data.track || '',
          subRole: data.subRole || '',
          submittedAtIso: data.submittedAtIso || data.createdAt || '',
          fileCounts: data.fileCounts || { resume: 0, coverLetter: 0, portfolio: 0 },
          files: data.files || { resume: null, coverLetter: null, portfolio: [] },
        };
      })
      .sort(sortBySubmittedAtDesc);
  }

  return {
    authRequired,
    configReady,
    initError,
    canVerifyTokens: Boolean(auth && configReady),
    verifyIdToken,
    getUserRole,
    listAdminUsers,
    listAdminSubmissions,
  };
}
