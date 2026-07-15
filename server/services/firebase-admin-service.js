import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

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

function isValidFirestoreDocumentId(value) {
  return Boolean(value)
    && !value.includes('/')
    && value !== '.'
    && value !== '..'
    && !/^__.*__$/.test(value);
}

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeSubmissionFile(file) {
  if (!file || typeof file !== 'object' || Array.isArray(file)) return null;
  return {
    fileName: String(file.fileName || ''),
    storagePath: String(file.storagePath || ''),
    size: Number(file.size) || 0,
    type: String(file.type || 'application/pdf'),
  };
}

export function sanitizeSubmissionFiles(files = {}) {
  const portfolio = Array.isArray(files?.portfolio)
    ? files.portfolio.slice(0, 5).map(sanitizeSubmissionFile).filter(Boolean)
    : [];
  return {
    resume: sanitizeSubmissionFile(files?.resume),
    coverLetter: sanitizeSubmissionFile(files?.coverLetter),
    portfolio,
  };
}

export function resolveSubmissionFileDescriptor({ submissionId, submission, fileKey }) {
  const normalizedSubmissionId = String(submissionId || '').trim();
  if (!isValidFirestoreDocumentId(normalizedSubmissionId)) {
    throw createServiceError('올바른 제출 ID가 필요합니다.', 400);
  }

  const normalizedFileKey = String(fileKey || '').trim();
  const files = sanitizeSubmissionFiles(submission?.files);
  let descriptor;
  let objectName;

  if (normalizedFileKey === 'resume') {
    descriptor = files.resume;
    objectName = 'resume.pdf';
  } else if (normalizedFileKey === 'coverLetter') {
    descriptor = files.coverLetter;
    objectName = 'cover-letter.pdf';
  } else {
    const portfolioMatch = normalizedFileKey.match(/^portfolio-([1-5])$/);
    if (!portfolioMatch) {
      throw createServiceError('지원하지 않는 제출 파일입니다.', 400);
    }
    const portfolioIndex = Number(portfolioMatch[1]) - 1;
    descriptor = files.portfolio[portfolioIndex] || null;
    objectName = `portfolio-${portfolioIndex + 1}.pdf`;
  }

  if (!descriptor) {
    throw createServiceError('제출 파일을 찾을 수 없습니다.', 404);
  }

  const userId = String(submission?.userId || '').trim();
  const expectedPath = `portfolio-submissions/${userId}/${normalizedSubmissionId}/${objectName}`;
  if (!isValidFirestoreDocumentId(userId) || descriptor.storagePath !== expectedPath) {
    throw createServiceError('제출 파일 경로가 올바르지 않습니다.', 409);
  }

  return descriptor;
}

function serializeSubmissionDoc(entry) {
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
    files: sanitizeSubmissionFiles(data.files),
    studentFeedback: data.studentFeedback || '',
    studentFeedbackUpdatedAtIso: data.studentFeedbackUpdatedAtIso || '',
    adminMemo: data.adminMemo || '',
    reviewUpdatedAtIso: data.reviewUpdatedAtIso || '',
    reviewedAtIso: data.reviewedAtIso || '',
    reviewedBy: data.reviewedBy || '',
    reviewedByEmail: data.reviewedByEmail || '',
  };
}

function serializeStudentSubmissionDoc(entry) {
  const data = serializeFirestoreValue(entry.data()) || {};
  return {
    id: entry.id,
    userId: data.userId || '',
    userEmail: data.userEmail || '',
    userDisplayName: data.userDisplayName || '',
    accountStudentName: data.accountStudentName || '',
    applicantName: data.applicantName || '',
    track: data.track || '',
    subRole: data.subRole || '',
    title: data.title || '',
    summary: data.summary || '',
    status: data.status || 'submitted',
    submittedAtIso: data.submittedAtIso || data.createdAt || '',
    fileCounts: data.fileCounts || { resume: 0, coverLetter: 0, portfolio: 0 },
    studentFeedback: data.studentFeedback || '',
    studentFeedbackUpdatedAtIso: data.studentFeedbackUpdatedAtIso || '',
    reviewUpdatedAtIso: data.reviewUpdatedAtIso || '',
    reviewedAtIso: data.reviewedAtIso || '',
  };
}

function serializeUserDoc(entry) {
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
    updatedAt: data.updatedAt || '',
  };
}

export function assertAdminUserAccessChange({ active, actorUid, targetUid, targetRole }) {
  if (typeof active !== 'boolean') {
    const error = new Error('계정 상태는 불리언 값이어야 합니다.');
    error.statusCode = 400;
    throw error;
  }
  if (targetUid === actorUid) {
    const error = new Error('현재 로그인한 관리자 계정은 중지할 수 없습니다.');
    error.statusCode = 409;
    throw error;
  }
  if (targetRole === 'admin') {
    const error = new Error('관리자 계정 상태는 이 화면에서 변경할 수 없습니다.');
    error.statusCode = 409;
    throw error;
  }
}

export function verifyFirebaseIdToken(auth, idToken, { checkRevoked = false } = {}) {
  if (!auth) throw new Error('Firebase Admin Auth is not configured.');
  return auth.verifyIdToken(idToken, checkRevoked);
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

  async function verifyIdToken(idToken, { checkRevoked = false } = {}) {
    if (!authRequired && !checkRevoked) return null;
    if (!auth || !configReady) {
      throw new Error(initError || 'Firebase Admin is not configured.');
    }
    return verifyFirebaseIdToken(auth, idToken, { checkRevoked });
  }

  async function getUserAccess(uid) {
    const firestore = requireFirestore();
    if (!uid) throw new Error('Authenticated user ID is missing.');
    const snapshot = await firestore.collection('users').doc(uid).get();
    if (!snapshot.exists) return { role: 'user', active: true };
    const data = snapshot.data() || {};
    return {
      role: data.role || 'user',
      active: data.active !== false,
    };
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
    return snapshot.docs.map(serializeUserDoc);
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
      .map(serializeSubmissionDoc)
      .sort(sortBySubmittedAtDesc);
  }

  async function listUserSubmissions({ uid, limit = 20 } = {}) {
    const firestore = requireFirestore();
    if (!uid) return [];
    const submissionsRef = firestore.collection('portfolioSubmissions');
    let snapshot;

    try {
      snapshot = await submissionsRef
        .where('userId', '==', uid)
        .orderBy('submittedAtIso', 'desc')
        .limit(limit)
        .get();
    } catch {
      snapshot = await submissionsRef
        .where('userId', '==', uid)
        .limit(limit)
        .get();
    }

    return snapshot.docs
      .map(serializeStudentSubmissionDoc)
      .sort(sortBySubmittedAtDesc);
  }

  function createSubmissionId() {
    return requireFirestore().collection('portfolioSubmissions').doc().id;
  }

  async function createPortfolioSubmission({ submissionId, authUser, payload, files }) {
    const firestore = requireFirestore();
    const normalizedSubmissionId = String(submissionId || '').trim();
    if (!isValidFirestoreDocumentId(normalizedSubmissionId)) {
      throw createServiceError('올바른 제출 ID가 필요합니다.', 400);
    }
    if (!authUser?.uid || !isValidFirestoreDocumentId(authUser.uid)) {
      throw createServiceError('로그인 정보가 올바르지 않습니다.', 401);
    }

    const userSnapshot = await firestore.collection('users').doc(authUser.uid).get();
    const userProfile = userSnapshot.exists ? serializeUserDoc(userSnapshot) : null;
    const accountDisplayName = userProfile?.studentName
      || userProfile?.displayName
      || payload.applicantName;
    const submittedAtIso = new Date().toISOString();
    const submissionRef = firestore.collection('portfolioSubmissions').doc(normalizedSubmissionId);
    const submittedEventRef = firestore.collection('submissionEvents').doc();
    const filesEventRef = firestore.collection('submissionEvents').doc();
    const fileCounts = {
      resume: files.resume ? 1 : 0,
      coverLetter: files.coverLetter ? 1 : 0,
      portfolio: Array.isArray(files.portfolio) ? files.portfolio.length : 0,
    };
    const submission = {
      userId: authUser.uid,
      userEmail: authUser.email || userProfile?.email || '',
      userDisplayName: accountDisplayName,
      accountStudentName: userProfile?.studentName || accountDisplayName,
      applicantName: payload.applicantName,
      track: payload.track,
      subRole: payload.subRole,
      experience: payload.experience,
      title: `${payload.applicantName} 제출`,
      summary: '포트폴리오 및 지원 서류 제출',
      skills: payload.skills,
      githubUrl: payload.githubUrl,
      status: 'submitted',
      adminMemo: '',
      studentFeedback: '',
      studentFeedbackUpdatedAtIso: '',
      latestAnalysisSummary: payload.latestAnalysisSummary,
      latestRecommendedJobsSnapshot: payload.latestRecommendedJobsSnapshot,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      submittedAtIso,
      submittedByRole: authUser.role || 'user',
      fileCounts,
      files: sanitizeSubmissionFiles(files),
    };

    const batch = firestore.batch();
    batch.create(submissionRef, submission);
    batch.create(submittedEventRef, {
      submissionId: normalizedSubmissionId,
      actorId: authUser.uid,
      actorRole: authUser.role || 'user',
      type: 'submitted',
      note: '사용자 제출 생성',
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: submittedAtIso,
    });
    batch.create(filesEventRef, {
      submissionId: normalizedSubmissionId,
      actorId: authUser.uid,
      actorRole: authUser.role || 'user',
      type: 'files_uploaded',
      note: `이력서 ${fileCounts.resume}, 자기소개서 ${fileCounts.coverLetter}, 포트폴리오 ${fileCounts.portfolio}`,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: submittedAtIso,
    });
    await batch.commit();

    const snapshot = await submissionRef.get();
    return serializeSubmissionDoc(snapshot);
  }

  async function getAdminSubmissionFileDescriptor({ submissionId, fileKey }) {
    const firestore = requireFirestore();
    const normalizedSubmissionId = String(submissionId || '').trim();
    if (!isValidFirestoreDocumentId(normalizedSubmissionId)) {
      throw createServiceError('올바른 제출 ID가 필요합니다.', 400);
    }

    const snapshot = await firestore.collection('portfolioSubmissions').doc(normalizedSubmissionId).get();
    if (!snapshot.exists) {
      throw createServiceError('제출 내역을 찾을 수 없습니다.', 404);
    }

    const descriptor = resolveSubmissionFileDescriptor({
      submissionId: normalizedSubmissionId,
      submission: snapshot.data() || {},
      fileKey,
    });
    return {
      ...descriptor,
      fileName: descriptor.fileName || 'submission.pdf',
    };
  }

  async function updateAdminSubmissionReview({
    submissionId,
    status,
    adminMemo,
    studentFeedback,
    actor,
  }) {
    const firestore = requireFirestore();
    const normalizedSubmissionId = String(submissionId || '').trim();
    if (!isValidFirestoreDocumentId(normalizedSubmissionId)) {
      const error = new Error('올바른 제출 ID가 필요합니다.');
      error.statusCode = 400;
      throw error;
    }

    const submissionRef = firestore.collection('portfolioSubmissions').doc(normalizedSubmissionId);
    const snapshot = await submissionRef.get();
    if (!snapshot.exists) {
      const error = new Error('제출 내역을 찾을 수 없습니다.');
      error.statusCode = 404;
      throw error;
    }

    const nowIso = new Date().toISOString();
    const patch = {
      updatedAt: FieldValue.serverTimestamp(),
      reviewUpdatedAtIso: nowIso,
      reviewedBy: actor?.uid || '',
      reviewedByEmail: actor?.email || '',
    };

    if (status !== undefined) {
      patch.status = status;
      if (status === 'reviewed') {
        patch.reviewedAtIso = nowIso;
      }
    }

    if (adminMemo !== undefined) {
      patch.adminMemo = adminMemo;
    }

    if (studentFeedback !== undefined) {
      patch.studentFeedback = studentFeedback;
      patch.studentFeedbackUpdatedAtIso = nowIso;
    }

    await submissionRef.set(patch, { merge: true });
    await firestore.collection('submissionEvents').add({
      submissionId: normalizedSubmissionId,
      actorId: actor?.uid || '',
      actorEmail: actor?.email || '',
      actorRole: 'admin',
      type: 'admin_review_updated',
      note: status ? `관리자 상태 변경: ${status}` : '검토 정보 변경',
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
    });

    const updatedSnapshot = await submissionRef.get();
    return serializeSubmissionDoc(updatedSnapshot);
  }

  async function updateAdminUserAccess({ uid, active, actor }) {
    const firestore = requireFirestore();
    const normalizedUid = String(uid || '').trim();
    if (!isValidFirestoreDocumentId(normalizedUid)) {
      const error = new Error('올바른 사용자 ID가 필요합니다.');
      error.statusCode = 400;
      throw error;
    }

    const userRef = firestore.collection('users').doc(normalizedUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      const error = new Error('사용자 계정을 찾을 수 없습니다.');
      error.statusCode = 404;
      throw error;
    }

    const currentUser = snapshot.data() || {};
    assertAdminUserAccessChange({
      active,
      actorUid: actor?.uid || '',
      targetUid: normalizedUid,
      targetRole: currentUser.role || 'user',
    });

    const nowIso = new Date().toISOString();
    const eventRef = firestore.collection('userAccessEvents').doc();
    const batch = firestore.batch();
    batch.set(userRef, {
      active,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(eventRef, {
      userId: normalizedUid,
      active,
      actorId: actor?.uid || '',
      actorEmail: actor?.email || '',
      type: active ? 'account_reactivated' : 'account_deactivated',
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
    });
    await batch.commit();

    if (!active && auth) {
      try {
        await auth.revokeRefreshTokens(normalizedUid);
      } catch (error) {
        console.warn(`[Firebase Admin] Failed to revoke tokens for ${normalizedUid}: ${error.message}`);
      }
    }

    const updatedSnapshot = await userRef.get();
    return serializeUserDoc(updatedSnapshot);
  }

  return {
    authRequired,
    configReady,
    initError,
    canVerifyTokens: Boolean(auth && configReady),
    verifyIdToken,
    getUserAccess,
    listAdminUsers,
    listAdminSubmissions,
    listUserSubmissions,
    createSubmissionId,
    createPortfolioSubmission,
    getAdminSubmissionFileDescriptor,
    updateAdminSubmissionReview,
    updateAdminUserAccess,
  };
}
