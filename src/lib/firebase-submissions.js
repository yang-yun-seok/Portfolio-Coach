import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { firebaseDb, firebaseStorage, isFirebaseAuthEnabled } from './firebase-client';

const MAX_PORTFOLIO_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function assertFirebaseSubmissionReady() {
  if (!isFirebaseAuthEnabled || !firebaseDb || !firebaseStorage) {
    throw new Error('Firebase 제출 기능이 아직 활성화되지 않았습니다.');
  }
}

function assertPdfFile(file, label) {
  if (!file) return;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${label} 파일은 10MB 이하만 업로드할 수 있습니다.`);
  }
  if (!String(file.type || '').includes('pdf') && !String(file.name || '').toLowerCase().endsWith('.pdf')) {
    throw new Error(`${label} 파일은 PDF만 허용합니다.`);
  }
}

async function uploadSingleFile({ uid, submissionId, file, path, kind }) {
  if (!file) return null;
  assertPdfFile(file, kind);
  const objectRef = ref(firebaseStorage, `portfolio-submissions/${uid}/${submissionId}/${path}`);
  await uploadBytes(objectRef, file, {
    contentType: 'application/pdf',
    customMetadata: {
      submissionKind: kind,
    },
  });
  return {
    fileName: file.name,
    storagePath: objectRef.fullPath,
    url: await getDownloadURL(objectRef),
    size: file.size,
    type: file.type || 'application/pdf',
  };
}

export async function createPortfolioSubmission({
  authUser,
  userProfile,
  userInfo,
  resumeFile,
  coverLetterFile,
  portfolioFiles,
  results,
  recommendedJobs,
}) {
  assertFirebaseSubmissionReady();

  if (!authUser?.uid) {
    throw new Error('로그인 정보가 없습니다.');
  }

  if (!userInfo?.name?.trim()) {
    throw new Error('제출 전에 지원자 이름을 입력해 주세요.');
  }

  if (!resumeFile && !coverLetterFile && (!Array.isArray(portfolioFiles) || portfolioFiles.length === 0)) {
    throw new Error('제출할 파일이 없습니다. 이력서, 자기소개서, 포트폴리오 중 하나 이상이 필요합니다.');
  }

  const trimmedPortfolioFiles = Array.isArray(portfolioFiles) ? portfolioFiles.slice(0, MAX_PORTFOLIO_FILES) : [];
  trimmedPortfolioFiles.forEach((file) => assertPdfFile(file, '포트폴리오'));
  assertPdfFile(resumeFile, '이력서');
  assertPdfFile(coverLetterFile, '자기소개서');
  const accountDisplayName = userProfile?.studentName || userProfile?.displayName || authUser.displayName || '';

  const submissionsRef = collection(firebaseDb, 'portfolioSubmissions');
  const submissionRef = await addDoc(submissionsRef, {
    userId: authUser.uid,
    userEmail: authUser.email || '',
    userDisplayName: accountDisplayName,
    accountStudentName: userProfile?.studentName || accountDisplayName,
    applicantName: userInfo.name.trim(),
    track: userInfo.roleGroup,
    subRole: userInfo.subRole,
    experience: Number(userInfo.experience) || 0,
    title: `${userInfo.name.trim()} 제출`,
    summary: '포트폴리오 및 지원 서류 제출',
    skills: Array.isArray(userInfo.skills) ? userInfo.skills : [],
    githubUrl: userInfo.githubUrl || '',
    status: 'submitted',
    adminMemo: '',
    latestAnalysisSummary: results?.profileAnalysis?.summary || '',
    latestRecommendedJobsSnapshot: Array.isArray(recommendedJobs)
      ? recommendedJobs.slice(0, 3).map((job) => ({
        id: job.id,
        company: job.company,
        title: job.title,
        score: job.score || 0,
      }))
      : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAtIso: new Date().toISOString(),
    submittedByRole: userProfile?.role || 'user',
    fileCounts: {
      resume: resumeFile ? 1 : 0,
      coverLetter: coverLetterFile ? 1 : 0,
      portfolio: trimmedPortfolioFiles.length,
    },
  });

  const submissionId = submissionRef.id;
  const uploadedResume = await uploadSingleFile({
    uid: authUser.uid,
    submissionId,
    file: resumeFile,
    path: 'resume.pdf',
    kind: 'resume',
  });
  const uploadedCoverLetter = await uploadSingleFile({
    uid: authUser.uid,
    submissionId,
    file: coverLetterFile,
    path: 'cover-letter.pdf',
    kind: 'cover-letter',
  });
  const uploadedPortfolioFiles = [];
  for (let index = 0; index < trimmedPortfolioFiles.length; index += 1) {
    const file = trimmedPortfolioFiles[index];
    uploadedPortfolioFiles.push(await uploadSingleFile({
      uid: authUser.uid,
      submissionId,
      file,
      path: `portfolio-${index + 1}.pdf`,
      kind: 'portfolio',
    }));
  }

  await addDoc(collection(firebaseDb, 'submissionEvents'), {
    submissionId,
    actorId: authUser.uid,
    actorRole: userProfile?.role || 'user',
    type: 'submitted',
    note: '사용자 제출 생성',
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(firebaseDb, 'submissionEvents'), {
    submissionId,
    actorId: authUser.uid,
    actorRole: userProfile?.role || 'user',
    type: 'files_uploaded',
    note: `이력서 ${uploadedResume ? 1 : 0}, 자기소개서 ${uploadedCoverLetter ? 1 : 0}, 포트폴리오 ${uploadedPortfolioFiles.length}`,
    createdAt: serverTimestamp(),
  });

  return {
    id: submissionId,
    resumeFile: uploadedResume,
    coverLetterFile: uploadedCoverLetter,
    portfolioFiles: uploadedPortfolioFiles.filter(Boolean),
  };
}

export async function listMyPortfolioSubmissions(uid) {
  assertFirebaseSubmissionReady();
  if (!uid) return [];

  const q = query(
    collection(firebaseDb, 'portfolioSubmissions'),
    where('userId', '==', uid),
    limit(20),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .sort((left, right) => {
      const leftTime = new Date(left.submittedAtIso || left.createdAt?.toDate?.() || 0).getTime();
      const rightTime = new Date(right.submittedAtIso || right.createdAt?.toDate?.() || 0).getTime();
      return rightTime - leftTime;
    });
}
