import { useCallback } from 'react';
import { parseInstructorMd } from '../components/InstructorFeedbackForm';
import { getProfileDisplayRole, normalizeUserProfile } from '../data/skills';
import { analyzeGitHubPortfolio } from '../lib/github-analyzer';
import { analyzeViaProxy, callGeminiProxy } from '../lib/gemini-client';

function buildLocalGitHubPortfolioAnalysis(githubPortfolio) {
  if (!githubPortfolio) return null;
  const stack = Array.isArray(githubPortfolio.topLanguages) && githubPortfolio.topLanguages.length > 0
    ? githubPortfolio.topLanguages.map((language) => `${language.name}${language.share ? ` (${language.share})` : ''}`)
    : (githubPortfolio.languages || []).slice(0, 6);
  const projectHighlights = Array.isArray(githubPortfolio.projectHighlights) && githubPortfolio.projectHighlights.length > 0
    ? githubPortfolio.projectHighlights
    : [
      githubPortfolio.readme
        ? 'README에 프로젝트 목적과 구조가 드러나면 지원자가 문제 정의를 설명하기 쉬워집니다.'
        : 'README가 약하면 프로젝트 목적과 실행 흐름을 별도 문서로 보강해야 합니다.',
      githubPortfolio.workflowFiles?.length
        ? 'CI 또는 배포 워크플로 흔적이 있어 협업/출시 경험을 설명할 근거가 생깁니다.'
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
        ? 'README 기반 실행/설명 문서가 있어 프로젝트 소개 근거를 확보할 수 있습니다.'
        : 'README가 약하면 저장소 첫인상과 실행 안내 품질이 떨어질 수 있습니다.',
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
      '핵심 모듈 2~3개를 별도 설명 문서로 정리하면 면접 대응력이 더 좋아집니다.',
    ];
  const risks = Array.isArray(githubPortfolio.risks) && githubPortfolio.risks.length > 0
    ? githubPortfolio.risks
    : [
      githubPortfolio.readme
        ? 'README에 실행 방법, 담당 역할, 핵심 구현 근거가 충분한지 확인이 필요합니다.'
        : 'README가 없거나 읽히지 않아 프로젝트 설명력이 약해질 수 있습니다.',
      '무료 분석 모드는 public repo의 핵심 구조와 대표 설정 파일 위주로 확인하므로, 핵심 구현 파일은 면접용 설명으로 별도 보강하는 편이 좋습니다.',
    ];
  const interviewTalkingPoints = Array.isArray(githubPortfolio.interviewTalkingPoints) && githubPortfolio.interviewTalkingPoints.length > 0
    ? githubPortfolio.interviewTalkingPoints
    : [
      '이 프로젝트를 만든 문제 상황과 목표를 30초 안에 설명하세요.',
      '핵심 기능 1~2개를 골라 본인의 설계 판단, 예외 처리, 검증 방법을 말하세요.',
      '지금 다시 만든다면 바꿀 구조나 테스트/배포 개선점을 준비하세요.',
    ];
  return {
    repoUrl: githubPortfolio.repoUrl,
    fullName: githubPortfolio.fullName,
    defaultBranch: githubPortfolio.defaultBranch,
    topLanguages: githubPortfolio.topLanguages || githubPortfolio.languages || [],
    stars: githubPortfolio.stars,
    forks: githubPortfolio.forks,
    updatedAt: githubPortfolio.updatedAt,
    summary: githubPortfolio.summary || `${githubPortfolio.fullName} 저장소는 ${githubPortfolio.language || '확인 필요'} 기반 프로젝트입니다. README, 핵심 디렉터리, 설정 파일, 자동화 신호를 기준으로 기술 설명 자료를 구성했습니다.`,
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
    reader.onerror = (err) => reject(err);
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
      `**성과 중심 재배치**: ${userInfo.experience}년차 ${profileRoleLabel} 경험을 상단에 두괄식으로 배치하세요.`,
      `**핵심 기술 증명**: [${userInfo.skills[0]?.name || '주요 기술'}] 활용 프로젝트 사례를 수치화하여 보강하세요.`,
    ],
    coverLetterImprovements: {
      common: [
        '**지원 동기 구체화**: 본인의 가치관과 목표가 게임 업계 방향성과 어떻게 일치하는지 첫 문장에 두괄식으로 서술하세요.',
        "**논리적 트러블슈팅**: '문제 발생 → 가설 수립 → 기술적 해결 → 결과 지표' 순으로 개조식 정리하세요.",
      ],
      rank1: [
        `**${top3[0]?.company || '1순위 공고'} 맞춤 전략**: 해당 공고의 핵심 인재상 키워드를 자소서 도입부에 직접 언급하고, 본인의 경험과 연결하세요.`,
        `**직무 이해도 어필**: ${top3[0]?.company || '1순위 회사'}의 최신 이슈·신작·방향성을 인용하여 진정성 있는 지원 동기를 구성하세요.`,
      ],
      rank2: [
        `**${top3[1]?.company || '2순위 공고'} 맞춤 전략**: 해당 공고가 요구하는 역량 중 본인의 경험과 가장 가까운 사례를 중심으로 자소서를 재구성하세요.`,
        `**차별화 포인트 강조**: ${top3[1]?.company || '2순위 회사'} 관점에서 다른 지원자와 차별화되는 본인의 강점을 구체적인 수치·결과물로 뒷받침하세요.`,
      ],
      rank3: [
        `**${top3[2]?.company || '3순위 공고'} 맞춤 전략**: 해당 공고의 요구 조건 중 충족하는 항목을 먼저 명시하고, 부족한 부분은 성장 의지와 대안으로 보완하세요.`,
        `**문화 핏 어필**: ${top3[2]?.company || '3순위 회사'}의 개발 철학·장르 특성과 본인의 커리어 방향성이 일치함을 구체적으로 서술하세요.`,
      ],
    },
    portfolioImprovements: portfolioFiles.length > 0
      ? portfolioFiles.map((file, index) => `**포트폴리오 ${index + 1} (${file.name})**: 해당 문서의 핵심 기여도와 문제 해결 과정을 수치화하여 보강하세요.`)
      : [
        '**과정 및 최적화 문서화**: 결과물 외에 문제 해결 과정(퍼포먼스 향상 등)을 노션/깃허브에 문서화하여 링크하세요.',
        '**기여도 명시**: 팀 프로젝트 내 본인의 명확한 역할과 기여도(%)를 앞장에 요약하세요.',
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
  selectedModelId,
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
    try {
      const today = new Date().toISOString().slice(0, 10);
      const normalizedProfile = normalizeUserProfile(profile);
      const prompt = `당신은 게임 업계 취업 컨설팅 강사입니다. 아래 AI 분석 결과를 바탕으로 강사 피드백 초고를 작성하세요.

지원자: ${normalizedProfile.name} | 직군: ${getProfileDisplayRole(normalizedProfile)} | 경력: ${normalizedProfile.experience}년
스킬: ${(normalizedProfile.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ')}

AI 분석 요약:
- 프로필: ${JSON.stringify(aiResults.profileAnalysis || {}).slice(0, 500)}
- 이력서: ${JSON.stringify(aiResults.resumeImprovements || []).slice(0, 500)}
- 포트폴리오: ${JSON.stringify(aiResults.portfolioImprovements || []).slice(0, 500)}

아래 마크다운 형식으로 정확히 작성하세요:

# 통합 피드백

## 전체 평가
(2~3문장 종합 평가)

## 주요 개선사항
- (핵심 개선 항목 3~5개)

# 이력서 피드백

## 강점
- (2~3개)

## 개선 포인트
- (2~3개)

# 자기소개서 피드백

## 강점
- (2~3개)

## 개선 포인트
- (2~3개)

# 포트폴리오 피드백

## 강점
- (2~3개)

## 개선 포인트
- (2~3개)

# 면접 대비

## 예상 질문
- (3~4개)

## 준비 방향
- (2~3개)

게임 업계 실무 관점에서 구체적으로 작성하세요.`;

      const data = await callGeminiProxy({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      });
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = parseInstructorMd(`# 강사명\nAI 초고\n\n# 피드백 일자\n${today}\n\n${text}`);
        setInstructorFeedback(parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('강사피드백 AI 초고 생성 실패:', error.message);
    }
    return null;
  }, [setInstructorFeedback]);

  const analyzeApplication = useCallback(async () => {
    if (!userInfo.name || userInfo.skills.length === 0) {
      setError('지원자 이름과 최소 1개 이상의 스킬을 입력해주세요.');
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
        setInfoMessage('GitHub 저장소를 분석하는 중입니다. README, 핵심 디렉터리, 설정 파일, 자동화 신호를 확인합니다. public repo 기준으로만 동작합니다.');
        try {
          githubPortfolio = await analyzeGitHubPortfolio(analysisProfile.githubUrl.trim());
        } catch (githubError) {
          setInfoMessage(`GitHub 분석은 건너뛰고 AI 분석을 계속합니다. (${githubError.message})`);
        }
      }

      let fileParts = [];
      if (currentProvider?.supportsFiles) {
        try {
          const maxFileSize = 10 * 1024 * 1024;
          const addFile = async (label, file) => {
            if (!file || file.size > maxFileSize) return;
            fileParts.push({ text: label }, { inlineData: { mimeType: 'application/pdf', data: await fileToBase64(file) } });
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
        modelId: selectedModelId,
        top3,
        profile: analysisProfile,
        hasFiles: fileParts.length > 0,
        hasPortfolioFile: portfolioFiles.length > 0,
        fileParts: fileParts.length > 0 ? fileParts : undefined,
        portfolioFileNames: portfolioFiles.map((file) => file.name),
        githubPortfolio,
      });

      const localGitHubAnalysis = buildLocalGitHubPortfolioAnalysis(githubPortfolio);
      const safeData = {
        ...data,
        resumeImprovements: Array.isArray(data.resumeImprovements) ? data.resumeImprovements : [],
        portfolioImprovements: Array.isArray(data.portfolioImprovements) ? data.portfolioImprovements : [],
        interviewPreps: Array.isArray(data.interviewPreps) ? data.interviewPreps.map((prep) => ({
          ...prep,
          questions: Array.isArray(prep.questions) ? prep.questions : [],
        })) : [],
        coverLetterImprovements: data.coverLetterImprovements || {},
        profileAnalysis: data.profileAnalysis || {},
        githubPortfolioAnalysis: mergeGitHubPortfolioAnalysis(localGitHubAnalysis, data.githubPortfolioAnalysis),
      };

      setResults(safeData);
      setActiveTab('feedback');

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

      persistWorkspaceSnapshot({
        userInfo: analysisProfile,
        results: safeData,
        recommendedJobs: jobsWithScores,
        instructorFeedback,
      }, { showConfirmation: true, trackHistory: true });
    } catch (error) {
      console.warn('AI 분석 오류 → 로컬 Fallback:', error.message);
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
        setInfoMessage(`AI API 연동 오류로 로컬 분석 엔진으로 결과를 대체 생성했습니다. (${error.message})`);
        setActiveTab('feedback');
        persistWorkspaceSnapshot({
          userInfo,
          results: localResults,
          recommendedJobs: jobsWithScores,
          instructorFeedback,
        }, { showConfirmation: true, trackHistory: true });
      } catch (fallbackError) {
        console.warn('로컬 Fallback도 실패:', fallbackError.message);
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
    selectedModelId,
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
