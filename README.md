# Portfolio Coach

게임 업계 취업을 준비하는 지원자를 위한 AI 포트폴리오 코치입니다. 지원자의 기본 정보, 직무 역량, 이력서/자기소개서/포트폴리오 PDF를 바탕으로 서류 피드백, 포트폴리오 개선 가이드, 맞춤 공고 추천, 면접 대비 자료를 한 화면에서 제공합니다.

배포 페이지: https://yang-yun-seok.github.io/Portfolio-Coach/

## 주요 기능

- 서류 피드백: 이력서와 자기소개서의 보완점, 문장 구성, 직무 적합성 개선 방향을 AI가 정리합니다.
- 포트폴리오 가이드: 기획, 프로그래밍, 아트 세부 직무에 맞춰 보여줘야 할 산출물, 제작 과정, 기여도, 보완 포인트를 제안합니다.
- 추천 공고: 직무 역량과 경력 조건을 기준으로 GameJob 공고를 점수화하고 우선순위로 보여줍니다.
- 우선 공고 지정: GameJob 공고 번호를 직접 입력하면 해당 공고를 1~3순위 분석 대상으로 고정할 수 있습니다.
- 면접 대비: 추천 공고와 지원자 정보에 맞춰 예상 질문과 준비 방향을 제공합니다.
- 직무 과제 평가: 기획, 프로그래밍, 아트 직군별 실무형 과제를 연습하고 답변을 점검할 수 있습니다.
- 인성검사 시뮬레이션: 리커트 척도와 선택형 문항으로 기업 인성검사 흐름을 연습할 수 있습니다.
- PDF 출력: 분석 결과와 강사 피드백을 정리해 제출/상담용 자료로 활용할 수 있습니다.
- 공고 데이터 최신화: Render 백엔드를 통해 GameJob 공고 데이터를 갱신할 수 있습니다.

## 사용 방법

1. `정보 입력` 탭에서 이름, 직무 대분류, 세부 직무, 경력, 직무 역량을 입력합니다.
2. 필요하면 이력서, 자기소개서, 포트폴리오 PDF를 첨부합니다.
3. 특정 공고를 우선 분석하고 싶다면 GameJob 공고 번호를 `우선 공고 지정`에 입력합니다.
4. `AI 분석 시작 및 저장`을 누르고 결과가 생성될 때까지 기다립니다.
5. `서류 피드백`, `포트폴리오`, `추천 공고`, `면접 대비` 탭을 이동하며 결과를 확인합니다.
6. 필요한 경우 `PDF 출력`에서 상담용 또는 제출용 자료를 저장합니다.

## 배포 구조

이 프로젝트는 정적 프론트엔드와 Node/Express 백엔드가 분리된 구조입니다.

- Frontend: GitHub Pages
- Backend: Render Web Service
- AI Proxy: Supabase Edge Function
- Static Data: `public/api/*.json`

GitHub Pages만으로는 화면과 정적 데이터, Supabase 기반 AI 분석 일부가 동작합니다. 공고 크롤링, 공고 번호 조회, 인성검사 서버 분석처럼 `/api/*`가 필요한 기능은 Render 백엔드가 필요합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3002`

## 배포 설정

GitHub 저장소의 `Settings > Pages`에서 Source를 `GitHub Actions`로 설정합니다.

GitHub Actions Variables에는 아래 값을 등록합니다.

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Render Web Service 설정은 다음과 같이 둡니다.

- Build Command: `npm install`
- Start Command: `npm start`

## 운영 참고

- 무료 Render 인스턴스는 일정 시간 미사용 시 sleep 상태가 될 수 있어 첫 요청이 느릴 수 있습니다.
- AI 분석은 네트워크와 모델 상태에 따라 30초 이상 걸릴 수 있습니다.
- 공고 크롤링은 브라우저의 실시간 스트림 연결이 불안정해도 상태 확인 방식으로 계속 진행되도록 보강되어 있습니다.
- API 키는 프론트에 직접 넣지 않고 Supabase/백엔드에서 관리하는 구성을 권장합니다.
