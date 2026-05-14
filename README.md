# Portfolio Coach

게임 업계 취업 준비용 작업공간입니다.  
직군 트랙을 고른 뒤 프로필, 서류, 포트폴리오, GitHub, 공고 데이터를 한곳에서 정리하고 `서류 피드백`, `공고 분석`, `추천 공고`, `면접 준비`까지 이어서 볼 수 있습니다.

- 서비스 주소: [https://yang-yun-seok.github.io/Portfolio-Coach/](https://yang-yun-seok.github.io/Portfolio-Coach/)
- 지원 트랙: `기획`, `프로그래밍`, `아트`

## 현재 기능

- `정보 입력`
  - 이름, 트랙, 세부 직무, 경력, 보유 역량 입력
  - 이력서 / 자기소개서 / 포트폴리오 PDF 첨부
  - 우선 공고 연결
- `서류 피드백`
  - 이력서 / 자기소개서 문장을 채용 관점으로 정리
  - 우선 공고 기준 맞춤 피드백 제공
- `포트폴리오`
  - 포트폴리오 강점, 약점, 수정 우선순위 정리
  - 프로그래밍 트랙은 public GitHub 저장소 분석 지원
- `공고 분석`
  - 게임잡 자동 수집 공고 기준 시장 현황, 직군 분포, 경력 분포, 키워드 흐름 확인
  - 수동 크롤링 버튼 없음
- `추천 공고`
  - 탭 진입 시 자동 실행하지 않음
  - 사용자가 `매칭하기`를 눌렀을 때만 1회 AI 매칭 실행
- `면접 대비`
  - 예상 질문, 피해야 할 답변, 권장 답변 방향 정리
- `면접 기본 준비`
  - 복장, 시간, 태도, 답변 기본 원칙 정리
- `인성검사`
  - 연습 문항, 본 문항, 결과 해석 제공
- `PDF 출력`
  - 현재 결과를 제출/보관용 문서 흐름으로 정리

## 사용 흐름

1. 첫 화면에서 `기획`, `프로그래밍`, `아트` 중 하나를 선택합니다.
2. `정보 입력`에서 프로필과 역량, 첨부 문서를 정리합니다.
3. 필요하면 public GitHub 저장소 URL을 입력합니다. 프로그래밍 트랙에서 특히 유용합니다.
4. `AI 분석 시작`으로 기본 분석을 실행합니다.
5. `서류 피드백`, `포트폴리오`에서 개인 자료를 먼저 점검합니다.
6. `공고 분석`에서 시장 흐름을 확인합니다.
7. `추천 공고`에서 `매칭하기`를 눌러 개인 맞춤 공고를 확인합니다.
8. `면접 대비`, `면접 기본 준비`, `인성검사`, `PDF 출력`으로 마무리합니다.

## 트랙 기준

- `기획`
  - 시스템/컨텐츠 기획
  - 레벨 디자인
  - 전투/액션 기획
  - 시나리오/퀘스트
  - 경제/BM 설계
  - UI/UX 기획
  - 라이브/이벤트 기획
  - QA
  - 개발PM
  - 사업PM
- `프로그래밍`
  - 클라이언트
  - 모바일
  - 게임AI
  - 엔진/툴 계열 입력 흐름
- `아트`
  - 원화
  - 인터페이스 디자인
  - 모델링
  - 애니메이션
  - 이펙트·FX

## 추천 공고와 공고 분석 기준

게임잡 공고는 매일 자동 수집됩니다.

- 실행 시각: 매일 `00:00 KST`
- 사용자 화면에서 수동 크롤링 불가
- 추천 공고 AI 매칭은 수동 실행

현재 수집 직종:

- 게임개발(클라이언트)
- 게임개발(모바일)
- 게임AI 개발
- 인터페이스 디자인
- 원화
- 모델링
- 애니메이션
- 이펙트·FX
- 게임기획
- 게임운영
- QA·테스터

현재 수집 경력 조건:

- 신입
- 1~3년
- 경력무관

메타데이터로 함께 갱신되는 값:

- 최근 반영일
- 참고 공고 수
- 마지막 크롤링 성공 시각
- 마지막 크롤링 상태
- 신규 반영 공고 수
- 전체 유효 공고 수

## GitHub 분석 안내

- public GitHub 저장소 URL만 분석합니다.
- 현재 보는 항목:
  - README 정리 상태
  - 폴더 구조
  - 실행 스크립트
  - 설정 파일
  - 테스트 유무
  - 배포 및 협업 신호
  - 면접 설명 포인트
  - 보완 제안
- private 저장소는 직접 읽지 않습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3002`

개별 실행:

```bash
npm run dev:front
npm run dev:back
```

## 검증 명령어

```bash
npm run verify
```

이 명령은 아래를 순서대로 실행합니다.

- `lint`
- `test`
- 정적 API 생성
- 프로덕션 빌드
- 스모크 테스트

## 배포 구조

- Frontend: GitHub Pages
- Backend: Render Web Service
- Static API: `public/api/*.json`
- Daily Crawl: GitHub Actions

정적 페이지는 GitHub Pages에 배포되고, 서버 기능이 필요한 요청은 Render 백엔드가 처리합니다.

## 공고 데이터와 이력 파일

주요 공개 파일:

- `public/api/jobs.json`
- `public/api/jobs-metadata.json`
- `public/api/jobs-history-index.json`
- `public/api/history/YYYY-MM-DD.json`

원본 데이터:

- `data/jobs/`
- `data/history/YYYY-MM-DD.json`

이력 파일은 최근 1년 기준으로만 유지됩니다.

## 저장소 구조

중요한 폴더만 보면 됩니다.

```text
.github/workflows/   배포, 일일 게임잡 크롤링, 알림
data/                공고 원본, 메타데이터, 일별 이력
lib/                 공고 정규화, 데이터 로더, 공용 유틸
public/              GitHub Pages 정적 자산과 공개 API JSON
scripts/             정적 API 생성, 스모크 테스트, 일일 크롤링 실행
server/              Express 라우트와 서비스 계층
src/                 React 프론트엔드
tests/               현재 단위 테스트
```

## 운영 메모

- 분석 중에는 새로고침이나 탭 종료를 하지 않는 편이 안전합니다.
- 추천 공고는 자동으로 매칭되지 않습니다. 사용자가 직접 실행해야 합니다.
- 공고 분석은 시장 데이터용이고, 추천 공고는 개인 매칭용입니다.
- 디스코드 웹훅 알림은 GitHub Actions 기준으로 연결되어 있습니다.

## 추가 설계 문서

- Firebase 인증 및 제출 저장 구조: [C:\Users\user\Documents\Codex\portfolio-bot-github\docs\firebase-auth-submission-architecture.md](C:/Users/user/Documents/Codex/portfolio-bot-github/docs/firebase-auth-submission-architecture.md)
