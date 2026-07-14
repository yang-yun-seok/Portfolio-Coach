import { useCallback } from 'react';
import { parseInstructorMd } from '../components/InstructorFeedbackForm';
import { getProfileDisplayRole, normalizeUserProfile } from '../data/skills';
import { analyzeGitHubPortfolio } from '../lib/github-analyzer';
import { analyzeViaProxy, requestInstructorDraft } from '../lib/gemini-client';
import { MAX_SUBMISSION_FILE_SIZE_BYTES } from '../lib/submission-files';

function buildLocalGitHubPortfolioAnalysis(githubPortfolio) {
  if (!githubPortfolio) return null;

  const stack = Array.isArray(githubPortfolio.topLanguages) && githubPortfolio.topLanguages.length > 0
    ? githubPortfolio.topLanguages.map((language) => `${language.name}${language.share ? ` (${language.share})` : ''}`)
    : (githubPortfolio.languages || []).slice(0, 6);

  const projectHighlights = Array.isArray(githubPortfolio.projectHighlights) && githubPortfolio.projectHighlights.length > 0
    ? githubPortfolio.projectHighlights
    : [
      githubPortfolio.readme
        ? 'README에서 프로젝트 목적과 구조가 드러나면 지원자가 문제 정의를 설명하기 쉬워집니다.'
        : 'README가 약하면 프로젝트 목적과 실행 흐름을 별도 문서로 보강해야 합니다.',
      githubPortfolio.workflowFiles?.length
        ? 'CI 또는 배포 워크플로 흔적이 있어 작업/출시 경험을 설명할 근거가 생깁니다.'
        : '워크플로 파일이 없으면 검증과 배포 과정을 직접 설명할 준비가 필요합니다.',
    ];

  const architecture = Array.isArray(githubPortfolio.architecture) && githubPortfolio.architecture.length > 0
    ? githubPortfolio.architecture
    : (githubPortfolio.rootFiles || [])
      .slice(0, 8)
      .map((file) => `${file.type === 'dir' ? '폴더' : '파일'}: ${file.path}`);

  const qualitySignals = Array.isArray(githubPortfolio.qualitySignals) && githubPortfolio.qualitySignals.length > 0
    ? githubPortfolio.qualitySignals
    : [
      githubPortfolio.readme
        ? 'README 기반 실행/설명 문서가 있어 프로젝트 소개 근거가 남아 있습니다.'
        : 'README가 약해 저장소 첫인상과 실행 안내가 떨어집니다.',
    ];

  const shippingSignals = Array.isArray(githubPortfolio.shippingSignals) && githubPortfolio.shippingSignals.length > 0
    ? githubPortfolio.shippingSignals
    : [
      githubPortfolio.workflowFiles?.length
        ? '자동화 워크플로 흔적이 있어 검증 또는 배포 경험을 설명할 수 있습니다.'
        : '자동화 워크플로가 보이지 않으면 수동 검증/배포 과정을 직접 설명해야 합니다.',
    ];

  const refactorSuggestions = Array.isArray(githubPortfolio.refactorSuggestions) && githubPortfolio.refactorSuggestions.length > 0
    ? githubPortfolio.refactorSuggestions
    : [
      '핵심 모듈 2~3개를 별도 설명 문서로 정리하면 면접 대응력이 좋아집니다.',
    ];

  const risks = Array.isArray(githubPortfolio.risks) && githubPortfolio.risks.length > 0
    ? githubPortfolio.risks
    : [
      githubPortfolio.readme
        ? 'README의 실행 방법, 역할, 핵심 구현 근거가 충분한지 추가 확인이 필요합니다.'
        : 'README가 비어 있어 프로젝트 설명력이 떨어집니다.',
      '무료 분석 모드는 public repo의 구조와 설정 파일 중심으로만 확인하므로, 핵심 구현은 면접에서 별도 설명 자료로 보강하는 편이 좋습니다.',
    ];

  const interviewTalkingPoints = Array.isArray(githubPortfolio.interviewTalkingPoints) && githubPortfolio.interviewTalkingPoints.length > 0
    ? githubPortfolio.interviewTalkingPoints
    : [
      '이 프로젝트를 만든 문제 상황과 목표를 30초 안에 설명하세요.',
      '핵심 기능 1~2개를 골라 설계 판단, 예외 처리, 검증 방법을 말할 수 있어야 합니다.',
      '지금 다시 만든다면 바꿀 구조나 테스트·배포 개선점을 준비하세요.',
    ];

  return {
    repoUrl: githubPortfolio.repoUrl,
    fullName: githubPortfolio.fullName,
    defaultBranch: githubPortfolio.defaultBranch,
    topLanguages: githubPortfolio.topLanguages || githubPortfolio.languages || [],
    stars: githubPortfolio.stars,
    forks: githubPortfolio.forks,
    updatedAt: githubPortfolio.updatedAt,
    summary: githubPortfolio.summary || `${githubPortfolio.fullName} 저장소를 기준으로 프로젝트 구조와 기술 설명 포인트를 정리했습니다.`,
    techStack: stack,
    projectHighlights,
    architecture,
    qualitySignals,
    shippingSignals,
    refactorSuggestions,
    documentation: githubPortfolio.documentation || githubPortfolio.techDocument,
    risks,
    interviewTalkingPoints,
  };
}

function mergeGitHubPortfolioAnalysis(localAnalysis, remoteAnalysis) {
  if (!localAnalysis) return remoteAnalysis;
  if (!remoteAnalysis) return localAnalysis;

  const merged = { ...localAnalysis, ...remoteAnalysis };
  const listFields = [
    'techStack',
    'architecture',
    'projectHighlights',
    'qualitySignals',
    'shippingSignals',
    'refactorSuggestions',
    'risks',
    'interviewTalkingPoints',
  ];

  listFields.forEach((field) => {
    if (!Array.isArray(remoteAnalysis[field]) || remoteAnalysis[field].length === 0) {
      merged[field] = Array.isArray(localAnalysis[field]) ? localAnalysis[field] : [];
    }
  });

  if (!String(remoteAnalysis.summary || '').trim()) {
    merged.summary = localAnalysis.summary;
  }

  if (!String(remoteAnalysis.documentation || '').trim()) {
    merged.documentation = localAnalysis.documentation;
  }

  return merged;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
      if (encoded.length % 4 > 0) encoded += '='.repeat(4 - (encoded.length % 4));
      resolve(encoded);
    };
    reader.onerror = (error) => reject(error);
  });
}

function buildLocalFallbackResults({
  instructorFeedback,
  jobsWithScores,
  portfolioFiles,
  userInfo,
  generateInterviewQuestionsLocal,
}) {
  const profileRoleLabel = getProfileDisplayRole(userInfo);
  const top3 = jobsWithScores.slice(0, 3);

  return {
    resumeImprovements: [
      `**성과 중심 배치**: ${userInfo.experience}년차 ${profileRoleLabel} 경험을 상단 핵심 문장으로 다시 정리하세요.`,
      `**핵심 기술 증명**: ${userInfo.skills[0]?.name || '주요 기술'}을 실제 프로젝트 결과와 연결해 보강하세요.`,
    ],
    coverLetterImprovements: {
      common: [
        '**지원 동기 구체화**: 본인의 가치와 목표가 회사/직무와 어떻게 맞는지 첫 문단에서 분명히 쓰세요.',
        "**문제 해결 내러티브**: '문제 발견 → 판단 → 실행 → 결과' 구조로 바꾸면 설득력이 높아집니다.",
      ],
      rank1: [
        `**${top3[0]?.company || '1순위 공고'} 맞춤 문장**: 해당 공고가 요구하는 핵심 역량을 자기소개서 도입부와 직접 연결하세요.`,
        `**직무 이해도 강조**: ${top3[0]?.company || '1순위 회사'}의 제품/서비스 방향성과 본인 경험을 엮어 쓰세요.`,
      ],
      rank2: [
        `**${top3[1]?.company || '2순위 공고'} 맞춤 문장**: 가장 가까운 경험 사례를 중심으로 근거를 재배치하세요.`,
        `**차별점 강조**: 다른 지원자와 구분되는 강점을 수치나 산출물로 보여주세요.`,
      ],
      rank3: [
        `**${top3[2]?.company || '3순위 공고'} 맞춤 문장**: 충족되는 조건과 보완 중인 조건을 명확히 나눠 서술하세요.`,
        `**문화 적합성 보강**: 회사 방향성과 본인의 커리어 방향이 만나는 지점을 쓰세요.`,
      ],
    },
    portfolioImprovements: portfolioFiles.length > 0
      ? portfolioFiles.map((file, index) => `**포트폴리오 ${index + 1} (${file.name})**: 역할, 문제 해결 과정, 결과 지표가 보이게 다시 정리하세요.`)
      : [
        '**과정 문서화**: 결과물 외에 문제 정의와 해결 과정을 따로 문서로 남기세요.',
        '**기여도 명시**: 프로젝트별 본인 역할과 기여 범위를 첫 화면에 넣으세요.',
      ],
    interviewPreps: generateInterviewQuestionsLocal(top3, userInfo),
    instructorFeedback,
  };
}

export function useApplicationAnalysis({
  computeJobsWithScores,
  currentProvider,
  coverLetterFile,
  generateInterviewQuestionsLocal,
  instructorFeedback,
  persistWorkspaceSnapshot,
  portfolioFiles,
  resumeFile,
  selectedApiKey,
  selectedProvider,
  selectedModelId,
  shouldGenerateInstructorDraft,
  setActiveTab,
  setError,
  setInfoMessage,
  setInstructorFeedback,
  setJobMatchState,
  setLoading,
  setMatchedJobs,
  setRecommendedJobs,
  setRestoreNotice,
  setResults,
  setVisibleJobs,
  userInfo,
}) {
  const generateInstructorDraft = useCallback(async (aiResults, profile) => {
    if (!shouldGenerateInstructorDraft) return null;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const normalizedProfile = normalizeUserProfile(profile);
      const response = await requestInstructorDraft({
        provider: selectedProvider,
        apiKey: selectedApiKey,
        modelId: selectedModelId,
        payload: {
          profile: normalizedProfile,
          aiResults,
        },
      });
      const markdown = response?.markdown;
      if (markdown) {
        const parsed = parseInstructorMd(
          markdown.includes('# 피드백 일자')
            ? markdown
            : `# 강사명\nAI 초고\n\n# 피드백 일자\n${today}\n\n${markdown}`,
        );
        setInstructorFeedback(parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('강사 피드백 초안 생성 실패:', error.message);
    }
    return null;
  }, [selectedApiKey, selectedModelId, selectedProvider, setInstructorFeedback, shouldGenerateInstructorDraft]);

  const analyzeApplication = useCallback(async () => {
    if (!userInfo.name || userInfo.skills.length === 0) {
      setError('지원자 이름과 최소 1개 이상의 보유 기술을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');
    setRestoreNotice(null);
    setMatchedJobs([]);
    setJobMatchState({
      running: false,
      attempted: false,
      summary: '',
      error: '',
      matchedAt: '',
    });

    try {
      const analysisProfile = normalizeUserProfile(userInfo);
      const jobsWithScores = computeJobsWithScores();
      setRecommendedJobs(jobsWithScores);
      setVisibleJobs(10);
      const top3 = jobsWithScores.slice(0, 3);

      let githubPortfolio = null;
      if (analysisProfile.roleGroup === '프로그래밍' && analysisProfile.githubUrl?.trim()) {
        setInfoMessage('GitHub 저장소를 분석 중입니다. README, 핵심 디렉터리, 설정 파일, 자동화 흔적을 확인합니다.');
        try {
          githubPortfolio = await analyzeGitHubPortfolio(analysisProfile.githubUrl.trim());
        } catch (githubError) {
          setInfoMessage(`GitHub 분석은 건너뛰고 AI 분석을 계속합니다. (${githubError.message})`);
        }
      }

      let fileParts = [];
      if (currentProvider?.supportsFiles) {
        try {
          const addFile = async (label, file) => {
            if (!file || file.size > MAX_SUBMISSION_FILE_SIZE_BYTES) return;
            fileParts.push(
              { text: label },
              { inlineData: { mimeType: 'application/pdf', data: await fileToBase64(file) } },
            );
          };

          await addFile('이력서 첨부:', resumeFile);
          await addFile('자기소개서 첨부:', coverLetterFile);
          for (let index = 0; index < portfolioFiles.length; index += 1) {
            await addFile(`포트폴리오 ${index + 1}:`, portfolioFiles[index]);
          }
        } catch {
          fileParts = [];
        }
      }

      const data = await analyzeViaProxy({
        provider: selectedProvider,
        apiKey: selectedApiKey,
        modelId: selectedModelId,
        top3,
        profile: analysisProfile,
        hasFiles: fileParts.length > 0,
        hasPortfolioFile: portfolioFiles.length > 0,
        fileParts: fileParts.length > 0 ? fileParts : undefined,
        portfolioFileNames: portfolioFiles.map((file) => file.name).filter(Boolean),
      });

      const localGitHubAnalysis = buildLocalGitHubPortfolioAnalysis(githubPortfolio);
      const safeData = {
        ...data,
        resumeImprovements: Array.isArray(data.resumeImprovements) ? data.resumeImprovements : [],
        portfolioImprovements: Array.isArray(data.portfolioImprovements) ? data.portfolioImprovements : [],
        interviewPreps: Array.isArray(data.interviewPreps)
          ? data.interviewPreps.map((prep) => ({
            ...prep,
            questions: Array.isArray(prep.questions) ? prep.questions : [],
          }))
          : [],
        coverLetterImprovements: data.coverLetterImprovements || {},
        profileAnalysis: data.profileAnalysis || {},
        githubPortfolioAnalysis: mergeGitHubPortfolioAnalysis(localGitHubAnalysis, data.githubPortfolioAnalysis),
      };

      setResults(safeData);
      setActiveTab('feedback');

      if (shouldGenerateInstructorDraft) {
        void generateInstructorDraft(safeData, analysisProfile)
          .then((draft) => {
            if (!draft) return;
            persistWorkspaceSnapshot({
              userInfo: analysisProfile,
              results: safeData,
              recommendedJobs: jobsWithScores,
              instructorFeedback: draft,
            });
          })
          .catch(() => {});
      }

      persistWorkspaceSnapshot({
        userInfo: analysisProfile,
        results: safeData,
        recommendedJobs: jobsWithScores,
        instructorFeedback,
      }, { showConfirmation: true, trackHistory: true });
    } catch (error) {
      console.warn('AI 분석 오류, 로컬 fallback 사용:', error.message);
      try {
        const jobsWithScores = computeJobsWithScores();
        const localResults = buildLocalFallbackResults({
          instructorFeedback,
          jobsWithScores,
          portfolioFiles,
          userInfo,
          generateInterviewQuestionsLocal,
        });

        setRecommendedJobs(jobsWithScores);
        setVisibleJobs(10);
        setResults(localResults);
        setInfoMessage(`AI 분석에 실패해 로컬 보조 결과를 먼저 표시합니다. (${error.message})`);
        setActiveTab('feedback');
        persistWorkspaceSnapshot({
          userInfo,
          results: localResults,
          recommendedJobs: jobsWithScores,
          instructorFeedback,
        }, { showConfirmation: true, trackHistory: true });
      } catch (fallbackError) {
        console.warn('로컬 fallback도 실패:', fallbackError.message);
        setError(`분석 실패: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [
    computeJobsWithScores,
    coverLetterFile,
    currentProvider?.supportsFiles,
    generateInstructorDraft,
    generateInterviewQuestionsLocal,
    instructorFeedback,
    persistWorkspaceSnapshot,
    portfolioFiles,
    resumeFile,
    selectedApiKey,
    selectedModelId,
    selectedProvider,
    shouldGenerateInstructorDraft,
    setActiveTab,
    setError,
    setInfoMessage,
    setJobMatchState,
    setLoading,
    setMatchedJobs,
    setRecommendedJobs,
    setRestoreNotice,
    setResults,
    setVisibleJobs,
    userInfo,
  ]);

  return {
    analyzeApplication,
  };
}
