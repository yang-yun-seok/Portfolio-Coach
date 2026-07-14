# Firebase 인증/제출 기능 설정 가이드

이 문서는 현재 코드베이스에 이미 반영된 Firebase 인증/포트폴리오 제출 기능을 실제로 켜는 절차만 정리합니다.

관련 설계 문서:
- [Firebase 인증/제출 아키텍처](firebase-auth-submission-architecture.md)

## 1. 현재 코드 상태

이미 구현된 범위:
- Firebase Auth 로그인 게이트
- Render 서버의 Firebase ID 토큰 검증
- 포트폴리오 제출 메타데이터 Firestore 저장
- 제출 파일 Firebase Storage 저장
- 내 제출 이력 조회
- 관리자 제출 검토, 내부 메모, 학생 공개 피드백
- 학생 계정 이용 활성화/중지
- Storage 준비 상태에 따른 제출 기능 제어

기본 동작:
- 프론트 `VITE_FIREBASE_AUTH_ENABLED !== 'true'` 이면 로그인 없이 기존처럼 동작
- 백엔드 `FIREBASE_AUTH_REQUIRED !== 'true'` 이면 인증 미들웨어가 비활성화됨

파일 제출은 `PORTFOLIO_UPLOADS_ENABLED=true`일 때만 열립니다. Storage 버킷과 규칙을 먼저 준비해야 합니다.
서버는 이 플래그와 별도로 실제 버킷 접근 가능 여부를 확인하며, 확인에 실패하면 제출 기능을 비활성 상태로 유지합니다.

## 2. Firebase에서 먼저 해야 할 일

### Authentication
Firebase Console > Authentication > Sign-in method

- `Google` 활성화
- `Email/Password`는 사용하지 않으면 비활성 유지
- 배포 도메인을 Firebase Authentication > Settings > Authorized domains에 추가

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
- 2026년 2월 3일 이후 기본 버킷 생성과 사용에는 Blaze 요금제가 필요하므로 비용 정책을 확인한 뒤 활성화
- 참고: [Cloud Storage 시작 가이드](https://firebase.google.com/docs/storage/web/start)

## 3. 프론트엔드 환경변수

로컬 또는 Render 프론트 환경에서 아래 값을 설정합니다.

예시는 [/.env.frontend.example](../.env.frontend.example) 참고.

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

Render 서버 환경에서 아래 값을 설정합니다.

예시는 [/.env.server.example](../.env.server.example) 참고.

필수:
- `FIREBASE_AUTH_REQUIRED=true`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_MODE_PASSWORD`

Storage 준비 완료 후 설정:
- `FIREBASE_STORAGE_BUCKET=portfolio-coach-92074.firebasestorage.app`
- `PORTFOLIO_UPLOADS_ENABLED=true`

주의:
- `FIREBASE_PRIVATE_KEY`는 줄바꿈이 `\n` 형태로 들어가도 코드에서 복원됩니다.
- `ADMIN_MODE_PASSWORD`는 프런트 환경변수나 소스에 넣지 않고 Render 서버 환경변수로만 관리합니다.
- 관리자 모드 진입은 Firebase의 `role: admin` 확인과 서버 비밀번호 검증을 모두 통과해야 합니다.

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
- 학생은 Google 계정으로 로그인
- 첫 로그인 시 Firestore `users/{uid}` 문서가 자동 생성됨
- 특정 학생만 허용해야 하면 Firestore `users/{uid}.active` 또는 학교 도메인 allowlist 정책을 추가

절차:
1. Firebase Console > Authentication > Sign-in method
2. `Google` 제공업체 활성화
3. 학생이 사이트에서 `Google로 로그인` 선택
4. 첫 로그인 후 Firestore `users/{uid}` 문서가 자동 생성됨

기본값:
- `role: user`
- `trackDefault: 기획`

관리자 계정은 서버의 관리자 이메일 설정과 Firebase Admin SDK 검증을 통해 판별합니다. 클라이언트에서 사용자가 직접 역할을 변경할 수 없습니다.

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
- 학생의 Storage 직접 읽기 차단
- 관리자 다운로드는 서버의 Firebase 관리자 인증 API에서 제출자와 파일 경로를 다시 확인한 뒤 제공
- Firestore에는 영구 다운로드 URL을 저장하지 않음

## 9. 권장 보안 규칙 적용 순서

1. Firebase 기능 연결
2. 관리자 계정 1개 생성
3. 프론트 로그인 동작 확인
4. 서버 보호 API 확인
5. Firestore/Storage 규칙 배포
6. 테스트 계정으로 제출 저장과 관리자 다운로드 확인
7. Render에서 `PORTFOLIO_UPLOADS_ENABLED=true` 설정 후 재배포

## 10. 로컬 점검 순서

프론트와 서버 환경변수를 모두 넣은 뒤:

```powershell
cd C:\Users\user\Documents\Codex\Portfolio-Coach
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

### 현재 구조
- 프론트/서버: Render Web Service
- 인증/DB: Firebase
- 파일: Firebase Storage 준비 후 활성화

### 최종 목표 구조
- 저장소: GitHub Private
- 서비스 운영: Render
- 인증/DB/파일: Firebase

권장 순서:
1. Firebase Console에서 Storage 버킷 생성
2. `npx firebase-tools deploy --only firestore,storage` 실행
3. Render에서 `PORTFOLIO_UPLOADS_ENABLED=true` 설정
4. Render 재배포 후 `/api/capabilities`와 실제 PDF 제출 확인

## 12. 롤백 방법

문제가 생기면 아래 설정을 끕니다.

프론트:
- `VITE_FIREBASE_AUTH_ENABLED=false`

백엔드:
- `FIREBASE_AUTH_REQUIRED=false`
- `PORTFOLIO_UPLOADS_ENABLED=false`

이 두 값이 꺼져 있으면 로그인 게이트와 인증 강제가 비활성화됩니다.

## 13. 운영 점검

- `/api/capabilities`에서 제출 활성화 상태 확인
- 관리자 화면에서 미제출, 분석 미완료, 반려 후 재제출 대기 확인
- 학생 화면에서 관리자 내부 메모가 노출되지 않는지 확인
- 제출 실패 시 Storage에 일부 파일이 남지 않는지 확인
