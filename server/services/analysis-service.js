import { getProfileDisplayRole, normalizeUserProfile } from '../../src/data/skills.js';

const DEFAULT_SUPABASE_URL = 'https://pkwbqbxuujpcvndpacsc.supabase.co';

const ROLE_FOCUS_MAP = {
  프로그래밍: `
### 직군 특화 평가 지침(프로그래밍 직군)
- 코드 기여도, 구조 설계, 성능/메모리 최적화 경험을 구체적으로 평가해 주세요.
- 사용 엔진이나 언어, 프레임워크를 나열하는 데 그치지 말고 본인이 직접 해결한 병목과 의사결정을 확인해 주세요.
- GitHub, 코드 스니펫, 트러블슈팅 문서, 테스트나 빌드 자동화 경험이 있으면 포트폴리오 설득 근거로 보강해 주세요.`,
  기획: `
### 직군 특화 평가 지침(게임 기획)
- 시스템, 콘텐츠, 시나리오, QA, 개발PM, 사업PM 등 세부 직무에 맞는 산출물과 사고 과정을 평가해 주세요.
- 지표 기반 의사결정 경험은 DAU, 리텐션, ARPU처럼 설명 가능한 수치 표현으로 안내해 주세요.
- QA라면 테스트 케이스와 결함 재현, PM이라면 일정/커뮤니케이션/이해관계자 조율 경험을 확인해 주세요.`,
  아트: `
### 직군 특화 평가 지침(아트 / TA)
- 포트폴리오의 퀄리티와 스타일 일관성을 최우선으로 평가해 주세요.
- 아트 직군 지원자의 경우 표현력, 리소스 사용, 게임 아트 매너 적합성을 함께 평가해 주세요.
- 결과 이미지뿐 아니라 제작 의도, 인터페이스, 파이프라인, 엔진 적용, 최적화 기준도 확인해 주세요.
- TA라면 데이터와 개발 경험, 아티스트-프로그래머 간 브리지 역할 경험을 강조해 주세요.`,
};

const DEFAULT_ROLE_FOCUS = `
### 직군 특화 평가 지침(공통)
- 지원 직군에서 요구하는 핵심 기술 스택과 보유 스킬 매칭률을 중점 평가해 주세요.
- 실제 프로젝트에서의 기여 방식과 성과를 수치나 결과 중심으로 표현하도록 안내해 주세요.`;

const PERSONALITY_SYSTEM_PROMPT = `당신은 기업 인적성 분석가이자 조직심리학 박사입니다.
지원자의 인성검사 응답 데이터를 분석하여 구조화된 피드백을 제공합니다.

분석 지침:
1. 응답 패턴에서 성격 특성을 추론합니다.
2. 게임 업계 직무 적합성 관점에서 해석합니다.
3. 일관성 지표와 유사 문항 간 응답 일치를 확인합니다.
4. 사회적 바람직성(Lie Scale) 문항과 응답 경향을 분석합니다.
5. 실제 인적성 검사 대비 전략을 개인화해서 제시합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

const PERSONALITY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    traits: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          score: { type: 'NUMBER' },
          description: { type: 'STRING' },
        },
        required: ['name', 'score', 'description'],
      },
    },
    workStyle: {
      type: 'OBJECT',
      properties: {
        axes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              leftLabel: { type: 'STRING' },
              rightLabel: { type: 'STRING' },
              value: { type: 'NUMBER' },
              description: { type: 'STRING' },
            },
            required: ['leftLabel', 'rightLabel', 'value', 'description'],
          },
        },
      },
      required: ['axes'],
    },
    strengths: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['title', 'description'],
      },
    },
    cautions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          description: { type: 'STRING' },
        },
        required: ['title', 'description'],
      },
    },
    consistency: {
      type: 'OBJECT',
      properties: {
        score: { type: 'NUMBER' },
        comment: { type: 'STRING' },
      },
      required: ['score', 'comment'],
    },
    gameIndustryFit: { type: 'STRING' },
    testStrategy: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['traits', 'workStyle', 'strengths', 'cautions', 'consistency', 'gameIndustryFit', 'testStrategy'],
};

const LIKERT_SCALE = [
  '전혀 그렇지 않다(1점)',
  '그렇지 않다(2점)',
  '그렇지 않은 편이다(3점)',
  '그런 편이다(4점)',
  '그렇다(5점)',
  '매우 그렇다(6점)',
];

function buildPortfolioPrompt({ top3, profile, hasFiles, hasPortfolioFile, loadPrompts }) {
  const normalizedProfile = normalizeUserProfile(profile);
  const prompts = loadPrompts();
  let template = prompts.userPromptTemplate;

  const top3JD = top3
    .map(
      (job, idx) => `
[${idx + 1}순위 추천 공고]
- 회사명: ${job.companyInfo?.name || job.company}
- 모집 직무: ${job.title} (${job.role})
- 인재상: ${job.companyInfo?.idealCandidate || '정보 없음'}
- 기업 최신 이슈: ${job.companyInfo?.news?.join(' / ') || '정보 없음'}
- 과제 여부: ${job.hasAssignment ? job.assignmentType : '없음'}`,
    )
    .join('\n---');

  const profileText = `
- 지원자 이름: ${normalizedProfile.name}
- 직무 대분류: ${normalizedProfile.roleGroup}
- 세부 직무: ${normalizedProfile.subRole}
- 매칭 기준 직군: ${normalizedProfile.role}
- 세부 평가 초점: ${normalizedProfile.roleFocus}
- 총 경력: ${normalizedProfile.experience}년${Number(normalizedProfile.experience) === 0 ? '(신입)' : '(경력)'}
- 보유 기술 및 숙련도: ${(normalizedProfile.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ')}`;

  const fileContext = hasFiles
    ? '### 첨부 파일\n첨부된 파일(이력서, 자기소개서, 포트폴리오)을 직접 분석하여 피드백에 반영해 주세요.'
    : '### 첨부 파일\n첨부 파일이 없습니다. 프로필 정보만으로 피드백을 제공해 주세요.';

  const portfolioInstruction = hasPortfolioFile
    ? '첨부된 포트폴리오 파일을 직접 분석하여 구체적인 개선안을 제시해 주세요.'
    : '포트폴리오 파일이 없으므로 프로젝트와 직군 기준으로 포트폴리오 구성 방향을 제안해 주세요.';

  const roleFocus = `${ROLE_FOCUS_MAP[normalizedProfile.roleGroup] || DEFAULT_ROLE_FOCUS}

### 세부 직무 맞춤 지침(${getProfileDisplayRole(normalizedProfile)})
- 모든 피드백은 "${normalizedProfile.subRole}" 지원자 관점에서 작성해 주세요.
- 이력서, 자기소개서, 포트폴리오 피드백은 해당 세부 직무에서 실제로 검증하는 산출물과 핵심 기준을 반영해 주세요.`;

  template = template.replace(/<!--[\s\S]*?-->/g, '');
  template = template.replace('{{TOP3_JD}}', top3JD);
  template = template.replace('{{PROFILE}}', profileText);
  template = template.replace('{{FILE_CONTEXT}}', fileContext);
  template = template.replace('{{PORTFOLIO_INSTRUCTION}}', portfolioInstruction);
  template = template.replace('{{ROLE_FOCUS}}', roleFocus);

  return template.trim();
}

function buildPersonalityPrompt({ likertAnswers, binaryAnswers, questions, binaryQuestions }) {
  let likertText = '## 리커트 척도 응답 (94문항)\n';
  if (questions && likertAnswers) {
    for (const question of questions) {
      const answer = likertAnswers[question.id];
      likertText += `Q${question.id}. "${question.text}" → ${answer !== undefined ? LIKERT_SCALE[answer] : '미응답'}\n`;
    }
  }

  let binaryText = '\n## 이항 선택형 응답 (31문항)\n';
  if (binaryQuestions && binaryAnswers) {
    for (const question of binaryQuestions) {
      const answer = binaryAnswers[question.id];
      if (answer === 'A') {
        binaryText += `Q${question.id}. "${question.text}" → A: "${question.optionA}"\n`;
      } else if (answer === 'B') {
        binaryText += `Q${question.id}. "${question.text}" → B: "${question.optionB}"\n`;
      } else {
        binaryText += `Q${question.id}. "${question.text}" → 미응답\n`;
      }
    }
  }

  return `다음은 게임 업계 지원자의 인성검사 응답 데이터입니다.

${likertText}
${binaryText}

이 응답을 분석하여 아래 JSON 형식으로 결과를 반환해 주세요:

{
  "traits": [
    { "name": "성격 특성 이름 (예: 성실성)", "score": 0~100, "description": "해당 특성에 대한 설명 (2~3문장)" }
  ],
  "workStyle": {
    "axes": [
      { "leftLabel": "협업 지향", "rightLabel": "독립 지향", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "보수적", "rightLabel": "도전적", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "규칙 준수", "rightLabel": "자율 선호", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "안정 추구", "rightLabel": "성장 추구", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "논리적 사고", "rightLabel": "감성적 사고", "value": -100~100, "description": "해석 설명" }
    ]
  },
  "strengths": [
    { "title": "강점 이름", "description": "구체적인 설명 (2~3문장)" }
  ],
  "cautions": [
    { "title": "주의점 이름", "description": "구체적인 설명 및 개선 방향 (2~3문장)" }
  ],
  "consistency": {
    "score": 0~100,
    "comment": "일관성 지표 해석 (유사 문항 간 응답 일치, Lie Scale 문항 분석 등)"
  },
  "gameIndustryFit": "게임 업계 적합성에 대한 종합 코멘트 (3~4문장)",
  "testStrategy": [
    "개인화된 인성검사 대비 전략 1",
    "개인화된 인성검사 대비 전략 2",
    "개인화된 인성검사 대비 전략 3"
  ]
}

- traits는 반드시 5개 이상 포함해 주세요.
- workStyle axes는 5개 축을 포함해 주세요.
- strengths는 2~3개, cautions는 1~2개 포함해 주세요.
- testStrategy는 지원자 응답 패턴에 맞춘 전략 3가지를 제시해 주세요.`;
}

async function requestGeminiData({
  apiKey,
  providerConfig,
  modelId,
  payload,
  fetchWithRetry,
  fetchImpl,
}) {
  if (apiKey) {
    const url = `${providerConfig.apiBase}/${modelId}:generateContent?key=${apiKey}`;
    return fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const proxyRes = await fetchImpl(`${supabaseUrl}/functions/v1/gemini-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      contents: payload.contents,
      systemInstruction: payload.systemInstruction,
      generationConfig: payload.generationConfig,
    }),
  });

  if (!proxyRes.ok) {
    const proxyText = await proxyRes.text().catch(() => '');
    throw new Error(proxyText || `gemini-proxy request failed (${proxyRes.status})`);
  }

  return proxyRes.json();
}

export function createAnalysisService({
  loadPrompts,
  loadServerConfig,
  getProviderConfig,
  findModel,
  fetchWithRetry,
  fetchImpl,
}) {
  async function analyze(payload) {
    const { provider, apiKey, modelId, top3, profile, hasFiles, hasPortfolioFile, fileParts, userPrompt: legacyPrompt } = payload;

    if (!provider || (provider !== 'gemini' && !apiKey)) {
      return { status: 400, body: { error: '필수 파라미터가 누락되었습니다.' } };
    }
    if (!top3 && !legacyPrompt) {
      return { status: 400, body: { error: '분석 데이터(top3/profile) 또는 userPrompt가 필요합니다.' } };
    }

    const userPrompt = top3 && profile
      ? buildPortfolioPrompt({ top3, profile, hasFiles: !!hasFiles, hasPortfolioFile: !!hasPortfolioFile, loadPrompts })
      : legacyPrompt;

    const providerConfig = getProviderConfig(provider);
    if (!providerConfig || !providerConfig.enabled) {
      return { status: 400, body: { error: `${provider}는 현재 지원하지 않는 AI 제공자입니다.` } };
    }

    const prompts = loadPrompts();
    const genConfig = loadServerConfig().generation;

    try {
      let result;

      if (provider === 'gemini') {
        const model = findModel('gemini', modelId);
        const parts = [{ text: userPrompt }];
        if (fileParts && fileParts.length > 0) {
          parts.push(...fileParts);
        }

        const payloadData = {
          contents: [{ parts }],
          systemInstruction: { parts: [{ text: prompts.systemPrompt }] },
          generationConfig: {
            responseMimeType: genConfig.responseMimeType,
            responseSchema: prompts.geminiResponseSchema,
            temperature: genConfig.temperature,
          },
        };

        const data = await requestGeminiData({
          apiKey,
          providerConfig,
          modelId: model.id,
          payload: payloadData,
          fetchWithRetry,
          fetchImpl,
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다.');
        result = JSON.parse(text);
      } else if (provider === 'claude') {
        const model = findModel('claude', modelId);
        const fullPrompt = `${userPrompt}\n\n${prompts.jsonSchemaPrompt}`;

        const data = await fetchWithRetry(`${providerConfig.apiBase}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': providerConfig.apiVersion,
          },
          body: JSON.stringify({
            model: model.id,
            max_tokens: genConfig.maxTokens,
            system: prompts.systemPrompt,
            messages: [{ role: 'user', content: fullPrompt }],
          }),
        });

        const text = data.content?.[0]?.text;
        if (!text) throw new Error('Claude 응답에 텍스트가 없습니다.');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } else if (provider === 'openai') {
        const model = findModel('openai', modelId);
        const fullPrompt = `${userPrompt}\n\n${prompts.jsonSchemaPrompt}`;

        const data = await fetchWithRetry(`${providerConfig.apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              { role: 'system', content: prompts.systemPrompt },
              { role: 'user', content: fullPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: genConfig.temperature,
          }),
        });

        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.');
        result = JSON.parse(text);
      } else {
        return { status: 400, body: { error: '지원하지 않는 AI 제공자입니다.' } };
      }

      return { status: 200, body: result };
    } catch (err) {
      console.error('[/api/analyze] Error:', err.message);
      return { status: 500, body: { error: err.message } };
    }
  }

  async function analyzePersonality(payload) {
    const { provider, apiKey, modelId, likertAnswers, binaryAnswers, questions, binaryQuestions } = payload;

    if (!provider || (provider !== 'gemini' && !apiKey)) {
      return { status: 400, body: { error: '필수 파라미터가 누락되었습니다.' } };
    }

    const providerConfig = getProviderConfig(provider);
    if (!providerConfig || !providerConfig.enabled) {
      return { status: 400, body: { error: `${provider}는 현재 지원하지 않는 AI 제공자입니다.` } };
    }

    const genConfig = loadServerConfig().generation;
    const userPrompt = buildPersonalityPrompt({ likertAnswers, binaryAnswers, questions, binaryQuestions });

    try {
      let result;

      if (provider === 'gemini') {
        const model = findModel('gemini', modelId);
        const payloadData = {
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: PERSONALITY_SYSTEM_PROMPT }] },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: PERSONALITY_RESPONSE_SCHEMA,
            temperature: genConfig.temperature,
          },
        };

        const data = await requestGeminiData({
          apiKey,
          providerConfig,
          modelId: model.id,
          payload: payloadData,
          fetchWithRetry,
          fetchImpl,
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다.');
        result = JSON.parse(text);
      } else if (provider === 'claude') {
        const model = findModel('claude', modelId);
        const data = await fetchWithRetry(`${providerConfig.apiBase}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': providerConfig.apiVersion,
          },
          body: JSON.stringify({
            model: model.id,
            max_tokens: genConfig.maxTokens,
            system: PERSONALITY_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        const text = data.content?.[0]?.text;
        if (!text) throw new Error('Claude 응답에 텍스트가 없습니다.');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } else if (provider === 'openai') {
        const model = findModel('openai', modelId);
        const data = await fetchWithRetry(`${providerConfig.apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.id,
            messages: [
              { role: 'system', content: PERSONALITY_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: genConfig.temperature,
          }),
        });

        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.');
        result = JSON.parse(text);
      } else {
        return { status: 400, body: { error: '지원하지 않는 AI 제공자입니다.' } };
      }

      return { status: 200, body: result };
    } catch (err) {
      console.error('[/api/analyze-personality] Error:', err.message);
      return { status: 500, body: { error: err.message } };
    }
  }

  async function requestGeminiJson({ modelId = 'gemini-2.5-flash', systemPrompt, userPrompt, responseSchema, temperature = 0.4 }) {
    const providerConfig = getProviderConfig('gemini');
    const payloadData = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature,
      },
    };

    const data = await requestGeminiData({
      apiKey: '',
      providerConfig,
      modelId,
      payload: payloadData,
      fetchWithRetry,
      fetchImpl,
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini 응답이 비어 있습니다.');
    return JSON.parse(text);
  }

  async function requestGeminiText({ modelId = 'gemini-2.5-flash', systemPrompt, userPrompt, temperature = 0.4 }) {
    const providerConfig = getProviderConfig('gemini');
    const payloadData = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature,
      },
    };

    const data = await requestGeminiData({
      apiKey: '',
      providerConfig,
      modelId,
      payload: payloadData,
      fetchWithRetry,
      fetchImpl,
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('Gemini 응답이 비어 있습니다.');
    return text;
  }

  async function matchJobs(payload) {
    const schema = {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING' },
        matches: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING' },
              score: { type: 'NUMBER' },
              reason: { type: 'STRING' },
              strengths: { type: 'ARRAY', items: { type: 'STRING' } },
              cautions: { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['id', 'score', 'reason', 'strengths', 'cautions'],
          },
        },
      },
      required: ['summary', 'matches'],
    };

    try {
      const candidates = Array.isArray(payload?.candidates) ? payload.candidates.slice(0, 24) : [];
      const profile = payload?.profile || {};
      const modelId = String(payload?.modelId || '').startsWith('gemini-') ? payload.modelId : 'gemini-2.5-flash';
      const profileText = [
        `지원자 이름: ${profile?.name || '미입력'}`,
        `직무 대분류: ${profile?.roleGroup || '미입력'}`,
        `세부 직무: ${profile?.subRole || profile?.role || '미입력'}`,
        `경력: ${profile?.experience ?? 0}년`,
        `보유 기술: ${(profile?.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ') || '없음'}`,
      ].join('\n');

      const candidateText = candidates.map((job, index) => [
        `[후보 ${index + 1}]`,
        `id: ${job.id}`,
        `회사: ${job.company}`,
        `공고명: ${job.title}`,
        `직무: ${job.role}`,
        `경력조건: ${job.reqExp === 0 ? '신입/무관' : `${job.reqExp}년 이상`}`,
        `요구기술: ${(job.reqSkills || []).join(', ') || '없음'}`,
        `로컬 점수: ${job.score ?? 0}`,
        `카테고리: ${[job.mainGame, job.gameCategory].filter(Boolean).join(' / ') || '없음'}`,
      ].join('\n')).join('\n\n');

      const systemPrompt = [
        '당신은 게임업계 채용공고 추천 분석가다.',
        '지원자 프로필과 공고 후보를 비교해 실제 지원 우선순위가 높은 공고만 골라라.',
        '반드시 JSON만 반환한다.',
        '점수는 0~100 정수로 주고, reason은 두 문장 이내로 제한한다.',
      ].join('\n');

      const userPrompt = [
        '아래 지원자 프로필과 공고 후보를 보고 상위 매칭 공고를 최대 8개 반환하라.',
        '단순 키워드 일치보다 직무 적합도, 경력 적합도, 실제 지원 가능성을 우선한다.',
        '',
        '## 지원자 프로필',
        profileText,
        '',
        '## 후보 공고',
        candidateText,
      ].join('\n');

      const result = await requestGeminiJson({
        modelId,
        systemPrompt,
        userPrompt,
        responseSchema: schema,
        temperature: 0.4,
      });

      return { status: 200, body: result };
    } catch (error) {
      console.error('[/api/match-jobs] Error:', error.message);
      return { status: 500, body: { error: error.message } };
    }
  }

  async function analyzeCompany(payload) {
    const schema = {
      type: 'OBJECT',
      properties: {
        games: { type: 'STRING' },
        employees: { type: 'STRING' },
        revenue: { type: 'STRING' },
        benefits: { type: 'STRING' },
        news: { type: 'ARRAY', items: { type: 'STRING' } },
        aiAnalysis: { type: 'STRING' },
      },
      required: ['games', 'employees', 'revenue', 'benefits', 'news', 'aiAnalysis'],
    };

    try {
      const name = payload?.name || '';
      const roles = payload?.roles || '';
      const skills = payload?.skills || '';
      const gameCategories = payload?.gameCategories || '';
      const companyJobsCount = Number(payload?.companyJobsCount) || 0;

      const systemPrompt = '당신은 한국 게임회사 리서치 어시스턴트다. 정확한 정보만 간결하게 JSON으로 정리한다.';
      const userPrompt = [
        `회사명: ${name}`,
        `현재 수집된 공고 수: ${companyJobsCount}`,
        `주요 직군: ${roles || '-'}`,
        `주요 요구 기술: ${skills || '-'}`,
        `카테고리/장르: ${gameCategories || '-'}`,
        '',
        '아래 JSON 형식으로 답변해라.',
        '{"games":"대표 게임 타이틀","employees":"직원 수","revenue":"매출 또는 규모","benefits":"복리후생 요약","news":["최근 이슈 1","최근 이슈 2"],"aiAnalysis":"회사와 채용 흐름 요약"}',
      ].join('\n');

      const result = await requestGeminiJson({
        systemPrompt,
        userPrompt,
        responseSchema: schema,
        temperature: 0.3,
      });

      return { status: 200, body: result };
    } catch (error) {
      console.error('[/api/company-insights] Error:', error.message);
      return { status: 500, body: { error: error.message } };
    }
  }

  async function analyzeMarket(payload) {
    try {
      const topCompanies = Array.isArray(payload?.topCompanies) ? payload.topCompanies : [];
      const topKeywords = Array.isArray(payload?.topKeywords) ? payload.topKeywords : [];
      const topSkills = Array.isArray(payload?.topSkills) ? payload.topSkills : [];
      const historyIndex = Array.isArray(payload?.historyIndex) ? payload.historyIndex : [];

      const trendSummary = historyIndex
        .slice(0, 7)
        .reverse()
        .map((entry) => `${entry.date}: 전체 ${entry.referenceJobCount}건 / 신규 ${entry.newJobsCount}건`)
        .join('\n');

      const systemPrompt = [
        '당신은 게임업계 채용시장 분석가다.',
        '과장하지 말고 제공된 데이터만 근거로 간결한 한국어 보고서를 작성한다.',
      ].join('\n');

      const userPrompt = [
        '다음 데이터를 근거로 시장 보고서를 작성해라.',
        '- 제목 없이 바로 1. 시장 개요, 2. 채용 신호, 3. 직무별 인사이트, 4. 지원 전략, 5. 한 줄 결론 순서로 작성',
        '- 각 항목은 2~4문장',
        '',
        `[총 공고 수] ${payload?.totalJobs || 0}`,
        `[최다 직군] ${payload?.dominantRole || '정보 없음'}`,
        `[최다 경력 조건] ${payload?.dominantCareer || '정보 없음'}`,
        `[상위 기업] ${topCompanies.slice(0, 8).map(([name, count]) => `${name}(${count})`).join(', ')}`,
        `[상위 키워드] ${topKeywords.slice(0, 12).map(([label, count]) => `${label}(${count})`).join(', ')}`,
        `[상위 요구 기술] ${topSkills.slice(0, 10).map(([label, count]) => `${label}(${count})`).join(', ')}`,
        '',
        '[최근 추이]',
        trendSummary || '추이 데이터 없음',
      ].join('\n');

      const text = await requestGeminiText({
        systemPrompt,
        userPrompt,
        temperature: 0.5,
      });

      return { status: 200, body: { text } };
    } catch (error) {
      console.error('[/api/market-insights] Error:', error.message);
      return { status: 500, body: { error: error.message } };
    }
  }

  async function generateInstructorDraft(payload) {
    try {
      const normalizedProfile = normalizeUserProfile(payload?.profile || {});
      const aiResults = payload?.aiResults || {};
      const today = new Date().toISOString().slice(0, 10);

      const prompt = `당신은 게임업계 취업 컨설턴트 강사다. 아래 AI 분석 결과를 바탕으로 강사 피드백 초고를 작성해라.

지원자: ${normalizedProfile.name} | 직무: ${getProfileDisplayRole(normalizedProfile)} | 경력: ${normalizedProfile.experience}년 | 기술: ${(normalizedProfile.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ')}

AI 분석 요약:
- 프로필: ${JSON.stringify(aiResults.profileAnalysis || {}).slice(0, 600)}
- 이력서: ${JSON.stringify(aiResults.resumeImprovements || []).slice(0, 600)}
- 포트폴리오: ${JSON.stringify(aiResults.portfolioImprovements || []).slice(0, 600)}

아래 마크다운 형식으로 작성해라.

# 강사명
AI 초고

# 피드백 일자
${today}

# 통합 피드백
## 전체 평가

## 주요 개선사항
- 항목

# 이력서 피드백
## 강점
- 항목

## 개선 사항
- 항목

# 자기소개서 피드백
## 강점
- 항목

## 개선 사항
- 항목

# 포트폴리오 피드백
## 강점
- 항목

## 개선 사항
- 항목

# 면접 준비
## 예상 질문
- 항목

## 준비 방향
- 항목`;

      const markdown = await requestGeminiText({
        systemPrompt: '당신은 게임업계 취업 컨설턴트 강사다. 마크다운 형식만 반환한다.',
        userPrompt: prompt,
        temperature: 0.7,
      });

      return { status: 200, body: { markdown } };
    } catch (error) {
      console.error('[/api/instructor-draft] Error:', error.message);
      return { status: 500, body: { error: error.message } };
    }
  }

  return {
    analyze,
    analyzePersonality,
    analyzeCompany,
    analyzeMarket,
    generateInstructorDraft,
    matchJobs,
  };
}
