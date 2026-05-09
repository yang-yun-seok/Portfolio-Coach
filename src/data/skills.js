export const ROLE_GROUPS = [
  {
    id: 'planning',
    label: '기획',
    description: '시스템/컨텐츠, QA, PM, 라이브 운영 설계 역량을 중심으로 평가합니다.',
  },
  {
    id: 'programming',
    label: '프로그래밍',
    description: '클라이언트, 서버, 엔진, 데이터/AI 구현 역량을 중심으로 평가합니다.',
  },
  {
    id: 'art',
    label: '아트',
    description: '원화, UI, 3D, 애니메이션, VFX, TA 제작 역량을 중심으로 평가합니다.',
  },
];

export const ROLE_INPUT_PLAYBOOK = {
  기획: {
    recruiterLens: '문제를 어떻게 구조화했고, 어떤 지표와 문서로 판단을 증명하는지 먼저 봅니다.',
    evidenceChecklist: [
      '담당 시스템이나 컨텐츠를 한 문장으로 정의하고, 목표 지표 또는 플레이 경험 목표를 같이 적습니다.',
      '기획서, 밸런스 시트, 와이어프레임, QA 리포트처럼 판단 근거가 남는 산출물을 우선 배치합니다.',
      '협업 경험은 “누구와 무엇을 조율했는지”까지 적어야 PM/QA 역량으로 읽힙니다.',
    ],
    skillGuide: '툴 이름보다 산출물과 연결되는 역량을 넣는 편이 좋습니다. 예: Excel 단독보다 “밸런스 시트 설계”.',
    portfolioGuide: '대표 문서 2~3개만 뽑아 문제 정의 → 설계 판단 → 검증 결과 흐름이 보이게 구성하세요.',
    fileChecklist: [
      '이력서: 담당 기능, 지표, 협업 구조가 한눈에 보이도록 정리',
      '자소서: 문제 정의와 판단 근거, 개선 결과를 사례형으로 작성',
      '포트폴리오: 기획서, UI 플로우, QA 리포트, 라이브 개선안 중 핵심만 선별',
    ],
  },
  프로그래밍: {
    recruiterLens: '기술 선택 이유, 코드 구조, 검증 방식, 배포나 협업 흔적이 남아 있는지를 먼저 봅니다.',
    evidenceChecklist: [
      '핵심 프로젝트는 README, 실행 방법, 담당 기능, 트러블슈팅 포인트가 바로 보이도록 정리합니다.',
      '언어/엔진만 적지 말고 네트워크, 최적화, 테스트, 툴링 같은 구현 범위를 같이 적습니다.',
      'GitHub 저장소는 public 기준으로 대표 프로젝트 1개에 집중하는 편이 분석 품질이 좋습니다.',
    ],
    skillGuide: '문법 지식보다 구현 범위가 읽히는 조합이 좋습니다. 예: Unity + UI 구현 + 최적화 + 프로파일링.',
    portfolioGuide: '코드, README, 실행 결과, 구조 설명을 한 세트로 묶으세요. 면접 설명용 기술 문서가 함께 있으면 좋습니다.',
    fileChecklist: [
      '이력서: 기술 스택, 담당 시스템, 검증 방식, 성능 개선 수치를 앞쪽에 배치',
      '자소서: 문제 상황과 기술 선택 이유, 장애 대응 경험을 사례형으로 작성',
      '포트폴리오: GitHub, 기술 문서, 주요 코드 설명, 테스트/배포 흔적을 같이 제시',
    ],
    githubGuide: [
      'public 저장소만 분석 가능합니다.',
      'README, 루트 구조, 설정 파일을 우선 읽기 때문에 실행 방법과 역할 설명을 꼭 적는 편이 좋습니다.',
      '여러 저장소보다 대표 저장소 1개를 먼저 넣는 편이 결과 품질이 안정적입니다.',
    ],
  },
  아트: {
    recruiterLens: '결과물의 완성도뿐 아니라 제작 역할, 엔진 적용 이해, 파이프라인 협업 감각이 보이는지 먼저 봅니다.',
    evidenceChecklist: [
      '한 장의 비주얼보다 제작 범위와 역할 분리가 보이는 시트를 우선 배치합니다.',
      '컨셉, 모델링, 리깅, UI, VFX 중 어디까지 담당했는지 단계별로 구분해 적습니다.',
      '엔진 적용 컷, 최적화 고려, 아웃풋 비교 전후가 있으면 실무형 포트폴리오로 읽힙니다.',
    ],
    skillGuide: '툴 숙련도만 적지 말고 어떤 산출물에 썼는지 연결하는 편이 좋습니다. 예: Blender + 3D 배경 제작 + 최적화.',
    portfolioGuide: '대표 결과물, 제작 과정, 역할 분리, 엔진 적용 컷을 묶어서 보여주세요. 장수보다 설명 구조가 중요합니다.',
    fileChecklist: [
      '이력서: 제작 파트, 사용 툴, 장르/스타일 경험을 명확히 구분',
      '자소서: 작업 의도, 피드백 반영 과정, 협업 경험을 사례형으로 작성',
      '포트폴리오: 결과물, 제작 과정, 역할 범위, 엔진 적용 화면을 한 흐름으로 구성',
    ],
  },
};

export const ROLE_RESULT_PLAYBOOK = {
  기획: {
    feedbackTitle: '기획 서류 피드백',
    feedbackDescription: '문서 구조, 판단 근거, 협업 언어가 채용 관점에서 선명한지 기준으로 정리합니다.',
    feedbackCards: [
      {
        label: '문서 구조',
        title: '문제 정의와 설계 범위가 먼저 보여야 합니다.',
        body: '프로젝트 설명보다 어떤 문제를 풀었고 어디까지 설계했는지 먼저 보여주는 편이 강합니다.',
      },
      {
        label: '판단 근거',
        title: '왜 그렇게 설계했는지 남겨야 합니다.',
        body: '기획 의사결정은 밸런스 시트, 와이어프레임, QA 결과, 지표 개선안과 연결될수록 설득력이 올라갑니다.',
      },
      {
        label: '협업 언어',
        title: '조율 범위를 적어야 실무형으로 읽힙니다.',
        body: '개발, 아트, QA와 무엇을 조율했고 어떤 결과를 만들었는지까지 써야 PM/운영 역량이 같이 드러납니다.',
      },
    ],
    feedbackSectionTitles: {
      resume: '기획 이력서 구조',
      cover: '기획 자소서 논리',
      custom: '공고별 기획 포인트',
    },
    portfolioTitle: '기획 포트폴리오 설계',
    portfolioDescription: '문서를 많이 보여주는 것보다 읽는 순서를 설계하는 것이 중요합니다.',
    portfolioCards: [
      {
        label: '평가 기준',
        title: '문제 정의 → 설계 판단 → 검증 결과',
        body: '기획 포트폴리오는 결과물보다 왜 그런 구조를 택했는지와 무엇으로 검증했는지를 먼저 봅니다.',
      },
      {
        label: '우선 자료',
        title: '대표 문서 2~3개만 선별하는 편이 좋습니다.',
        body: '기획서, 플로우, 밸런스 시트, QA 리포트 중 역할과 의도가 분명한 자료부터 앞쪽에 배치하세요.',
      },
      {
        label: '면접 연결',
        title: '설계 판단을 말로 풀 수 있어야 합니다.',
        body: '면접에서는 문서의 완성도보다 우선순위 기준, 지표 가정, 실패 이후 수정 방향을 더 자주 묻습니다.',
      },
    ],
    jobsTitle: '기획 적합 공고 탐색',
    jobsDescription: '장르 핏, 설계 범위, 지표 언어, 협업 포지션을 기준으로 추천 공고를 읽으면 됩니다.',
    jobsCards: [
      {
        label: '매칭 해석',
        title: '직무 정합도와 지표 언어를 먼저 보세요.',
        body: '세부 직무가 맞더라도 요구 스킬이 QA/운영/PM 쪽으로 기울어 있으면 서류 프레이밍을 바꿔야 합니다.',
      },
      {
        label: '강점 활용',
        title: '설계 산출물과 협업 경험을 묶으세요.',
        body: '강점 스킬은 문서 이름, 개선 수치, 담당 범위와 함께 연결할 때 실제 채용 언어가 됩니다.',
      },
      {
        label: '보완 방향',
        title: '부족 역량은 대체 증빙으로 메우면 됩니다.',
        body: '직접 경험이 없더라도 유사 장르 분석, 라이브 운영 정리, QA 리포트 경험으로 일부 보완이 가능합니다.',
      },
    ],
  },
  프로그래밍: {
    feedbackTitle: '기술 서류 피드백',
    feedbackDescription: '기술 선택 이유, 구조 설명, 검증 방식, 협업 흔적이 읽히는지 기준으로 봅니다.',
    feedbackCards: [
      {
        label: '구현 범위',
        title: '무엇을 직접 만들었는지 먼저 구분해야 합니다.',
        body: '언어와 엔진만 적는 것보다 게임플레이, 서버, 툴링, 최적화 중 어디를 맡았는지가 더 중요합니다.',
      },
      {
        label: '기술 판단',
        title: '선택 이유와 트레이드오프를 남겨야 합니다.',
        body: '라이브러리나 구조를 왜 골랐는지, 실패한 접근과 수정 과정을 적으면 문서 신뢰도가 올라갑니다.',
      },
      {
        label: '검증 방식',
        title: '테스트와 성능 확인 흔적이 필요합니다.',
        body: '로그, 프로파일링, 테스트 자동화, 배포 경험이 있으면 코드 품질을 말로만 설명하지 않아도 됩니다.',
      },
    ],
    feedbackSectionTitles: {
      resume: '기술 이력서 구조',
      cover: '기술 자소서 설명력',
      custom: '공고별 기술 포인트',
    },
    portfolioTitle: '개발 포트폴리오 리뷰',
    portfolioDescription: '실행 가능한 설명과 코드 구조가 같이 보여야 포트폴리오로 읽힙니다.',
    portfolioCards: [
      {
        label: '평가 기준',
        title: 'README, 구조, 핵심 기능 설명이 한 세트여야 합니다.',
        body: '코드만 많아도 약하고, 설명만 많아도 약합니다. 실행 방법과 담당 기능이 같이 보여야 합니다.',
      },
      {
        label: '우선 자료',
        title: '대표 저장소 1개를 깊게 정리하는 편이 낫습니다.',
        body: '여러 프로젝트를 얕게 나열하기보다 README, 기술 문서, 실행 화면이 잘 정리된 저장소 한 개가 더 강합니다.',
      },
      {
        label: '면접 연결',
        title: '문제 상황과 구조 선택을 1분 안에 말할 수 있어야 합니다.',
        body: '면접에서는 구현 상세보다 왜 그 구조를 골랐고, 어떤 제약을 어떻게 넘겼는지를 먼저 묻습니다.',
      },
    ],
    jobsTitle: '기술 적합 공고 탐색',
    jobsDescription: '스택 일치뿐 아니라 구현 범위, 운영 안정성, 테스트/협업 흔적까지 같이 읽는 편이 좋습니다.',
    jobsCards: [
      {
        label: '매칭 해석',
        title: '언어보다 구현 범위를 먼저 맞추세요.',
        body: '같은 C++라도 게임플레이, 엔진, 서버는 요구 문장이 다르기 때문에 세부 직무와 역할 키워드를 우선 확인해야 합니다.',
      },
      {
        label: '강점 활용',
        title: '강한 스택은 구조 설명과 같이 묶으세요.',
        body: '매칭된 스킬이 많다면 담당 모듈, 테스트 방식, 성능 개선 사례를 함께 적을 때 실제 강점으로 읽힙니다.',
      },
      {
        label: '보완 방향',
        title: '부족 스택은 유사 구현 경험으로 연결하세요.',
        body: '정확히 같은 기술이 없더라도 네트워크, 최적화, 툴링, 데이터 처리 같은 인접 경험으로 충분히 연결할 수 있습니다.',
      },
    ],
  },
  아트: {
    feedbackTitle: '아트 서류 피드백',
    feedbackDescription: '결과물 완성도뿐 아니라 역할 범위, 제작 과정, 엔진 적용 이해가 보이는지 기준으로 봅니다.',
    feedbackCards: [
      {
        label: '역할 범위',
        title: '어디까지 직접 제작했는지 분리해서 적어야 합니다.',
        body: '컨셉, 모델링, 리깅, UI, 이펙트 중 어디를 담당했는지가 흐리면 작업 강점이 약하게 읽힙니다.',
      },
      {
        label: '제작 과정',
        title: '결과물보다 과정 시트가 중요할 때가 많습니다.',
        body: '실루엣 탐색, 색 선택, 리깅 수정, 엔진 적용 전후처럼 판단 과정이 보이면 신뢰도가 올라갑니다.',
      },
      {
        label: '실무 적용',
        title: '게임 엔진 안에서 어떻게 쓰였는지 보여줘야 합니다.',
        body: '최적화, 파이프라인, 협업 핸드오프까지 보이면 단순 결과물보다 실무형 포트폴리오로 읽힙니다.',
      },
    ],
    feedbackSectionTitles: {
      resume: '아트 이력서 구조',
      cover: '작업 의도와 협업 서술',
      custom: '공고별 아트 포인트',
    },
    portfolioTitle: '아트 포트폴리오 리뷰',
    portfolioDescription: '비주얼 퀄리티와 함께 역할 분리, 제작 과정, 엔진 적용성이 같이 보여야 강합니다.',
    portfolioCards: [
      {
        label: '평가 기준',
        title: '한 장의 완성컷보다 역할과 과정이 중요합니다.',
        body: '채용자는 보기 좋은 결과물만이 아니라 어떤 의도로 만들었고, 어떤 피드백을 반영했는지까지 확인합니다.',
      },
      {
        label: '우선 자료',
        title: '대표 결과물과 과정 시트를 짝으로 보여주세요.',
        body: '최종 이미지, 와이어, 제작 단계, 엔진 적용 컷을 함께 놓아야 실제 제작 역량이 읽힙니다.',
      },
      {
        label: '면접 연결',
        title: '스타일 선택과 수정 이력을 설명할 수 있어야 합니다.',
        body: '면접에서는 미감 자체보다 왜 그런 재질, 색, 연출을 골랐는지와 협업 피드백 대응을 자주 묻습니다.',
      },
    ],
    jobsTitle: '아트 적합 공고 탐색',
    jobsDescription: '스타일 적합도, 제작 파이프라인 경험, 엔진 적용 여부를 같이 보면서 공고를 읽는 편이 좋습니다.',
    jobsCards: [
      {
        label: '매칭 해석',
        title: '툴보다 산출물과 장르 적합도를 먼저 보세요.',
        body: '같은 Photoshop 경험이라도 UI, 원화, 그래픽 디자인은 보여줘야 할 산출물이 완전히 다릅니다.',
      },
      {
        label: '강점 활용',
        title: '강한 파트는 결과물과 과정 컷을 같이 제시하세요.',
        body: '매칭된 스킬이 많다면 제작 단계, 역할 분리, 엔진 적용 이미지를 같이 보여주는 편이 훨씬 강합니다.',
      },
      {
        label: '보완 방향',
        title: '부족 역량은 파이프라인 이해로 메울 수 있습니다.',
        body: '직접 제작 경험이 부족하더라도 협업 과정, 적용 이해, 리소스 핸드오프 경험으로 일부 보완이 가능합니다.',
      },
    ],
  },
};

export const ROLE_INTERVIEW_PLAYBOOK = {
  기획: {
    title: '기획 면접 대비',
    description: '설계 의도, 우선순위 판단, 협업 조율을 얼마나 명확하게 설명하는지 보는 질문 흐름입니다.',
    cards: [
      {
        label: '검증 포인트',
        title: '문제 정의와 판단 기준이 먼저 들려야 합니다.',
        body: '무엇을 만들었는지보다 왜 필요한지, 어떤 유저 행동이나 지표를 바꾸려 했는지를 먼저 말해야 합니다.',
      },
      {
        label: '답변 구조',
        title: '결론 → 판단 근거 → 협업 결과 순서가 가장 강합니다.',
        body: '기획 문서 설명보다 의사결정 배경, 조율 포인트, 수정 이유를 짧게 구조화하는 편이 더 설득력 있습니다.',
      },
      {
        label: '실수 방지',
        title: '아이디어 자랑보다 조건 해석이 중요합니다.',
        body: '제약, 예외, 운영 리스크를 빼면 기획보다 아이디어 스케치처럼 들릴 수 있습니다.',
      },
    ],
    strategyTitle: '기획 답변 프레임',
    strategyBody: '한 문장 결론 뒤에 유저 문제, 설계 기준, 협업 조율, 검증 결과를 붙이세요. 문서를 설명하는 대신 판단을 설명해야 합니다.',
    assignmentTitle: '과제형 질문 대응',
    assignmentBody: '과제나 케이스 질문이 나오면 기능 소개보다 조건 정리, 우선순위, 성공 지표, 실패 시 수정안까지 같이 말하는 편이 좋습니다.',
    answerTip: '기획 면접은 아이디어보다 판단 근거를 검증합니다. STAR 구조 안에서도 “왜 그렇게 설계했는지”를 분명히 넣어야 합니다.',
  },
  프로그래밍: {
    title: '프로그래밍 면접 대비',
    description: '구현 구조, 실패 케이스, 검증 방식, 운영 안정성을 설명할 수 있는지 기준으로 질문을 읽습니다.',
    cards: [
      {
        label: '검증 포인트',
        title: '구현 범위와 책임 분리가 먼저 보여야 합니다.',
        body: '내가 맡은 모듈, 데이터 흐름, 서버와 클라이언트 책임이 흐리면 실제 기여도가 약하게 읽힙니다.',
      },
      {
        label: '답변 구조',
        title: '문제 상황 → 구조 선택 → 검증 결과 순서가 안정적입니다.',
        body: '무슨 기술을 썼는지보다 왜 그 구조를 선택했고 어떤 로그나 테스트로 확인했는지를 먼저 보여줘야 합니다.',
      },
      {
        label: '실수 방지',
        title: '정상 흐름만 설명하면 약합니다.',
        body: '지연, 예외, 장애, 롤백, 성능 병목 같은 실패 케이스를 같이 설명해야 실무형으로 들립니다.',
      },
    ],
    strategyTitle: '기술 답변 프레임',
    strategyBody: '결론을 먼저 말하고, 구조 선택 이유와 대안 비교, 검증 수치, 운영 리스크까지 짧게 붙이세요. 기술명 나열은 마지막입니다.',
    assignmentTitle: '구현 과제 대응',
    assignmentBody: '과제 질문에서는 코드 양보다 입력, 상태, 검증, 로그, 장애 대응을 어떻게 나눴는지 보여주는 편이 더 강합니다.',
    answerTip: '프로그래밍 면접은 정답보다 재현 가능성을 봅니다. 무엇을 측정했고 어디서 실패할 수 있는지를 말할수록 신뢰도가 올라갑니다.',
  },
  아트: {
    title: '아트 면접 대비',
    description: '시각 의도, 제작 판단, 피드백 반영, 엔진 적용 이해를 설명할 수 있는지 기준으로 질문을 읽습니다.',
    cards: [
      {
        label: '검증 포인트',
        title: '결과물보다 역할과 제작 판단이 먼저 보여야 합니다.',
        body: '무엇을 만들었는지뿐 아니라 어디까지 담당했고 어떤 기준으로 수정했는지를 먼저 말해야 합니다.',
      },
      {
        label: '답변 구조',
        title: '의도 → 제작 과정 → 적용 결과 순서가 가장 강합니다.',
        body: '완성컷 설명보다 실루엣, 색, 재질, 피드백 대응, 엔진 적용성까지 이어질 때 설득력이 올라갑니다.',
      },
      {
        label: '실수 방지',
        title: '취향 설명만으로 끝나면 약합니다.',
        body: '스타일 선택 이유, 협업 기준, 수정 근거가 없으면 개인 작업 감상처럼 보일 수 있습니다.',
      },
    ],
    strategyTitle: '아트 답변 프레임',
    strategyBody: '한 문장으로 시각 의도를 말한 뒤, 제작 과정과 피드백 반영, 엔진 적용 또는 협업 전달 기준을 붙이세요.',
    assignmentTitle: '제작 과제 대응',
    assignmentBody: '과제 질문에서는 예쁘게 만들었다보다 왜 그 스타일을 골랐고, 어떤 제약 안에서 우선순위를 잡았는지가 중요합니다.',
    answerTip: '아트 면접은 미감만 보는 자리가 아닙니다. 작업 기준과 피드백 대응이 설명될 때 실무 적합도가 높게 읽힙니다.',
  },
};

export const ROLE_ASSESSMENT_PLAYBOOK = {
  기획: {
    reviewTitle: '설계 판단 리뷰 포인트',
    reviewBody: '채용 관점에서는 답변 길이보다 문제 정의, 우선순위, 지표, 협업 전달 구조가 보이는지를 먼저 봅니다.',
    reviewCards: [
      {
        label: '좋게 읽히는 답안',
        title: '조건을 먼저 정리하고 판단 기준을 적은 답안',
        body: '문항의 제약, 유저 목표, 성공 기준을 먼저 세우면 실무형 기획자로 읽힙니다.',
      },
      {
        label: '면접 연결',
        title: '왜 그렇게 설계했는지 말로 풀 수 있어야 합니다.',
        body: '리뷰 화면에서 적은 논리를 그대로 면접 답변으로 옮길 수 있어야 합니다.',
      },
      {
        label: '감점 포인트',
        title: '기능 소개만 있고 검증 기준이 없는 답안',
        body: '아이디어 자체보다 지표, 리스크, 협업 관점이 빠지면 설계력 어필이 약해집니다.',
      },
    ],
  },
  프로그래밍: {
    reviewTitle: '구현 구조 리뷰 포인트',
    reviewBody: '채용 관점에서는 정답 코드보다 책임 분리, 실패 케이스, 검증 방법, 운영 안정성을 설명하는지를 먼저 봅니다.',
    reviewCards: [
      {
        label: '좋게 읽히는 답안',
        title: '입력, 상태, 검증, 로그가 나뉜 답안',
        body: '구현 요소를 분리해 설명하면 실제 서비스 코드 감각이 있는 답안으로 읽힙니다.',
      },
      {
        label: '면접 연결',
        title: '구조 선택 이유와 대안을 같이 말할 수 있어야 합니다.',
        body: '면접에서는 무엇을 만들었는지보다 왜 그 구조가 적절했는지를 더 자주 묻습니다.',
      },
      {
        label: '감점 포인트',
        title: '정상 흐름만 있고 장애 대응이 없는 답안',
        body: '성능, 예외, 로그, 롤백이 빠지면 구현 경험이 얕게 보일 수 있습니다.',
      },
    ],
  },
  아트: {
    reviewTitle: '제작 판단 리뷰 포인트',
    reviewBody: '채용 관점에서는 완성도만이 아니라 시각 의도, 제작 과정, 피드백 반영, 엔진 적용 이해가 보이는지를 먼저 봅니다.',
    reviewCards: [
      {
        label: '좋게 읽히는 답안',
        title: '시각 기준과 제작 순서를 분리해 적은 답안',
        body: '실루엣, 색, 명도, 재질, 적용 환경을 나눠 설명하면 판단력이 선명해집니다.',
      },
      {
        label: '면접 연결',
        title: '왜 그런 스타일을 택했는지 설명할 수 있어야 합니다.',
        body: '포트폴리오 컷 자체보다 수정 이유와 피드백 대응을 말할 수 있어야 면접에서 강합니다.',
      },
      {
        label: '감점 포인트',
        title: '취향 평가만 있고 적용 기준이 없는 답안',
        body: '좋다, 세다, 예쁘다 수준에서 멈추면 실제 제작 역량을 보여주기 어렵습니다.',
      },
    ],
  },
};

export const ROLE_PERSONALITY_PLAYBOOK = {
  기획: {
    introTitle: '기획 직군은 논리적 소통과 조율 안정성을 함께 봅니다.',
    introDescription: '응답 속도보다 일관성, 스트레스 관리, 협업 태도, 판단 근거를 설명할 수 있는 성향이 중요합니다.',
    summaryTitle: '기획 직군 해석 기준',
    summaryBody: '이 결과는 설계 판단, 협업 커뮤니케이션, 운영 이슈 대응 관점으로 읽는 편이 좋습니다.',
    resultCards: [
      {
        label: '강하게 보는 항목',
        title: '성실성, 정서 안정성, 친화성',
        body: '기획은 문서 품질과 협업 조율이 중요해서 일관성과 감정 관리가 특히 크게 읽힙니다.',
      },
      {
        label: '면접 연결',
        title: '협업 태도와 판단 근거를 함께 설명하세요.',
        body: '점수 자체보다 갈등 상황에서 어떻게 조율했는지, 스트레스를 어떻게 관리했는지로 연결하는 편이 좋습니다.',
      },
      {
        label: '보완 메모',
        title: '완벽한 사람처럼 보이려는 응답은 오히려 약합니다.',
        body: '기획 직군은 현실적인 자기 인식과 수정 가능성을 보여주는 편이 더 신뢰를 얻습니다.',
      },
    ],
    fitTitle: '기획 직군 해석 메모',
    fitBody: '문서 완성도만큼 협업 태도와 운영 안정성도 같이 해석하세요. 강점은 설계 판단 언어로, 주의점은 개선 루틴으로 연결하는 편이 좋습니다.',
  },
  프로그래밍: {
    introTitle: '프로그래밍 직군은 문제 해결 일관성과 안정적인 실행 성향을 함께 봅니다.',
    introDescription: '응답 패턴은 협업성뿐 아니라 장애 대응 태도, 집중 유지, 검증 습관으로도 해석됩니다.',
    summaryTitle: '프로그래밍 직군 해석 기준',
    summaryBody: '이 결과는 구현 안정성, 협업 커뮤니케이션, 압박 상황에서의 대응 패턴 관점으로 읽는 편이 좋습니다.',
    resultCards: [
      {
        label: '강하게 보는 항목',
        title: '성실성, 자기 효능감, 정서 안정성',
        body: '개발 직군은 꾸준한 검증과 장애 대응이 중요해서 실행력과 안정감이 특히 크게 읽힙니다.',
      },
      {
        label: '면접 연결',
        title: '트러블슈팅 태도와 검증 습관으로 연결하세요.',
        body: '점수 설명보다 장애나 성능 이슈를 어떻게 다루는 성향인지 사례와 함께 연결하는 편이 강합니다.',
      },
      {
        label: '보완 메모',
        title: '과도한 완벽주의 응답은 협업 리스크로 읽힐 수 있습니다.',
        body: '무조건 정확한 사람보다 확인 절차를 갖춘 사람으로 보이는 편이 더 좋습니다.',
      },
    ],
    fitTitle: '프로그래밍 직군 해석 메모',
    fitBody: '높은 점수는 검증 루틴과 실행력으로, 낮은 점수는 코드 리뷰 습관과 장애 대응 프로세스로 보완 방향을 설명하는 편이 좋습니다.',
  },
  아트: {
    introTitle: '아트 직군은 피드백 수용성과 제작 지속력, 협업 안정성을 함께 봅니다.',
    introDescription: '응답 패턴은 결과물 완성도보다 수정 태도, 커뮤니케이션, 작업 몰입 유지력까지 연결해서 해석할 수 있습니다.',
    summaryTitle: '아트 직군 해석 기준',
    summaryBody: '이 결과는 제작 지속력, 피드백 대응, 협업 말투, 스타일 일관성 관점으로 읽는 편이 좋습니다.',
    resultCards: [
      {
        label: '강하게 보는 항목',
        title: '개방성, 친화성, 정서 안정성',
        body: '아트 직군은 스타일 탐색과 피드백 반영이 많아서 유연함과 감정 조절이 특히 크게 읽힙니다.',
      },
      {
        label: '면접 연결',
        title: '수정 과정과 피드백 대응 방식으로 연결하세요.',
        body: '성향 점수는 추상적으로 말하지 말고, 작업 수정 경험과 협업 방식으로 풀어내는 편이 좋습니다.',
      },
      {
        label: '보완 메모',
        title: '예민함을 솔직하게 말하되 관리 방식을 같이 보여주세요.',
        body: '아트 직군은 감수성이 강할 수 있지만, 수정 루프를 어떻게 안정적으로 운영하는지가 더 중요합니다.',
      },
    ],
    fitTitle: '아트 직군 해석 메모',
    fitBody: '결과는 작업 몰입과 피드백 수용 태도로 풀어내세요. 강점은 제작 루틴으로, 주의점은 수정 대응 방식으로 번역하는 편이 설득력 있습니다.',
  },
};

export const ROLE_READINESS_PLAYBOOK = {
  기획: {
    heroTitle: '기획 면접은 문서보다 판단을 설명하는 자리입니다.',
    heroDescription: '복장과 태도는 기본이고, 핵심은 문제 정의, 우선순위, 협업 조율, 지표 판단을 짧은 문장으로 증명하는 것입니다.',
    summaryStats: [
      { label: '면접관이 보는 것', value: '판단 기준 · 협업 조율 · 운영 감각' },
      { label: '직전 점검', value: '대표 문서 · KPI · 수정 이유 정리' },
    ],
    prepCards: [
      {
        label: '핵심 준비',
        title: '대표 기획 문서 2개만 깊게 설명할 수 있어야 합니다.',
        body: '많은 자료보다 시스템, 컨텐츠, 라이브 개선안 중 대표 사례를 골라 문제 정의와 설계 이유를 명확히 준비하세요.',
      },
      {
        label: '답변 포인트',
        title: '기능 소개보다 왜 그 판단을 했는지가 중요합니다.',
        body: '질문을 받으면 유저 문제, 제약, 우선순위, 검증 방식 순으로 짧게 이어가는 편이 더 강합니다.',
      },
      {
        label: '리스크 관리',
        title: '실패와 수정 이력을 숨기지 마세요.',
        body: '운영 리스크, QA 피드백, 협업 충돌을 어떻게 조정했는지 설명할 수 있어야 기획 직무답게 읽힙니다.',
      },
    ],
    quickChecks: [
      '대표 프로젝트마다 목표 지표, 문제 정의, 수정 이유를 1분 안에 말할 수 있게 정리합니다.',
      '기획서, 플로우, QA 리포트, 밸런스 시트 중 면접관이 바로 열어볼 자료 권한을 다시 확인합니다.',
      '유저 경험과 비즈니스 목표가 충돌했던 사례를 하나 골라 우선순위 판단 기준을 준비합니다.',
      '모르는 질문을 받았을 때 추론 가능한 범위와 추가 확인 계획을 말하는 문장을 미리 준비합니다.',
    ],
    answerFrameTitle: '기획 답변 프레임',
    answerFrameBody: '결론 1문장 뒤에 유저 문제, 판단 기준, 협업 조율, 검증 결과를 붙이세요. 문서의 분량보다 왜 그런 결정을 했는지가 먼저 들려야 합니다.',
    reviewerNoteTitle: '면접관 시선',
    reviewerNoteBody: '기획 면접은 아이디어 자체보다 조건을 읽는 방식과 수정 가능성을 봅니다. “재밌어 보여서”보다 “이탈 구간을 줄이기 위해” 같은 문장이 훨씬 강합니다.',
  },
  프로그래밍: {
    heroTitle: '프로그래밍 면접은 코드보다 구조와 검증을 설명하는 자리입니다.',
    heroDescription: '언어와 엔진은 전제일 뿐입니다. 구현 범위, 책임 분리, 예외 처리, 성능 확인, 협업 방식이 짧게 구조화되어야 합니다.',
    summaryStats: [
      { label: '면접관이 보는 것', value: '구현 범위 · 실패 케이스 · 검증 습관' },
      { label: '직전 점검', value: 'README · 핵심 모듈 · 로그/테스트 근거' },
    ],
    prepCards: [
      {
        label: '핵심 준비',
        title: '대표 저장소 1개를 기술 설명서처럼 다뤄야 합니다.',
        body: 'README, 구조도, 담당 모듈, 장애 경험, 검증 방식이 연결된 프로젝트 하나를 중심으로 준비하는 편이 좋습니다.',
      },
      {
        label: '답변 포인트',
        title: '정상 흐름보다 실패 케이스를 같이 말하세요.',
        body: '패킷 지연, 중복 요청, 성능 병목, 롤백 조건을 설명할 수 있으면 구현 깊이가 바로 드러납니다.',
      },
      {
        label: '리스크 관리',
        title: '수치와 로그가 없는 답변은 약합니다.',
        body: '프로파일링, 테스트, 에러율, 처리 시간처럼 검증 흔적을 같이 말해야 신뢰도가 올라갑니다.',
      },
    ],
    quickChecks: [
      '대표 프로젝트마다 내가 맡은 모듈, 데이터 흐름, 외부 의존성을 1분 안에 설명할 수 있게 정리합니다.',
      'README 실행 방법, 데모 링크, GitHub 공개 권한, 주요 브랜치나 태그 상태를 다시 확인합니다.',
      '성능 이슈나 버그 대응 사례를 하나 골라 재현, 원인 분리, 수정, 검증 순서로 말할 준비를 합니다.',
      '모르는 기술 질문을 받았을 때 알고 있는 인접 개념과 확인 계획으로 연결하는 문장을 준비합니다.',
    ],
    answerFrameTitle: '기술 답변 프레임',
    answerFrameBody: '결론을 먼저 말하고, 구조 선택 이유, 대안 비교, 검증 방식, 운영 리스크를 붙이세요. 기술명은 마지막에 정리해도 늦지 않습니다.',
    reviewerNoteTitle: '면접관 시선',
    reviewerNoteBody: '프로그래밍 면접은 문법 암기보다 재현 가능한 문제 해결을 봅니다. “돌아간다”보다 “어떻게 검증했고 어디서 실패할 수 있는가”가 더 중요합니다.',
  },
  아트: {
    heroTitle: '아트 면접은 결과물보다 제작 판단과 협업 태도를 설명하는 자리입니다.',
    heroDescription: '완성컷은 이미 제출 자료로 봅니다. 면접에서는 역할 범위, 스타일 선택 이유, 수정 과정, 피드백 대응, 엔진 적용 이해가 더 중요합니다.',
    summaryStats: [
      { label: '면접관이 보는 것', value: '제작 의도 · 수정 과정 · 협업 태도' },
      { label: '직전 점검', value: '대표작 · 과정 시트 · 엔진 적용 컷' },
    ],
    prepCards: [
      {
        label: '핵심 준비',
        title: '대표작은 완성컷과 과정 시트를 한 쌍으로 준비해야 합니다.',
        body: '썸네일만 좋으면 약합니다. 실루엣 탐색, 색 선택, 수정 이력, 역할 범위가 같이 보이는 자료가 필요합니다.',
      },
      {
        label: '답변 포인트',
        title: '취향 설명보다 기준 설명이 중요합니다.',
        body: '왜 그 색과 재질, 명도, 연출을 골랐는지와 프로젝트 톤에 어떻게 맞췄는지를 말해야 합니다.',
      },
      {
        label: '리스크 관리',
        title: '피드백 대응 방식이 협업 적합도를 결정합니다.',
        body: '수정 요청을 어떻게 해석하고 우선순위를 잡았는지를 설명할 수 있어야 실무형으로 읽힙니다.',
      },
    ],
    quickChecks: [
      '대표작마다 본인 역할, 제작 기간, 사용 툴, 수정 포인트를 1분 안에 설명할 수 있게 정리합니다.',
      'ArtStation, PDF, 노션, 엔진 캡처 자료의 링크와 확대 이미지 품질을 다시 확인합니다.',
      '피드백으로 크게 수정했던 사례를 하나 골라 어떤 기준으로 방향을 바꿨는지 준비합니다.',
      '모르는 제작 프로세스 질문을 받았을 때 현재 이해 범위와 학습 계획을 차분하게 말하는 문장을 준비합니다.',
    ],
    answerFrameTitle: '아트 답변 프레임',
    answerFrameBody: '한 문장으로 시각 의도를 말한 뒤, 제작 과정, 피드백 반영, 엔진 적용 또는 협업 전달 기준을 붙이세요. 예쁘다는 말만으로는 부족합니다.',
    reviewerNoteTitle: '면접관 시선',
    reviewerNoteBody: '아트 면접은 미감 자체보다 작업 기준과 수정 안정성을 봅니다. “감으로 맞췄다”보다 “톤 기준표에 맞춰 조정했다”가 훨씬 강합니다.',
  },
};

export const ROLE_GUIDE_PLAYBOOK = {
  기획: {
    quickStartTitle: '기획 기준으로는 문제 정의와 판단 근거가 먼저 보이게 입력해야 합니다.',
    quickStartBody: '세부 직무를 고른 뒤 대표 문서, 지표, 협업 조율 경험을 증명 가능한 표현으로 넣고 AI 분석을 실행하세요. 결과는 서류 피드백 → 면접 대비 → 추천 공고 순으로 보는 편이 효율적입니다.',
    focusCards: [
      {
        label: '입력 우선순위',
        title: '문서 이름보다 해결한 문제를 먼저 적으세요.',
        body: '예: 상점 기획보다 “신규 유저 전환을 위한 상점 구조 개편”처럼 목적이 보이는 표현이 좋습니다.',
      },
      {
        label: '첨부 자료',
        title: '기획서, 플로우, QA 리포트 중 대표 2~3개만 선별하세요.',
        body: '많은 자료보다 판단 과정이 잘 읽히는 핵심 문서를 앞쪽에 두는 편이 분석 품질이 높습니다.',
      },
      {
        label: '결과 확인',
        title: '면접 대비와 추천 공고를 같이 보세요.',
        body: '어떤 설계 언어를 강조해야 하는지와 어떤 역량이 부족한지를 함께 보면 수정 방향이 더 빨라집니다.',
      },
    ],
    priorityTabs: [
      { title: '서류 피드백', body: '문제 정의, 설계 범위, 지표 표현이 약한 문장부터 먼저 손봅니다.' },
      { title: '면접 대비', body: '대표 프로젝트를 왜 그렇게 설계했는지 말로 풀 수 있는지 점검합니다.' },
      { title: '추천 공고', body: '기획, QA, PM 성향 중 어느 포지션 언어로 서류를 다듬을지 판단합니다.' },
    ],
    workflow: [
      '정보 입력에서 세부 직무와 증명 가능한 역량을 먼저 정리합니다.',
      '대표 문서 PDF와 우선 공고를 지정한 뒤 AI 분석을 실행합니다.',
      '서류 피드백에서 문장 수정 포인트를 잡고, 면접 대비에서 말하기 구조까지 맞춥니다.',
    ],
  },
  프로그래밍: {
    quickStartTitle: '프로그래밍 기준으로는 구현 범위와 검증 흔적이 먼저 보이게 입력해야 합니다.',
    quickStartBody: '세부 직무를 고른 뒤 담당 모듈, 스택, 테스트/성능 경험, public GitHub 저장소를 연결하고 AI 분석을 실행하세요. 결과는 포트폴리오 → 서류 피드백 → 면접 대비 순으로 보는 편이 좋습니다.',
    focusCards: [
      {
        label: '입력 우선순위',
        title: '언어보다 구현 범위를 먼저 적으세요.',
        body: '예: C++보다 “C++ 기반 전투 상태머신 구현 및 네트워크 보정”처럼 역할이 보이는 표현이 좋습니다.',
      },
      {
        label: '첨부 자료',
        title: 'README와 기술 설명이 있는 대표 저장소 1개가 중요합니다.',
        body: '프로젝트가 여러 개여도 깊게 설명 가능한 저장소 하나를 먼저 연결하는 편이 결과 품질이 안정적입니다.',
      },
      {
        label: '결과 확인',
        title: '포트폴리오와 면접 대비를 같이 보세요.',
        body: '코드 설명, 구조 선택 이유, 장애 대응 경험이 실제 면접 언어로 이어지는지 바로 확인할 수 있습니다.',
      },
    ],
    priorityTabs: [
      { title: '포트폴리오', body: 'GitHub, README, 기술문서화 결과를 먼저 보고 설명이 부족한 부분을 메웁니다.' },
      { title: '서류 피드백', body: '담당 시스템, 검증 수치, 기술 선택 이유가 이력서에서 제대로 드러나는지 확인합니다.' },
      { title: '면접 대비', body: '구조 선택, 장애 대응, 성능 이슈를 1분 안에 설명할 수 있는지 점검합니다.' },
    ],
    workflow: [
      '정보 입력에서 세부 직무, 구현 범위, 증명 가능한 기술 조합을 먼저 정리합니다.',
      'public GitHub 저장소와 PDF 자료를 연결한 뒤 AI 분석을 실행합니다.',
      '포트폴리오에서 기술 설명을 보강하고, 서류 피드백과 면접 대비로 말하기 구조를 맞춥니다.',
    ],
  },
  아트: {
    quickStartTitle: '아트 기준으로는 역할 범위와 제작 판단이 먼저 보이게 입력해야 합니다.',
    quickStartBody: '세부 직무를 고른 뒤 대표 결과물, 과정 시트, 엔진 적용 컷, 피드백 반영 경험을 연결하고 AI 분석을 실행하세요. 결과는 포트폴리오 → 서류 피드백 → 면접 대비 순으로 보는 편이 효율적입니다.',
    focusCards: [
      {
        label: '입력 우선순위',
        title: '툴 이름보다 어떤 산출물을 만들었는지 먼저 적으세요.',
        body: '예: Photoshop보다 “2D UI 그래픽 제작 및 아이콘 톤 가이드 구축”처럼 결과물이 보이는 표현이 좋습니다.',
      },
      {
        label: '첨부 자료',
        title: '완성컷과 과정 시트를 같이 보여주세요.',
        body: '한 장의 결과물보다 역할, 수정 이력, 엔진 적용 전후가 같이 보이는 자료가 더 강합니다.',
      },
      {
        label: '결과 확인',
        title: '포트폴리오와 면접 대비를 같이 보세요.',
        body: '작업 의도, 스타일 선택 이유, 피드백 대응을 어떻게 말로 풀지까지 바로 점검할 수 있습니다.',
      },
    ],
    priorityTabs: [
      { title: '포트폴리오', body: '대표작 순서, 역할 표기, 과정 시트, 엔진 적용 컷 구성이 적절한지 먼저 봅니다.' },
      { title: '서류 피드백', body: '역할 범위와 작업 의도, 협업 경험이 이력서와 자소서에서 제대로 드러나는지 확인합니다.' },
      { title: '면접 대비', body: '스타일 선택 이유와 피드백 반영 과정을 짧게 설명할 수 있는지 점검합니다.' },
    ],
    workflow: [
      '정보 입력에서 세부 직무, 역할 범위, 제작 가능 산출물을 먼저 정리합니다.',
      '대표 결과물 PDF와 과정 자료를 연결한 뒤 AI 분석을 실행합니다.',
      '포트폴리오에서 작품 구성을 정리하고, 서류 피드백과 면접 대비로 말하기 구조를 맞춥니다.',
    ],
  },
};

export const ROLE_DETAILS = {
  기획: [
    { label: '시스템/컨텐츠 기획', matchRole: '기획', focus: '규칙, 성장, 전투, 컨텐츠 루프를 통합 설계하는 역량' },
    { label: '레벨 디자인', matchRole: '기획', focus: '동선, 난이도 곡선, 전투 배치, 플레이 템포를 설계하는 역량' },
    { label: '전투/액션 기획', matchRole: '기획', focus: '캐릭터 조작감, 스킬 구조, 판정, 밸런스를 설계하는 역량' },
    { label: '시나리오/퀘스트', matchRole: '기획', focus: '세계관, 캐릭터 서사, 퀘스트 플로우를 구조화하는 역량' },
    { label: '경제/BM 설계', matchRole: '기획', focus: '재화 흐름, 상점, 보상, 과금 구조를 지표 기반으로 설계하는 역량' },
    { label: 'UI/UX 기획', matchRole: '기획', focus: '정보 구조, 화면 플로우, 사용성 개선을 설계하는 역량' },
    { label: '라이브/이벤트 기획', matchRole: 'PM/운영', focus: '라이브 지표, 이벤트 캘린더, 운영 개선안을 설계하는 역량' },
    { label: 'QA', matchRole: 'QA/테스트', focus: '테스트 케이스, 결함 재현, 품질 기준과 리스크를 관리하는 역량' },
    { label: '개발PM', matchRole: 'PM/운영', focus: '개발 일정, 이슈, 리스크, 협업 프로세스를 조율하는 역량' },
    { label: '사업PM', matchRole: 'PM/운영', focus: '시장, 매출, 운영 지표를 바탕으로 사업성과 실행 계획을 관리하는 역량' },
  ],
  프로그래밍: [
    { label: '클라이언트 프로그래머', matchRole: '클라이언트', focus: '게임플레이, UI, 렌더링, 엔진 연동 구현 역량' },
    { label: '서버 프로그래머', matchRole: '서버', focus: '동시 접속, DB, 네트워크, 안정성 중심의 서버 구현 역량' },
    { label: '게임플레이 프로그래머', matchRole: '클라이언트', focus: '캐릭터, 전투, 상호작용, 상태머신 구현 역량' },
    { label: '엔진/그래픽스 프로그래머', matchRole: '클라이언트', focus: '렌더링, 셰이더, 엔진 구조, 최적화 역량' },
    { label: '모바일 프로그래머', matchRole: '클라이언트', focus: '모바일 빌드, 성능, 플랫폼 대응 구현 역량' },
    { label: '툴/빌드 프로그래머', matchRole: '클라이언트', focus: '개발 파이프라인, 에디터 툴, 자동화 구축 역량' },
    { label: 'AI/데이터 엔지니어', matchRole: 'AI/데이터', focus: '게임 데이터 분석, 추천/매칭, ML/LLM 활용 구현 역량' },
  ],
  아트: [
    { label: '원화/컨셉 아트', matchRole: '아트/UI', focus: '캐릭터, 배경, 키비주얼 콘셉트 설계와 표현 역량' },
    { label: '도트아티스트', matchRole: '아트/UI', focus: '픽셀 단위 실루엣, 제한 팔레트, 프레임 애니메이션을 제작하는 역량' },
    { label: '2D 그래픽 디자이너', matchRole: '아트/UI', focus: '2D 리소스, 아이콘, 배너, UI 그래픽을 게임 톤에 맞게 제작하는 역량' },
    { label: 'UI 아트', matchRole: '아트/UI', focus: '게임 UI 비주얼, 아이콘, 레이아웃, 사용성 표현 역량' },
    { label: '3D 캐릭터', matchRole: '아트/UI', focus: '모델링, 스컬프팅, 텍스처링, 최적화 제작 역량' },
    { label: '3D 배경', matchRole: '아트/UI', focus: '환경 모델링, 월드 구성, 머티리얼, 최적화 제작 역량' },
    { label: '애니메이션', matchRole: '아트/UI', focus: '캐릭터 모션, 타이밍, 리깅 이해, 인게임 적용 역량' },
    { label: 'VFX/이펙트', matchRole: '아트/UI', focus: '전투 이펙트, 파티클, 셰이더 기반 연출 제작 역량' },
    { label: 'TA', matchRole: '아트/TA', focus: '아트 파이프라인, 셰이더, 툴 제작, 최적화 브리지 역량' },
  ],
};

export const ROLE_GROUP_MATCH_ROLES = {
  기획: ['기획', 'PM/운영'],
  프로그래밍: ['클라이언트', '서버', 'AI/데이터'],
  아트: ['아트/UI', '아트/TA'],
};

export const ROLE_SKILL_CATEGORIES = {
  기획: {
    '기획 전문 역량': [
      '시스템/컨텐츠 기획', '레벨 디자인', '전투/액션 기획',
      '시나리오/퀘스트', '밸런싱', '경제/BM 설계', 'UI/UX 기획', '라이브/이벤트 기획',
    ],
    'QA/PM 역량': [
      'QA/테스트', '테스트 케이스 작성', '버그 리포트', '리스크 관리',
      '개발PM', '사업PM', '일정 관리', '요구사항 정리', '이슈 트래킹',
    ],
    '분석 및 문서화': [
      'GDD 작성', '기획서 작성', '밸런스 시트', '지표 설계', '데이터 분석',
      '유저 리서치', 'A/B 테스트', 'Excel', 'PowerPoint', 'Notion',
    ],
    '협업 및 툴': [
      'JIRA/Confluence', 'Figma', 'Miro', 'Git/SVN', '프로젝트 매니징(PM)',
      '커뮤니케이션', '영어(비즈니스)', '일본어', '중국어',
    ],
    'AI 활용': [
      'ChatGPT/Claude 활용', 'AI 데이터 분석', 'AI 프롬프트 엔지니어링', 'AI 문서 초안화',
    ],
  },
  프로그래밍: {
    '프로그래밍 언어': [
      'C++', 'C#', 'C', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Lua',
    ],
    '엔진 및 클라이언트': [
      'Unity', 'Unreal Engine', 'Gameplay Ability System', 'DirectX', 'OpenGL',
      'Shader', 'UI 구현', 'FSM', '최적화', '프로파일링',
    ],
    '서버 및 인프라': [
      'TCP/IP', 'WebSocket', 'Dedicated Server', 'SQL', 'MySQL', 'Redis',
      'Node.js', 'Spring', 'Docker', 'Kubernetes', 'CI/CD',
    ],
    'AI/데이터': [
      'Machine Learning', 'TensorFlow/PyTorch', '데이터 분석', 'Python 데이터 처리',
      'LLM 활용', '로그 분석', '추천 시스템',
    ],
    '협업 및 형상관리': ['Git/SVN', 'JIRA/Confluence', '코드 리뷰', '테스트 자동화'],
  },
  아트: {
    '2D 및 컨셉': [
      'Photoshop', 'Illustrator', '원화', '캐릭터 디자인', '배경 디자인',
      '도트 아트', 'Aseprite', '픽셀 애니메이션', '2D 그래픽 디자인',
      '컬러/라이팅', '아이콘 제작', '드로잉',
    ],
    '3D 및 애니메이션': [
      'Maya', '3ds Max', 'Blender', 'ZBrush', 'Substance Painter',
      '리깅', '애니메이션', '스킨/웨이트', '모션 캡처',
    ],
    'VFX 및 TA': [
      'Unity', 'Unreal Engine', 'Niagara', 'Particle System', 'Shader',
      'Material', 'LOD', '아틀라스', '최적화', '툴 제작',
    ],
    'UI 및 협업': ['Figma', 'UI 아트', 'UX 이해', '디자인 시스템', 'JIRA/Confluence', 'Git/SVN'],
    'AI 활용': ['AI 이미지 생성', 'Stable Diffusion', 'ComfyUI', 'Midjourney', 'AI 레퍼런스 제작'],
  },
};

export const SKILL_CATEGORIES = ROLE_SKILL_CATEGORIES.기획;

export const ROLES = ROLE_GROUPS.map((group) => group.label);

export function getRoleDetails(roleGroup) {
  return ROLE_DETAILS[roleGroup] || ROLE_DETAILS.기획;
}

export function getDefaultRoleDetail(roleGroup = '기획') {
  return getRoleDetails(roleGroup)[0];
}

export function getRoleDetail(roleGroup, subRole) {
  return getRoleDetails(roleGroup).find((detail) => detail.label === subRole || detail.matchRole === subRole) || getDefaultRoleDetail(roleGroup);
}

export function getSkillCategoriesForRoleGroup(roleGroup = '기획') {
  return ROLE_SKILL_CATEGORIES[roleGroup] || ROLE_SKILL_CATEGORIES.기획;
}

export function getDefaultSkillInput(roleGroup = '기획') {
  const categories = getSkillCategoriesForRoleGroup(roleGroup);
  const category = Object.keys(categories)[0];
  return { category, name: categories[category][0], level: '중' };
}

export function inferRoleGroupFromRole(role) {
  if (ROLE_DETAILS[role]) return role;
  for (const [group, details] of Object.entries(ROLE_DETAILS)) {
    if (details.some((detail) => detail.label === role || detail.matchRole === role)) return group;
  }
  return '기획';
}

export function normalizeUserProfile(profile = {}) {
  const roleGroup = profile.roleGroup || inferRoleGroupFromRole(profile.role);
  const detail = getRoleDetail(roleGroup, profile.subRole || profile.role);
  return {
    ...profile,
    roleGroup,
    subRole: profile.subRole || detail.label,
    role: detail.matchRole,
    roleFocus: detail.focus,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
  };
}

export function getProfileMatchRoles(profile = {}) {
  const normalized = normalizeUserProfile(profile);
  const roles = new Set([normalized.role, ...(ROLE_GROUP_MATCH_ROLES[normalized.roleGroup] || [])]);
  return [...roles].filter(Boolean);
}

export function getProfileDisplayRole(profile = {}) {
  const normalized = normalizeUserProfile(profile);
  return `${normalized.roleGroup} > ${normalized.subRole}`;
}
