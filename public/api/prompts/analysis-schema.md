반드시 아래 JSON 스키마에 맞는 유효한 JSON만 반환하세요. 마크다운 코드블록, 설명, 기타 텍스트 없이 순수 JSON만 출력하세요.

{
  "profileAnalysis": {
    "strengths": ["강점 항목 (두괄식 개조식, - 로 시작)"],
    "weaknesses": ["약점 / 보완 필요 항목 (두괄식 개조식, - 로 시작)"],
    "fitScore": "1순위 공고 기준 종합 매칭 평가 한 줄 요약"
  },
  "resumeImprovements": ["이력서 보완점 (두괄식 개조식, - 로 시작)"],
  "coverLetterImprovements": ["자기소개서 보완점 (두괄식 개조식, - 로 시작)"],
  "portfolioImprovements": ["포트폴리오 보완점 (두괄식 개조식, - 로 시작)"],
  "interviewPreps": [
    {
      "rank": 1,
      "company": "회사명",
      "idealCandidateReflected": "인재상 어필 전략 (두괄식 개조식, - 로 시작)",
      "assignmentGuide": "과제 대비 팁 (없으면 빈 문자열)",
      "questions": [
        {
          "type": "직무역량 | 인성·문화핏 | 산업이해 | 문제해결",
          "question": "면접 질문 내용",
          "avoid": "피해야 할 답변 패턴 (- 항목)",
          "recommend": "권장 답변 방향 (두괄식, - 항목)"
        }
      ]
    }
  ]
}

위 구조에서:
- profileAnalysis.strengths / weaknesses: 각 3~5개 항목
- resumeImprovements / coverLetterImprovements / portfolioImprovements: 각 3~5개 항목
- interviewPreps: 1~3개 항목 (추천 공고 수에 따라)
- questions: 각 공고당 3~4개, type 필드는 반드시 위 4가지 중 하나로 분류
