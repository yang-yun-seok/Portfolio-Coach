# Firebase 인증과 무료 파일 제출 설정

이 문서는 현재 운영 구조인 Firebase Auth·Firestore와 Supabase Free Storage를 연결하는 절차를 정리합니다.

관련 설계 문서:
- [Firebase 인증/제출 아키텍처](firebase-auth-submission-architecture.md)

## 1. 운영 구조

- 로그인: Firebase Authentication Google 로그인
- 사용자·제출·검토 데이터: Firestore
- PDF 파일: Supabase Free 비공개 Storage 버킷
- API와 화면: Render Web Service
- 관리자 다운로드: Firebase 관리자 권한을 검증하는 Render API

브라우저는 Supabase 비밀 키나 파일 URL을 받지 않습니다. 학생 제출은 Firebase ID 토큰을 포함한 멀티파트 요청으로 Render에 전달되고, 서버가 PDF를 검증한 후 비공개 버킷과 Firestore에 저장합니다.

## 2. Firebase 설정

### Authentication

Firebase Console > Authentication > Sign-in method

1. `Google` 로그인을 활성화합니다.
2. 사용하지 않는 `Email/Password` 방식은 비활성화합니다.
3. Authentication > Settings > Authorized domains에 Render 배포 도메인을 추가합니다.

### Firestore

필수 컬렉션:

- `users`
- `portfolioSubmissions`
- `submissionEvents`
- `userAccessEvents`

브라우저는 `portfolioSubmissions`와 `submissionEvents`에 직접 쓰지 못합니다. 제출 생성과 관리자 변경은 Firebase Admin SDK를 사용하는 Render API만 수행합니다.

규칙 배포:

```powershell
npx firebase-tools deploy --only firestore:rules
```

Firebase Storage는 사용하지 않으므로 Blaze 업그레이드와 기본 버킷 생성이 필요하지 않습니다. `firebase.json`에도 Storage 배포 대상을 두지 않습니다.

## 3. Supabase Free Storage 설정

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 Free 프로젝트를 생성합니다.
2. Storage에서 `portfolio-submissions` 버킷을 생성합니다.
3. 버킷은 반드시 **Private** 상태로 둡니다.
4. 파일 크기 제한은 `10 MB`, 허용 MIME은 `application/pdf`로 설정합니다.
5. Project Settings > API Keys에서 서버용 `Secret key`를 발급합니다.

서버용 키는 `sb_secret_...` 형식을 권장합니다. 레거시 `service_role` 키도 코드에서 지원하지만 2026년 말 폐기 예정이므로 새 프로젝트에는 사용하지 않습니다.

무료 한도와 제약:

- 파일 저장 1GB
- 월 egress 5GB
- 결제 수단을 등록하지 않은 Free 조직에서는 유료 사용량으로 자동 전환되지 않음
- 사용량이 적은 프로젝트는 일시 중지될 수 있으며 Dashboard에서 다시 시작할 수 있음

참고:

- [Supabase Free 요금제](https://supabase.com/pricing)
- [Free 프로젝트 일시 중지](https://supabase.com/docs/guides/platform/free-project-pausing)
- [비공개 버킷](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [새 API 키 안내](https://supabase.com/docs/guides/getting-started/api-keys)

## 4. 프론트엔드 환경 변수

[/.env.frontend.example](../.env.frontend.example)을 기준으로 설정합니다.

필수:

- `VITE_FIREBASE_AUTH_ENABLED=true`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

선택:

- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Supabase URL과 Secret key는 프론트 환경 변수에 넣지 않습니다.

## 5. Render 서버 환경 변수

[/.env.server.example](../.env.server.example)을 기준으로 설정합니다.

Firebase 인증:

- `FIREBASE_AUTH_REQUIRED=true`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_MODE_PASSWORD`

Supabase Storage:

- `SUPABASE_STORAGE_URL=https://PROJECT_REF.supabase.co`
- `SUPABASE_STORAGE_SECRET_KEY=sb_secret_...`
- `SUPABASE_STORAGE_BUCKET=portfolio-submissions`
- `PORTFOLIO_UPLOADS_ENABLED=false`

주의:

- `SUPABASE_STORAGE_SECRET_KEY`와 `FIREBASE_PRIVATE_KEY`는 Render 서버 환경 변수로만 관리합니다.
- 두 값에 `VITE_` 접두사를 붙이면 브라우저 번들에 포함될 수 있으므로 금지합니다.
- 저장소 연결 검증 전에는 `PORTFOLIO_UPLOADS_ENABLED=false`를 유지합니다.
- 관리자 모드는 Firebase의 `role: admin`과 서버 비밀번호 검증을 모두 통과해야 합니다.

## 6. 파일 저장 경로와 검증

고정 경로:

- `portfolio-submissions/{uid}/{submissionId}/resume.pdf`
- `portfolio-submissions/{uid}/{submissionId}/cover-letter.pdf`
- `portfolio-submissions/{uid}/{submissionId}/portfolio-1.pdf`부터 `portfolio-5.pdf`

서버 검증:

- 로그인한 활성 사용자만 제출 가능
- 사용자별 동시 제출 1개
- PDF 헤더 시그니처 확인
- 파일당 최대 10MB
- 이력서 1개, 자기소개서 1개, 포트폴리오 최대 5개
- 고정 사용자·제출 경로 외의 객체 접근 거부
- Firestore 저장 실패 시 이미 올라간 Supabase 객체 삭제
- 관리자 다운로드 시 제출 문서의 소유자와 경로를 다시 검증
- `Cache-Control: private, no-store`와 `nosniff` 적용

Firestore에는 영구 다운로드 URL이나 Supabase Secret key를 저장하지 않습니다.

## 7. 활성화 순서

1. Firebase Google 로그인과 관리자 계정을 확인합니다.
2. Firestore 규칙을 배포합니다.
3. Supabase Free 비공개 버킷을 생성합니다.
4. Render에 Supabase 서버 환경 변수를 등록하고 재배포합니다.
5. `/api/capabilities`에서 `status: ready`가 반환되는지 확인합니다.
6. Render의 `PORTFOLIO_UPLOADS_ENABLED=true`로 변경하고 다시 배포합니다.
7. 학생 계정으로 PDF를 제출합니다.
8. 관리자 모드에서 제출 파일 다운로드와 검토 저장을 확인합니다.
9. 학생 화면에 공개 피드백만 노출되고 관리자 메모가 보이지 않는지 확인합니다.

`PORTFOLIO_UPLOADS_ENABLED=true`여도 버킷이 없거나 공개 상태이거나 Secret key 검증에 실패하면 제출 기능은 열리지 않습니다.

## 8. 롤백

파일 제출만 즉시 닫으려면 Render에서 다음 값을 설정하고 재배포합니다.

```text
PORTFOLIO_UPLOADS_ENABLED=false
```

기존 제출 메타데이터와 비공개 파일은 유지되고 신규 업로드만 차단됩니다. 인증 전체를 비활성화하는 `FIREBASE_AUTH_REQUIRED=false`는 관리자 API 보호까지 해제할 수 있으므로 운영 롤백에 사용하지 않습니다.

## 9. 운영 점검

- `/api/capabilities`의 제출 상태 확인
- Supabase Storage 사용량이 무료 1GB 한도에 가까워지는지 확인
- 학생이 오래 사용하지 않은 기간에는 Supabase 프로젝트 일시 중지 여부 확인
- 제출 실패 후 일부 파일이 남지 않는지 확인
- 관리자 다운로드가 비로그인 요청에 `401`을 반환하는지 확인
- 학생 응답에 `adminMemo`, `reviewedByEmail`, `storagePath`가 포함되지 않는지 확인
