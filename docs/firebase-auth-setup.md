# Firebase 인증/제출 기능 설정 가이드

이 문서는 현재 코드베이스에 이미 반영된 Firebase 인증/포트폴리오 제출 기능을 실제로 켜는 절차만 정리합니다.

관련 설계 문서:
- [Firebase 인증/제출 아키텍처](C:/Users/user/Documents/Codex/portfolio-bot-github/docs/firebase-auth-submission-architecture.md)

## 1. 현재 코드 상태

이미 구현된 범위:
- Firebase Auth 로그인 게이트
- Render 서버의 Firebase ID 토큰 검증
- 포트폴리오 제출 메타데이터 Firestore 저장
- 제출 파일 Firebase Storage 저장
- 내 제출 이력 조회

기본 동작:
- 프론트 `VITE_FIREBASE_AUTH_ENABLED !== 'true'` 이면 로그인 없이 기존처럼 동작
- 백엔드 `FIREBASE_AUTH_REQUIRED !== 'true'` 이면 인증 미들웨어가 비활성화됨

즉, 설정값을 넣기 전까지는 배포가 깨지지 않도록 설계되어 있습니다.

## 2. Firebase에서 먼저 해야 할 일

### Authentication
Firebase Console > Authentication > Sign-in method

- `Email/Password` 활성화
- 그 외 로그인 방식은 일단 비활성 유지

### Firestore
Firebase Console > Firestore Database

- 데이터베이스 생성
- 위치 선택
- 초기 규칙은 테스트 모드로 시작해도 되지만, 배포 전에는 규칙을 제한해야 함

필수 컬렉션:
- `users`
- `portfolioSubmissions`
- `submissionEvents`

### Storage
Firebase Console > Storage

- 기본 버킷 생성
- PDF 업로드가 가능하도록 준비

## 3. 프론트엔드 환경변수

로컬 또는 Replit 프론트 환경에서 아래 값을 설정합니다.

예시는 [/.env.frontend.example](C:/Users/user/Documents/Codex/portfolio-bot-github/.env.frontend.example) 참고.

필수:
- `VITE_FIREBASE_AUTH_ENABLED=true`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`

선택:
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## 4. 백엔드 환경변수

Render 또는 Replit 서버 환경에서 아래 값을 설정합니다.

예시는 [/.env.server.example](C:/Users/user/Documents/Codex/portfolio-bot-github/.env.server.example) 참고.

필수:
- `FIREBASE_AUTH_REQUIRED=true`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

주의:
- `FIREBASE_PRIVATE_KEY`는 줄바꿈이 `\n` 형태로 들어가도 코드에서 복원됩니다.

## 5. 서비스 계정 발급

Firebase Console > Project settings > Service accounts

1. `새 비공개 키 생성`
2. JSON 다운로드
3. 아래 값을 서버 시크릿으로 등록

매핑:
- `project_id` -> `FIREBASE_PROJECT_ID`
- `client_email` -> `FIREBASE_CLIENT_EMAIL`
- `private_key` -> `FIREBASE_PRIVATE_KEY`

## 6. 계정 발급 방식

현재 권장 운영 방식:
- 공개 회원가입 UI 없음
- 운영자가 Firebase Console에서 사용자 계정을 직접 생성

절차:
1. Firebase Console > Authentication > Users
2. `사용자 추가`
3. 이메일/비밀번호 발급
4. 첫 로그인 후 Firestore `users/{uid}` 문서가 자동 생성됨

기본값:
- `role: user`
- `trackDefault: 기획`

관리자 승격:
- Firestore `users/{uid}.role = admin`

## 7. 지금 보호되는 API

`FIREBASE_AUTH_REQUIRED=true` 일 때 아래 API는 로그인 사용자만 접근 가능합니다.

- `POST /api/analyze`
- `POST /api/analyze-personality`
- `POST /api/match-jobs`
- `POST /api/company-insights`
- `POST /api/market-insights`
- `POST /api/instructor-draft`
- `POST /api/jobs/resolve`

## 8. 포트폴리오 제출 저장 구조

### Firestore
컬렉션:
- `portfolioSubmissions`
- `submissionEvents`

### Storage
경로:
- `portfolio-submissions/{uid}/{submissionId}/resume.pdf`
- `portfolio-submissions/{uid}/{submissionId}/cover-letter.pdf`
- `portfolio-submissions/{uid}/{submissionId}/portfolio-1.pdf`

제한:
- PDF만 허용
- 파일당 최대 10MB
- 포트폴리오 첨부 최대 5개

## 9. 권장 보안 규칙 적용 순서

1. Firebase 기능 연결
2. 관리자 계정 1개 생성
3. 프론트 로그인 동작 확인
4. 서버 보호 API 확인
5. 제출 저장 확인
6. 그 다음 Firestore/Storage 규칙 강화

초기에는 너무 강한 규칙부터 적용하면 디버깅이 막힐 수 있습니다.

## 10. 로컬 점검 순서

프론트와 서버 환경변수를 모두 넣은 뒤:

```powershell
cd C:\Users\user\Documents\Codex\portfolio-bot-github
npm install
npm run dev
```

체크 항목:
1. 로그인 화면 노출
2. 로그인 성공 후 앱 진입
3. `매칭하기` / AI 분석 API 정상 호출
4. 포트폴리오 탭에서 제출 버튼 동작
5. Firestore에 제출 문서 생성
6. Storage에 PDF 파일 업로드

## 11. 배포 순서

### 현재 과도기 구조
- 프론트: GitHub Pages
- 서버: Render

### 최종 목표 구조
- 저장소: GitHub Private
- 서비스 운영: Replit
- 인증/DB/파일: Firebase

권장 순서:
1. Firebase 로그인/제출 기능을 현재 구조에서 먼저 안정화
2. Render 서버 보호 API 검증 완료
3. GitHub 저장소 Private 전환
4. 프론트/백엔드를 Replit 운영 구조로 이전

## 12. 롤백 방법

문제가 생기면 아래 두 값만 끄면 기존처럼 동작합니다.

프론트:
- `VITE_FIREBASE_AUTH_ENABLED=false`

백엔드:
- `FIREBASE_AUTH_REQUIRED=false`

이 두 값이 꺼져 있으면 로그인 게이트와 인증 강제가 비활성화됩니다.

## 13. 다음 구현 단계

현재 구현 이후 바로 이어질 권장 작업:
- 관리자 제출 목록 화면
- 관리자 상태 변경 / 메모 기능
- Firestore/Storage 보안 규칙 적용
- 사용자별 AI 요청 횟수 제한
- 사용자별 제출 횟수 제한
