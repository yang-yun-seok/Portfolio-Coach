# Portfolio Bot GitHub Deploy Guide

이 사본은 `GitHub Pages + 별도 Node 백엔드` 구조로 올리는 것을 기준으로 정리되어 있습니다.

## 1. 배포 구조

- 프론트엔드: GitHub Pages
- 백엔드: Render 무료 Web Service
- AI 프록시: 현재 Supabase Edge Function 유지

## 2. 로컬 개발

```bash
npm install
npm run dev
```

- 프론트: `http://localhost:5173`
- 백엔드: `http://localhost:3002`

로컬에서는 `VITE_API_BASE_URL` 없이도 `/api`를 그대로 사용합니다.

## 3. GitHub Pages 배포

이 저장소에는 GitHub Pages 배포 워크플로가 포함되어 있습니다.

1. 이 폴더를 새 GitHub 저장소에 푸시합니다.
2. GitHub 저장소 `Settings > Pages`에서 `GitHub Actions`를 선택합니다.
3. 기본 브랜치를 `main` 또는 `master`로 사용합니다.
4. 저장소 `Settings > Secrets and variables > Actions > Variables`에 `VITE_API_BASE_URL` 값을 추가합니다.
   - 예: `https://your-app.onrender.com`
5. 푸시하면 `.github/workflows/deploy.yml`이 자동으로 정적 프론트를 빌드해 Pages에 배포합니다.

워크플로는 저장소 이름 기준으로 `VITE_BASE_PATH`를 자동 설정하고, `VITE_API_BASE_URL`은 Actions Variable에서 읽습니다.

## 4. Render 백엔드 배포

1. Render에서 새 `Web Service`를 만듭니다.
2. 이 저장소를 연결합니다.
3. 설정:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 백엔드 URL이 생기면 예: `https://your-app.onrender.com`

## 5. 프론트와 백엔드 연결

GitHub Actions Variable 또는 로컬 `.env`에서 아래 값을 설정합니다.

```bash
VITE_API_BASE_URL=https://your-app.onrender.com
```

필요하면 `.env.example`를 복사해서 `.env.local`로 써도 됩니다.

## 6. 현재 동작 범위

- Pages에서 동작:
  - 기본 UI
  - 정적 JSON 데이터 로딩
  - 메인 AI 분석용 Supabase 프록시 호출
- 별도 백엔드가 있어야 동작:
  - 공고 resolve
  - 크롤링 시작/중지/SSE
  - 인성검사 서버 분석

## 7. 추천 순서

1. 먼저 GitHub에 업로드
2. Pages 자동 배포 확인
3. Render 백엔드 생성
4. `VITE_API_BASE_URL` 연결
5. 기능 점검
