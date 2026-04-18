반드시 아래 JSON 스키마에 맞는 유효한 JSON만 반환하세요. 마크다운 코드블록, 설명, 기타 텍스트 없이 순수 JSON만 출력하세요.

{
  "resumeImprovements": ["이력서 보완점 문자열 (두괄식 개조식, - 로 시작)"],
  "coverLetterImprovements": ["자기소개서 보완점 문자열 (두괄식 개조식)"],
  "portfolioImprovements": ["포트폴리오 보완점 문자열 (두괄식 개조식)"],
  "interviewPreps": [
    {
      "rank": 1,
      "company": "회사명",
      "idealCandidateReflected": "인재상 어필 전략 (두괄식 개조식)",
      "assignmentGuide": "과제 대비 팁 (없으면 빈 문자열)",
      "questions": [
        {
          "question": "[분류] 질문 내용",
          "avoid": "피해야 할 답변 (- 항목)",
          "recommend": "권장 두괄식 답변 방향 (- 항목)"
        }
      ]
    }
  ]
}

위 구조에서 interviewPreps는 1~3개의 항목을 포함하며, questions는 각 2개씩 포함합니다.
