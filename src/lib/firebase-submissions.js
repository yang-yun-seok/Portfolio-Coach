import {
  isFirebaseAuthEnabled,
  loadFirebaseFirestore,
  loadFirebaseStorage,
} from './firebase-client';
import { rollbackUploadedObjects } from './submission-upload-utils';

const MAX_PORTFOLIO_FILES = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function assertFirebaseSubmissionReady() {
  if (!isFirebaseAuthEnabled) {
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

async function uploadSingleFile({ storageClient, uid, submissionId, file, path, kind, uploadedObjectRefs }) {
  if (!file) return null;
  assertPdfFile(file, kind);
  const objectRef = storageClient.ref(storageClient.storage, `portfolio-submissions/${uid}/${submissionId}/${path}`);
  await storageClient.uploadBytes(objectRef, file, {
    contentType: 'application/pdf',
    customMetadata: {
      submissionKind: kind,
    },
  });
  uploadedObjectRefs.push(objectRef);
  return {
    fileName: file.name,
    storagePath: objectRef.fullPath,
    url: await storageClient.getDownloadURL(objectRef),
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

  const [firestore, storageClient] = await Promise.all([
    loadFirebaseFirestore(),
    loadFirebaseStorage(),
  ]);
  if (!firestore || !storageClient) {
    throw new Error('Firebase 제출 저장소를 준비하지 못했습니다.');
  }

  const submissionsRef = firestore.collection(firestore.db, 'portfolioSubmissions');
  const submissionRef = firestore.doc(submissionsRef);
  const submissionId = submissionRef.id;
  const baseSubmission = {
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
    studentFeedback: '',
    studentFeedbackUpdatedAtIso: '',
    latestAnalysisSummary: results?.profileAnalysis?.summary || '',
    latestRecommendedJobsSnapshot: Array.isArray(recommendedJobs)
      ? recommendedJobs.slice(0, 3).map((job) => ({
        id: job.id,
        company: job.company,
        title: job.title,
        score: job.score || 0,
      }))
      : [],
    createdAt: firestore.serverTimestamp(),
    updatedAt: firestore.serverTimestamp(),
    submittedAtIso: new Date().toISOString(),
    submittedByRole: userProfile?.role || 'user',
    fileCounts: {
      resume: resumeFile ? 1 : 0,
      coverLetter: coverLetterFile ? 1 : 0,
      portfolio: trimmedPortfolioFiles.length,
    },
  };

  const uploadedObjectRefs = [];
  let uploadedResume;
  let uploadedCoverLetter;
  const uploadedPortfolioFiles = [];
  let uploadedFiles;

  try {
    uploadedResume = await uploadSingleFile({
      storageClient,
      uid: authUser.uid,
      submissionId,
      file: resumeFile,
      path: 'resume.pdf',
      kind: 'resume',
      uploadedObjectRefs,
    });
    uploadedCoverLetter = await uploadSingleFile({
      storageClient,
      uid: authUser.uid,
      submissionId,
      file: coverLetterFile,
      path: 'cover-letter.pdf',
      kind: 'cover-letter',
      uploadedObjectRefs,
    });
    for (let index = 0; index < trimmedPortfolioFiles.length; index += 1) {
      const file = trimmedPortfolioFiles[index];
      uploadedPortfolioFiles.push(await uploadSingleFile({
        storageClient,
        uid: authUser.uid,
        submissionId,
        file,
        path: `portfolio-${index + 1}.pdf`,
        kind: 'portfolio',
        uploadedObjectRefs,
      }));
    }

    uploadedFiles = {
      resume: uploadedResume,
      coverLetter: uploadedCoverLetter,
      portfolio: uploadedPortfolioFiles.filter(Boolean),
    };

    await firestore.setDoc(submissionRef, {
      ...baseSubmission,
      files: uploadedFiles,
    });
  } catch (error) {
    await rollbackUploadedObjects(storageClient, uploadedObjectRefs);
    throw error;
  }

  await Promise.allSettled([
    firestore.addDoc(firestore.collection(firestore.db, 'submissionEvents'), {
      submissionId,
      actorId: authUser.uid,
      actorRole: userProfile?.role || 'user',
      type: 'submitted',
      note: '사용자 제출 생성',
      createdAt: firestore.serverTimestamp(),
    }),
    firestore.addDoc(firestore.collection(firestore.db, 'submissionEvents'), {
      submissionId,
      actorId: authUser.uid,
      actorRole: userProfile?.role || 'user',
      type: 'files_uploaded',
      note: `이력서 ${uploadedResume ? 1 : 0}, 자기소개서 ${uploadedCoverLetter ? 1 : 0}, 포트폴리오 ${uploadedPortfolioFiles.length}`,
      createdAt: firestore.serverTimestamp(),
    }),
  ]);

  return {
    id: submissionId,
    resumeFile: uploadedFiles.resume,
    coverLetterFile: uploadedFiles.coverLetter,
    portfolioFiles: uploadedFiles.portfolio,
  };
}
