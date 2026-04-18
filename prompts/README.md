# 프롬프트 및 콘텐츠 관리 가이드

이 디렉토리에는 AI 분석에 사용되는 프롬프트와 정적 콘텐츠가 포함되어 있습니다.
**코드를 수정하지 않고** 이 파일들만 편집하면 AI 동작을 변경할 수 있습니다.

## 파일 목록

| 파일 | 설명 | 편집 시 영향 |
|------|------|-------------|
| `system-prompt.md` | AI의 역할과 응답 스타일 정의 | AI의 전체적인 말투·포맷 변경 |
| `analysis-schema.md` | Claude/GPT용 JSON 출력 스키마 설명 | 비-Gemini 모델의 응답 구조 변경 |
| `analysis-schema.json` | Gemini 구조화 응답 스키마 (JSON) | Gemini 응답 필드 추가/제거 |
| `interview-basic.json` | 면접 기본 준비 탭 콘텐츠 | 면접 에티켓 가이드 항목 변경 |

## 편집 방법

### system-prompt.md
마크다운 형식의 일반 텍스트입니다. AI의 페르소나와 응답 규칙을 정의합니다.

### analysis-schema.md
Claude, GPT 등 구조화 응답을 직접 지원하지 않는 모델에게 전달되는 스키마 안내문입니다.
JSON 구조 예시를 포함하고 있으며, 필드를 추가/제거할 경우 `analysis-schema.json`과 동기화해야 합니다.

### analysis-schema.json
Gemini의 `responseSchema`에 직접 전달되는 구조입니다.
Gemini API 타입 시스템(`STRING`, `INTEGER`, `ARRAY`, `OBJECT`)을 따릅니다.
**이 파일과 `analysis-schema.md`는 반드시 동기화**해야 합니다.

### interview-basic.json
면접 기본 준비 탭에 표시되는 카드 콘텐츠입니다.
`icon` 필드에는 lucide-react 아이콘 이름을 사용합니다.
`color` 필드에는 Tailwind CSS 색상명(blue, amber, purple, emerald 등)을 사용합니다.

## 개발 모드 핫 리로드

개발 모드(`npm run dev`)에서는 **매 API 요청마다** 프롬프트 파일을 다시 읽습니다.
파일을 수정하면 서버 재시작 없이 바로 반영됩니다.

프로덕션 모드에서는 서버 시작 시 1회 로드 후 캐시됩니다.
